import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/chrome";
import { getMyOrder } from "@/lib/shop/api";
import { inr, when } from "@/lib/shop/money";
import { formatPhone } from "@/lib/shop/phone";
import { useSession } from "@/lib/shop/session";
import type { Order } from "@/lib/shop/types";

export const Route = createFileRoute("/order/$id")({
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const session = useSession();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    if (!session.ready) return;
    if (!session.customer) {
      setOrder(null);
      return;
    }
    getMyOrder({ data: { token: session.token(), id } })
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [session, session.ready, session.customer, id]);

  if (!session.ready || order === undefined) {
    return (
      <Shell>
        <p className="px-4 py-16 text-center text-muted">Loading the order…</p>
      </Shell>
    );
  }

  if (!session.customer) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-muted">Sign in to see this order.</p>
          <Link to="/login" search={{ next: `/order/${id}`, admin: false }} className="mt-4 inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ivory">
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="display text-5xl">We cannot find that order.</h1>
          <Link to="/account" className="mt-4 inline-block text-sm font-semibold">Back to account</Link>
        </div>
      </Shell>
    );
  }

  const fresh = order.status === "placed";

  return (
    <Shell>
      <div className="mx-auto max-w-xl px-4 py-12">
        {fresh ? (
          <div className="done-in">
            <p className="text-xs font-semibold tracking-widest text-ok uppercase">Payment done</p>
            <h1 className="display mt-2 text-5xl">Order placed.</h1>
            <p className="mt-3 text-muted">
              {order.id} is with the watchroom. We match {inr(order.totalPaise)} on UPI before it is packed.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">{order.status}</p>
            <h1 className="display mt-2 text-5xl">{order.id}</h1>
            <p className="mt-3 text-muted">{when(order.createdAt)}</p>
          </div>
        )}
        <ul className="mt-8 grid gap-3">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3">
              <img src={item.image} alt="" className="h-16 w-16 rounded-xl bg-paper object-contain" />
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted">Qty {item.qty}</p>
              </div>
              <p className="tabular-nums">{inr(item.pricePaise * item.qty)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-6 grid gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd className="font-semibold tabular-nums">{inr(order.totalPaise)}</dd></div>
          {order.couponCode ? <div className="flex justify-between"><dt className="text-muted">Coupon</dt><dd>{order.couponCode}</dd></div> : null}
          {order.upiRef ? <div className="flex justify-between"><dt className="text-muted">UPI reference</dt><dd>{order.upiRef}</dd></div> : null}
        </dl>
        <div className="mt-6 text-sm">
          <p className="font-semibold">Delivering to</p>
          <p className="mt-1 text-muted">
            {order.address.name}<br />
            {formatPhone(order.address.phone)}<br />
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ""}<br />
            {order.address.city}, {order.address.state} {order.address.pincode}
          </p>
        </div>
        <Link to="/account" className="mt-8 inline-flex h-12 items-center text-sm font-semibold">
          All orders
        </Link>
      </div>
    </Shell>
  );
}
