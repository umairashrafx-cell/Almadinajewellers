import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

import { Analytics } from "@/components/layout/Analytics";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { SITE, STORES, shareImageUrl, whatsappLink } from "@/lib/site";

/** Where a lost visitor is most likely to have been heading. */
const RECOVERY_LINKS = [
  { to: "/collections", label: "All collections" },
  { to: "/bridal", label: "Bridal" },
  { to: "/new-arrivals", label: "New arrivals" },
  { to: "/gold-rate", label: "Today's gold rate" },
  { to: "/stores", label: "Visit the shop" },
  { to: "/contact", label: "Contact" },
];

/**
 * A missing page in the house style, with the full navigation attached.
 *
 * Most 404s here will be a mistyped or retired product URL, so this offers the
 * catalogue and the WhatsApp handoff rather than a dead end — the visitor was
 * looking for a specific piece and someone at the shop can find it for them.
 */
function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] uppercase tracking-widest text-gold">Error 404</p>
            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              We could not find that page
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-champagne/80">
              The address may have changed, or the piece you were looking at has been sold. Tell us
              what you were after and we will send photographs and a current price.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ActionLink
                href={whatsappLink(
                  "Assalam-o-Alaikum, I was looking for a piece on your website but the page did not open.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ask on WhatsApp
              </ActionLink>
              <ActionLink variant="ghostLight" href="/collections">
                Browse the catalogue
              </ActionLink>
            </div>
          </div>
        </section>

        <section className="section-y mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-light tracking-wide text-primary">
            Or start from here
          </h2>
          <div className="hairline mx-auto mt-6 max-w-24" />
          <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
            {RECOVERY_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-warmgrey underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs text-warmgrey">
            {SITE.address} · {SITE.whatsappDisplay}
          </p>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Al-Madina Jewellers" },
      {
        name: "description",
        content: "Weighed Honestly, Made Beautifully — fine gold, diamond and silver jewellery.",
      },
      { name: "author", content: "Al-Madina Jewellers" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE.name },
      { property: "og:locale", content: "en_PK" },
      // Set once here so every page has a preview. Pages with a picture of
      // their own — a product, chiefly — override it. Most links to this shop
      // are pasted into WhatsApp, where a card with no image is a bare URL.
      { property: "og:image", content: shareImageUrl() },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${SITE.name} — ${SITE.tagline}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: shareImageUrl() },
      { name: "theme-color", content: "#0B3D2E" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@400;500;600&display=swap",
      },
      // The .ico carries 16/32/48 so browser chrome picks a real size rather
      // than badly downscaling a large PNG.
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * Who this is, sitewide.
 *
 * The individual branches describe themselves as LocalBusiness on /stores;
 * this is the organisation behind them, which is what a search engine ties a
 * knowledge panel and the social profiles to. Rendered in the shell so it is
 * present on every page, server-side, without each route repeating it.
 */
function SiteSchema() {
  const store = STORES[0];

  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE.origin}/#organization`,
      name: SITE.name,
      url: SITE.origin,
      logo: { "@type": "ImageObject", url: `${SITE.origin}/icon-512.png`, width: 512, height: 512 },
      image: shareImageUrl(),
      slogan: SITE.tagline,
      foundingDate: SITE.founded,
      founder: { "@type": "Person", name: SITE.founder },
      telephone: SITE.phones[0],
      address: {
        "@type": "PostalAddress",
        streetAddress: store?.name ?? "Sarafa Market",
        addressLocality: "Mandi Bahauddin",
        addressRegion: "Punjab",
        addressCountry: "PK",
      },
      sameAs: [SITE.instagram, SITE.facebook, SITE.tiktok],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.origin}/#website`,
      url: SITE.origin,
      name: SITE.name,
      publisher: { "@id": `${SITE.origin}/#organization` },
      inLanguage: "en-PK",
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Our own configuration, serialised. No user input reaches it.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/*
          The server sends every revealed section at opacity 0 and JavaScript
          fades it in. With scripting off that second half never happens, so the
          page would render as a blank ivory column. Undo the reveal in that
          case rather than let a decorative animation hide the catalogue.
        */}
        <noscript>
          <style>{".reveal{opacity:1 !important;transform:none !important}"}</style>
        </noscript>
        <SiteSchema />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Keyed on the pathname alone, not the full href: the collection filters and
  // the search overlay must not restart the transition as they change state.
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div key={pathname} className="page-enter">
        <Outlet />
      </div>
      {/* Renders nothing and loads nothing unless the tracking IDs are set. */}
      <Analytics />
    </QueryClientProvider>
  );
}
