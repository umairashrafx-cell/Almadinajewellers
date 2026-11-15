import { useMemo } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, Gem, Loader2, Scale, Tag } from "lucide-react";

import { Banner, Card, PageHeading, StatCard } from "@/components/admin/ui";

import { fetchAdminCategories, fetchAdminProducts, soldOn } from "@/lib/admin";
import { buildStockReport, formatTola, ratePriorTo } from "@/lib/reports";
import type { Group } from "@/lib/reports";
import { fetchKaratSeries, fetchRateSnapshot, formatRateDate, rateFor } from "@/lib/rates";
import type { RatePoint } from "@/lib/rates";
import { formatPKR } from "@/lib/site";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsScreen,
});

/**
 * What the shop owns, what it has sold, and what the rate has done.
 *
 * Every figure is counted from rows the shop already keeps — nothing here is
 * typed in and nothing is stored. A report with its own copy of the numbers is
 * a second place for them to be wrong. The arithmetic lives in `@/lib/reports`
 * so it can be tested; this file is the layout of its results.
 *
 * What is deliberately NOT here: takings and profit. The shop records that a
 * piece sold (`products.sold_at`) but not what was paid for it, and `orders`
 * is empty because the counter is still where money changes hands. A takings
 * figure derived from the list price would read like a sales report and be a
 * guess, so the sold section says what is missing instead of filling it in.
 */

/** The 22K rate is the one the whole catalogue prices against. */
const HEADLINE_KARAT = "22K";

/** How far back the rate chart looks — roughly the quarter the shop has. */
const SERIES_DAYS = 120;

