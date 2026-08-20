import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Banner, PageHeading } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { perGramFromTola, publishRates } from "@/lib/admin";
import { GOLD_KARATS, fetchRateSnapshot, formatRateDate } from "@/lib/rates";
import { formatPKR } from "@/lib/site";

export const Route = createFileRoute("/admin/rates")({
  component: RatesScreen,
});

/** Every metal the catalogue prices against, in the order they are shown. */
const KARAT_ROWS: { karat: string; label: string }[] = [
  ...GOLD_KARATS.map((k) => ({ karat: k, label: `${k} gold` })),
  { karat: "925", label: "925 silver" },
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
   * Fills 22K, 21K and 18K from the 24K figure by purity ratio. Most days the
   * shop is told one number; the rest follow from it arithmetically, and doing
   * it here keeps the four rows internally consistent.
   */
  function deriveFrom24k() {
    const anchor = Number(tola["24K"]);
    if (!anchor || anchor <= 0) {
      setStatus({ tone: "error", text: "Enter the 24K per-tola rate first." });
      return;
    }

    setTola((current) => ({
      ...current,
      "22K": String(Math.round((anchor * 22) / 24)),
      "21K": String(Math.round((anchor * 21) / 24)),
      "18K": String(Math.round((anchor * 18) / 24)),
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
        <div className="rounded-md border border-border bg-card p-4">
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

          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Metal</th>
                <th className="pb-2 font-medium">Per tola (PKR)</th>
                <th className="pb-2 text-right font-medium">Per gram</th>
              </tr>
            </thead>
            <tbody>
              {KARAT_ROWS.map((row) => {
                const value = Number(tola[row.karat] ?? 0);
                return (
                  <tr key={row.karat} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <Label htmlFor={`rate-${row.karat}`}>{row.label}</Label>
                    </td>
                    <td className="py-2 pr-4">
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
                        className="nums max-w-40"
                      />
                    </td>
                    <td className="nums py-2 text-right text-muted-foreground">
                      {value > 0 ? perGramFromTola(value).toLocaleString("en-US") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void onPublish()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Publish rates
            </Button>
            <Button variant="outline" onClick={deriveFrom24k}>
              Fill 22K / 21K / 18K from 24K
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
        </div>

        <aside className="rounded-md border border-border bg-card p-4">
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
        </aside>
      </div>
    </>
  );
}
