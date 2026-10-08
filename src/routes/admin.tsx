import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Shell } from "@/components/chrome";
import { Area, Button, Field, Notice, SelectField } from "@/components/ui";
import {
  adminCoupons,
  adminDeleteCoupon,
  adminDeleteProduct,
  adminOrders,
  adminOverview,
  adminProducts,
  adminSaveCoupon,
  adminSaveProduct,
  adminSetStatus,
} from "@/lib/shop/api";
import { inr, when } from "@/lib/shop/money";
import { formatPhone } from "@/lib/shop/phone";
import { useSession } from "@/lib/shop/session";
import { UPI_ID } from "@/lib/shop/upi";
import type { Analytics, Category, Coupon, Order, OrderStatus, Product } from "@/lib/shop/types";
import { WATCH_IMAGES } from "@/lib/shop/types";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Tab = "overview" | "products" | "coupons" | "orders";

const statuses: OrderStatus[] = ["placed", "packed", "shipped", "delivered", "declined"];

function AdminPage() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [tick, setTick] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session.ready || !session.admin) return;
    const token = session.adminToken();
    let cancel = false;
    Promise.all([
      adminOverview({ data: { token } }),
      adminProducts({ data: { token } }),
      adminCoupons({ data: { token } }),
      adminOrders({ data: { token } }),
    ])
      .then(([nextAnalytics, nextProducts, nextCoupons, nextOrders]) => {
        if (cancel) return;
        if (!nextAnalytics || !nextProducts || !nextCoupons || !nextOrders) {
          setError("The desk session expired.");
          return;
        }
        setAnalytics(nextAnalytics);
        setProducts(nextProducts);
        setCoupons(nextCoupons);
        setOrders(nextOrders);
        setError("");
      })
      .catch(() => {
        if (!cancel) setError("Could not load the desk.");
      });
    return () => {
      cancel = true;
    };
  }, [session, session.ready, session.admin, tick]);

  if (!session.ready) {
    return (
      <Shell bare>
        <p className="px-4 py-16 text-center text-muted">Opening the desk…</p>
      </Shell>
    );
  }

  if (!session.admin) {
    return (
      <Shell bare>
        <div className="mx-auto max-w-lg px-4 py-16">
          <h1 className="display text-5xl">Desk is locked.</h1>
          <p className="mt-3 text-muted">Use the small Admin link on the sign-in page.</p>
          <Link to="/login" search={{ next: "/admin", admin: true }} className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ivory">
            Admin sign in
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell bare>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">Beyyond desk</p>
            <h1 className="display text-4xl">Watchroom</h1>
          </div>
          <Button variant="line" onClick={() => void session.adminOut()}>Sign out</Button>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto">
          {(["overview", "products", "coupons", "orders"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold capitalize ${tab === item ? "bg-ink text-ivory" : "border border-line bg-card"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <div className="mt-6">
          {tab === "overview" && analytics ? <Overview analytics={analytics} /> : null}
          {tab === "products" && products ? (
            <Products products={products} onChange={() => setTick((value) => value + 1)} />
          ) : null}
          {tab === "coupons" && coupons ? (
            <Coupons coupons={coupons} onChange={() => setTick((value) => value + 1)} />
          ) : null}
          {tab === "orders" && orders ? (
            <Orders orders={orders} onChange={() => setTick((value) => value + 1)} />
          ) : null}
          {tab === "overview" && !analytics && !error ? <p className="text-muted">Loading sales…</p> : null}
        </div>
      </div>
    </Shell>
  );
}

function Overview({ analytics }: { analytics: Analytics }) {
  const hasSales = analytics.orders > 0;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue" value={inr(analytics.revenuePaise)} />
        <Stat label="Orders" value={String(analytics.orders)} />
        <Stat label="Average" value={inr(analytics.aovPaise)} />
        <Stat label="Declined" value={String(analytics.declined)} />
      </div>
      <div className="rounded-3xl bg-card p-4">
        <p className="text-sm font-semibold">Last 14 days</p>
        {hasSales ? (
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.days}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted)" }} stroke="var(--color-line)" />
                <Tooltip formatter={(value) => inr(Number(value ?? 0))} />
                <Bar dataKey="revenuePaise" fill="var(--color-ink)" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No paid orders yet. They show up here after a customer confirms UPI.</p>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl bg-card p-4">
          <p className="text-sm font-semibold">By shelf</p>
          <p className="mt-3 text-sm">Luxury <span className="float-right tabular-nums">{inr(analytics.luxuryPaise)}</span></p>
          <p className="mt-2 text-sm">Everyday <span className="float-right tabular-nums">{inr(analytics.everydayPaise)}</span></p>
        </div>
        <div className="rounded-3xl bg-card p-4">
          <p className="text-sm font-semibold">Top watches</p>
          {!analytics.top.length ? <p className="mt-3 text-sm text-muted">Nothing sold yet.</p> : null}
          <ul className="mt-3 grid gap-2 text-sm">
            {analytics.top.map((item) => (
              <li key={item.name} className="flex justify-between gap-3">
                <span>{item.name} · {item.qty}</span>
                <span className="tabular-nums">{inr(item.revenuePaise)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Products({ products, onChange }: { products: Product[]; onChange: () => void }) {
  const session = useSession();
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError("");
    const result = await adminSaveProduct({
      data: {
        token: session.adminToken(),
        id: draft.id,
        name: draft.name,
        tagline: draft.tagline,
        description: draft.description,
        priceRupees: Number(draft.priceRupees),
        category: draft.category,
        movement: draft.movement,
        caseMm: Number(draft.caseMm),
        stock: Number(draft.stock),
        image: draft.image,
        featured: draft.featured,
        active: draft.active,
      },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(null);
    onChange();
  }

  async function remove(id: string) {
    const result = await adminDeleteProduct({ data: { token: session.adminToken(), id } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmId("");
    onChange();
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setDraft(blankProduct())}>Add a watch</Button>
      </div>
      {draft ? (
        <form className="grid gap-3 rounded-3xl bg-card p-4" onSubmit={save}>
          <Field label="Name" name="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <Field label="Tagline" name="tagline" value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} />
          <Area label="Description" name="description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price in rupees" name="price" inputMode="decimal" value={draft.priceRupees} onChange={(event) => setDraft({ ...draft, priceRupees: event.target.value })} />
            <Field label="Case mm" name="case" inputMode="numeric" value={draft.caseMm} onChange={(event) => setDraft({ ...draft, caseMm: event.target.value })} />
            <Field label="Stock" name="stock" inputMode="numeric" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} />
            <Field label="Movement" name="movement" value={draft.movement} onChange={(event) => setDraft({ ...draft, movement: event.target.value })} />
          </div>
          <SelectField label="Shelf" name="category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}>
            <option value="everyday">Everyday</option>
            <option value="luxury">Luxury</option>
          </SelectField>
          <label className="grid gap-2 text-sm font-medium">
            Photo
            <select className="h-12 rounded-xl border border-line bg-ivory px-3" value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })}>
              {WATCH_IMAGES.map((src) => (
                <option key={src} value={src}>{src.replace("/watches/", "")}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} />
            Featured on the home edit
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
            Listed for customers
          </label>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <div className="flex gap-2">
            <Button type="submit">Save watch</Button>
            <Button variant="line" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </form>
      ) : null}
      <ul className="grid gap-3">
        {products.map((product) => (
          <li key={product.id} className="flex gap-3 rounded-3xl bg-card p-3">
            <img src={product.image} alt="" className="h-20 w-20 rounded-xl bg-paper object-contain" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-muted">
                {inr(product.pricePaise)} · {product.category} · stock {product.stock}
                {product.active ? "" : " · hidden"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold"
                  onClick={() =>
                    setDraft({
                      id: product.id,
                      name: product.name,
                      tagline: product.tagline,
                      description: product.description,
                      priceRupees: String(product.pricePaise / 100),
                      category: product.category,
                      movement: product.movement,
                      caseMm: String(product.caseMm),
                      stock: String(product.stock),
                      image: product.image,
                      featured: product.featured,
                      active: product.active,
                    })
                  }
                >
                  Edit
                </button>
                {confirmId === product.id ? (
                  <button type="button" className="text-sm font-semibold text-danger" onClick={() => void remove(product.id)}>
                    Confirm delete
                  </button>
                ) : (
                  <button type="button" className="text-sm text-muted" onClick={() => setConfirmId(product.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ProductDraft = {
  id?: string;
  name: string;
  tagline: string;
  description: string;
  priceRupees: string;
  category: Category;
  movement: string;
  caseMm: string;
  stock: string;
  image: string;
  featured: boolean;
  active: boolean;
};

function blankProduct(): ProductDraft {
  return {
    name: "",
    tagline: "",
    description: "",
    priceRupees: "",
    category: "everyday",
    movement: "Quartz",
    caseMm: "40",
    stock: "10",
    image: WATCH_IMAGES[5],
    featured: false,
    active: true,
  };
}

function Coupons({ coupons, onChange }: { coupons: Coupon[]; onChange: () => void }) {
  const session = useSession();
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "flat">("percent");
  const [amount, setAmount] = useState("10");
  const [minRupees, setMinRupees] = useState("0");
  const [category, setCategory] = useState<"" | Category>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    const result = await adminSaveCoupon({
      data: {
        token: session.adminToken(),
        code,
        kind,
        amount: Number(amount),
        minRupees: Number(minRupees),
        category,
        active: true,
        note,
      },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    setNote("");
    setError("");
    onChange();
  }

  async function remove(couponCode: string) {
    await adminDeleteCoupon({ data: { token: session.adminToken(), code: couponCode } });
    onChange();
  }

  return (
    <div className="grid gap-4">
      <form className="grid gap-3 rounded-3xl bg-card p-4" onSubmit={save}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code" name="code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="FESTIVE20" />
          <SelectField label="Kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value as "percent" | "flat")}>
            <option value="percent">Percent off</option>
            <option value="flat">Rupees off</option>
          </SelectField>
          <Field label={kind === "percent" ? "Percent" : "Rupees off"} name="amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <Field label="Minimum order, rupees" name="min" inputMode="decimal" value={minRupees} onChange={(event) => setMinRupees(event.target.value)} />
        </div>
        <SelectField label="Applies to" name="shelf" value={category} onChange={(event) => setCategory(event.target.value as "" | Category)}>
          <option value="">Whole cart</option>
          <option value="everyday">Everyday only</option>
          <option value="luxury">Luxury only</option>
        </SelectField>
        <Field label="Note" name="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Shown to you, not required" />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button type="submit">Save coupon</Button>
      </form>
      <ul className="grid gap-3">
        {coupons.map((coupon) => (
          <li key={coupon.code} className="flex items-center justify-between gap-3 rounded-3xl bg-card p-4">
            <div>
              <p className="font-semibold">{coupon.code}</p>
              <p className="text-sm text-muted">
                {coupon.kind === "percent" ? `${coupon.amount}%` : inr(coupon.amount)}
                {coupon.minPaise ? ` · from ${inr(coupon.minPaise)}` : ""}
                {coupon.category ? ` · ${coupon.category}` : ""}
                {coupon.active ? "" : " · off"}
              </p>
            </div>
            <button type="button" className="text-sm text-danger" onClick={() => void remove(coupon.code)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Orders({ orders, onChange }: { orders: Order[]; onChange: () => void }) {
  const session = useSession();
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(orders[0]?.id ?? null);

  async function setStatus(id: string, status: OrderStatus) {
    setError("");
    const result = await adminSetStatus({ data: { token: session.adminToken(), id, status } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange();
  }

  if (!orders.length) return <p className="text-muted">No orders yet.</p>;

  return (
    <div className="grid gap-3">
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {orders.map((order) => (
        <article key={order.id} className="rounded-3xl bg-card p-4">
          <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(open === order.id ? null : order.id)}>
            <span>
              <span className="block font-semibold">{order.id}</span>
              <span className="text-sm text-muted">{order.customerName || "No name"} · {when(order.createdAt)}</span>
            </span>
            <span className="text-right">
              <span className="block font-semibold tabular-nums">{inr(order.totalPaise)}</span>
              <span className="text-sm capitalize text-muted">{order.status}</span>
            </span>
          </button>
          {open === order.id ? (
            <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm">
              <p>
                <span className="font-semibold">{order.customerName}</span>
                <br />
                {order.customerPhone ? formatPhone(order.customerPhone) : ""}
              </p>
              <p className="text-muted">
                {order.address.name} · {formatPhone(order.address.phone)}
                <br />
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ""}
                <br />
                {order.address.city}, {order.address.state} {order.address.pincode}
              </p>
              <ul className="grid gap-1">
                {order.items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-3">
                    <span>{item.name} × {item.qty}</span>
                    <span className="tabular-nums">{inr(item.pricePaise * item.qty)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted">
                Match {inr(order.totalPaise)} on {UPI_ID}. Reference {order.id}.
                {order.upiRef ? ` Customer UTR: ${order.upiRef}.` : ""}
                {order.couponCode ? ` Coupon ${order.couponCode}.` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {statuses.filter((status) => status !== "declined").map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={order.status === status}
                    onClick={() => void setStatus(order.id, status)}
                    className="h-10 rounded-full border border-line px-3 text-xs font-semibold capitalize disabled:opacity-40"
                  >
                    {status}
                  </button>
                ))}
                <button type="button" className="h-10 rounded-full px-3 text-xs font-semibold text-danger" onClick={() => void setStatus(order.id, "declined")}>
                  Decline order
                </button>
              </div>
              {order.status !== "declined" ? (
                <p className="text-xs text-muted">Decline puts the watches back in stock. Refund the UPI yourself if the money arrived.</p>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
