import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

import { Card, PageHeading } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  RATI_PER_TOLA,
  buyingLine,
  carriedRates,
  parseAmount,
  sellingLine,
} from "@/lib/counter-calc";
import { RATE_BOARD, fetchRateSnapshot } from "@/lib/rates";
import { formatPKR } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/calculator")({
  component: CalculatorScreen,
});

type Mode = "selling" | "buying";

/**
 * One line of the bill, as typed. Strings, not numbers, so a half-typed "4."
 * survives a render. `factor` is the polish per tola when selling and the kaat
 * in rati when buying — the sheet's second column in either case.
 */
type Row = { id: number; weight: string; factor: string; rate: string };

/** The sheet's own starting values for its second column. */
const DEFAULT_FACTOR: Record<Mode, string> = { selling: "2", buying: "20" };

const EMPTY_ROWS = 3;

let nextId = 1;
const blankRow = (mode: Mode, factor = DEFAULT_FACTOR[mode]): Row => ({
  id: nextId++,
  weight: "",
  factor,
  rate: "",
});
const blankRows = (mode: Mode) => Array.from({ length: EMPTY_ROWS }, () => blankRow(mode));

const grams = (value: number) => `${value.toFixed(3)} g`;
const rupees = (value: number) => formatPKR(Math.round(value));

/**
 * The counter calculator, from the shop's "Gold price calculator" sheet.
 *
 * Nothing here is saved or published. It is a scratch pad for working out a
 * bill across the counter, so it lives in the page and is gone on refresh —
 * the same as closing the sheet without saving.
 */
