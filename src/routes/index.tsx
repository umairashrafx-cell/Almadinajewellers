import { createFileRoute } from "@tanstack/react-router";

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

const title = "Al-Madina Jewellers — Heirlooms in the Making";
const description =
  "Hallmarked 21K & 22K gold, certified diamond and 925 silver jewellery from Sarafa Market, Mandi Bahauddin. Bridal sets, bangles, rings. Enquire on WhatsApp.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <CategoryTiles />
        <SignatureBridal />
        <StorySplit />
        <EverydayGold />
        <GoldRateStrip />
        <Testimonials />
        <NewsletterCta />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
