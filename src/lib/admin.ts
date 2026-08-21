import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/catalogue";
import { TOLA_IN_GRAMS } from "@/lib/rates";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Data layer for /admin.
 *
 * Every call here goes through the ordinary browser client with the anon key
 * and the signed-in session attached — there is no service-role key on the
 * client. Writes succeed only because the admin_panel migration grants them to
 * rows passing public.is_admin(), so the database, not this file, is what
 * actually enforces who may edit the catalogue.
 */

/**
 * admin_users and is_admin() are newer than the generated Database type, which
 * the platform regenerates and which must not be hand-edited. Reaching just
 * those two through an untyped handle keeps everything else fully typed.
 */
const untyped = supabase as unknown as SupabaseClient;

/**
 * A number, or undefined for anything blank.
 *
 * Form fields hand back strings, and an untouched number input hands back "".
 * Everything numeric in this file is read through here so a blank box never
 * silently becomes 0.
 */
export function toNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (!error) return;

  throw new Error(
    /invalid login credentials/i.test(error.message)
      ? "That email and password do not match an account."
      : error.message,
  );
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Is the signed-in user staff? Answered by the database rather than by anything
 * this bundle could be edited to claim.
 */
export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await untyped.rpc("is_admin");

  if (!error) return data === true;

  // PGRST202 is Postgrest's "function not found in the schema cache", which is
  // what an unapplied migration looks like from here.
  if (error.code === "PGRST202" || /is_admin/i.test(error.message)) {
    throw new Error(
      "The admin_panel migration has not been applied to this database yet, so there is nothing to sign in to.",
    );
  }

  throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Turns a Postgrest error into something the shop can act on. */