function CalculatorScreen() {
  const [mode, setMode] = useState<Mode>("selling");
  const [rows, setRows] = useState<Record<Mode, Row[]>>(() => ({
    selling: blankRows("selling"),
    buying: blankRows("buying"),
  }));

  const { data: published } = useQuery({
    queryKey: ["rates", "snapshot"],
    queryFn: fetchRateSnapshot,
  });

  const current = rows[mode];
  const rates = carriedRates(current.map((row) => row.rate));

  function update(id: number, patch: Partial<Omit<Row, "id">>) {
    setRows((all) => ({
      ...all,
      [mode]: all[mode].map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  /** A new line takes the second column from the line above, like the sheet's defaults. */
  function addRow() {
    setRows((all) => {
      const last = all[mode].at(-1);
      return { ...all, [mode]: [...all[mode], blankRow(mode, last?.factor)] };
    });
  }

  function removeRow(id: number) {
    setRows((all) => {
      const remaining = all[mode].filter((row) => row.id !== id);
      return { ...all, [mode]: remaining.length > 0 ? remaining : [blankRow(mode)] };
    });
  }

  function clear() {
    setRows((all) => ({ ...all, [mode]: blankRows(mode) }));
  }

  /** Puts a published rate on the first line; the lines below carry it down. */
  function applyRate(perTola: number) {
    const first = current[0];
    if (first) update(first.id, { rate: String(perTola) });
  }

  // Each line's result, or null while it is missing a figure.
  const lines = current.map((row, index) => {
    const weight = parseAmount(row.weight);
    const factor = parseAmount(row.factor);
    const rate = rates[index] ?? null;
    if (weight === null || factor === null || rate === null || weight === 0) return null;
    if (mode === "buying" && factor > RATI_PER_TOLA) return null;

    if (mode === "selling") {
      const line = sellingLine(weight, factor, rate);
      return { weight, extra: line.polishGrams, billed: line.totalGrams, amount: line.amount };
    }
    const line = buyingLine(weight, factor, rate);
    return { weight, extra: weight - line.pureGrams, billed: line.pureGrams, amount: line.amount };
  });

  const counted = lines.filter((line) => line !== null);
  const totals = counted.reduce(
    (sum, line) => ({
      weight: sum.weight + line.weight,
      billed: sum.billed + line.billed,
      amount: sum.amount + line.amount,
    }),
    { weight: 0, billed: 0, amount: 0 },
  );

  const selling = mode === "selling";
  const factorLabel = selling ? "Polish / tola (g)" : "Kaat (rati / tola)";
  const billedLabel = selling ? "Total weight" : "24k weight";
  // Gold only: silver is on the board too, but nothing here is priced in it.
  const boardRates = RATE_BOARD.flatMap((board) => {
    if (!board.karat.endsWith("K")) return [];
    const rate = published?.rates.find((r) => r.karat === board.karat);
    return rate ? [{ karat: board.karat, name: board.name, perTola: rate.perTola }] : [];
  });

  return (
    <>
      <PageHeading
        title="Calculator"
        hint={
          selling
            ? "Selling: polish is added to the weight at so many grams per tola, and the total is charged at the rate."
            : "Buying: kaat is taken off in rati per tola (96 rati to a tola) to reach the 24k weight, which is paid at the rate."
        }
      >
        <div
          role="tablist"
          aria-label="Calculator"
          className="inline-flex rounded-lg border border-gold/30 bg-card p-1"
        >
          {(["selling", "buying"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "min-h-10 rounded-md px-5 text-sm font-medium capitalize transition-colors",
                mode === value ? "bg-primary text-ivory" : "text-warmgrey hover:text-primary",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </PageHeading>

      {boardRates.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-warmgrey">Use today's rate:</span>
          {boardRates.map((rate) => (
            <button
              key={rate.karat}
              type="button"
              onClick={() => applyRate(rate.perTola)}
              className="nums rounded-full border border-gold/40 bg-champagne/20 px-3 py-1.5 font-medium text-ink transition-colors hover:border-gold hover:bg-gold/20"
            >
              {rate.karat} · {rupees(rate.perTola)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {current.map((row, index) => {
          const line = lines[index];
          const inherited = row.rate.trim() === "" ? rates[index] : null;
          const kaatTooHigh = !selling && (parseAmount(row.factor) ?? 0) > RATI_PER_TOLA;

          return (
            <Card key={row.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="nums text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                  Line {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={`Remove line ${index + 1}`}
                  className="-mr-2 grid h-9 w-9 place-items-center rounded-md text-warmgrey transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Two up on a phone, with the rate under them; one row from sm. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor={`weight-${row.id}`} className="text-xs text-warmgrey">
                    Weight (g)
                  </Label>
                  <Input
                    id={`weight-${row.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={row.weight}
                    onChange={(e) => update(row.id, { weight: e.target.value })}
                    className="nums mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`factor-${row.id}`} className="text-xs text-warmgrey">
                    {factorLabel}
                  </Label>
                  <Input
                    id={`factor-${row.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={selling ? undefined : RATI_PER_TOLA}
                    step="0.01"
                    value={row.factor}
                    onChange={(e) => update(row.id, { factor: e.target.value })}
                    aria-invalid={kaatTooHigh || undefined}
                    className="nums mt-1"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor={`rate-${row.id}`} className="text-xs text-warmgrey">
                    Rate per tola (Rs.)
                  </Label>
                  <Input
                    id={`rate-${row.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    value={row.rate}
                    // A blank rate follows the line above; the placeholder says so.
                    placeholder={inherited ? `${inherited.toLocaleString("en-US")} (same)` : ""}
                    onChange={(e) => update(row.id, { rate: e.target.value })}
                    className="nums mt-1"
                  />
                </div>
              </div>

              {kaatTooHigh ? (
                <p className="mt-2 text-xs text-destructive">
                  Kaat can't be more than {RATI_PER_TOLA} rati.
                </p>
              ) : null}

              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-gold/15 pt-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-warmgrey sm:text-[11px]">
                    {selling ? "Polish" : "Kaat"}
                  </dt>
                  <dd className="nums mt-0.5">{line ? grams(line.extra) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-warmgrey sm:text-[11px]">
                    {billedLabel}
                  </dt>
                  <dd className="nums mt-0.5">{line ? grams(line.billed) : "—"}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-[10px] uppercase tracking-wider text-warmgrey sm:text-[11px]">
                    Amount
                  </dt>
                  <dd
                    className={cn(
                      "nums mt-0.5 font-display text-lg leading-tight",
                      line ? "text-primary" : "text-warmgrey/50",
                    )}
                  >
                    {line ? rupees(line.amount) : "—"}
                  </dd>
                </div>
              </dl>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={addRow}>
          <Plus aria-hidden="true" />
          Add line
        </Button>
        <Button variant="outline" onClick={clear}>
          <RotateCcw aria-hidden="true" />
          Clear
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-gold via-champagne to-gold" aria-hidden="true" />
        <dl className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
              Total weight
            </dt>
            <dd className="nums mt-1 text-xl">{grams(totals.weight)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
              {selling ? "With polish" : "24k weight"}
            </dt>
            <dd className="nums mt-1 text-xl">{grams(totals.billed)}</dd>
          </div>
          <div className="sm:text-right">
            <dt className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
              {selling ? "Customer pays" : "We pay"}
            </dt>
            <dd className="nums mt-1 font-display text-4xl font-light text-primary">
              {rupees(totals.amount)}
            </dd>
          </div>
        </dl>
        <p className="border-t border-gold/15 px-5 py-3 text-xs text-muted-foreground">
          {counted.length} of {current.length} lines counted. A line is left out until its weight,{" "}
          {selling ? "polish" : "kaat"} and rate are all filled in. Nothing on this screen is saved.
        </p>
      </Card>
    </>
  );
}
