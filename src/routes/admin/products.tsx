import { useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Upload, X } from "lucide-react";

import { Banner, Card, Chip, FieldError, PageHeading, Select } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import {
  KARATS,
  METALS,
  blankProductForm,
  deleteProduct,
  fetchAdminCategories,
  fetchAdminProducts,
  grossWeightFor,
  makingChargesFor,
  productFormSchema,
  productToForm,
  removeProductImage,
  saveProduct,
  slugify,
  toNumber,
  uploadProductImage,
  type AdminCategory,
  type AdminProduct,
  type ProductForm as ProductFormValues,
} from "@/lib/admin";
import { imageFor } from "@/lib/catalogue";
import { fetchRateSnapshot, rateFor } from "@/lib/rates";
import { formatPKR } from "@/lib/site";
import { tracksMetalRate } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/products")({
  component: ProductsScreen,
});

type Editing = { mode: "new" } | { mode: "edit"; row: AdminProduct } | null;

function ProductsScreen() {
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const queryClient = useQueryClient();

  const products = useQuery({ queryKey: ["admin", "products"], queryFn: fetchAdminProducts });
  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: fetchAdminCategories });

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products.data ?? []).filter((p) => {
      if (category && p.category_slug !== category) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products.data, query, category]);

  async function afterSave() {
    setEditing(null);
    await queryClient.invalidateQueries();
  }

  if (editing) {
    return (
      <ProductForm
        key={editing.mode === "edit" ? editing.row.id : "new"}
        row={editing.mode === "edit" ? editing.row : null}
        categories={categories.data ?? []}
        onDone={() => void afterSave()}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <>
      <PageHeading title="Products" hint={`${products.data?.length ?? 0} pieces in the catalogue.`}>
        <Button onClick={() => setEditing({ mode: "new" })} disabled={!categories.data?.length}>
          <Plus aria-hidden="true" />
          Add product
        </Button>
      </PageHeading>

      {products.error ? <Banner tone="error">{(products.error as Error).message}</Banner> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search by name or SKU"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs rounded-lg bg-card"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
        >
          <option value="">All categories</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {products.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-gold/15">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ mode: "edit", row: p })}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-champagne/20"
                >
                  <img
                    src={imageFor(p.image_keys?.[0])}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-lg border border-gold/20 object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-ink">{p.name}</span>
                      <Chip tone={p.metal === "silver" ? "neutral" : "product"}>{p.karat}</Chip>
                      {p.is_new ? <Chip tone="settled">New</Chip> : null}
                      {p.sale_price_pkr != null ? <Chip tone="bridal">Sale</Chip> : null}
                    </span>
                    <span className="nums mt-1 block truncate text-xs text-warmgrey">
                      {p.sku} · {Number(p.gross_weight_g).toFixed(3)} g · {p.stones || "No stones"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="nums block font-display text-lg text-primary">
                      {formatPKR(p.sale_price_pkr ?? p.price_pkr)}
                    </span>
                    {p.sale_price_pkr != null ? (
                      <span className="nums block text-xs text-warmgrey line-through">
                        {formatPKR(p.price_pkr)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 ? (
              <li className="px-4 py-16 text-center text-sm text-warmgrey">
                Nothing matches that.
              </li>
            ) : null}
          </ul>
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

function ProductForm({
  row,
  categories,
  onDone,
  onCancel,
}: {
  row: AdminProduct | null;
  categories: AdminCategory[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /**
   * Storage objects this edit has created or dropped, but which the product row
   * does not yet agree with. Nothing is deleted from the bucket until the form
   * is either saved or abandoned, so a half-finished edit can never leave a
   * live product pointing at an image that has already been removed.
   */
  const uploaded = useRef<string[]>([]);
  const dropped = useRef<string[]>([]);

  const rates = useQuery({ queryKey: ["rates", "snapshot"], queryFn: fetchRateSnapshot });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: row
      ? productToForm(row)
      : blankProductForm(categories[0]?.slug ?? "bridal-sets"),
  });

  const imageKeys = watch("imageKeys") ?? [];
  const making = makingChargesFor(watch());
  const grossWeight = grossWeightFor(watch());
  const discount = toNumber(watch("discountPkr"));
  const listedPrice = toNumber(watch("pricePkr"));

  /*
   * Whether this piece will re-price with the gold rate.
   *
   * catalogue.ts falls back to the stored price when making_charges_pkr is
   * null, and making charges are derived from this panel — so leaving it blank
   * quietly freezes the piece at whatever it was listed at, while the rest of
   * the catalogue moves every morning. That is not something anyone should
   * discover from a customer, so the form says it while there is still time to
   * act on it.
   */
  const metal = watch("metal");
  const tracksRate = tracksMetalRate(metal);
  const willTrackRate = making !== undefined && Boolean(toNumber(watch("netWeightG")));

  async function onSubmit(values: ProductFormValues) {
    setFailure(null);
    try {
      await saveProduct(values, row?.id);
      // The row now matches the form, so the images it no longer references are
      // safe to delete and the ones it does reference are safe to keep.
      await Promise.all(dropped.current.map(removeProductImage));
      dropped.current = [];
      uploaded.current = [];
      onDone();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not save.");
    }
  }

  /** Abandoning the edit takes the unreferenced uploads with it. */
  async function onAbandon() {
    const orphans = uploaded.current;
    uploaded.current = [];
    dropped.current = [];
    onCancel();
    await Promise.all(orphans.map(removeProductImage));
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setFailure(null);
    setUploading(true);

    try {
      const sku = getValues("sku") || getValues("slug") || "unfiled";
      const room = 4 - imageKeys.length;
      const chosen = Array.from(files).slice(0, Math.max(room, 0));

      if (chosen.length === 0) throw new Error("Four images is the maximum.");

      const paths: string[] = [];
      for (const file of chosen) paths.push(await uploadProductImage(file, sku));

      uploaded.current = [...uploaded.current, ...paths];
      setValue("imageKeys", [...imageKeys, ...paths], { shouldValidate: true });
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not upload that image.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function dropImage(key: string) {
    setValue(
      "imageKeys",
      imageKeys.filter((k) => k !== key),
      { shouldValidate: true },
    );

    // Not deleted yet: until this form is saved, the stored product still
    // references this image. It stays in `uploaded` too if it came from this
    // session, so abandoning the edit cleans it up either way.
    dropped.current = [...dropped.current, key];
  }

  /**
   * Fills the price panel from the published rate for this piece's karat.
   * Making charges are whatever is left of the listed price afterwards, which
   * is the invariant the products table enforces.
   */
  function priceFromRate() {
    // getValues returns what the inputs hold, so every number is still a string.
    const values = getValues();
    const rate = rateFor(rates.data, values.karat);

    if (!rate) {
      setFailure(`No published rate for ${values.karat}. Set one on the Gold rate screen first.`);
      return;
    }

    const weight = toNumber(values.netWeightG);
    if (!weight) {
      setFailure("Enter a weight first.");
      return;
    }

    setFailure(null);
    setValue("rateBasisPkrPerG", String(rate.perGram), { shouldValidate: true });
    setValue("metalValuePkr", String(Math.round(weight * rate.perGram)), { shouldValidate: true });
    // A plain gold piece has no stone value, but the panel needs all three
    // parts, so seed it rather than leaving the breakdown half-filled.
    if (toNumber(values.stoneValuePkr) === undefined) {
      setValue("stoneValuePkr", "0", { shouldValidate: true });
    }
  }

  async function onDelete() {
    if (!row) return;
    setDeleting(true);
    try {
      await deleteProduct(row.id);
      onDone();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not delete.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeading title={row ? row.name : "New product"} hint={row ? row.sku : undefined}>
        <Button type="button" variant="outline" onClick={() => void onAbandon()}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
      </PageHeading>

      {failure ? (
        <div className="mb-4">
          <Banner tone="error">{failure}</Banner>
        </div>
      ) : null}

      <div className="space-y-6">
        <Section title="Identity">
          <Field label="Name" error={errors.name?.message} className="sm:col-span-2">
            <Input
              {...register("name")}
              onBlur={(e) => {
                if (!getValues("slug")) setValue("slug", slugify(e.target.value));
              }}
            />
          </Field>

          <Field label="Web address" error={errors.slug?.message} hint="/products/…">
            <Input {...register("slug")} />
          </Field>

          <Field label="SKU" error={errors.sku?.message}>
            <Input {...register("sku")} className="uppercase" />
          </Field>

          <Field
            label="Category"
            error={errors.categorySlug?.message}
            hint="File a piece under the most specific one. A necklace set belongs in its kind — Chokar, Mala, Short or Ghani — and shows on the Necklace Set page as well."
          >
            <Select {...register("categorySlug")}>
              {/*
                Grouped by parent so the four kinds of necklace set read as
                belonging to it, rather than as four more categories sitting
                alongside Rings.
              */}
              {categories
                .filter((c) => !c.parent_slug)
                .map((parent) => {
                  const children = categories.filter((c) => c.parent_slug === parent.slug);
                  return children.length === 0 ? (
                    <option key={parent.slug} value={parent.slug}>
                      {parent.name}
                    </option>
                  ) : (
                    <optgroup key={parent.slug} label={parent.name}>
                      <option value={parent.slug}>{parent.name} — unsorted</option>
                      {children.map((child) => (
                        <option key={child.slug} value={child.slug}>
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
            </Select>
          </Field>
        </Section>

        <Section title="Specification">
          <Field label="Metal" error={errors.metal?.message}>
            <Select {...register("metal")}>
              {METALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Karat" error={errors.karat?.message}>
            <Select {...register("karat")}>
              {KARATS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Net metal weight (g)"
            error={errors.netWeightG?.message}
            hint="What the metal is priced on, and what the piece weighs before polish and stones."
          >
            <Input type="number" step="0.001" {...register("netWeightG")} className="nums" />
          </Field>

          <Field
            label="Polish (g per tola)"
            error={errors.polishGPerTola?.message}
            hint="As it is quoted at the counter. Leave blank for none."
          >
            <Input type="number" step="0.01" {...register("polishGPerTola")} className="nums" />
          </Field>

          <div className="sm:col-span-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Gross weight: </span>
              <span className="nums font-medium text-primary">
                {grossWeight === undefined ? "—" : `${grossWeight.toFixed(3)} g`}
              </span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Calculated, never typed: net metal, plus the stones, plus the polish on each tola of
              net. This is the figure that goes on the bill and on the page.
            </p>
          </div>

          <Field
            label="Stones"
            error={errors.stones?.message}
            hint="Shown on the card, e.g. Emerald & Pearl"
            className="sm:col-span-2"
          >
            <Input {...register("stones")} />
          </Field>

          <Field label="Stone weight (ct)" error={errors.stoneWeightCt?.message}>
            <Input type="number" step="0.01" {...register("stoneWeightCt")} className="nums" />
          </Field>

          <Field label="Dimensions" error={errors.dimensions?.message}>
            <Input {...register("dimensions")} />
          </Field>

          <Field
            label="Ring sizes"
            error={errors.sizes?.message}
            hint="Comma separated. Leave blank if not applicable."
            className="sm:col-span-2"
          >
            <Input {...register("sizes")} placeholder="12, 14, 16, 18" />
          </Field>

          <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
            <textarea
              {...register("description")}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </Field>
        </Section>

        {/*
          One panel, not two. Price, discount and the breakdown were split
          across a "Pricing" section and this one, which meant setting a price
          and explaining it were separate jobs on the same screen. They are the
          same job.
        */}
        <Section
          title="Price"
          hint="Fill metal, stone and rate basis together, or leave all three blank. They print “How this price is calculated” on the product page, and they are what lets the price follow the gold rate."
        >
          <Field label="Price (PKR)" error={errors.pricePkr?.message}>
            <Input type="number" step="1" {...register("pricePkr")} className="nums" />
          </Field>

          <Field
            label="Discount (PKR)"
            error={errors.discountPkr?.message}
            hint="Rupees off, not a percentage. Leave blank for no discount."
          >
            <Input type="number" step="1" {...register("discountPkr")} className="nums" />
          </Field>

          {discount !== undefined && listedPrice !== undefined ? (
            <p className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">After discount: </span>
              <span className="nums font-medium text-primary">
                {formatPKR(Math.max(0, listedPrice - discount))}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                Moves with the rate — the discount stays {formatPKR(discount)}.
              </span>
            </p>
          ) : null}

          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="is-new"
              type="checkbox"
              {...register("isNew")}
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="is-new">Show in New Arrivals</Label>
          </div>

          <Field label="Metal value (PKR)" error={errors.metalValuePkr?.message}>
            <Input type="number" step="1" {...register("metalValuePkr")} className="nums" />
          </Field>

          <Field label="Stone value (PKR)" error={errors.stoneValuePkr?.message}>
            <Input type="number" step="1" {...register("stoneValuePkr")} className="nums" />
          </Field>

          <Field label="Rate basis (PKR / g)" error={errors.rateBasisPkrPerG?.message}>
            <Input type="number" step="1" {...register("rateBasisPkrPerG")} className="nums" />
          </Field>

          <div className="sm:col-span-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Making charges: </span>
              <span
                className={cn("nums", making !== undefined && making < 0 && "text-destructive")}
              >
                {making === undefined ? "—" : formatPKR(making)}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Calculated, never typed: the listed price less metal and stone value. The database
              refuses a product whose three parts do not add up.
            </p>

            {!tracksRate ? (
              <Banner tone="info" className="mt-4">
                Silver is priced as merchandised and does not follow the metal rate, so this piece
                keeps the price you list whatever the panel says.
              </Banner>
            ) : willTrackRate ? (
              <Banner tone="ok" className="mt-4">
                This piece will re-price with the gold rate. Metal value is recalculated each day;
                making charges and stone value stay as listed.
              </Banner>
            ) : (
              <Banner tone="caution" className="mt-4">
                Leave this blank and the piece keeps a fixed price for good — it will not follow the
                gold rate, while the rest of the catalogue does. Fill the three fields, or press
                “Fill from today’s rate”, unless you mean to hold it at this figure.
              </Banner>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={priceFromRate}
              disabled={!rates.data}
            >
              Fill from today's rate
            </Button>
          </div>
        </Section>

        <Section title="Photographs" hint="Two minimum. Square, same lighting, same background.">
          <div className="sm:col-span-2">
            <div className="flex flex-wrap gap-3">
              {imageKeys.map((key) => (
                <div key={key} className="relative">
                  <img
                    src={imageFor(key)}
                    alt=""
                    className="h-24 w-24 border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => dropImage(key)}
                    aria-label="Remove image"
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-border bg-card shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  {!key.includes("/") ? (
                    <span className="mt-1 block text-center text-[10px] text-muted-foreground">
                      placeholder
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              hidden
              onChange={(e) => void onFiles(e.target.files)}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={uploading || imageKeys.length >= 4}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Upload aria-hidden="true" />
              )}
              Upload images
            </Button>

            <FieldError message={errors.imageKeys?.message} />

            <p className="mt-2 text-xs text-muted-foreground">
              JPEG, PNG, WebP or AVIF. Straight off a phone is fine — each photograph is resized and
              re-encoded in the browser before it is uploaded. Removing an uploaded photograph
              deletes it from storage.
            </p>
          </div>
        </Section>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-6">
        <Button type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {row ? "Save changes" : "Create product"}
        </Button>

        <Button type="button" variant="outline" onClick={() => void onAbandon()}>
          Cancel
        </Button>

        {row ? (
          <div className="ml-auto flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-sm text-muted-foreground">Delete for good?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={() => void onDelete()}
                >
                  {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  Yes, delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Form furniture
// ---------------------------------------------------------------------------

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
    <fieldset className="rounded-xl border border-gold/25 bg-card p-6 shadow-[var(--shadow-soft)]">
      <legend className="px-2 font-display text-lg text-primary">{title}</legend>
      {hint ? <p className="mb-5 max-w-2xl text-xs leading-relaxed text-warmgrey">{hint}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint ? <span className="ml-2 text-xs text-warmgrey">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
      <FieldError message={error} />
    </label>
  );
}
