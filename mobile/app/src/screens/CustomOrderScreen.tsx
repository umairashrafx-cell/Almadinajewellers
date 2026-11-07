import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { categoryTree, fetchCategories, type Category } from "@/lib/catalogue";
import {
  IMAGE_TYPES,
  customOrderSchema,
  needsSize,
  sizeLabel,
  submitCustomOrder,
  uploadAttachment,
} from "@/lib/custom-orders";
import { whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

import { AppButton, AppLink } from "../components/AppButton";
import { CATEGORIES_KEY, useCached } from "../lib/cache";
import { openShop } from "../lib/shop";

/**
 * Have something made, from inside the app.
 *
 * The same enquiry the website takes, through the same door: `customOrderSchema`
 * decides what a valid enquiry is, `uploadAttachment` puts the picture in the
 * same private bucket, and `submit_custom_order` is the same RPC, so an enquiry
 * sent here arrives in the shop's list indistinguishable from one sent on a
 * desktop and carries the same kind of reference. Nothing was added to the
 * database for this screen and nothing here works a rule out for itself.
 *
 * Two deliberate differences from that page.
 *
 * The voice note is not here. The website offers one because a browser that can
 * record says so and can be taken at its word; this app's manifest asks for no
 * microphone, so `getUserMedia` would be refused on a real phone and the button
 * would fail under a thumb — which the website's own recorder has a comment
 * about, and it is right. In its place is the WhatsApp line, which is where the
 * shop's voice notes actually arrive. Putting the recorder in the app is a
 * decision about what the Play Store listing says this app wants, and that is
 * the shop's to make, not this screen's.
 *
 * And the form is one column of cards rather than three bordered fieldsets.
 * Same questions, same order, same words where the words were already right.
 */
type Fields = {
  name: string;
  phone: string;
  city: string;
  categorySlug: string;
  size: string;
  description: string;
};

const EMPTY: Fields = {
  name: "",
  phone: "",
  city: "",
  categorySlug: "",
  size: "",
  description: "",
};

const WHATSAPP_INSTEAD =
  "Assalam-o-Alaikum, I would like something made to order. May I send you a picture?";

const WHATSAPP_VOICE =
  "Assalam-o-Alaikum, I would like something made to order. I am sending a voice note.";

export function CustomOrderScreen() {
  const categories = useCached<Category[]>(CATEGORIES_KEY, fetchCategories);

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [problems, setProblems] = useState<Partial<Record<keyof Fields, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const photoInput = useRef<HTMLInputElement>(null);

  /* An object URL outlives the component unless it is let go of. */
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.preview);
    };
  }, [photo]);

  const set = (key: keyof Fields, value: string) => {
    setFields((held) => ({ ...held, [key]: value }));
    setProblems(({ [key]: _gone, ...rest }) => rest);
  };

  const askSize = needsSize(fields.categorySlug);
  const tree = categoryTree(categories.data ?? []);

  function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setFailure(null);

    if (!IMAGE_TYPES.includes(file.type)) {
      setFailure("That file is not a picture. JPEG, PNG, WebP or HEIC, please.");
      return;
    }

    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);

    /*
     * The website's own schema, not a second idea of a valid enquiry. Parsed
     * rather than hand-checked, so the rules and the wording of every
     * complaint are the ones a customer would meet on the website.
     */
    const parsed = customOrderSchema.safeParse(fields);
    if (!parsed.success) {
      const found: Partial<Record<keyof Fields, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in found)) {
          found[field as keyof Fields] = issue.message;
        }
      }
      setProblems(found);
      return;
    }

    if (!fields.description.trim() && !photo) {
      setFailure("Add a picture or a description so we know what to make.");
      return;
    }

    setSending(true);
    try {
      const attachments: { imagePath?: string } = {};
      if (photo) {
        const extension = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";
        attachments.imagePath = await uploadAttachment(photo.file, "photo", extension);
      }

      const { reference } = await submitCustomOrder(parsed.data, attachments);
      setPlaced(reference);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not send that just now.");
    } finally {
      setSending(false);
    }
  }

  if (placed) return <Sent reference={placed} />;

  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="font-display text-2xl text-primary">Have it made</h1>
      <p className="mt-2 text-sm leading-relaxed text-warmgrey">
        Show us a picture, write it down, or both. Our workshop has been making pieces to order
        since 1980 — most of what leaves this shop was somebody&rsquo;s idea first.
      </p>

      <form onSubmit={onSubmit} noValidate>
        <Card title="What would you like made?">
          <p className="text-xs leading-relaxed text-warmgrey">
            Either one is enough. Most people send a picture and a sentence.
          </p>

          <div className="mt-4">
            {photo ? (
              <div className="card-lift-sm relative overflow-hidden rounded-xl border border-gold/20 bg-white">
                <img src={photo.preview} alt="" className="h-48 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(photo.preview);
                    setPhoto(null);
                  }}
                  aria-label="Remove this picture"
                  className="absolute top-2.5 right-2.5 grid h-11 w-11 place-items-center rounded-full bg-primary/85 text-ivory"
                >
                  <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-gold/45 bg-champagne/20 px-4 py-8 text-center"
              >
                <ImagePlus className="h-6 w-6 text-gold-deep" aria-hidden />
                <span className="text-sm font-semibold text-ink">Add a picture</span>
                <span className="text-xs leading-relaxed text-warmgrey">
                  Something you saw, something you own, or something you found online
                </span>
              </button>
            )}
            <input
              ref={photoInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0])}
            />
          </div>

          <Field label="Describe it" htmlFor="co-description" problem={problems.description}>
            <textarea
              id="co-description"
              rows={4}
              value={fields.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="A 22K set like my mother's — heavy chokar, with pearls. For a wedding in December."
              className={cn(field, "resize-y")}
            />
          </Field>

          {/*
            Where the website puts its recorder. The app asks for no
            microphone, so offering one here would be a button that fails on
            tap; WhatsApp is where the shop's voice notes arrive anyway.
          */}
          <a
            href={whatsappLink(WHATSAPP_VOICE)}
            className="mt-5 flex items-center gap-3 rounded-xl border border-gold/20 bg-white px-4 py-3.5"
          >
            <WhatsAppIcon className="h-[18px] w-[18px] shrink-0 text-[#25D366]" aria-hidden />
            <span>
              <span className="block text-sm font-medium text-ink">Easier to say it out loud?</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-warmgrey">
                Send a voice note on WhatsApp
              </span>
            </span>
          </a>
        </Card>

        <Card title="The piece">
          <Field label="What kind of piece?" htmlFor="co-category">
            <select
              id="co-category"
              value={fields.categorySlug}
              onChange={(e) => set("categorySlug", e.target.value)}
              className={field}
            >
              <option value="">Not sure yet</option>
              {tree.map((parent) =>
                parent.children.length === 0 ? (
                  <option key={parent.slug} value={parent.slug}>
                    {parent.name}
                  </option>
                ) : (
                  <optgroup key={parent.slug} label={parent.name}>
                    <option value={parent.slug}>{parent.name}</option>
                    {parent.children.map((child) => (
                      <option key={child.slug} value={child.slug}>
                        {child.name}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </select>
          </Field>

          {/*
            Only for the pieces that have a size. Asking everyone for a ring
            size is how a form teaches people to stop reading it.
          */}
          {askSize ? (
            <Field
              label={sizeLabel(fields.categorySlug)}
              htmlFor="co-size"
              problem={problems.size}
              note="Not sure? Leave it — we size in the shop at no charge."
            >
              <input
                id="co-size"
                value={fields.size}
                onChange={(e) => set("size", e.target.value)}
                placeholder="16, or 2.4 inches — whatever you know"
                className={field}
              />
            </Field>
          ) : null}
        </Card>

        <Card title="Where to reach you">
          <Field label="Your name" htmlFor="co-name" problem={problems.name}>
            <input
              id="co-name"
              autoComplete="name"
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              className={field}
            />
          </Field>

          <Field label="Phone" htmlFor="co-phone" problem={problems.phone}>
            <input
              id="co-phone"
              inputMode="tel"
              autoComplete="tel"
              value={fields.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={cn(field, "nums")}
            />
          </Field>

          <Field label="City (optional)" htmlFor="co-city" problem={problems.city}>
            <input
              id="co-city"
              autoComplete="address-level2"
              value={fields.city}
              onChange={(e) => set("city", e.target.value)}
              className={field}
            />
          </Field>
        </Card>

        {failure ? (
          <p role="alert" className="mt-5 text-sm font-medium text-destructive">
            {failure}
          </p>
        ) : null}

        <AppButton type="submit" disabled={sending} className="mt-6">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {sending ? "Sending…" : "Send my idea"}
        </AppButton>

        <p className="mt-4 text-[11px] leading-relaxed text-warmgrey">
          Nothing is charged and nothing is committed. We will call to talk it through, and quote
          against the gold rate on the day the work is agreed.{" "}
          <a href={whatsappLink(WHATSAPP_INSTEAD)} className="font-medium text-gold-deep underline">
            Send it on WhatsApp instead
          </a>
          .
        </p>
      </form>
    </div>
  );
}

/** What the shop has, and what happens next. */
function Sent({ reference }: { reference: string }) {
  return (
    <div className="px-4 pt-10 pb-10 text-center">
      <span className="card-lift mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/35 bg-white">
        <Check className="h-7 w-7 text-primary" strokeWidth={1.4} aria-hidden />
      </span>

      <h1 className="font-display mt-6 text-2xl text-primary">We have it</h1>
      <p className="nums mt-3 text-sm text-warmgrey">
        Your reference is{" "}
        <span className="font-semibold tracking-widest text-primary">{reference}</span>
      </p>
      <p className="mt-5 text-sm leading-relaxed text-ink">
        We will look at what you sent and call you to talk it through — the weight, the stones and
        what it will come to. Nothing is committed until you say so.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <AppLink
          href={whatsappLink(`Assalam-o-Alaikum, I sent a custom order — ${reference}.`)}
          className="bg-[#25D366] text-white hover:bg-[#1fb356]"
        >
          <WhatsAppIcon className="h-4 w-4" aria-hidden />
          Add to it on WhatsApp
        </AppLink>
        <AppButton variant="quiet" onClick={() => openShop("/collections")}>
          Browse the collections
        </AppButton>
      </div>
    </div>
  );
}

const field =
  "mt-2 w-full rounded-xl border border-gold/25 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-gold";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-lift mt-6 rounded-xl border border-gold/15 bg-ivory p-5">
      <h2 className="font-display mb-3 text-lg text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  problem,
  note,
  children,
}: {
  label: string;
  htmlFor: string;
  problem?: string | undefined;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold tracking-widest text-warmgrey uppercase"
      >
        {label}
      </label>
      {children}
      {note ? <p className="mt-1.5 text-xs leading-relaxed text-warmgrey">{note}</p> : null}
      {problem ? (
        <span role="alert" className="mt-1.5 block text-xs text-destructive">
          {problem}
        </span>
      ) : null}
    </div>
  );
}
