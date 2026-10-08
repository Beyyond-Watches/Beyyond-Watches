import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/chrome";
import { Button, Notice } from "@/components/ui";
import { listOffers, quoteCart } from "@/lib/shop/api";
import { useCart, useCartHydrated } from "@/lib/shop/cart";
import { inr } from "@/lib/shop/money";
import { shopSearch, type Quote } from "@/lib/shop/types";

export const Route = createFileRoute("/cart")({
  loader: () => listOffers(),
  component: CartPage,
});

function CartPage() {
  const offers = Route.useLoaderData();
  const hydrated = useCartHydrated();
  const lines = useCart((state) => state.lines);
  const setQty = useCart((state) => state.setQty);
  const remove = useCart((state) => state.remove);
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | { ok: false; error: string } | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!lines.length) {
      setQuote(null);
      return;
    }
    let cancel = false;
    quoteCart({
      data: {
        items: lines.map((line) => ({ productId: line.productId, qty: line.qty })),
        couponCode: coupon.trim() || null,
      },
    })
      .then((next) => {
        if (!cancel) setQuote(next);
      })
      .catch(() => {
        if (!cancel) setQuote({ ok: false, error: "Could not refresh prices. Try again." });
      });
    return () => {
      cancel = true;
    };
  }, [hydrated, lines, coupon]);

  return (
    <Shell>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h1 className="display text-5xl">Your bag</h1>
          {!hydrated ? <p className="mt-6 text-muted">Opening your bag…</p> : null}
          {hydrated && !lines.length ? (
            <div className="mt-8">
              <p className="text-muted">Nothing here yet. The edit is a short walk.</p>
              <Link to="/shop" search={shopSearch()} className="mt-5 inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ivory">
                Shop watches
              </Link>
            </div>
          ) : null}
          <ul className="mt-6 grid gap-4">
            {hydrated
              ? lines.map((line) => (
                  <li key={line.productId} className="flex gap-4 rounded-3xl bg-card p-3">
                    <Link to="/watch/$slug" params={{ slug: line.slug }} className="w-24 shrink-0 overflow-hidden rounded-xl bg-paper">
                      <img src={line.image} alt="" className="aspect-square w-full object-contain" />
                    </Link>
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-semibold">{line.name}</h2>
                          <p className="text-sm text-muted">{line.category === "luxury" ? "Luxury" : "Everyday"}</p>
                        </div>
                        <p className="font-semibold tabular-nums">{inr(line.pricePaise * line.qty)}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex h-11 items-center rounded-full border border-line">
                          <button type="button" className="h-11 w-11" aria-label={`Fewer ${line.name}`} onClick={() => setQty(line.productId, line.qty - 1)}>−</button>
                          <span className="w-5 text-center text-sm tabular-nums">{line.qty}</span>
                          <button type="button" className="h-11 w-11" aria-label={`More ${line.name}`} onClick={() => setQty(line.productId, line.qty + 1)}>+</button>
                        </div>
                        <button type="button" className="h-11 px-2 text-sm text-muted" onClick={() => remove(line.productId)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              : null}
          </ul>
        </div>
        <aside className="h-fit rounded-3xl bg-card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Pay once for the bag</h2>
          <label className="mt-4 grid gap-2 text-sm font-medium">
            Coupon
            <input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              placeholder="BEYYOND10"
              className="h-12 rounded-xl border border-line bg-ivory px-3 text-base uppercase outline-none focus:border-ink"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {offers.map((offer) => (
              <button key={offer.code} type="button" onClick={() => setCoupon(offer.code)} className="h-10 rounded-full border border-line px-3 text-xs font-semibold">
                {offer.code}
              </button>
            ))}
          </div>
          {quote && !quote.ok ? <Notice tone="danger">{quote.error}</Notice> : null}
          {quote && quote.ok && quote.couponError ? <Notice tone="danger">{quote.couponError}</Notice> : null}
          <dl className="mt-4 grid gap-2 text-sm">
            <Row label="Watches" value={quote?.ok ? inr(quote.subtotalPaise) : "—"} />
            <Row label="Discount" value={quote?.ok ? `− ${inr(quote.discountPaise)}` : "—"} />
            <Row label="Shipping" value={quote?.ok ? (quote.shippingPaise ? inr(quote.shippingPaise) : "Free") : "—"} />
            <div className="mt-2 flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>To pay</dt>
              <dd className="tabular-nums">{quote?.ok ? inr(quote.totalPaise) : "—"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">Free shipping over ₹5,000. Payment is UPI, then the order is placed.</p>
          <Link
            to="/checkout"
            className={`mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-ivory ${!lines.length ? "pointer-events-none opacity-40" : ""}`}
          >
            Checkout
          </Link>
          <Button variant="ghost" className="mt-1" full onClick={() => setCoupon("")}>
            Clear coupon
          </Button>
        </aside>
      </div>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
