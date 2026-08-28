import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Banner, Card, PageHeading } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { perGramFromTola, publishRates } from "@/lib/admin";
import { RATE_BOARD, fetchRateSnapshot, formatRateDate, roundRateToHundred } from "@/lib/rates";
import { formatPKR } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/rates")({
  component: RatesScreen,
});

/** Every metal the catalogue prices against, in the order they are shown. */
const KARAT_ROWS: { karat: string; label: string }[] = [
  ...RATE_BOARD.map((r) => ({ karat: r.karat, label: `${r.name} — ${r.mark}` })),
  // Sterling is what the silver pieces are stamped, and it is kept separate
  // from the 999 the board quotes. It is not priced against the rate, but the
  // shop still records it.
  { karat: "925", label: "925 sterling silver" },
];

/** Local calendar date as YYYY-MM-DD. Not UTC — the shop publishes its own day. */
function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Today's rates.
 *
 * Per tola is the figure that gets quoted in the market and the one the shop
 * actually knows each morning, so it is the only thing typed here; per gram is
 * always derived from it. That is the same direction the rate-correction
 * migration settled on, and it stops the two columns drifting apart.
 */
function RatesScreen() {
  const queryClient = useQueryClient();

  const { data: published, isPending } = useQuery({
    queryKey: ["rates", "snapshot"],
    queryFn: fetchRateSnapshot,
  });

  const [rateDate, setRateDate] = useState(todayIso);
  const [tola, setTola] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  /** Prefills the form with what is currently published, ready to be edited. */
  function copyPublished() {
    if (!published) return;
    const next: Record<string, string> = {};
    for (const rate of published.rates) next[rate.karat] = String(rate.perTola);
    setTola(next);
    setStatus(null);
  }

  /**
   * Fills Pathor and Jewellery from the Piece figure by purity ratio.
   *
   * Most days the shop is told one number and the rest follow from it. Silver
   * is not touched: it is a different metal with its own market, not a fraction
   * of the gold rate.
   *
   * Both land on the hundred, rounded down, because a rate reads as a rate
   * rather than as the output of a division.
   */
  function deriveFrom24k() {
    const anchor = Number(tola["24K"]);
    if (!anchor || anchor <= 0) {
      setStatus({ tone: "error", text: "Enter the Piece (24k) per-tola rate first." });
      return;
    }

    setTola((current) => ({
      ...current,
      "23.65K": String(roundRateToHundred((anchor * 23.65) / 24)),
      "22K": String(roundRateToHundred((anchor * 22) / 24)),
    }));
    setStatus(null);
  }

  async function onPublish() {
    setStatus(null);
    setSaving(true);

    try {
      const drafts = KARAT_ROWS.map((row) => ({
        karat: row.karat,
        perTola: Number(tola[row.karat] ?? 0),
      })).filter((d) => Number.isFinite(d.perTola) && d.perTola > 0);

      await publishRates(rateDate, drafts);
      // The homepage band, the rate page and the calculator all read the same
      // snapshot, so refresh everything rather than guessing at keys.
      await queryClient.invalidateQueries();
      setStatus({
        tone: "ok",
        text: `Published ${drafts.length} rates for ${formatRateDate(rateDate)}.`,
      });
    } catch (e) {
      setStatus({ tone: "error", text: e instanceof Error ? e.message : "Could not publish." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Gold rate"
        hint="Type the per-tola rate. Per gram is calculated from it (1 tola = 11.6638 g). Publishing twice in one day corrects that day rather than adding a second set."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="p-6">
          <div className="max-w-xs">
            <Label htmlFor="rate-date">Rate date</Label>
            <Input
              id="rate-date"
              type="date"
              value={rateDate}
              onChange={(e) => setRateDate(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="mt-6 space-y-3">
            {KARAT_ROWS.map((row) => {
              const value = Number(tola[row.karat] ?? 0);
              const filled = value > 0;
              return (
                <div
                  key={row.karat}
                  className={cn(
                    "flex flex-wrap items-center gap-4 rounded-lg border p-3 transition-colors",
                    filled ? "border-gold/40 bg-champagne/20" : "border-gold/15 bg-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "nums grid h-11 w-14 shrink-0 place-items-center rounded-md font-display text-lg",
                      row.karat === "925"
                        ? "bg-muted text-warmgrey"
                        : "bg-gradient-to-br from-gold to-champagne text-primary",
                    )}
                    aria-hidden="true"
                  >
                    {row.karat}
                  </span>

                  <div className="min-w-[10rem] flex-1">
                    <Label htmlFor={`rate-${row.karat}`} className="text-xs text-warmgrey">
                      {row.label} — per tola
                    </Label>
                    <Input
                      id={`rate-${row.karat}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={tola[row.karat] ?? ""}
                      onChange={(e) =>
                        setTola((current) => ({ ...current, [row.karat]: e.target.value }))
                      }
                      className="nums mt-1"
                    />
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-widest text-warmgrey">Per gram</p>
                    <p
                      className={cn(
                        "nums mt-1 font-display text-2xl",
                        filled ? "text-primary" : "text-warmgrey/50",
                      )}
                    >
                      {filled ? perGramFromTola(value).toLocaleString("en-US") : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void onPublish()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Publish rates
            </Button>
            <Button variant="outline" onClick={deriveFrom24k}>
              Fill Pathor & Jewellery from Piece
            </Button>
            <Button variant="outline" onClick={copyPublished} disabled={!published}>
              Start from published
            </Button>
          </div>

          {status ? (
            <div className="mt-4">
              <Banner tone={status.tone}>{status.text}</Banner>
            </div>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Rows left blank are not published — the previous day's figure stands for that metal.
            Existing product prices are not recalculated; they hold the rate they were struck at
            until you edit them.
          </p>
        </Card>

        <Card className="h-fit p-6">
          <h2 className="text-sm font-medium">Currently live</h2>
          {isPending ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : !published ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">{formatRateDate(published.date)}</p>
              <dl className="mt-3 space-y-1 text-sm">
                {published.rates.map((rate) => (
                  <div key={rate.karat} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{rate.karat}</dt>
                    <dd className="nums">{formatPKR(rate.perTola)} / tola</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
