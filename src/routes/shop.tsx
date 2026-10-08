import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/chrome";
import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/lib/shop/api";
import { shopSearch, type ShopSearch } from "@/lib/shop/types";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => shopSearch({
    cat: search.cat === "everyday" || search.cat === "luxury" ? search.cat : "all",
    q: typeof search.q === "string" ? search.q : "",
    sort: search.sort === "price-asc" || search.sort === "price-desc" ? search.sort : "featured",
  }),
  loader: () => listProducts(),
  component: ShopPage,
});

function ShopPage() {
  const products = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = search.q.trim().toLowerCase();
  const filtered = products
    .filter((product) => (search.cat === "all" ? true : product.category === search.cat))
    .filter((product) =>
      q
        ? `${product.name} ${product.tagline} ${product.movement}`.toLowerCase().includes(q)
        : true,
    )
    .sort((a, b) => {
      if (search.sort === "price-asc") return a.pricePaise - b.pricePaise;
      if (search.sort === "price-desc") return b.pricePaise - a.pricePaise;
      return Number(b.featured) - Number(a.featured);
    });

  function setSearch(partial: Partial<ShopSearch>) {
    void navigate({ search: shopSearch({ ...search, ...partial }) });
  }

  const title = search.cat === "luxury" ? "Luxury" : search.cat === "everyday" ? "Everyday" : "All watches";

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">The edit</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="display text-5xl">{search.q ? `“${search.q}”` : title}</h1>
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Sort
            <select
              value={search.sort}
              onChange={(event) => setSearch({ sort: event.target.value as ShopSearch["sort"] })}
              className="h-11 rounded-xl border border-line bg-card px-3 text-sm text-ink"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low</option>
              <option value="price-desc">Price, high</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(["all", "everyday", "luxury"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSearch({ cat })}
              className={`h-10 rounded-full px-4 text-sm font-semibold ${search.cat === cat ? "bg-ink text-ivory" : "border border-line bg-card"}`}
            >
              {cat === "all" ? "All" : cat === "everyday" ? "Everyday" : "Luxury"}
            </button>
          ))}
        </div>
        {filtered.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3">
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-muted">Nothing matches that. Try another word, or clear the search.</p>
        )}
      </div>
    </Shell>
  );
}
