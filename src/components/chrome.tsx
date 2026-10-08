import { Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState, type ReactNode } from "react";
import { useCart, useCartHydrated } from "@/lib/shop/cart";
import { formatPhone } from "@/lib/shop/phone";
import { shopSearch } from "@/lib/shop/types";
import { UPI_ID } from "@/lib/shop/upi";
import { useSession } from "@/lib/shop/session";

export function Shell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {bare ? null : <Footer />}
    </div>
  );
}

function Header() {
  const navigate = useNavigate();
  const session = useSession();
  const hydrated = useCartHydrated();
  const count = useCart((state) => state.lines.reduce((sum, line) => sum + line.qty, 0));
  const [query, setQuery] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    void navigate({ to: "/shop", search: shopSearch({ q: query.trim() }) });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="shrink-0 leading-none">
          <span className="display block text-2xl">Beyyond</span>
          <span className="text-xs font-semibold tracking-widest text-muted">WATCHES</span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <Link to="/shop" search={shopSearch({ cat: "everyday" })} className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold">
            Everyday
          </Link>
          <Link to="/shop" search={shopSearch({ cat: "luxury" })} className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold">
            Luxury
          </Link>
          <Link to="/shop" search={shopSearch()} className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold">
            All
          </Link>
        </nav>
        <form onSubmit={search} className="ml-auto hidden min-w-0 flex-1 md:block">
          <label className="sr-only" htmlFor="desk-search">
            Search watches
          </label>
          <input
            id="desk-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the edit"
            className="h-11 w-full rounded-full border border-line bg-card px-4 text-sm outline-none focus:border-ink"
          />
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {session.admin ? (
            <Link to="/admin" className="hidden h-11 items-center px-3 text-sm font-semibold sm:inline-flex">
              Desk
            </Link>
          ) : null}
          <Link to="/account" className="inline-flex h-11 items-center px-3 text-sm font-semibold">
            {session.customer?.name ? session.customer.name.split(" ")[0] : "Account"}
          </Link>
          <Link to="/cart" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-ivory">
            Bag
            <span className="tabular-nums">{hydrated ? count : 0}</span>
          </Link>
        </div>
      </div>
      <form onSubmit={search} className="px-4 pb-3 md:hidden">
        <label className="sr-only" htmlFor="mobile-search">
          Search watches
        </label>
        <input
          id="mobile-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search watches"
          className="h-11 w-full rounded-full border border-line bg-card px-4 text-sm outline-none focus:border-ink"
        />
      </form>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        <Link to="/shop" search={shopSearch({ cat: "everyday" })} className="inline-flex h-10 shrink-0 items-center rounded-full border border-line bg-card px-4 text-sm font-semibold">
          Everyday
        </Link>
        <Link to="/shop" search={shopSearch({ cat: "luxury" })} className="inline-flex h-10 shrink-0 items-center rounded-full border border-line bg-card px-4 text-sm font-semibold">
          Luxury
        </Link>
        <Link to="/shop" search={shopSearch()} className="inline-flex h-10 shrink-0 items-center rounded-full border border-line bg-card px-4 text-sm font-semibold">
          All
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  const session = useSession();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="display text-3xl">Beyyond</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            An Indian watchroom. Everyday steel beside a smaller luxury. Ships across India.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Pay</p>
          <p className="mt-2 text-muted">UPI only</p>
          <p className="mt-1 font-medium tabular-nums">{UPI_ID}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Account</p>
          <div className="mt-2 grid gap-2">
            <Link to="/account" className="text-muted">
              {session.customer ? formatPhone(session.customer.phone) : "Sign in with your number"}
            </Link>
            <Link to="/login" search={{ next: "", admin: false }} className="text-muted">
              Customer login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
