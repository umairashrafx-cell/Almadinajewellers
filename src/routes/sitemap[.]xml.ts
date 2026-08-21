import { createFileRoute } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

/**
 * /sitemap.xml, built from the live catalogue.
 *
 * A static file would go stale the first time a product is added through the
 * admin panel, and the catalogue is the part of this site that most needs
 * indexing — a product page is what someone searching "22K bridal set Mandi
 * Bahauddin" should land on.
 *
 * Pages that carry `robots: noindex` are left out: the wishlist is per-visitor
 * and /admin is staff tooling.
 */

type Entry = { path: string; changefreq: string; priority: string; lastmod?: string };

const STATIC_ENTRIES: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/collections", changefreq: "weekly", priority: "0.9" },
  { path: "/bridal", changefreq: "monthly", priority: "0.9" },
  { path: "/new-arrivals", changefreq: "weekly", priority: "0.8" },
  // The rate is republished most mornings, so this is the one page that is
  // genuinely daily.
  { path: "/gold-rate", changefreq: "daily", priority: "0.8" },
  { path: "/our-story", changefreq: "yearly", priority: "0.5" },
  { path: "/our-story/founder", changefreq: "yearly", priority: "0.5" },
  { path: "/stores", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/policies", changefreq: "yearly", priority: "0.4" },
];

function urlNode(entry: Entry): string {
  return [
    "  <url>",
    `    <loc>${SITE.origin}${entry.path}</loc>`,
    entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function catalogueEntries(): Promise<Entry[]> {
  const [categories, products] = await Promise.all([
    supabase.from("categories").select("slug").order("sort_order"),
    supabase.from("products").select("slug, created_at").order("created_at", { ascending: false }),
  ]);

  // A database hiccup should still produce a valid sitemap of the fixed pages
  // rather than a 500 that Search Console records as a fetch error.
  if (categories.error || products.error) {
    console.error("[sitemap] catalogue query failed", categories.error ?? products.error);
    return [];
  }

  return [
    ...(categories.data ?? []).map((c) => ({
      path: `/collections/${c.slug}`,
      changefreq: "weekly",
      priority: "0.8",
    })),
    ...(products.data ?? []).map((p) => ({
      path: `/products/${p.slug}`,
      changefreq: "monthly",
      priority: "0.7",
      lastmod: p.created_at.slice(0, 10),
    })),
  ];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [...STATIC_ENTRIES, ...(await catalogueEntries())];

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...entries.map(urlNode),
          "</urlset>",
          "",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            // An hour is long enough to absorb crawler traffic and short enough
            // that a product added this morning is listed by lunchtime.
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
