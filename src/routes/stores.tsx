import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Clock, MapPin, MessageCircle, Phone } from "lucide-react";

import storeFront from "@/assets/store-front.webp";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { StoreSchema } from "@/components/seo/StoreSchema";
import { SITE, STORES, directionsUrl, mapEmbedUrl, reviewUrl } from "@/lib/site";

export const Route = createFileRoute("/stores")({
  head: () => {
    const store = STORES[0]!;
    const title = `Visit Us — ${store.name}, ${store.city} · ${SITE.name}`;
    const description = `${SITE.name} at ${store.address}. Open ${store.hours}. ${store.closed}. Call ${store.phones[0]} or message us on WhatsApp.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/stores` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/stores` }],
    };
  },
  component: StoresPage,
});

function StoresPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <StoreSchema />

      <main>
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                <li>
                  <Link to="/" className="transition-colors hover:text-gold">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  Stores
                </li>
              </ol>
            </nav>
            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Visit Us
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">
              Come in and see the pieces in person. The whole range is at the counter, and every
              weight is checked in front of you.
            </p>
          </div>
        </section>

        <section className="band-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {STORES.map((store) => (
              <Reveal key={store.name}>
                <article className="grid gap-10 lg:grid-cols-2 lg:gap-16">
                  <div>
                    {/*
                      The shopfront, which is what a page headed "Visit Us" is
                      for: the one photograph that tells somebody standing in
                      Sarafa Market they have found the right door. It replaces
                      a close-up of a necklace, whose alt had to say outright
                      that it was not the premises.

                      Heavier than what it replaces — 242KB against 38KB — and
                      that is the picture, not the encoding: a lattice screen, a
                      chandelier and four lit cases give a webp encoder very
                      little it can throw away. Re-encoding the supplied file at
                      quality 80 took 405KB down to 242KB with no visible change
                      at 4x magnification on the smallest text in the frame,
                      which is as far as a second lossy pass is worth pushing.
                      It sits below the fold on a secondary page and loads
                      lazily, so the weight falls on somebody who has already
                      decided to come in.
                    */}
                    <img
                      src={storeFront}
                      alt="The Al-Madina Jewellers shopfront in Sarafa Market: a lit glass frontage under a black and gold name board in Urdu and English, with display cases and seating inside"
                      loading="lazy"
                      width={1448}
                      height={1086}
                      className="aspect-[4/3] w-full object-cover"
                    />

                    {/* Map */}
                    <div className="mt-6 aspect-[4/3] w-full border border-gold/30">
                      <iframe
                        title={`Map of ${SITE.name}, ${store.name}`}
                        src={mapEmbedUrl(store.mapEmbedQuery)}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="h-full w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold-deep">
                      {store.city}
                    </p>
                    <h2 className="mt-4 font-display text-3xl font-light tracking-wide text-primary sm:text-4xl">
                      {store.name}
                    </h2>

                    <dl className="mt-8 space-y-6 text-sm">
                      <Detail icon={MapPin} label="Address">
                        <address className="not-italic leading-relaxed text-ink">
                          {store.address}
                        </address>
                      </Detail>

                      <Detail icon={Clock} label="Opening hours">
                        <p className="nums text-ink">{store.hours}</p>
                        <p className="mt-1 text-ink">{store.closed}</p>
                      </Detail>

                      <Detail icon={Phone} label="Phone">
                        <ul className="space-y-1">
                          {store.phones.map((phone) => (
                            <li key={phone}>
                              <a
                                href={`tel:${phone.replace(/\s/g, "")}`}
                                className="nums inline-flex min-h-11 items-center text-ink transition-colors hover:text-gold"
                              >
                                {phone}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </Detail>

                      <Detail icon={MessageCircle} label="WhatsApp">
                        <a
                          href={`https://wa.me/${store.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nums inline-flex min-h-11 items-center text-ink transition-colors hover:text-gold"
                        >
                          {SITE.whatsappDisplay}
                        </a>
                      </Detail>
                    </dl>

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                      <ActionLink
                        href={directionsUrl(store.mapQuery, store.placeId)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get Directions
                      </ActionLink>
                      <ActionLink variant="outline" href="/bridal#consultation">
                        Book a Consultation
                      </ActionLink>
                    </div>

                    <p className="mt-8 text-xs leading-relaxed text-warmgrey">
                      Coming from out of town? Message us before you travel and we will have the
                      pieces you want to see ready at the counter.
                    </p>

                    {/*
                      Aimed at someone who has already bought, so it stays a
                      quiet line rather than a third button competing with the
                      two actions above.
                    */}
                    <p className="mt-4 text-xs leading-relaxed text-warmgrey">
                      Bought from us before?{" "}
                      <a
                        href={reviewUrl(store.placeId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-b border-gold/50 pb-0.5 text-ink transition-colors hover:text-gold"
                      >
                        Leave a review on Google
                      </a>{" "}
                      — it is how families in {store.city} find us.
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden="true" />
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
          {label}
        </dt>
        <dd className="mt-1.5">{children}</dd>
      </div>
    </div>
  );
}
