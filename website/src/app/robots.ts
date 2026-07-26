import type { MetadataRoute } from "next";

/**
 * Keep the operational surface out of search results.
 *
 * The diagnostic pages and position APIs expose request logs, storage state and
 * import tooling. None of it belongs in an index, and having it crawled is how
 * an internal endpoint becomes a publicly known one.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://matarikiyacht.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/diagnostic/", "/api/", "/studio/", "/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
