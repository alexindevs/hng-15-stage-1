import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/cart", "/checkout", "/order/", "/orders", "/booking/", "/login"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
