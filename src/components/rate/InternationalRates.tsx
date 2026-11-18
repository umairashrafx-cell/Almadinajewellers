import { useQuery } from "@tanstack/react-query";

import { InternationalBoard, REFRESH_MS } from "@/components/rate/InternationalBoard";
import { InternationalCalendar } from "@/components/rate/InternationalCalendar";
import { InternationalFed } from "@/components/rate/InternationalFed";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { fetchMarketSnapshot } from "@/lib/markets";
import type { MarketSnapshot } from "@/lib/markets";

/**
 * The international section of the app's rate screen, on the website.
 *
 * Three panels in the order the shop asked for them on the phone: the board of
 * world prices, the week's releases that move gold, and the Fed. They all come
 * out of one snapshot, so they are fetched once here and handed down rather
 * than each asking for themselves.
 *
 * Seeded from the route loader, which reads the snapshot on the server. That
 * is the whole point of the prop: this page is the shop's recurring-traffic
 * magnet, and a section that fetched its own figures in the browser would be a
 * section no crawler ever saw — the same mistake the board, the history and the
 * international gold figure above were each fixed for.
 */
export function InternationalRates({ initial }: { initial: MarketSnapshot | null }) {
  const { data } = useQuery({
    queryKey: ["market-snapshot"],
    queryFn: fetchMarketSnapshot,
    /*
     * The server's read, handed over as the first answer. Left undefined when
     * the edge function was unavailable at render time, which puts the section
     * back on the query rather than asserting figures nobody checked.
     */
    initialData: initial ?? undefined,
    /*
     * Half a minute, and only while somebody is looking.
     *
     * The app polls this same function every five seconds, which is right for
     * a screen deliberately opened and watched. This is a public page that
     * search engines crawl and that opens on far more devices than the app
     * does, so the same cadence would spend a visitor's battery and the shop's
     * edge-function quota on a figure most of them did not come for.
     *
     * refetchIntervalInBackground is left at its default of false, so React
     * Query stops the timer entirely while the tab is not focused and starts
     * it again when the reader comes back. A page left open in a background
     * tab all afternoon costs nothing.
     */
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    // One retry. A board that cannot be fetched is not worth hammering for,
    // and the figures already on screen stay there.
    retry: 1,
  });

  const snapshot = data ?? null;

  /*
   * Nothing at all rather than an empty frame. If the edge function is down
   * both on the server and in the browser there is no honest version of this
   * section, and the shop's own rates above it are the part of the page that
   * matters.
   */
  if (!snapshot) return null;

  return (
    <section
      id="international-rates"
      className="section-y scroll-mt-24 bg-champagne/15 px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          strong
          eyebrow="Reference board · indicative"
          title="International Rates"
          description="What gold, silver and the dollar are doing in the world markets — the same board our Android app shows. None of this is our counter rate; it is the context behind it."
        />

        <InternationalBoard snapshot={snapshot} />
        <InternationalCalendar calendar={snapshot.calendar} />
        <InternationalFed fed={snapshot.fed} />
      </div>
    </section>
  );
}
