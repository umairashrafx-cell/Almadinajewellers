import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";

import { Banner, Card, Chip, PageHeading } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  deleteCalculation,
  fetchCalculations,
  saveCalculation,
  type CounterLine,
  type CounterMode,
  type SavedCalculation,
} from "@/lib/admin";

import {
  RATI_PER_TOLA,
  buyingLine,
  carriedRates,
  parseAmount,
  sellingLine,
} from "@/lib/counter-calc";
import { RATE_BOARD, fetchRateSnapshot, rateStampParts } from "@/lib/rates";
import { formatPKR } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/calculator")({
  component: CalculatorScreen,
});

type Mode = CounterMode;

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

/** "16 September 2026 · 3:40 pm", in the shop's clock. */
function stamp(iso: string): string {
  const parts = rateStampParts(iso);
  return parts ? `${parts.date} · ${parts.time}` : "";
}

const SAVED_KEY = ["counter-calculations"] as const;

/**
 * The counter calculator, from the shop's "Gold price calculator" sheet.
 *
 * It is a scratch pad for working out a bill across the counter, so what is
 * typed lives in the page and is gone on refresh. When the figures are worth
 * keeping, Save asks for the customer's name and files a copy with the date
 * and time, listed under the calculator.
 */
function CalculatorScreen() {
  const [mode, setMode] = useState<Mode>("selling");
  const [rows, setRows] = useState<Record<Mode, Row[]>>(() => ({
    selling: blankRows("selling"),
    buying: blankRows("buying"),
  }));
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

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
  const lines = current.map((row, index): CounterLine | null => {
    const weight = parseAmount(row.weight);
    const factor = parseAmount(row.factor);
    const rate = rates[index] ?? null;
    if (weight === null || factor === null || rate === null || weight === 0) return null;
    if (mode === "buying" && factor > RATI_PER_TOLA) return null;

    if (mode === "selling") {
      const line = sellingLine(weight, factor, rate);
      return {
        weight,
        factor,
        rate,
        extra: line.polishGrams,
        billed: line.totalGrams,
        amount: line.amount,
      };
    }
    const line = buyingLine(weight, factor, rate);
    return {
      weight,
      factor,
      rate,
      extra: weight - line.pureGrams,
      billed: line.pureGrams,
      amount: line.amount,
    };
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
                "min-h-12 rounded-md px-6 text-lg font-medium capitalize transition-colors",
                mode === value ? "bg-primary text-ivory" : "text-warmgrey hover:text-primary",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </PageHeading>

      {boardRates.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-base">
          <span className="text-warmgrey">Use today's rate:</span>
          {boardRates.map((rate) => (
            <button
              key={rate.karat}
              type="button"
              onClick={() => applyRate(rate.perTola)}
              className="nums rounded-full border border-gold/40 bg-champagne/20 px-4 py-2 font-medium text-ink transition-colors hover:border-gold hover:bg-gold/20"
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
                <span className="nums text-sm font-semibold uppercase tracking-widest text-warmgrey">
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
                  <Label htmlFor={`weight-${row.id}`} className="text-base text-warmgrey">
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
                    className="nums mt-1.5 h-14 text-2xl md:h-14 md:text-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor={`factor-${row.id}`} className="text-base text-warmgrey">
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
                    className="nums mt-1.5 h-14 text-2xl md:h-14 md:text-2xl"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor={`rate-${row.id}`} className="text-base text-warmgrey">
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
                    className="nums mt-1.5 h-14 text-2xl md:h-14 md:text-2xl"
                  />
                </div>
              </div>

              {kaatTooHigh ? (
                <p className="mt-2 text-base text-destructive">
                  Kaat can't be more than {RATI_PER_TOLA} rati.
                </p>
              ) : null}

              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-gold/15 pt-3 text-lg sm:text-xl">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-warmgrey sm:text-sm">
                    {selling ? "Polish" : "Kaat"}
                  </dt>
                  <dd className="nums mt-0.5">{line ? grams(line.extra) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-warmgrey sm:text-sm">
                    {billedLabel}
                  </dt>
                  <dd className="nums mt-0.5">{line ? grams(line.billed) : "—"}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-xs uppercase tracking-wider text-warmgrey sm:text-sm">
                    Amount
                  </dt>
                  <dd
                    className={cn(
                      "nums mt-0.5 font-display text-xl leading-tight sm:text-3xl",
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
        <Button
          onClick={() => {
            setSavedNote(null);
            setSaving(true);
          }}
          disabled={counted.length === 0}
          className="sm:ml-auto"
        >
          <Save aria-hidden="true" />
          Save
        </Button>
      </div>

      {savedNote ? (
        <Banner tone="ok" className="mt-4">
          {savedNote}
        </Banner>
      ) : null}

      <Card className="mt-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-gold via-champagne to-gold" aria-hidden="true" />
        <dl className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-semibold uppercase tracking-widest text-warmgrey">
              Total weight
            </dt>
            <dd className="nums mt-1 text-3xl">{grams(totals.weight)}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase tracking-widest text-warmgrey">
              {selling ? "With polish" : "24k weight"}
            </dt>
            <dd className="nums mt-1 text-3xl">{grams(totals.billed)}</dd>
          </div>
          <div className="sm:text-right">
            <dt className="text-sm font-semibold uppercase tracking-widest text-warmgrey">
              {selling ? "Customer pays" : "We pay"}
            </dt>
            <dd className="nums mt-1 font-display text-4xl font-light text-primary lg:text-5xl">
              {rupees(totals.amount)}
            </dd>
          </div>
        </dl>
        <p className="border-t border-gold/15 px-5 py-3 text-base text-muted-foreground">
          {counted.length} of {current.length} lines counted. A line is left out until its weight,{" "}
          {selling ? "polish" : "kaat"} and rate are all filled in.
        </p>
      </Card>

      <SaveDialog
        open={saving}
        onOpenChange={setSaving}
        mode={mode}
        lines={counted}
        totals={totals}
        onSaved={(saved) => {
          setSaving(false);
          setSavedNote(`Saved for ${saved.customer_name} on ${stamp(saved.created_at)}.`);
        }}
      />

      <SavedCalculations />
    </>
  );
}

/**
 * Asks whose bill this is, then saves it.
 *
 * The name is all that is asked for: the date and time are stamped by the
 * database when the row is written, so they are the moment it was saved and
 * not whatever the phone's clock says.
 */
function SaveDialog({
  open,
  onOpenChange,
  mode,
  lines,
  totals,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  lines: CounterLine[];
  totals: { weight: number; billed: number; amount: number };
  onSaved: (saved: SavedCalculation) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const save = useMutation({
    mutationFn: () =>
      saveCalculation({
        mode,
        customerName: name,
        lines,
        totalWeight: totals.weight,
        totalBilled: totals.billed,
        totalAmount: totals.amount,
      }),
    onSuccess: async (saved) => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: SAVED_KEY });
      onSaved(saved);
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === "" || save.isPending) return;
    save.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) save.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Save calculation</DialogTitle>
            <DialogDescription>
              {mode === "selling" ? "Selling" : "Buying"} · {lines.length}{" "}
              {lines.length === 1 ? "line" : "lines"} · {rupees(totals.amount)}. Today's date and
              time are saved with it.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Label htmlFor="calc-customer">Customer name</Label>
            <Input
              id="calc-customer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="off"
              autoFocus
              className="mt-1.5 h-12 text-xl md:h-12 md:text-xl"
            />
          </div>

          {save.error ? (
            <Banner tone="error" className="mt-4">
              {save.error.message}
            </Banner>
          ) : null}

          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={name.trim() === "" || save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Every saved bill, newest first, searchable by customer name. */
function SavedCalculations() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const {
    data: saved,
    isPending,
    error,
  } = useQuery({
    queryKey: SAVED_KEY,
    queryFn: fetchCalculations,
  });

  const needle = query.trim().toLowerCase();
  const shown = (saved ?? []).filter((calc) =>
    needle === "" ? true : calc.customer_name.toLowerCase().includes(needle),
  );

  return (
    <section className="mt-12" aria-labelledby="saved-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id="saved-heading" className="font-display text-2xl font-light text-primary">
          Saved calculations
        </h2>
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warmgrey"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer name"
            aria-label="Search saved calculations by customer name"
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <Banner tone="error">{error.message}</Banner>
      ) : isPending ? (
        <p className="text-base text-muted-foreground">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-base text-muted-foreground">
          {needle ? `No saved calculations for “${query.trim()}”.` : "Nothing saved yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((calc) => (
            <SavedItem
              key={calc.id}
              calc={calc}
              open={openId === calc.id}
              onToggle={() => setOpenId((id) => (id === calc.id ? null : calc.id))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SavedItem({
  calc,
  open,
  onToggle,
}: {
  calc: SavedCalculation;
  open: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();
  const selling = calc.mode === "selling";

  const remove = useMutation({
    mutationFn: () => deleteCalculation(calc.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAVED_KEY }),
  });

  function confirmDelete() {
    if (confirm(`Delete the calculation saved for ${calc.customer_name}?`)) remove.mutate();
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-champagne/15"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-lg font-medium text-ink">{calc.customer_name}</span>
            <Chip tone={selling ? "product" : "callback"}>{selling ? "Selling" : "Buying"}</Chip>
          </div>
          <p className="nums mt-1 text-sm text-warmgrey">{stamp(calc.created_at)}</p>
        </div>
        <span className="nums font-display text-2xl text-primary">
          {formatPKR(calc.total_amount_pkr)}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-warmgrey transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="border-t border-gold/15 p-4">
          <div className="overflow-x-auto">
            <table className="nums w-full min-w-[36rem] text-lg">
              <thead>
                <tr className="text-left text-sm uppercase tracking-wider text-warmgrey">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Weight</th>
                  <th className="pb-2 font-medium">{selling ? "Polish/tola" : "Kaat"}</th>
                  <th className="pb-2 font-medium">{selling ? "Total wt" : "24k wt"}</th>
                  <th className="pb-2 font-medium">Rate</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {calc.lines.map((line, index) => (
                  <tr key={index} className="border-t border-gold/10">
                    <td className="py-2 text-warmgrey">{index + 1}</td>
                    <td className="py-2">{grams(line.weight)}</td>
                    <td className="py-2">{selling ? `${line.factor} g` : `${line.factor} rati`}</td>
                    <td className="py-2">{grams(line.billed)}</td>
                    <td className="py-2">{rupees(line.rate)}</td>
                    <td className="py-2 text-right">{rupees(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gold/30 font-medium">
                  <td className="pt-2" />
                  <td className="pt-2">{grams(calc.total_weight_g)}</td>
                  <td className="pt-2" />
                  <td className="pt-2">{grams(calc.total_billed_g)}</td>
                  <td className="pt-2" />
                  <td className="pt-2 text-right text-primary">
                    {formatPKR(calc.total_amount_pkr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {remove.error ? (
            <Banner tone="error" className="mt-3">
              {remove.error.message}
            </Banner>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={confirmDelete}
              disabled={remove.isPending}
              className="text-destructive hover:text-destructive"
            >
              {remove.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
