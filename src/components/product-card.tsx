import { Link } from "@tanstack/react-router";
import { inr } from "@/lib/shop/money";
import type { Product } from "@/lib/shop/types";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <Link
      to="/watch/$slug"
      params={{ slug: product.slug }}
      className={`rise group grid gap-3 ${index % 5 === 1 ? "d1" : ""} ${index % 5 === 2 ? "d2" : ""} ${index % 5 === 3 ? "d3" : ""} ${index % 5 === 4 ? "d4" : ""}`}
    >
      <div className="overflow-hidden rounded-3xl bg-paper">
        <img
          src={product.image}
          alt={product.name}
          loading={index < 2 ? "eager" : "lazy"}
          className="shot aspect-square w-full object-contain"
        />
      </div>
      <div className="grid gap-1 px-1">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          {product.category === "luxury" ? "Luxury" : "Everyday"} · {product.caseMm}mm
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">{product.name}</h2>
          <p className="shrink-0 text-sm font-semibold tabular-nums">{inr(product.pricePaise)}</p>
        </div>
        <p className="text-sm text-muted">{product.tagline}</p>
      </div>
    </Link>
  );
}
