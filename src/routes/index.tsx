import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/chrome";
import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/lib/shop/api";
import { shopSearch } from "@/lib/shop/types";

export const Route = createFileRoute("/")({
  loader: () => listProducts(),
  component: Home,
});

function Home() {
  const products = Route.useLoaderData();
  const featured = products.filter((product) => product.featured).slice(0, 4);
  const edit = featured.length ? featured : products.slice(0, 4);

  return (
    <Shell>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
        <div>
          <p className="rise text-xs font-semibold tracking-widest text-muted uppercase">India · Watchroom</p>
          <h1 className="display rise d1 mt-3 text-5xl md:text-7xl">Time, worn beyond the hour.</h1>
          <p className="rise d2 mt-4 max-w-md text-base text-muted">
            Everyday pieces and a quieter luxury, from one Indian desk. Add a few to the bag, pay once by UPI, and we ship them together.
          </p>
          <div className="rise d3 mt-6 flex flex-wrap gap-3">
            <Link to="/shop" search={shopSearch()} className="inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ivory">
              Shop the edit
            </Link>
            <Link to="/shop" search={shopSearch({ cat: "luxury" })} className="inline-flex h-12 items-center rounded-full border border-line bg-card px-5 text-sm font-semibold">
              Luxury
            </Link>
          </div>
        </div>
        <div className="rise d2 grid grid-cols-2 gap-3">
          <Link to="/watch/$slug" params={{ slug: "aurum-chronograph" }} className="col-span-2 overflow-hidden rounded-3xl bg-paper">
            <img src="/watches/aurum.jpg" alt="Aurum Chronograph" className="aspect-square w-full object-cover" />
          </Link>
          <Link to="/watch/$slug" params={{ slug: "coastal-blue" }} className="overflow-hidden rounded-3xl bg-paper">
            <img src="/watches/coastal.jpg" alt="Coastal Blue" className="aspect-square w-full object-cover" />
          </Link>
          <Link to="/watch/$slug" params={{ slug: "heritage-pilot" }} className="overflow-hidden rounded-3xl bg-paper">
            <img src="/watches/pilot.jpg" alt="Heritage Pilot" className="aspect-square w-full object-cover" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="display text-4xl">The edit</h2>
          <Link to="/shop" search={shopSearch()} className="text-sm font-semibold">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {edit.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-3 px-4 py-12 md:grid-cols-2">
        <Link to="/shop" search={shopSearch({ cat: "everyday" })} className="rounded-3xl bg-card p-6">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">From ₹6,750</p>
          <h2 className="display mt-2 text-4xl">Everyday</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">Steel, leather, and dials you can wear to work without a speech.</p>
        </Link>
        <Link to="/shop" search={shopSearch({ cat: "luxury" })} className="rounded-3xl bg-ink p-6 text-ivory">
          <p className="text-xs font-semibold tracking-widest text-ivory/70 uppercase">The slower shelf</p>
          <h2 className="display mt-2 text-4xl">Luxury</h2>
          <p className="mt-2 max-w-sm text-sm text-ivory/75">Chronographs, a skeleton, a GMT. Fewer of them, on purpose.</p>
        </Link>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-4 sm:grid-cols-3">
        <p className="text-sm"><span className="block font-semibold">One UPI payment</span><span className="text-muted">The whole bag is paid together before the order is placed.</span></p>
        <p className="text-sm"><span className="block font-semibold">Free over ₹5,000</span><span className="text-muted">Otherwise shipping is ₹149, anywhere in India.</span></p>
        <p className="text-sm"><span className="block font-semibold">Sign in with your number</span><span className="text-muted">A code, then your name. That is the account.</span></p>
      </section>
    </Shell>
  );
}
