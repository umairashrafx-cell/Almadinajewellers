import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { shareOnWhatsApp } from "@/lib/share";

/**
 * Hand something to the phone's share sheet.
 *
 * Not the Web Share API. Android's WebView does not have it — navigator.share
 * is undefined inside this app, checked on the emulator's WebView 113 — so a
 * screen that leans on it opens WhatsApp in a browser tab at best and does
 * nothing at worst. @capacitor/share opens the real system sheet, the one
 * every other app on the phone uses, and a picture goes through it as a file
 * written to the app's cache first, which is what the sheet needs to hand it
 * to WhatsApp, Gmail or the gallery.
 *
 * In a browser — the dev server, nothing a customer runs — the Web Share API
 * where there is one, and WhatsApp or a download where there is not.
 *
 * The plugins are only ever called, never returned. A Capacitor plugin is a
 * Proxy that turns every property read into a native call, and resolving a
 * promise with one reads `.then` on it; see lib/review.ts.
 */

export type Shared = "shared" | "dismissed";

/** Somebody closing the sheet is not a failure worth a word on screen. */
function dismissed(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error);
  // What the Android plugin rejects with when the sheet is closed.
  return /cancel/i.test(message);
}

/** Text, through the sheet. */
export async function shareText({ title, text }: { title: string; text: string }): Promise<Shared> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, dialogTitle: title });
      return "shared";
    }

    if (typeof navigator.share === "function") {
      await navigator.share({ title, text });
      return "shared";
    }

    window.open(shareOnWhatsApp(text), "_blank", "noopener");
    return "shared";
  } catch (error) {
    if (dismissed(error)) return "dismissed";
    throw error;
  }
}

/** The picture as base64, which is how the filesystem plugin takes a file. */
function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("The picture could not be read."));
    reader.readAsDataURL(blob);
  });
}

/** A picture, with a line of text where the receiving app takes one. */
export async function shareImage({
  blob,
  filename,
  title,
  text,
}: {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
}): Promise<Shared> {
  try {
    if (Capacitor.isNativePlatform()) {
      // The cache, not the gallery: nothing is saved on the phone that the
      // customer did not choose to keep, and Android clears it when it needs to.
      const { uri } = await Filesystem.writeFile({
        path: filename,
        data: await base64(blob),
        directory: Directory.Cache,
      });
      await Share.share({ title, text, files: [uri], dialogTitle: title });
      return "shared";
    }

    const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return "shared";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "shared";
  } catch (error) {
    if (dismissed(error)) return "dismissed";
    throw error;
  }
}
