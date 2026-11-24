import { ImageDown, Loader2, Plus, Share2, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { BUY_PURITIES, formatRateDate, type RateSnapshot, type WeightUnit } from "@/lib/rates";
import { renderZakatCard } from "@/lib/share-card";
import { SITE, formatPKR } from "@/lib/site";
import { cn } from "@/lib/utils";

import { AppButton } from "../components/AppButton";
import { Kept } from "../components/Kept";
import type { Cached } from "../lib/cache";
import { shareImage, shareText } from "../lib/share";
import {
  GOLD_NISAB_GRAMS,
  GOLD_NISAB_TOLA,
  SILVER_NISAB_GRAMS,
  SILVER_NISAB_TOLA,
  readAmount,
  zakatFor,
  type ZakatResult,
} from "../lib/zakat";

/**
 * Zakat on what somebody owns, at the shop's rates.
 *
 * Gold and silver are valued off the same board as everything else in the
 * app, through the same functions the gold calculator uses; lib/zakat.ts does
 * the adding up and says why each rule is the rule. This screen only collects
 * the figures and says the answer back, in a form that can be sent to the
 * person who asked.
 *
 * Nothing typed here leaves the phone unless the customer shares it, and
 * nothing is kept once the screen is closed: a list of somebody's savings is
 * not something an app should hold on to without being asked.
 */

type GoldRow = { id: number; amount: string; unit: WeightUnit; purity: string };

const UNITS: { value: WeightUnit; label: string }[] = [
  { value: "tola", label: "Tola" },
  { value: "g", label: "Grams" },
];

export function ZakatScreen({ rates }: { rates: Cached<RateSnapshot> }) {
  const id = useId();
  const [gold, setGold] = useState<GoldRow[]>([{ id: 0, amount: "", unit: "tola", purity: "22K" }]);
  const [silver, setSilver] = useState<{ amount: string; unit: WeightUnit }>({
    amount: "",
    unit: "tola",
  });
  const [money, setMoney] = useState({ cash: "", savings: "", stock: "", owed: "", debts: "" });

  const result = zakatFor(rates.data, {
    gold: gold.map((row) => ({
      amount: readAmount(row.amount),
      unit: row.unit,
      purity: row.purity,
    })),
    silver: { amount: readAmount(silver.amount), unit: silver.unit },
    cash: readAmount(money.cash),
    savings: readAmount(money.savings),
    stock: readAmount(money.stock),
    owed: readAmount(money.owed),
    debts: readAmount(money.debts),
  });

  if (!rates.data || !result) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <p className="max-w-xs text-sm leading-relaxed text-warmgrey">
          Zakat on gold is worked from the day&rsquo;s rates. Open the rate screen once with a
          connection and this will work without one from then on.
        </p>
      </div>
    );
  }

  const snapshot = rates.data;
  const setMoneyField = (key: keyof typeof money) => (value: string) =>
    setMoney((m) => ({ ...m, [key]: value }));

  const updateGold = (rowId: number, patch: Partial<GoldRow>) =>
    setGold((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));

  const metalText = describeMetal(gold, silver);

  return (
    <div className="px-4 pt-6 pb-10">
      <Kept
        stale={rates.stale}
        loading={rates.loading}
        savedAt={rates.savedAt}
        refresh={rates.refresh}
      />

      <h1 className="font-display text-2xl font-light tracking-wide text-primary">
        Zakat calculator
      </h1>
      <div className="hairline mt-5 max-w-24" />
      <p className="mt-4 text-sm leading-relaxed text-ink/80">
        Gold and silver at today&rsquo;s rates from the board, with your cash, savings and business.
        A guide to the sum &mdash; a scholar has the last word on your own case.
      </p>

      <Card title="Gold">
        <ul className="space-y-4">
          {gold.map((row, index) => (
            <li key={row.id} className={cn(index > 0 && "border-t border-gold/15 pt-4")}>
              <div className="flex items-end gap-2">
                <WeightInput
                  id={`${id}-gold-${row.id}`}
                  label={gold.length > 1 ? `Gold ${index + 1}` : "Weight"}
                  value={row.amount}
                  unit={row.unit}
                  onChange={(amount) => updateGold(row.id, { amount })}
                />
                <label className="w-28 shrink-0">
                  <span className={label}>Purity</span>
                  <select
                    value={row.purity}
                    onChange={(e) => updateGold(row.id, { purity: e.target.value })}
                    className={cn(field, "nums h-12 py-0")}
                  >
                    {BUY_PURITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                {gold.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setGold((rows) => rows.filter((r) => r.id !== row.id))}
                    aria-label={`Remove gold ${index + 1}`}
                    className="grid h-12 w-10 shrink-0 place-items-center rounded-xl text-warmgrey active:bg-champagne/40"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
              </div>
              <UnitChoice
                name={`${id}-gold-unit-${row.id}`}
                value={row.unit}
                onChange={(unit) => updateGold(row.id, { unit })}
              />
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() =>
            setGold((rows) => [
              ...rows,
              {
                id: Math.max(...rows.map((r) => r.id)) + 1,
                amount: "",
                unit: "tola",
                purity: "22K",
              },
            ])
          }
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-deep"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add gold of another purity
        </button>

        <p className="mt-3 text-[13px] leading-relaxed text-ink/70">
          Jewellery you wear counts too, in the Hanafi view most families here follow. 21K, 20K and
          18K are worked from the pathor rate, as on the gold calculator.
        </p>
        {result.unpriced > 0 ? (
          <p className="mt-2 text-[13px] text-destructive">
            One of these purities has no rate today, so it is not counted.
          </p>
        ) : null}
      </Card>

      <Card title="Silver">
        <WeightInput
          id={`${id}-silver`}
          label="Weight"
          value={silver.amount}
          unit={silver.unit}
          onChange={(amount) => setSilver((s) => ({ ...s, amount }))}
        />
        <UnitChoice
          name={`${id}-silver-unit`}
          value={silver.unit}
          onChange={(unit) => setSilver((s) => ({ ...s, unit }))}
        />
        <p className="mt-3 text-[13px] leading-relaxed text-ink/70">
          Valued at the board&rsquo;s silver rate.
        </p>
      </Card>

      <Card title="Money">
        <RupeeInput
          id={`${id}-cash`}
          label="Cash in hand"
          value={money.cash}
          onChange={setMoneyField("cash")}
        />
        <RupeeInput
          id={`${id}-savings`}
          label="Savings"
          note="In the bank, a committee or a savings scheme."
          value={money.savings}
          onChange={setMoneyField("savings")}
        />
        <RupeeInput
          id={`${id}-stock`}
          label="Business stock"
          note="At what it would sell for today."
          value={money.stock}
          onChange={setMoneyField("stock")}
        />
        <RupeeInput
          id={`${id}-owed`}
          label="Owed to you"
          note="Money lent that you expect to get back."
          value={money.owed}
          onChange={setMoneyField("owed")}
        />
      </Card>

      <Card title="What you owe">
        <RupeeInput
          id={`${id}-debts`}
          label="Debts due now"
          note="Loans, bills and instalments you have to pay now — not the whole of a long loan."
          value={money.debts}
          onChange={setMoneyField("debts")}
        />
      </Card>

      <Result result={result} snapshot={snapshot} metalText={metalText} />
    </div>
  );
}

/** The answer, on green, with the sum under it and the ways to send it. */
function Result({
  result,
  snapshot,
  metalText,
}: {
  result: ZakatResult;
  snapshot: RateSnapshot;
  metalText: string;
}) {
  const entered = result.total > 0 || result.debts > 0;
  const nisab = nisabLine(result);

  return (
    <section
      aria-label="Your zakat"
      className="card-lift mt-8 overflow-hidden rounded-xl border border-gold/40 bg-primary p-5 text-ivory"
    >
      <dl className="nums divide-y divide-gold/20 text-sm">
        <Line label="Gold" value={formatPKR(result.goldValue)} />
        <Line label="Silver" value={formatPKR(result.silverValue)} />
        <Line label="Cash, savings & business" value={formatPKR(result.moneyValue)} />
        {result.debts > 0 ? (
          <Line label="Less debts" value={`− ${formatPKR(result.debts)}`} />
        ) : null}
        <Line label="Wealth for zakat" value={formatPKR(result.net)} strong />
      </dl>

      <p className="mt-4 text-[13px] leading-relaxed text-champagne/85">{nisab}</p>

      <div className="mt-6 border-t border-gold/25 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          {result.meetsNisab ? "Zakat due" : "No zakat due"}
        </p>
        <p
          aria-live="polite"
          aria-atomic="true"
          className="nums mt-3 font-display text-[44px] leading-none text-rate-gold-light"
        >
          {entered ? (
            <span key={result.zakat} className="value-in inline-block">
              {formatPKR(result.zakat)}
            </span>
          ) : (
            <span className="text-3xl text-champagne/70">Enter what you own</span>
          )}
        </p>
        {result.meetsNisab ? (
          <p className="nums mt-3 text-sm text-champagne/85">2.5% of {formatPKR(result.net)}</p>
        ) : null}
        <p className="mt-3 text-[12px] leading-relaxed text-champagne/75">
          Due once a full lunar year has passed with your wealth at or above the nisab. Gold rate of{" "}
          {formatRateDate(snapshot.date)}.
        </p>
      </div>

      {entered ? <ShareActions result={result} snapshot={snapshot} metalText={metalText} /> : null}
    </section>
  );
}

/** Which nisab was used, how much it is today, and why that one. */
function nisabLine(result: ZakatResult): string {
  const { nisab } = result;
  const figure = formatPKR(nisab.value);

  if (nisab.basis === "mixed") {
    return `Measured against the silver nisab, ${SILVER_NISAB_TOLA} tola (${SILVER_NISAB_GRAMS} g) of silver — ${figure} today. When you own more than gold alone, the lower silver threshold applies, as most scholars in Pakistan hold.`;
  }
  if (nisab.basis === "no-silver-rate") {
    return `The board has no silver rate today, so this is measured against the gold nisab, ${GOLD_NISAB_TOLA} tola (${GOLD_NISAB_GRAMS} g) — ${figure}. With money beside your gold the silver nisab would normally apply, and it is lower.`;
  }
  return `Measured against the gold nisab, ${GOLD_NISAB_TOLA} tola (${GOLD_NISAB_GRAMS} g) of gold — ${figure} for gold like yours today. It applies because you own gold and nothing else; add cash or silver and the lower silver nisab applies instead.`;
}

/** The result in words, for WhatsApp or wherever it is going. */
function shareMessage(result: ZakatResult, snapshot: RateSnapshot, metalText: string): string {
  const nisabName =
    result.nisab.metal === "silver"
      ? `silver, ${SILVER_NISAB_TOLA} tola`
      : `gold, ${GOLD_NISAB_TOLA} tola`;

  return [
    `*Zakat calculation · ${SITE.name}*`,
    `Gold & silver (${metalText}): ${formatPKR(result.goldValue + result.silverValue)}`,
    `Cash, savings & business: ${formatPKR(result.moneyValue)}`,
    result.debts > 0 ? `Less debts: ${formatPKR(result.debts)}` : null,
    `Wealth for zakat: ${formatPKR(result.net)}`,
    `Nisab (${nisabName}): ${formatPKR(result.nisab.value)}`,
    result.meetsNisab
      ? `*Zakat due: ${formatPKR(result.zakat)}* (2.5%)`
      : "*No zakat due* — below the nisab",
    "",
    `At the gold rate of ${formatRateDate(snapshot.date)}. An estimate; a scholar has the last word.`,
    `Worked out in the ${SITE.name} app: ${SITE.playStore}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function ShareActions({
  result,
  snapshot,
  metalText,
}: {
  result: ZakatResult;
  snapshot: RateSnapshot;
  metalText: string;
}) {
  const [busy, setBusy] = useState<"picture" | "text" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const title = "Zakat calculation";
  const text = shareMessage(result, snapshot, metalText);

  async function run(kind: "picture" | "text") {
    setBusy(kind);
    setFailure(null);
    try {
      if (kind === "text") {
        await shareText({ title, text });
      } else {
        const blob = await renderZakatCard({
          rateDate: snapshot.date,
          metalText,
          metalValue: result.goldValue + result.silverValue,
          moneyValue: result.moneyValue,
          moneyNote:
            result.debts > 0 ? `Less debts ${formatPKR(result.debts)}` : "No debts entered",
          zakat: result.zakat,
          label: result.meetsNisab ? "Zakat due" : "No zakat due",
          workings: result.meetsNisab
            ? `2.5% of ${formatPKR(result.net)}`
            : `Below the nisab of ${formatPKR(result.nisab.value)}`,
          note: `${result.nisab.metal === "silver" ? "Silver" : "Gold"} nisab · An estimate, a scholar has the last word`,
        });
        await shareImage({
          blob,
          filename: `al-madina-zakat-${snapshot.date}.jpg`,
          title,
          text: `${title} · ${SITE.name}`,
        });
      }
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "That could not be shared.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 border-t border-gold/25 pt-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">
        Share this calculation
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <AppButton
          variant="gold"
          disabled={busy !== null}
          onClick={() => void run("picture")}
          className="px-3"
        >
          {busy === "picture" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ImageDown className="h-4 w-4" aria-hidden />
          )}
          {busy === "picture" ? "Making…" : "As picture"}
        </AppButton>
        <AppButton
          variant="quiet"
          disabled={busy !== null}
          onClick={() => void run("text")}
          className="px-3"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          As text
        </AppButton>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-champagne/70">
        Only the figures go, not your name. Choose who sees them.
      </p>
      {failure ? (
        <p role="status" className="mt-2 text-xs text-rose-200">
          {failure}
        </p>
      ) : null}
    </div>
  );
}

/** "7.5 tola gold · 10 tola silver", as the weights were typed. */
function describeMetal(gold: GoldRow[], silver: { amount: string; unit: WeightUnit }): string {
  const parts = gold
    .filter((row) => readAmount(row.amount) > 0)
    .map((row) => `${weight(readAmount(row.amount), row.unit)} ${row.purity}`);
  const silverAmount = readAmount(silver.amount);
  if (silverAmount > 0) parts.push(`${weight(silverAmount, silver.unit)} silver`);
  return parts.length ? parts.join(" · ") : "none";
}

function weight(amount: number, unit: WeightUnit): string {
  return `${Number(amount.toFixed(3))} ${unit === "g" ? "g" : "tola"}`;
}

const label = "text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/75";

const field =
  "mt-2 w-full rounded-xl border border-gold/25 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-gold";

const segment =
  "grid h-10 cursor-pointer select-none place-items-center rounded-lg border border-gold/40 bg-white text-xs font-semibold tracking-wide text-ink transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card-lift mt-6 rounded-xl border border-gold/15 bg-ivory p-5">
      <h2 className="font-display mb-3 text-lg text-primary">{title}</h2>
      {children}
    </section>
  );
}

function WeightInput({
  id,
  label: text,
  value,
  unit,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  unit: WeightUnit;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={cn(field, "nums h-12 pr-16 text-base")}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 mt-2 grid place-items-center text-sm text-ink/60">
          {unit === "g" ? "grams" : "tola"}
        </span>
      </div>
    </div>
  );
}

function UnitChoice({
  name,
  value,
  onChange,
}: {
  name: string;
  value: WeightUnit;
  onChange: (unit: WeightUnit) => void;
}) {
  return (
    <fieldset className="mt-2">
      <legend className="sr-only">Unit</legend>
      <div className="grid w-44 grid-cols-2 gap-2">
        {UNITS.map((u) => (
          <label key={u.value} className="relative">
            <input
              type="radio"
              name={name}
              value={u.value}
              checked={value === u.value}
              onChange={() => onChange(u.value)}
              className="peer sr-only"
            />
            <span className={segment}>{u.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RupeeInput({
  id,
  label: text,
  note,
  value,
  onChange,
}: {
  id: string;
  label: string;
  note?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 mt-2 grid place-items-center text-sm text-ink/60">
          Rs.
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          aria-describedby={note ? `${id}-note` : undefined}
          className={cn(field, "nums h-12 pl-12 text-base")}
        />
      </div>
      {note ? (
        <p id={`${id}-note`} className="mt-1.5 text-[12px] leading-relaxed text-warmgrey">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function Line({ label: text, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className={cn("text-champagne/85", strong && "font-semibold text-ivory")}>{text}</dt>
      <dd className={cn("text-right text-ivory", strong && "font-semibold text-gold-light")}>
        {value}
      </dd>
    </div>
  );
}
