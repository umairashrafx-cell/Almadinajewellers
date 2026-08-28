import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Custom order enquiries.
 *
 * Describing a piece of jewellery in writing is hard, and most people would
 * rather show a photograph or just say it. The form takes a picture, a
 * description, a voice note, or any combination, and insists on at least one.
 *
 * `custom_orders` is newer than the generated Database type, which the platform
 * regenerates and must not be hand-edited, so it is reached through an untyped
 * handle.
 */
const untyped = supabase as unknown as SupabaseClient;

/** Customer uploads live here. Private, unlike the product photography. */
export const CUSTOM_ORDER_BUCKET = "custom-orders";

const PHONE = /^(\+?92|0)?[\s-]?\d{2,4}[\s-]?\d{6,8}$/;

/** 12 MB. Enough for a phone photograph or a minute or two of speech. */
export const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif"];

export const customOrderSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "That name is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on.")
    .max(25, "That number is too long.")
    .regex(PHONE, "Please check the phone number."),
  city: z.string().trim().max(60, "That city name is too long.").optional(),
  categorySlug: z.string().max(60).optional(),
  size: z.string().trim().max(40, "That size is too long.").optional(),
  description: z.string().trim().max(2000, "Please keep it under 2000 characters.").optional(),
});

export type CustomOrderDraft = z.infer<typeof customOrderSchema>;

/**
 * Does this category need a size?
 *
 * Matched on the slug rather than a list of exact names, so a new category
 * called "cocktail-rings" asks the question without anyone remembering to add
 * it here.
 */
export function needsSize(categorySlug: string | undefined): boolean {
  if (!categorySlug) return false;
  // Anchored to a word start, or "earrings" asks for a ring size.
  return /\b(ring|bangle|bracelet)/i.test(categorySlug);
}

/** The wording of the size question, which differs by piece. */
export function sizeLabel(categorySlug: string | undefined): string {
  if (!categorySlug) return "Size";
  if (/\b(bangle|bracelet)/i.test(categorySlug)) return "Bangle size";
  return "Ring size";
}

/**
 * Puts one attachment in the bucket and returns its path.
 *
 * The path is a random uuid under a folder naming what it is, so nothing about
 * the customer is guessable from it and the shop can still tell a photograph
 * from a recording at a glance.
 */
export async function uploadAttachment(
  file: Blob,
  kind: "photo" | "voice",
  extension: string,
): Promise<string> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("That file is too large. Please keep attachments under 12 MB.");
  }

  const path = `${kind}/${crypto.randomUUID()}.${extension}`;

  // exactOptionalPropertyTypes: the option has to be absent, not undefined.
  const { error } = await supabase.storage.from(CUSTOM_ORDER_BUCKET).upload(path, file, {
    ...(file.type ? { contentType: file.type } : {}),
    upsert: false,
  });

  if (error) {
    throw new Error(
      /bucket not found/i.test(error.message)
        ? "Attachments are not set up yet. Please send it to us on WhatsApp instead."
        : "That file could not be uploaded. Please try again, or send it on WhatsApp.",
    );
  }

  return path;
}

export type PlacedCustomOrder = { reference: string };

export async function submitCustomOrder(
  draft: CustomOrderDraft,
  attachments: { imagePath?: string | undefined; voicePath?: string | undefined },
): Promise<PlacedCustomOrder> {
  const hasSomething =
    Boolean(draft.description?.trim()) ||
    Boolean(attachments.imagePath) ||
    Boolean(attachments.voicePath);

  if (!hasSomething) {
    throw new Error("Add a picture, a description or a voice note so we know what to make.");
  }

  const { data, error } = await untyped.rpc("submit_custom_order", {
    p_name: draft.name.trim(),
    p_phone: draft.phone.trim(),
    p_city: draft.city?.trim() || null,
    p_category_slug: draft.categorySlug || null,
    p_size: draft.size?.trim() || null,
    p_description: draft.description?.trim() || null,
    p_image_path: attachments.imagePath ?? null,
    p_voice_path: attachments.voicePath ?? null,
  });

  if (error) {
    throw new Error(
      "We could not send that just now. Please try again, or send it to us on WhatsApp.",
    );
  }

  const reference = typeof data === "string" ? data : null;
  if (!reference) {
    throw new Error("Your enquiry was not confirmed. Please try again, or send it on WhatsApp.");
  }

  return { reference };
}

/**
 * Whether this browser can record.
 *
 * Checked before the button is offered rather than after it is pressed: a
 * record button that fails on tap is worse than one that was never there, and
 * the form has two other ways to say the same thing.
 */
export function canRecordAudio(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/** The first recording format this browser actually supports. */
export function pickAudioFormat(): { mimeType: string; extension: string } | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;

  const candidates: { mimeType: string; extension: string }[] = [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
    // Safari records mp4 and refuses webm entirely.
    { mimeType: "audio/mp4", extension: "m4a" },
    { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  ];

  return candidates.find((c) => MediaRecorder.isTypeSupported(c.mimeType));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
