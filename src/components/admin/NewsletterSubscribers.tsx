import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, Loader2, Mail, Trash2 } from "lucide-react";

import { Banner, Card } from "@/components/admin/ui";
import { deleteSubscriber, fetchSubscribers, formatEnquiryDate } from "@/lib/admin";
import { cn } from "@/lib/utils";

const KEY = ["admin", "newsletter"] as const;

/**
 * Everyone who signed up to the newsletter from the home page.
 *
 * Kept below the enquiry inbox rather than in a tab of its own: it is looked at
 * when there is an email to send, not every morning. The whole list copies in
 * one tap, ready to paste into the "To" or "Bcc" line of an email.
 */
export function NewsletterSubscribers() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isPending, error } = useQuery({ queryKey: KEY, queryFn: fetchSubscribers });
  const subscribers = data ?? [];

  const remove = useMutation({
    mutationFn: deleteSubscriber,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  async function copyAll() {
    const list = subscribers.map((s) => s.email).join(", ");
    try {
      await navigator.clipboard.writeText(list);
    } catch {
      // Older browsers and non-secure contexts: fall back to a hidden textarea.
      const area = document.createElement("textarea");
      area.value = list;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-12" aria-labelledby="newsletter-heading">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-enquiry-tint text-enquiry">
            <Mail className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="newsletter-heading" className="font-medium text-ink">
              Newsletter subscribers
            </h2>
            <p className="nums text-sm text-warmgrey">
              {isPending
                ? "Loading…"
                : subscribers.length === 1
                  ? "1 person signed up from the home page"
                  : `${subscribers.length} people signed up from the home page`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyAll()}
              disabled={subscribers.length === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gold/30 px-3 text-sm text-ink transition-colors hover:border-gold hover:text-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {copied ? (
                <Check className="h-4 w-4 text-settled" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy all emails"}
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              disabled={subscribers.length === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gold/30 px-3 text-sm text-ink transition-colors hover:border-gold hover:text-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {open ? "Hide list" : "Show list"}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-5 pb-5">
            <Banner tone="error">{(error as Error).message}</Banner>
          </div>
        ) : null}
        {remove.error ? (
          <div className="px-5 pb-5">
            <Banner tone="error">{(remove.error as Error).message}</Banner>
          </div>
        ) : null}

        {open && subscribers.length > 0 ? (
          <ul className="divide-y divide-gold/15 border-t border-gold/15">
            {subscribers.map((subscriber) => {
              const busy = remove.isPending && remove.variables === subscriber.id;
              return (
                <li key={subscriber.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`mailto:${subscriber.email}`}
                      className="block truncate text-sm text-ink hover:text-primary"
                    >
                      {subscriber.email}
                    </a>
                    <p className="nums text-xs text-warmgrey">
                      {formatEnquiryDate(subscriber.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove ${subscriber.email} from the newsletter list?`)) {
                        remove.mutate(subscriber.id);
                      }
                    }}
                    disabled={busy}
                    aria-label={`Remove ${subscriber.email}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-warmgrey transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>
    </section>
  );
}
