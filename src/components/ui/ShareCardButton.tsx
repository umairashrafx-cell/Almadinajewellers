import { useState } from "react";
import { Download, ImageDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Makes the picture, then hands it to the phone.
 *
 * Two paths, decided by the device rather than by a setting. A phone gets the
 * native share sheet with the file attached, which is the only way the picture
 * reaches WhatsApp without a trip through the gallery. A desktop browser cannot
 * share a file, so it downloads instead and the shop attaches it themselves.
 *
 * canShare is asked with the actual file, not just for the feature: Safari
 * advertises navigator.share and then refuses payloads containing files, and
 * the difference only shows up when a real one is offered.
 */
type Props = {
  /** Draws the card. Called on click, not on render — it is not free. */
  render: () => Promise<Blob>;
  /** Sent alongside the picture where the platform takes text too. */
  text: string;
  title: string;
  /** Becomes the file name, so it wants to read well in a downloads folder. */
  filename: string;
  className?: string | undefined;
  children?: React.ReactNode;
};

export function ShareCardButton({
  render,
  text,
  title,
  filename,
  className,
  children = "Share as picture",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  async function onClick() {
    setBusy(true);
    setFailure(null);
    setDownloaded(false);

    try {
      const blob = await render();
      const file = new File([blob], filename, { type: "image/jpeg" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text, title });
          return;
        } catch (e) {
          // Dismissing the share sheet is not a failure worth reporting.
          if (e instanceof DOMException && e.name === "AbortError") return;
          // Anything else falls through to the download, which always works.
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoked on the next tick: Safari cancels the download if it goes early.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setDownloaded(true);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "The picture could not be made.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-[2px] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest transition-colors duration-300 disabled:opacity-70",
          className,
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : downloaded ? (
          <Download className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ImageDown className="h-4 w-4" aria-hidden="true" />
        )}
        {busy ? "Making the picture…" : downloaded ? "Saved to your device" : children}
      </button>

      {failure ? (
        <span role="status" className="text-xs text-destructive">
          {failure}
        </span>
      ) : null}
    </span>
  );
}
