import { getProducts } from "@/lib/products";
import { GalleryGrid } from "@/components/GalleryGrid";

export const metadata = {
  title: "Gallery",
  description: "Photos of the cars, SUVs, motorcycles and bikes at Ego Olisa Enterprises.",
};

export default async function Gallery() {
  const items = (await getProducts())
    .filter((p) => p.image_url)
    .map((p) => ({ src: p.image_url!, name: p.name, slug: p.slug, category: p.category }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
      <p className="eyebrow">Gallery</p>
      <h1 className="font-display mt-2 max-w-2xl text-5xl sm:text-6xl">The lot, up close.</h1>
      <p className="mt-4 max-w-xl text-mute">Tap any photo to enlarge it, then jump to the listing.</p>
      <div className="mt-12"><GalleryGrid items={items} /></div>
    </div>
  );
}
