import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/chrome";
import { Button } from "@/components/ui";
import { getProduct } from "@/lib/shop/api";
import { useCart } from "@/lib/shop/cart";
import { inr } from "@/lib/shop/money";
import { shopSearch } from "@/lib/shop/types";

export const Route = createFileRoute("/watch/$slug")({
  loader: async ({ params }) => {
    const product = await getProduct({ data: { slug: params.slug } });
    if (!product) throw notFound();
    return product;
  },
  notFoundComponent: Missing,
  component: WatchPage,
});

function Missing() {
  return (
    <Shell>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="display text-5xl">That watch has left the tray.</h1>
        <Link to="/shop" search={shopSearch()} className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ivory">
          Browse the edit
        </Link>
      </div>
    </Shell>
  );
}

function WatchPage() {
  const product = Route.useLoaderData();
  const add = useCart((state) => state.add);
  const [qty, setQty] = useState(1);
  const soldOut = product.stock < 1;

  return (
    <Shell>
      <article className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2 md:py-12">
        <div className="overflow-hidden rounded-3xl bg-paper">
          <img src={product.image} alt={product.name} className="aspect-square w-full object-contain" />
        </div>
        <div className="md:py-4">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">
            {product.category === "luxury" ? "Luxury" : "Everyday"} · {product.movement}
          </p>
          <h1 className="display mt-2 text-5xl">{product.name}</h1>
          <p className="mt-3 text-muted">{product.tagline}</p>
          <p className="mt-5 text-2xl font-semibold tabular-nums">{inr(product.pricePaise)}</p>
          <p className="mt-1 text-sm text-muted">Inclusive of GST. {soldOut ? "Sold out." : product.stock <= 3 ? `Only ${product.stock} left.` : `${product.stock} in the tray.`}</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed">{product.description}</p>
          <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-card p-3">
              <dt className="text-xs text-muted">Case</dt>
              <dd className="font-semibold tabular-nums">{product.caseMm}mm</dd>
            </div>
            <div className="rounded-2xl bg-card p-3">
              <dt className="text-xs text-muted">Movement</dt>
              <dd className="font-semibold">{product.movement}</dd>
            </div>
            <div className="rounded-2xl bg-card p-3">
              <dt className="text-xs text-muted">Ships</dt>
              <dd className="font-semibold">India</dd>
            </div>
          </dl>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-12 items-center rounded-full border border-line bg-card">
              <button type="button" className="h-12 w-12" onClick={() => setQty((value) => Math.max(1, value - 1))} aria-label="Fewer">−</button>
              <span className="w-6 text-center tabular-nums">{qty}</span>
              <button type="button" className="h-12 w-12" onClick={() => setQty((value) => Math.min(product.stock, value + 1))} aria-label="More" disabled={soldOut}>+</button>
            </div>
            <Button
              full
              disabled={soldOut}
              onClick={() => {
                add(
                  {
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    pricePaise: product.pricePaise,
                    image: product.image,
                    category: product.category,
                    stock: product.stock,
                  },
                  qty,
                );
                toast.success(`${product.name} is in your bag`);
              }}
            >
              {soldOut ? "Sold out" : "Add to bag"}
            </Button>
          </div>
        </div>
      </article>
    </Shell>
  );
}
