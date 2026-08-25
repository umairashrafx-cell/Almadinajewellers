import { SITE } from "@/lib/site";

export type Crumb = { name: string; path: string };

/**
 * BreadcrumbList for a page that shows a breadcrumb trail.
 *
 * Product and collection pages already render that trail for people; this is
 * the same trail for a search engine, which is what makes a result read
 * "almadinajeweller.com › Bridal Sets › Mehr Polki Set" rather than a bare URL.
 *
 * Home is prepended here so no caller has to remember it, and positions are
 * one-based because the specification says so.
 */
export function BreadcrumbSchema({ trail }: { trail: Crumb[] }) {
  const items = [{ name: "Home", path: "/" }, ...trail];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE.origin}${crumb.path}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Built from our own routing data, serialised. No user input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
