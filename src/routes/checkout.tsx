import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Shell } from "@/components/chrome";
import { Button, Field, Notice, SelectField } from "@/components/ui";
import { placeOrder, quoteCart, upiQr } from "@/lib/shop/api";
import { useCart, useCartHydrated } from "@/lib/shop/cart";
import { inr, rupeeString } from "@/lib/shop/money";
import { STATES } from "@/lib/shop/phone";
import { useSession } from "@/lib/shop/session";
import type { Address, Quote } from "@/lib/shop/types";
import { makePayRef, UPI_ID, upiPayUrl } from "@/lib/shop/upi";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

const emptyAddress = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "Maharashtra",
  pincode: "",
};

function CheckoutPage() {
  const navigate = useNavigate();
  const session = useSession();
  const hydrated = useCartHydrated();
  const lines = useCart((state) => state.lines);
  const clear = useCart((state) => state.clear);
  const [step, setStep] = useState<"address" | "review" | "pay" | "waiting">("address");
  const [address, setAddress] = useState(emptyAddress);
  const [coupon, setCoupon] = useState("");
  const [upiRef, setUpiRef] = useState("");
  const [quote, setQuote] = useState<Quote | { ok: false; error: string } | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState(false);
  const payRef = useRef<string>("");
  if (!payRef.current) payRef.current = makePayRef();

  useEffect(() => {
    if (!session.ready || !hydrated) return;
    if (!session.customer) {
      void navigate({ to: "/login", search: { next: "/checkout", admin: false } });
      return;
    }
    if (!session.customer.name) {
      void navigate({ to: "/login", search: { next: "/checkout", admin: false } });
    }
  }, [session.ready, session.customer, hydrated, navigate]);

  useEffect(() => {
    if (!session.customer || filled) return;
    setAddress((current) => ({
      ...current,
      name: session.customer?.name ?? "",
      phone: session.customer?.phone ?? "",
    }));
    setFilled(true);
  }, [session.customer, filled]);

  useEffect(() => {
    if (!hydrated || !lines.length) return;
    let cancel = false;
    quoteCart({
      data: {
        items: lines.map((line) => ({ productId: line.productId, qty: line.qty })),
        couponCode: coupon.trim() || null,
      },
    }).then((next) => {
      if (!cancel) setQuote(next);
    });
    return () => {
      cancel = true;
    };
  }, [hydrated, lines, coupon]);

  useEffect(() => {
    if (step !== "pay" && step !== "waiting") return;
    if (!quote?.ok) return;
    let cancel = false;
    upiQr({ data: { amountPaise: quote.totalPaise, note: `Beyyond ${payRef.current}` } }).then((svg) => {
      if (!cancel) setQr(svg);
    });
    return () => {
      cancel = true;
    };
  }, [step, quote]);

  function patch<K extends keyof Address>(key: K, value: Address[K]) {
    setAddress((current) => ({ ...current, [key]: value }));
  }

  function continueAddress(event: FormEvent) {
    event.preventDefault();
    if (address.name.trim().length < 2 || address.line1.trim().length < 5 || address.city.trim().length < 2 || !/^\d{6}$/.test(address.pincode.trim())) {
      setError("Fill the name, street, city, and a 6-digit PIN code.");
      return;
    }
    setError("");
    setStep("review");
  }

  function openApp(app: "upi" | "gpay" | "phonepe" | "paytm") {
    if (!quote?.ok) return;
    const url = upiPayUrl(app, rupeeString(quote.totalPaise), `Beyyond ${payRef.current}`);
    window.location.href = url;
    setStep("waiting");
  }

  async function confirmPaid() {
    if (!quote?.ok) return;
    setBusy(true);
    setError("");
    const result = await placeOrder({
      data: {
        token: session.token(),
        items: lines.map((line) => ({ productId: line.productId, qty: line.qty })),
        couponCode: coupon.trim() || null,
        address,
        upiRef,
        payRef: payRef.current,
      },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    clear();
    await navigate({ to: "/order/$id", params: { id: result.orderId } });
  }

  if (!hydrated || !session.ready) {
    return (
      <Shell>
        <p className="px-4 py-16 text-center text-muted">Preparing checkout…</p>
      </Shell>
    );
  }

  if (!lines.length && step !== "waiting") {
    return (
      <Shell>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="display text-5xl">Your bag is empty.</h1>
          <Link to="/shop" search={{ cat: "all", q: "", sort: "featured" }} className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ivory">
            Shop watches
          </Link>
        </div>
      </Shell>
    );
  }

  const amount = quote?.ok ? inr(quote.totalPaise) : "—";

  return (
    <Shell>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">
            {step === "address" ? "Step 1 of 3" : step === "review" ? "Step 2 of 3" : "Step 3 of 3"}
          </p>
          <h1 className="display mt-2 text-5xl">
            {step === "address" ? "Where should it go?" : step === "review" ? "Check the bag." : "Pay with UPI."}
          </h1>

          {step === "address" ? (
            <form className="mt-6 grid gap-4" onSubmit={continueAddress}>
              <Field label="Full name" name="name" value={address.name} onChange={(event) => patch("name", event.target.value)} autoComplete="name" />
              <Field label="Mobile number" name="phone" value={address.phone} onChange={(event) => patch("phone", event.target.value)} inputMode="numeric" autoComplete="tel" />
              <Field label="Address" name="line1" value={address.line1} onChange={(event) => patch("line1", event.target.value)} autoComplete="address-line1" placeholder="House, street, area" />
              <Field label="Landmark" name="line2" value={address.line2} onChange={(event) => patch("line2", event.target.value)} placeholder="Optional" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City" name="city" value={address.city} onChange={(event) => patch("city", event.target.value)} />
                <Field label="PIN code" name="pincode" value={address.pincode} onChange={(event) => patch("pincode", event.target.value)} inputMode="numeric" maxLength={6} />
              </div>
              <SelectField label="State" name="state" value={address.state} onChange={(event) => patch("state", event.target.value)}>
                {STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </SelectField>
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button type="submit">Continue</Button>
            </form>
          ) : null}

          {step === "review" && quote?.ok ? (
            <div className="mt-6 grid gap-4">
              <ul className="grid gap-3">
                {quote.lines.map((line) => (
                  <li key={line.productId} className="flex items-center justify-between gap-3 text-sm">
                    <span>{line.name} × {line.qty}</span>
                    <span className="tabular-nums">{inr(line.linePaise)}</span>
                  </li>
                ))}
              </ul>
              <label className="grid gap-2 text-sm font-medium">
                Coupon
                <input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} className="h-12 rounded-xl border border-line bg-card px-3 uppercase" placeholder="BEYYOND10" />
              </label>
              {quote.couponError ? <Notice tone="danger">{quote.couponError}</Notice> : null}
              <p className="text-sm text-muted">
                {address.name}, {address.line1}, {address.city}, {address.state} {address.pincode}. {address.phone}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="line" onClick={() => setStep("address")}>Edit address</Button>
                <Button onClick={() => setStep("pay")} disabled={Boolean(coupon.trim() && quote.couponError)}>Pay {amount}</Button>
              </div>
            </div>
          ) : null}
          {step === "review" && quote && !quote.ok ? <Notice tone="danger">{quote.error}</Notice> : null}

          {step === "pay" || step === "waiting" ? (
            <div className="mt-6 grid gap-4">
              <p className="text-sm text-muted">
                Send <span className="font-semibold text-ink tabular-nums">{amount}</span> to <span className="font-semibold text-ink">{UPI_ID}</span>. The note should say Beyyond {payRef.current}. The order is placed only after you confirm the payment.
              </p>
              {qr ? <div className="w-fit rounded-2xl bg-card p-3" dangerouslySetInnerHTML={{ __html: qr }} /> : null}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="line" onClick={() => openApp("gpay")}>Google Pay</Button>
                <Button variant="line" onClick={() => openApp("phonepe")}>PhonePe</Button>
                <Button variant="line" onClick={() => openApp("paytm")}>Paytm</Button>
                <Button onClick={() => openApp("upi")}>Any UPI app</Button>
              </div>
              <button type="button" className="justify-self-start text-sm font-semibold" onClick={() => navigator.clipboard?.writeText(UPI_ID)}>
                Copy {UPI_ID}
              </button>
              <Field label="UPI reference" name="utr" value={upiRef} onChange={(event) => setUpiRef(event.target.value)} hint="Optional. Paste the UTR if your app shows one." />
              {error ? <Notice tone="danger">{error}</Notice> : null}
              {step === "waiting" ? <p className="text-sm font-semibold">Finish in your payment app, then confirm here.</p> : null}
              <Button onClick={() => void confirmPaid()} disabled={busy || !quote?.ok}>
                {busy ? "Placing…" : "Payment done — place order"}
              </Button>
            </div>
          ) : null}
        </div>
        <aside className="h-fit rounded-3xl bg-card p-5 lg:col-span-2">
          <h2 className="font-semibold">One payment</h2>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{amount}</p>
          <p className="mt-2 text-sm text-muted">Reference {payRef.current}</p>
          {quote?.ok ? (
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Watches</dt><dd className="tabular-nums">{inr(quote.subtotalPaise)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tabular-nums">− {inr(quote.discountPaise)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{quote.shippingPaise ? inr(quote.shippingPaise) : "Free"}</dd></div>
            </dl>
          ) : null}
        </aside>
      </div>
    </Shell>
  );
}
