import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { siteUrl } from "@/lib/format";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/shop", "/about", "/gallery", "/contact", "/book"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const }));
  const products = (await getProducts()).map((p) => ({ url: `${base}/product/${p.slug}`, changeFrequency: "weekly" as const }));
  return [...pages, ...products];
}
