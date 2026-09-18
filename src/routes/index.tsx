import { createFileRoute } from "@tanstack/react-router";

import { fetchCategories, fetchHomeRails } from "@/lib/catalogue";
import { fetchRateSnapshot } from "@/lib/rates";
import { SITE } from "@/lib/site";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { Hero } from "@/components/home/Hero";
import { TrustStrip } from "@/components/home/TrustStrip";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { SignatureBridal } from "@/components/home/SignatureBridal";
import { StorySplit } from "@/components/home/StorySplit";
import { EverydayGold } from "@/components/home/EverydayGold";
import { GoldRateStrip } from "@/components/home/GoldRateStrip";
import { Testimonials } from "@/components/home/Testimonials";
import { NewsletterCta } from "@/components/home/NewsletterCta";

const title = "Al-Madina Jewellers — Weighed Honestly, Made Beautifully";
const description =
  "Hallmarked 22K gold, certified diamond and 925 silver jewellery from Sarafa Market, Mandi Bahauddin. Bridal sets, bangles, rings. Enquire on WhatsApp.";

export const Route = createFileRoute("/")({
  /*
   * The categories, the two rails and today's rate.
   *
   * The front door was assembling itself in the browser: the tiles stood on a
   * bundled fallback list, both rails were skeletons, and the rate band showed
   * placeholders. What the server sent had no link to a single piece on it, so
   * the homepage pointed a crawler at nothing it sells.
   *
   * Each falls back rather than failing. This page has a hero, a story and a
   * newsletter that owe nothing to any of these three, and it should still be
   * a page when the database is having a moment — the sections that come up
   * empty already know how to stand down.
   */
  loader: async () => {
    const [categories, rails, rates] = await Promise.all([
      fetchCategories().catch(() => undefined),
      fetchHomeRails().catch(() => undefined),
      fetchRateSnapshot().catch(() => undefined),
    ]);
    return { categories, rails, rates };
  },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE.origin}/` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE.origin}/` }],
  }),
  component: Home,
});

function Home() {
  const { categories, rails, rates } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header overHero />
      <main>
        <Hero />
        <TrustStrip />
        <CategoryTiles initial={categories} />
        <SignatureBridal initial={rails} />
        <StorySplit />
        <EverydayGold initial={rails} />
        <GoldRateStrip initial={rates} />
        <Testimonials />
        <NewsletterCta />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
