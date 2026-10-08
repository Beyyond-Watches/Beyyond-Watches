import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/chrome";
import { Button } from "@/components/ui";
import { myOrders } from "@/lib/shop/api";
import { inr, when } from "@/lib/shop/money";
import { formatPhone } from "@/lib/shop/phone";
import { useSession } from "@/lib/shop/session";
import type { Order } from "@/lib/shop/types";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

const statusLabel: Record<Order["status"], string> = {
  placed: "Placed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  declined: "Declined",
};

function AccountPage() {
  const session = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!session.ready) return;
    if (!session.customer) {
      setOrders([]);
      return;
    }
    myOrders({ data: { token: session.token() } })
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [session.ready, session.customer, session]);

  if (!session.ready || orders === null) {
    return (
      <Shell>
        <p className="px-4 py-16 text-center text-muted">Loading your account…</p>
      </Shell>
    );
  }

  if (!session.customer) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg px-4 py-16">
          <h1 className="display text-5xl">Your watches, in one place.</h1>
          <p className="mt-3 text-muted">Sign in with your mobile number to see orders.</p>
          <Link to="/login" search={{ next: "/account", admin: false }} className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ivory">
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">Account</p>
            <h1 className="display mt-2 text-5xl">{session.customer.name ?? "Add your name"}</h1>
            <p className="mt-2 text-muted">{formatPhone(session.customer.phone)}</p>
          </div>
          <Button variant="line" onClick={() => void session.signOut()}>Sign out</Button>
        </div>
        {!session.customer.name ? (
          <Link to="/login" search={{ next: "/account", admin: false }} className="mt-4 inline-block text-sm font-semibold">
            Finish your name
          </Link>
        ) : null}
        <h2 className="mt-10 text-lg font-semibold">Orders</h2>
        {!orders.length ? <p className="mt-3 text-sm text-muted">No orders yet.</p> : null}
        <ul className="mt-4 grid gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link to="/order/$id" params={{ id: order.id }} className="block rounded-3xl bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{order.id}</p>
                  <p className="tabular-nums">{inr(order.totalPaise)}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {statusLabel[order.status]} · {when(order.createdAt)} · {order.items.length} {order.items.length === 1 ? "watch" : "watches"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}