function readableError(error: { code?: string; message: string }, context: string): Error {
  // 42501 is Postgres "insufficient privilege" — here, always an RLS refusal.
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return new Error(
      "This account is not allowed to make that change. Sign out and back in, and check it is listed as an administrator.",
    );
  }

  if (error.code === "23505") {
    const field = /slug/i.test(error.message) ? "web address" : "SKU";
    return new Error(`Another product already uses that ${field}.`);
  }

  if (/products_price_parts_sum/i.test(error.message)) {
    return new Error(
      "Metal value, making charges and stone value have to add up to the listed price.",
    );
  }

  return new Error(`${context}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type AdminProduct = Tables<"products">;
export type AdminCategory = Tables<"categories">;

export const METALS = ["gold", "silver", "diamond"] as const;
export const KARATS = ["24K", "22K", "21K", "18K", "925"] as const;

/**
 * Number fields are validated as the strings the DOM actually hands back.
 *
 * Coercing inside the schema would leave the form's input type and its output
 * type disagreeing, which react-hook-form cannot reconcile. Keeping one
 * representation the whole way through and converting once, in formToRow, is
 * both simpler to reason about and what keeps an empty box empty.
 */
const text = z.string().trim();

const isBlank = (v: string) => v === "";
const isNumeric = (v: string) => !isBlank(v) && Number.isFinite(Number(v));

function requiredAmount(label: string, max: number) {
  return text
    .refine((v) => !isBlank(v), `${label} is required.`)
    .refine((v) => isBlank(v) || isNumeric(v), `Enter a number for ${label.toLowerCase()}.`)
    .refine((v) => isBlank(v) || Number(v) > 0, `${label} has to be more than zero.`)
    .refine((v) => isBlank(v) || Number(v) <= max, `That ${label.toLowerCase()} looks wrong.`);
}

const optionalAmount = text
  .refine((v) => isBlank(v) || isNumeric(v), "Enter a number, or leave it blank.")
  .refine((v) => isBlank(v) || Number(v) >= 0, "That cannot be negative.")
  .optional();

export const productFormSchema = z
  .object({
    sku: text
      .min(3, "SKU is too short.")
      .max(40, "SKU is too long.")
      .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only."),
    name: text.min(2, "Please enter a name.").max(80, "That name is too long."),
    slug: text
      .min(2, "Please enter a web address.")
      .max(120, "That web address is too long.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only."),
    categorySlug: z.string().min(1, "Choose a category."),
    metal: z.enum(METALS),
    karat: z.string().min(2, "Choose a karat."),
    grossWeightG: requiredAmount("Gross weight", 5000),
    netWeightG: optionalAmount,
    stones: text.max(120, "That stone description is too long."),
    stoneWeightCt: optionalAmount,
    dimensions: text.max(160, "That is too long.").optional(),
    /** Comma-separated in the form, stored as an array. */
    sizes: text.max(200, "That is too long.").optional(),
    description: text.max(2000, "Please keep it under 2000 characters.").optional(),
    pricePkr: requiredAmount("Price", 100_000_000),
    salePricePkr: optionalAmount,
    isNew: z.boolean(),
    imageKeys: z.array(z.string().min(1)).max(4, "Four images is the maximum."),
    metalValuePkr: optionalAmount,
    stoneValuePkr: optionalAmount,
    rateBasisPkrPerG: optionalAmount,
  })
  .superRefine((v, ctx) => {
    const price = toNumber(v.pricePkr);
    const sale = toNumber(v.salePricePkr);
    const gross = toNumber(v.grossWeightG);
    const net = toNumber(v.netWeightG);

    if (price !== undefined && sale !== undefined && sale >= price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salePricePkr"],
        message: "A sale price has to be below the listed price.",
      });
    }

    if (gross !== undefined && net !== undefined && net > gross) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["netWeightG"],
        message: "Net weight cannot exceed gross weight.",
      });
    }

    // The price panel is all-or-nothing: the database CHECK requires the three
    // parts to sum to the listed price exactly, so a half-filled breakdown
    // would either fail to save or publish a figure that does not add up.
    const parts = [
      toNumber(v.metalValuePkr),
      toNumber(v.stoneValuePkr),
      toNumber(v.rateBasisPkrPerG),
    ];
    const given = parts.filter((p) => p !== undefined).length;

    if (given > 0 && given < parts.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metalValuePkr"],
        message:
          "Fill in metal value, stone value and the rate basis together, or leave all three blank to hide the price panel.",
      });
      return;
    }

    if (given === parts.length && price !== undefined && parts[0]! + parts[1]! > price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metalValuePkr"],
        message:
          "Metal and stone value already exceed the listed price, leaving nothing for making.",
      });
    }
  });

export type ProductForm = z.infer<typeof productFormSchema>;

/** "Mahnoor Jhumar Set" -> "mahnoor-jhumar-set". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Making charges are never entered — they are whatever the price leaves over. */
export function makingChargesFor(values: {
  pricePkr?: unknown;
  metalValuePkr?: unknown;
  stoneValuePkr?: unknown;
}): number | undefined {
  const price = toNumber(values.pricePkr);
  const metal = toNumber(values.metalValuePkr);
  const stone = toNumber(values.stoneValuePkr);

  if (price === undefined || metal === undefined || stone === undefined) return undefined;
  return price - metal - stone;
}

/** A new product starts with empty fields rather than a misleading 0. */
export function blankProductForm(categorySlug: string): ProductForm {
  return {
    sku: "",
    name: "",
    slug: "",
    categorySlug,
    metal: "gold",
    karat: "22K",
    grossWeightG: "",
    netWeightG: "",
    stones: "",
    stoneWeightCt: "",
    dimensions: "",
    sizes: "",
    description: "",
    pricePkr: "",
    salePricePkr: "",
    isNew: true,
    imageKeys: [],
    metalValuePkr: "",
    stoneValuePkr: "",
    rateBasisPkrPerG: "",
  };
}

const asText = (value: number | string | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

export function productToForm(row: AdminProduct): ProductForm {
  return {
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    categorySlug: row.category_slug,
    metal: (METALS as readonly string[]).includes(row.metal)
      ? (row.metal as ProductForm["metal"])
      : "gold",
    karat: row.karat,
    grossWeightG: asText(row.gross_weight_g),
    netWeightG: asText(row.net_weight_g),
    stones: row.stones,
    stoneWeightCt: asText(row.stone_weight_ct),
    dimensions: row.dimensions ?? "",
    sizes: (row.sizes ?? []).join(", "),
    description: row.description ?? "",
    pricePkr: asText(row.price_pkr),
    salePricePkr: asText(row.sale_price_pkr),
    isNew: row.is_new,
    imageKeys: row.image_keys ?? [],
    metalValuePkr: asText(row.metal_value_pkr),
    stoneValuePkr: asText(row.stone_value_pkr),
    rateBasisPkrPerG: asText(row.rate_basis_pkr_per_g),
  };
}

function formToRow(values: ProductForm) {
  const price = toNumber(values.pricePkr) ?? 0;
  const gross = toNumber(values.grossWeightG) ?? 0;
  const metal = toNumber(values.metalValuePkr);
  const stone = toNumber(values.stoneValuePkr);
  const making = makingChargesFor(values);

  return {
    sku: values.sku.trim().toUpperCase(),
    name: values.name.trim(),
    slug: values.slug.trim(),
    category_slug: values.categorySlug,
    metal: values.metal,
    karat: values.karat,
    gross_weight_g: gross,
    // Net weight is what the metal is valued on; gross is the honest default.
    net_weight_g: toNumber(values.netWeightG) ?? gross,
    stones: values.stones.trim(),
    stone_weight_ct: toNumber(values.stoneWeightCt) ?? null,
    dimensions: values.dimensions?.trim() || null,
    sizes: (values.sizes ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    description: values.description?.trim() ?? "",
    price_pkr: Math.round(price),
    sale_price_pkr: toNumber(values.salePricePkr) ?? null,
    is_new: values.isNew,
    image_keys: values.imageKeys,
    metal_value_pkr: metal ?? null,
    making_charges_pkr: making ?? null,
    stone_value_pkr: stone ?? null,
    rate_basis_pkr_per_g: toNumber(values.rateBasisPkrPerG) ?? null,
  };
}

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw readableError(error, "Could not load products");
  return data ?? [];
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");

  if (error) throw readableError(error, "Could not load categories");
  return data ?? [];
}

/** Inserts when `id` is absent, updates that row when it is present. */
export async function saveProduct(values: ProductForm, id?: string): Promise<void> {
  const row = formToRow(values);

  const { error } = id
    ? await supabase.from("products").update(row).eq("id", id)
    : await supabase.from("products").insert(row);

  if (error) throw readableError(error, "Could not save the product");
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw readableError(error, "Could not delete the product");
}

// ---------------------------------------------------------------------------
// Product images
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Sanity bound on what comes off the camera, not a quality limit — anything
 * under this is resized and re-encoded below rather than refused.
 */
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

/** Longest edge after resizing. Ample for a full-width product gallery. */
const MAX_EDGE = 1600;

/** WebP quality. 0.82 is the point where jewellery detail survives and the
 *  file is a fraction of the JPEG it came from. */
const WEBP_QUALITY = 0.82;

export type PreparedImage = { blob: Blob; extension: string; contentType: string };

/**
 * Resizes and re-encodes a photograph for the web before it is uploaded.
 *
 * The shop photographs stock on a phone, and a phone photo is routinely 4–8 MB
 * of 4000px JPEG. Uploading that as-is would put a single image well past the
 * 2 MB-per-page budget the launch checklist sets, on a catalogue whose whole
 * job is to load quickly on Pakistani mobile data.
 *
 * `imageOrientation: "from-image"` is the important part. Phones record
 * portrait shots as landscape pixels plus an EXIF rotation flag; drawing to a
 * canvas discards that flag, so without this every portrait photograph would
 * upload on its side. Bitmap decoding also happens off the main thread, so the
 * panel does not lock up on a 12-megapixel file.
 *
 * Aspect ratio is deliberately preserved. The brief asks the photographer for
 * square shots — that is a decision for whoever frames the picture, and a
 * centre crop applied here would quietly cut the top off a necklace.
 */
export async function prepareProductImage(file: File): Promise<PreparedImage> {
  const fallbackExtension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";

  // Older browsers, or a decode failure on an odd file: upload what we were
  // given rather than refuse it. A large image is worse than a small one, but
  // both are better than a shop that cannot add its own stock.
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return { blob: file, extension: fallbackExtension, contentType: file.type };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { blob: file, extension: fallbackExtension, contentType: file.type };
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) return { blob: file, extension: fallbackExtension, contentType: file.type };

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const encoded = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );

    // Re-encoding a small or already-optimised file can make it bigger. Keep
    // whichever is smaller.
    if (!encoded || encoded.size >= file.size) {
      return { blob: file, extension: fallbackExtension, contentType: file.type };
    }

    return { blob: encoded, extension: "webp", contentType: "image/webp" };
  } finally {
    bitmap.close();
  }
}

/**
 * Uploads one photograph and returns the object path to store in image_keys.
 * The path is derived from the SKU so the bucket stays browsable by product,
 * and carries a random component so re-uploading never overwrites a live image
 * that a cached page is still pointing at.
 */
export async function uploadProductImage(file: File, sku: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Images must be JPEG, PNG, WebP or AVIF.");
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("That file is enormous. Export it under 40 MB and try again.");
  }

  const { blob, extension, contentType } = await prepareProductImage(file);
  const folder = slugify(sku) || "unfiled";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, blob, {
    contentType,
    // Immutable: the random path means a new upload is always a new object.
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw new Error(
      /bucket not found/i.test(error.message)
        ? "The product-images bucket is missing. Apply the admin_panel migration first."
        : `Could not upload that image: ${error.message}`,
    );
  }

  return path;
}

/**
 * Deletes an uploaded photograph. Placeholder keys ("bridal", "rings") are not
 * storage objects, so removing one from a product is only ever a list edit.
 */
export async function removeProductImage(key: string): Promise<void> {
  if (!key.includes("/") || /^https?:\/\//i.test(key)) return;
  await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([key]);
}

// ---------------------------------------------------------------------------
// Gold rates
// ---------------------------------------------------------------------------

export type RateDraft = { karat: string; perTola: number };

/** Per-gram is always derived, never typed, so the two can never disagree. */
export function perGramFromTola(perTola: number): number {
  return Math.round(perTola / TOLA_IN_GRAMS);
}

/**
 * Publishes one day's rates. The table holds one row per karat per day, so this
 * upserts on that pair — saving twice in a day corrects the day rather than
 * adding a second conflicting set.
 */
export async function publishRates(rateDate: string, drafts: RateDraft[]): Promise<void> {
  const rows = drafts
    .filter((d) => d.perTola > 0)
    .map((d) => ({
      rate_date: rateDate,
      karat: d.karat,
      rate_per_tola_pkr: Math.round(d.perTola),
      rate_per_gram_pkr: perGramFromTola(d.perTola),
    }));

  if (rows.length === 0) throw new Error("Enter at least one rate.");

  const { error } = await supabase
    .from("gold_rates")
    .upsert(rows, { onConflict: "rate_date,karat" });

  if (error) throw readableError(error, "Could not publish the rates");
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

export type AdminEnquiry = Tables<"enquiries">;

export async function fetchEnquiries(): Promise<AdminEnquiry[]> {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw readableError(error, "Could not load enquiries");
  return data ?? [];
}

export async function setEnquiryHandled(id: string, handled: boolean): Promise<void> {
  const { error } = await supabase.from("enquiries").update({ handled }).eq("id", id);
  if (error) throw readableError(error, "Could not update that enquiry");
}

/** "21 Aug 2026, 14:05" — enough to tell two same-day enquiries apart. */
export function formatEnquiryDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Digits-only form of a submitted phone number, for a wa.me link. */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
}
