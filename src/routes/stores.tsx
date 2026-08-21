import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Clock, MapPin, MessageCircle, Phone } from "lucide-react";

import storeImage from "@/assets/cat-silver.jpg";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SITE, STORES, directionsUrl, mapEmbedUrl } from "@/lib/site";

export const Route = createFileRoute("/stores")({
  head: () => {
    const store = STORES[0]!;
    const title = `Visit Us — ${store.name}, ${store.city} · ${SITE.name}`;
    const description = `${SITE.name} at ${store.address}. Open ${store.hours}. Call ${store.phones[0]} or message us on WhatsApp.`;
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
                    <img
                      src={storeImage}
                      alt={`${SITE.name}, ${store.name}, ${store.city}`}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />

                    {/* Map */}
                    <div className="mt-6 aspect-[4/3] w-full border border-gold/30">
                      <iframe
                        title={`Map of ${SITE.name}, ${store.name}`}
                        src={mapEmbedUrl(store.mapQuery)}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="h-full w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
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
                      </Detail>

                      <Detail icon={Phone} label="Phone">
                        <ul className="space-y-1">
                          {store.phones.map((phone) => (
                            <li key={phone}>
                              <a
                                href={`tel:${phone.replace(/\s/g, "")}`}
                                className="nums text-ink transition-colors hover:text-gold"
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
                          className="nums text-ink transition-colors hover:text-gold"
                        >
                          {SITE.whatsappDisplay}
                        </a>
                      </Detail>
                    </dl>

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                      <ActionLink
                        href={directionsUrl(store.mapQuery)}
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

/** JewelryStore schema, which is what feeds a Google Business listing. */
function StoreSchema() {
  const store = STORES[0]!;
  const schema = {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    name: SITE.name,
    description: SITE.tagline,
    url: `${SITE.origin}/stores`,
    telephone: store.phones[0],
    founder: { "@type": "Person", name: SITE.founder },
    address: {
      "@type": "PostalAddress",
      streetAddress: store.name,
      addressLocality: store.city,
      addressRegion: "Punjab",
      addressCountry: "PK",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "11:00",
      closes: "20:00",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
