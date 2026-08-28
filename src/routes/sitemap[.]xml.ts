import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * products.updated_at is newer than the generated Database type, which the
 * platform regenerates and which must not be hand-edited. Reaching just this
 * one query through an untyped handle keeps the rest of the file typed — the
 * same approach admin.ts and orders.ts take for the tables they added.
 */
const untyped = supabase as unknown as SupabaseClient;

type Entry = { path: string; changefreq: string; priority: string; lastmod?: string };

type ProductRow = { slug: string; created_at: string; updated_at: string | null };

const STATIC_ENTRIES: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/collections", changefreq: "weekly", priority: "0.9" },
  { path: "/bridal", changefreq: "monthly", priority: "0.9" },
  { path: "/new-arrivals", changefreq: "weekly", priority: "0.8" },
  // The rate is republished most mornings, so this is the one page that is
  // genuinely daily.
  { path: "/gold-rate", changefreq: "daily", priority: "0.8" },
  { path: "/sell-your-gold", changefreq: "monthly", priority: "0.8" },
  { path: "/custom-order", changefreq: "monthly", priority: "0.8" },
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

/** The date the shop last published a rate, for /gold-rate's lastmod. */
async function lastRateDate(): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("gold_rates")
    .select("rate_date")
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;
  return data.rate_date.slice(0, 10);
}

async function catalogueEntries(): Promise<Entry[]> {
  const [categories, products] = await Promise.all([
    supabase.from("categories").select("slug").order("sort_order"),
    untyped
      .from("products")
      .select("slug, created_at, updated_at")
      .order("created_at", { ascending: false }),
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
    ...((products.data ?? []) as ProductRow[]).map((p) => ({
      path: `/products/${p.slug}`,
      changefreq: "monthly",
      priority: "0.7",
      /*
       * When the shop last edited this piece — not when the price last moved.
       *
       * Listed prices are rebuilt from the day's gold rate, so in one sense
       * every product page changes every morning. Saying so would mark all
       * forty-nine as modified daily, which is indistinguishable from a site
       * gaming the field, and a crawler that stops trusting lastmod stops
       * using it at all. The rate itself is what changed, and /gold-rate is
       * where that is declared.
       */
      lastmod: (p.updated_at ?? p.created_at).slice(0, 10),
    })),
  ];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [rateDate, catalogue] = await Promise.all([lastRateDate(), catalogueEntries()]);

        const entries = [
          ...STATIC_ENTRIES.map((entry) =>
            entry.path === "/gold-rate" && rateDate ? { ...entry, lastmod: rateDate } : entry,
          ),
          ...catalogue,
        ];

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
