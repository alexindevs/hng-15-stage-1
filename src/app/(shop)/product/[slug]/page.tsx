import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProductMedia, getProducts } from "@/lib/products";
import { formatNaira } from "@/lib/format";
import { FEE_POLICY, inspectionFeeKobo } from "@/lib/site";
import { AddToCart } from "@/components/AddToCart";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductCard } from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Vehicle" };
  return {
    title: p.name,
    description: `${p.name}${p.year ? `, ${p.year}` : ""} for ${formatNaira(p.price_kobo)}. ${p.description}`.slice(0, 200),
    openGraph: { images: p.image_url ? [p.image_url] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const [media, all] = await Promise.all([getProductMedia(p), getProducts()]);
  const related = all.filter((x) => x.slug !== p.slug && x.category === p.category).slice(0, 3);
  const specs: [string, string][] = [
    ["Year", p.year ? String(p.year) : "n/a"],
    ["Mileage", p.mileage_km != null ? `${p.mileage_km.toLocaleString("en-NG")} km` : "n/a"],
    ["Condition", p.condition ?? "n/a"],
    ["Category", p.category],
  ];
  const available = p.stock > 0;
  return (
    <>
      <nav className="mb-6 text-sm text-mute" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-gold">Shop</Link> <span aria-hidden>/</span>{" "}
        <Link href={`/shop?category=${encodeURIComponent(p.category)}`} className="hover:text-gold">{p.category}</Link>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <ProductGallery media={media} name={p.name} />
        <div className="flex flex-col gap-5">
          <div>
            <p className="eyebrow !text-gold">{p.category}</p>
            <h1 className="font-display mt-2 text-4xl sm:text-5xl">{p.name}</h1>
            <p className="mt-3 text-3xl font-semibold text-gold">{formatNaira(p.price_kobo)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
            {specs.map(([k, v]) => (
              <div key={k} className="bg-panel p-4"><dt className="eyebrow">{k}</dt><dd className="mt-1.5">{v}</dd></div>
            ))}
          </dl>
          <p className="leading-relaxed text-mute">{p.description}</p>
          <p className="text-sm">
            {available ? <span className="text-emerald-400">● {p.stock === 1 ? "1 available" : `${p.stock} available`}</span> : <span className="text-red-400">● Sold</span>}
          </p>
          <div className="flex flex-wrap gap-3">
            {available && <Link href={`/book?vehicle=${p.slug}`} className="btn-gold">Book a viewing</Link>}
            <AddToCart product={p} variant="ghost" />
          </div>
          <p className="text-xs text-mute">
            Viewings carry a {formatNaira(inspectionFeeKobo())} inspection fee. {FEE_POLICY} Prefer to buy now? Add it to your cart and check out.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-3xl">More {p.category.toLowerCase()}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => <ProductCard key={r.slug} p={r} />)}
          </div>
        </section>
      )}
    </>
  );
}