/** A plain line of the rate over time. No axes: the figures beside it say the scale. */
function Sparkline({ series }: { series: RatePoint[] }) {
  const path = useMemo(() => {
    if (series.length < 2) return undefined;

    const values = series.map((point) => point.perTola);
    const low = Math.min(...values);
    const high = Math.max(...values);
    // A flat stretch would divide by zero and draw nothing; 1 draws a line.
    const span = high - low || 1;
    const width = 640;
    const height = 120;
    const pad = 6;

    return series
      .map((point, index) => {
        const x = pad + (index / (series.length - 1)) * (width - pad * 2);
        const y = pad + (1 - (point.perTola - low) / span) * (height - pad * 2);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [series]);

  if (!path) return null;

  return (
    <svg
      viewBox="0 0 640 120"
      preserveAspectRatio="none"
      className="mt-4 h-28 w-full text-gold-deep"
      role="img"
      aria-label={`The ${HEADLINE_KARAT} rate over the last ${series.length} published days`}
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** A titled block. The admin screens are plain surfaces with a heading on top. */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Card className="mt-6 p-5">
      <h2 className="font-display text-xl font-light tracking-wide text-primary">{title}</h2>
      {hint ? <p className="mt-1 text-sm leading-relaxed text-warmgrey">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

/** The shared shape of the two breakdown tables. */
function GroupTable({ groups, heading }: { groups: Group[]; heading: string }) {
  if (groups.length === 0) {
    return <p className="text-sm text-warmgrey">Nothing in stock to break down yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gold/20 text-left text-[11px] uppercase tracking-widest text-warmgrey">
            <th className="pb-2 font-semibold">{heading}</th>
            <th className="pb-2 text-right font-semibold">Pieces</th>
            <th className="pb-2 text-right font-semibold">Gold</th>
            <th className="pb-2 text-right font-semibold">Worth today</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.key} className="border-b border-gold/10 last:border-0">
              <td className="py-2 pr-3 text-ink">{group.label}</td>
              <td className="nums py-2 text-right text-ink">{group.pieces}</td>
              <td className="nums py-2 text-right text-warmgrey">{formatTola(group.grams)}</td>
              <td className="nums py-2 text-right font-medium text-ink">
                {formatPKR(group.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One lookback column: what the rate has done over a window, in rupees and percent. */
function Change({ series, days }: { series: RatePoint[]; days: number }) {
  const latest = series[series.length - 1];
  const prior = ratePriorTo(series, days);
  const change = prior && latest ? latest.perTola - prior.perTola : undefined;
  const percent =
    change !== undefined && prior && prior.perTola > 0 ? (change / prior.perTola) * 100 : undefined;

  return (
    <div className="rounded-lg border border-gold/20 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
        {days} days
      </p>
      <p className="nums mt-1 text-lg text-ink">
        {change === undefined ? "—" : `${change >= 0 ? "+" : "−"}${formatPKR(Math.abs(change))}`}
      </p>
      <p className="mt-1 text-xs text-warmgrey">
        {percent === undefined
          ? "Not that far back yet"
          : `${percent >= 0 ? "+" : "−"}${Math.abs(percent).toFixed(1)}% per tola`}
      </p>
    </div>
  );
}

function ReportsScreen() {
  const products = useQuery({ queryKey: ["admin", "products"], queryFn: fetchAdminProducts });
  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: fetchAdminCategories });
  const snapshot = useQuery({ queryKey: ["rates", "snapshot"], queryFn: fetchRateSnapshot });
  const series = useQuery({
    queryKey: ["rates", "series", HEADLINE_KARAT, SERIES_DAYS],
    queryFn: () => fetchKaratSeries(HEADLINE_KARAT, SERIES_DAYS),
  });

  const categoryNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const category of categories.data ?? []) names.set(category.slug, category.name);
    return names;
  }, [categories.data]);

  const report = useMemo(
    () =>
      buildStockReport(
        products.data ?? [],
        snapshot.data,
        (slug) => categoryNames.get(slug) ?? slug,
      ),
    [products.data, snapshot.data, categoryNames],
  );

  /* The query hands back newest first; the chart and the lookbacks read forwards. */
  const points = useMemo(() => [...(series.data ?? [])].reverse(), [series.data]);
  const headline = rateFor(snapshot.data, HEADLINE_KARAT);

  const failed = products.error ?? snapshot.error ?? categories.error;

  if (failed) {
    return (
      <>
        <PageHeading title="Reports" />
        <Banner tone="error">
          {failed instanceof Error ? failed.message : "Could not load the figures."}
        </Banner>
      </>
    );
  }

  if (products.isPending || snapshot.isPending) {
    return (
      <>
        <PageHeading title="Reports" />
        <p className="flex items-center gap-2 text-sm text-warmgrey">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Counting the stock…
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Reports"
        hint={
          snapshot.data?.date
            ? `Counted from the catalogue, priced at the rate published ${formatRateDate(
                snapshot.data.date,
              )}. Nothing here is typed in or stored.`
            : "Counted from the catalogue. Nothing here is typed in or stored."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stock worth today"
          value={formatPKR(report.value)}
          hint={`${report.forSale.length} pieces for sale`}
          tone="bridal"
          icon={Tag}
        />
        <StatCard
          label="Gold in stock"
          value={formatTola(report.grams)}
          hint={`${report.grams.toFixed(1)} g charged at rate`}
          tone="product"
          icon={Scale}
        />
        <StatCard
          label="Sold"
          value={report.sold.length}
          hint={report.sold.length === 0 ? "Nothing marked sold yet" : "Pieces marked sold, so far"}
          tone="settled"
          icon={Gem}
        />
        <StatCard
          label={`${HEADLINE_KARAT} per tola`}
          value={headline ? formatPKR(headline.perTola) : "—"}
          hint={
            headline ? `Rs. ${headline.perGram.toLocaleString("en-US")} per gram` : "No rate today"
          }
          tone="contact"
          icon={Coins}
        />
      </div>

      {report.fromStored > 0 ? (
        <Banner tone="caution" className="mt-4">
          {report.fromStored} {report.fromStored === 1 ? "piece is" : "pieces are"} priced from the
          figure stored against them rather than today&rsquo;s rate — silver, which the shop prices
          by hand, or a piece with no making charge recorded. Their price is in the total above;
          their weight is not in the gold figure, because no rate was charged on it.
        </Banner>
      ) : null}

      <Section
        title="Where the stock sits"
        hint="The same prices the catalogue quotes, added up by collection. Gold is the weight the rate is charged on, so it leaves out the stones."
      >
        <GroupTable groups={report.byCategory} heading="Collection" />
      </Section>

      <Section title="By metal" hint="Useful once more than gold is on the shelf.">
        <GroupTable groups={report.byMetal} heading="Metal" />
      </Section>

      <Section
        title="What has sold"
        hint="The shop records that a piece sold, not what was paid for it, so there is no takings figure here — that would be a guess from the list price."
      >
        {report.sold.length === 0 ? (
          <p className="text-sm text-warmgrey">
            Nothing marked sold yet. Mark a piece sold on the Products screen and it will appear
            here.
          </p>
        ) : (
          <ul className="divide-y divide-gold/10">
            {report.sold.map((row) => (
              <li key={row.product.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-sm text-ink">
                  {row.product.name}
                  <span className="ml-2 text-xs text-warmgrey">{row.product.sku}</span>
                </span>
                <span className="nums text-sm text-warmgrey">
                  {row.product.sold_at ? soldOn(row.product.sold_at) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`The ${HEADLINE_KARAT} rate`}
        hint={
          points.length > 0
            ? `${points.length} published days, oldest on the left.`
            : "No published history yet."
        }
      >
        {series.isPending ? (
          <p className="flex items-center gap-2 text-sm text-warmgrey">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Reading the history…
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {[7, 30, 90].map((days) => (
                <Change key={days} series={points} days={days} />
              ))}
            </div>
            <Sparkline series={points} />
          </>
        )}
      </Section>
    </>
  );
}
