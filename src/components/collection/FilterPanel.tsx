import type { Product } from "@/data/products";
import { formatPKR } from "@/lib/site";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  countFor,
  isDirty,
  optionsFor,
  type Bounds,
  type Filters,
  type Range,
} from "@/lib/filters";

const METAL_LABELS: Record<string, string> = {
  gold: "Gold",
  silver: "Silver",
  diamond: "Diamond",
};

type Props = {
  products: Product[];
  filters: Filters;
  bounds: Bounds;
  onChange: (next: Filters) => void;
  onClear: () => void;
};

function FacetHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">{children}</h3>
  );
}

function CheckboxRow({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const disabled = count === 0 && !checked;

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 py-1.5 text-sm transition-colors",
        disabled ? "cursor-not-allowed text-warmgrey/50" : "text-ink hover:text-primary",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-[var(--gold)]"
      />
      <span className="flex-1">{label}</span>
      <span className="nums text-xs text-warmgrey">{count}</span>
    </label>
  );
}

export function FilterPanel({ products, filters, bounds, onChange, onClear }: Props) {
  const toggle = (facet: "metals" | "karats" | "stones", value: string) => {
    const current = filters[facet];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, [facet]: next });
  };

  const dirty = isDirty(filters, bounds);
  const priceStep = Math.max(1000, Math.round((bounds.price[1] - bounds.price[0]) / 100));

  return (
    <div className="space-y-9">
      <div className="flex items-center justify-between">
        <FacetHeading>Refine</FacetHeading>
        {dirty && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium uppercase tracking-widest text-warmgrey underline underline-offset-4 transition-colors hover:text-gold"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Metal */}
      <div>
        <FacetHeading>Metal</FacetHeading>
        <div className="mt-3">
          {optionsFor(products, "metals").map((m) => (
            <CheckboxRow
              key={m}
              label={METAL_LABELS[m] ?? m}
              count={countFor(products, filters, "metals", m)}
              checked={filters.metals.includes(m)}
              onToggle={() => toggle("metals", m)}
            />
          ))}
        </div>
      </div>

      <div className="hairline" />

      {/* Karat / purity */}
      <div>
        <FacetHeading>Purity</FacetHeading>
        <div className="mt-3">
          {optionsFor(products, "karats").map((k) => (
            <CheckboxRow
              key={k}
              label={k === "925" ? "925 Sterling" : k}
              count={countFor(products, filters, "karats", k)}
              checked={filters.karats.includes(k)}
              onToggle={() => toggle("karats", k)}
            />
          ))}
        </div>
      </div>

      <div className="hairline" />

      {/* Price */}
      <div>
        <FacetHeading>Price</FacetHeading>
        <p className="nums mt-3 text-sm text-ink">
          {formatPKR(filters.price[0])} — {formatPKR(filters.price[1])}
        </p>
        <Slider
          className="mt-5"
          min={bounds.price[0]}
          max={bounds.price[1]}
          step={priceStep}
          value={filters.price}
          onValueChange={(v) => onChange({ ...filters, price: [v[0], v[1]] as Range })}
          aria-label="Price range in rupees"
        />
      </div>

      <div className="hairline" />

      {/* Weight */}
      <div>
        <FacetHeading>Weight</FacetHeading>
        <p className="nums mt-3 text-sm text-ink">
          {filters.weight[0].toFixed(0)} g — {filters.weight[1].toFixed(0)} g
        </p>
        <Slider
          className="mt-5"
          min={bounds.weight[0]}
          max={bounds.weight[1]}
          step={1}
          value={filters.weight}
          onValueChange={(v) => onChange({ ...filters, weight: [v[0], v[1]] as Range })}
          aria-label="Gross weight range in grams"
        />
      </div>

      <div className="hairline" />

      {/* Stones */}
      <div>
        <FacetHeading>Stones</FacetHeading>
        <div className="mt-3">
          {optionsFor(products, "stones").map((s) => (
            <CheckboxRow
              key={s}
              label={s}
              count={countFor(products, filters, "stones", s)}
              checked={filters.stones.includes(s)}
              onToggle={() => toggle("stones", s)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
