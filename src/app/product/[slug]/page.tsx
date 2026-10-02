import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products";
import { formatNaira } from "@/lib/format";
import { AddToCart } from "@/components/AddToCart";
import { ProductArt } from "@/components/ProductArt";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  return { title: p?.name ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="aspect-square overflow-hidden border border-line"><ProductArt name={p.name} src={p.image_url} /></div>
      <div className="flex flex-col gap-4">
        <span className="text-xs uppercase tracking-widest text-gold-deep">{p.category}</span>
        <h1 className="font-display text-4xl">{p.name}</h1>
        <p className="text-2xl text-gold">{formatNaira(p.price_kobo)}</p>
        <p className="text-mute">{p.description}</p>
        <p className="text-sm">{p.stock > 0 ? (p.stock === 1 ? "Only 1 available" : `${p.stock} available`) : "Currently sold out"}</p>
        <div><AddToCart product={p} /></div>
      </div>
    </div>
  );
}
