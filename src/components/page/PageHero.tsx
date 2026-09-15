import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { BreadcrumbSchema, type Crumb } from "@/components/seo/BreadcrumbSchema";

/**
 * The dark green band at the top of an inner page: breadcrumb, title and a
 * short introduction, with room for actions beneath.
 *
 * It is the band the existing inner pages draw by hand — same green, same
 * `band-y` rhythm, same 36/48px Cormorant title, same champagne breadcrumb —
 * made once so new pages cannot drift from it. The breadcrumb's structured data
 * comes with it, so a page that shows the trail always describes it too.
 *
 * `trail` is everything after Home; its last entry is the current page.
 */
export function PageHero({
  title,
  intro,
  trail,
  children,
}: {
  title: string;
  intro?: ReactNode;
  trail: Crumb[];
  children?: ReactNode;
}) {
  const parents = trail.slice(0, -1);
  const current = trail.at(-1);

  return (
    <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
      <BreadcrumbSchema trail={trail} />
      <div className="rise-in mx-auto max-w-7xl">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
            <li>
              <Link to="/" className="transition-colors hover:text-gold">
                Home
              </Link>
            </li>
            {parents.map((crumb) => (
              <li key={crumb.path} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <Link to={crumb.path} className="transition-colors hover:text-gold">
                  {crumb.name}
                </Link>
              </li>
            ))}
            {current ? (
              <li aria-current="page" className="flex items-center gap-1.5 text-gold">
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                {current.name}
              </li>
            ) : null}
          </ol>
        </nav>

        <h1 className="mt-6 max-w-3xl font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
          {title}
        </h1>

        {intro ? (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">{intro}</p>
        ) : null}

        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
