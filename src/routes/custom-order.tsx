import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronRight,
  ImagePlus,
  Loader2,
  Mic,
  PencilLine,
  Square,
  Trash2,
} from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

import { categoryTree, fetchCategories } from "@/lib/catalogue";
import {
  IMAGE_TYPES,
  canRecordAudio,
  customOrderSchema,
  formatDuration,
  needsSize,
  pickAudioFormat,
  sizeLabel,
  submitCustomOrder,
  uploadAttachment,
  type CustomOrderDraft,
} from "@/lib/custom-orders";
import { SITE, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Have something made.
 *
 * The hard part of a custom order is not the form, it is describing jewellery
 * to someone who cannot see what you are picturing. So the page offers three
 * ways to do it — show a photograph, write it down, say it out loud — and
 * treats them as equal rather than making one the real field and the others an
 * afterthought. Any one of the three is enough to send.
 */

const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum, I would like something made to order. May I send you a picture?";

export const Route = createFileRoute("/custom-order")({
  head: () => {
    const title = `Custom Order — Have a Piece Made · ${SITE.name}`;
    const description =
      "Have jewellery made to order at Al-Madina Jewellers, Mandi Bahauddin. Send a photograph, describe it, or record a voice note — whichever is easiest — and we will come back with a price.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/custom-order` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/custom-order` }],
    };
  },
  component: CustomOrderPage,
});

const STEPS = [
  {
    icon: ImagePlus,
    title: "Show us",
    body: "A photograph of something you saw, something you own, or something you found online. A picture settles more than a paragraph.",
  },
  {
    icon: PencilLine,
    title: "Or write it",
    body: "The metal, the weight, the stones, the occasion — whatever you know. You do not need the words for the rest.",
  },
  {
    icon: Mic,
    title: "Or just say it",
    body: "Record a voice note the way you would send one on WhatsApp. Easier than typing, and nothing is lost in translation.",
  },
];

function CustomOrderPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />
      <BreadcrumbSchema trail={[{ name: "Custom Order", path: "/custom-order" }]} />

      <main>
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                <li>
                  <Link to="/" className="transition-colors hover:text-gold">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  Custom Order
                </li>
              </ol>
            </nav>

            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Have it made
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-champagne/80">
              Bring us a picture, a description, or just tell us in your own words. Our workshop has
              been making pieces to order since 1980 — most of what leaves this shop was somebody's
              idea first.
            </p>
          </div>
        </section>

        <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="However suits you"
            title="Three ways to tell us"
            description="Use whichever is easiest. One is enough — you do not need all three."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} className="border border-gold/40 bg-card p-7" delay={i * 80}>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-champagne/40 text-primary">
                  <step.icon className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl font-light tracking-wide text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-warmgrey">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="band-y bg-champagne/25 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <CustomOrderForm />
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function CustomOrderForm() {
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [voice, setVoice] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  const tree = categoryTree(categories ?? []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CustomOrderDraft>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: { name: "", phone: "", city: "", categorySlug: "", description: "", size: "" },
  });

  const categorySlug = watch("categorySlug");
  const askSize = needsSize(categorySlug);

  // Object URLs outlive the component unless they are let go of.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.preview);
      if (voice) URL.revokeObjectURL(voice.url);
    };
  }, [photo, voice]);

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

  async function onSubmit(values: CustomOrderDraft) {
    setFailure(null);

    if (!values.description?.trim() && !photo && !voice) {
      setFailure("Add a picture, a description or a voice note so we know what to make.");
      return;
    }

    setSending(true);
    try {
      const attachments: { imagePath?: string; voicePath?: string } = {};

      if (photo) {
        const extension = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";
        attachments.imagePath = await uploadAttachment(photo.file, "photo", extension);
      }

      if (voice) {
        const extension = voice.blob.type.includes("mp4") ? "m4a" : "webm";
        attachments.voicePath = await uploadAttachment(voice.blob, "voice", extension);
      }

      const { reference } = await submitCustomOrder(values, attachments);
      setPlaced(reference);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not send that just now.");
    } finally {
      setSending(false);
    }
  }

  if (placed) {
    return (
      <div className="border border-gold bg-card p-10 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/50 bg-champagne/30">
          <Check className="h-7 w-7 text-primary" strokeWidth={1.4} aria-hidden="true" />
        </span>
        <h2 className="mt-8 font-display text-3xl font-light tracking-wide text-primary">
          We have it
        </h2>
        <p className="nums mt-4 text-sm text-warmgrey">
          Your reference is{" "}
          <span className="font-semibold tracking-widest text-primary">{placed}</span>
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink">
          We will look at what you sent and call you to talk it through — the weight, the stones and
          what it will come to. Nothing is committed until you say so.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ActionLink
            href={whatsappLink(`Assalam-o-Alaikum, I sent a custom order — ${placed}.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Add to it on WhatsApp
          </ActionLink>
          <ActionLink variant="outline" href="/collections">
            Browse collections
          </ActionLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-10">
      {/* ---------------- what to make ---------------- */}
      <fieldset className="border border-gold/40 bg-card p-7 sm:p-9">
        <legend className="px-2 font-display text-2xl font-light tracking-wide text-primary">
          What would you like made?
        </legend>
        <p className="mb-7 text-sm leading-relaxed text-warmgrey">
          Any one of these is enough. Most people send a picture and a sentence.
        </p>

        <PhotoField
          photo={photo}
          onPick={() => photoInput.current?.click()}
          onClear={() => {
            if (photo) URL.revokeObjectURL(photo.preview);
            setPhoto(null);
          }}
        />
        <input
          ref={photoInput}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => onPickPhoto(e.target.files?.[0])}
        />

        <div className="mt-7">
          <Label htmlFor="co-description">Describe it</Label>
          <textarea
            id="co-description"
            rows={5}
            placeholder="A 22K set like my mother's — heavy chokar, with pearls. For a wedding in December."
            className={cn(fieldClass, "mt-2 resize-y")}
            {...register("description")}
          />
          <FieldError message={errors.description?.message} />
        </div>

        <div className="mt-7">
          <VoiceField voice={voice} onChange={setVoice} onError={setFailure} />
        </div>
      </fieldset>

      {/* ---------------- the piece ---------------- */}
      <fieldset className="border border-gold/40 bg-card p-7 sm:p-9">
        <legend className="px-2 font-display text-2xl font-light tracking-wide text-primary">
          The piece
        </legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="co-category">What kind of piece?</Label>
            <select
              id="co-category"
              className={cn(fieldClass, "mt-2")}
              {...register("categorySlug")}
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
          </div>

          {/*
            Only for the pieces that have a size. Asking everyone for a ring
            size is how a form teaches people to stop reading it.
          */}
          {askSize ? (
            <div>
              <Label htmlFor="co-size">{sizeLabel(categorySlug)}</Label>
              <input
                id="co-size"
                placeholder="16, or 2.4 inches — whatever you know"
                className={cn(fieldClass, "mt-2")}
                {...register("size")}
              />
              <p className="mt-1.5 text-xs leading-relaxed text-warmgrey">
                Not sure? Leave it — we size in the shop at no charge.
              </p>
              <FieldError message={errors.size?.message} />
            </div>
          ) : null}
        </div>
      </fieldset>

      {/* ---------------- who to call ---------------- */}
      <fieldset className="border border-gold/40 bg-card p-7 sm:p-9">
        <legend className="px-2 font-display text-2xl font-light tracking-wide text-primary">
          Where to reach you
        </legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="co-name">Your name</Label>
            <input
              id="co-name"
              autoComplete="name"
              className={cn(fieldClass, "mt-2")}
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label htmlFor="co-phone">Phone</Label>
            <input
              id="co-phone"
              inputMode="tel"
              autoComplete="tel"
              className={cn(fieldClass, "nums mt-2")}
              {...register("phone")}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="co-city">City (optional)</Label>
            <input
              id="co-city"
              autoComplete="address-level2"
              className={cn(fieldClass, "mt-2")}
              {...register("city")}
            />
            <FieldError message={errors.city?.message} />
          </div>
        </div>
      </fieldset>

      {failure ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {failure}
        </p>
      ) : null}

      <div className="flex flex-col items-start gap-4">
        <ActionButton type="submit" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {sending ? "Sending…" : "Send my idea"}
        </ActionButton>
        <p className="text-xs leading-relaxed text-warmgrey">
          Nothing is charged and nothing is committed. We will call to talk it through, and quote
          against the gold rate on the day the work is agreed. Would rather use WhatsApp?{" "}
          <a
            href={whatsappLink(WHATSAPP_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:text-gold hover:underline"
          >
            Send it there instead
          </a>
          .
        </p>
      </div>
    </form>
  );
}

const fieldClass =
  "w-full rounded-[2px] border border-gold/40 bg-ivory px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-gold";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey"
    >
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1.5 block text-xs text-destructive">
      {message}
    </span>
  );
}

function PhotoField({
  photo,
  onPick,
  onClear,
}: {
  photo: { file: File; preview: string } | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <Label htmlFor="co-photo-button">Show us a picture</Label>
      {photo ? (
        <div className="mt-2 flex flex-wrap items-center gap-4 border border-gold/40 bg-ivory p-4">
          <img
            src={photo.preview}
            alt="The picture you attached"
            className="h-24 w-24 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">{photo.file.name}</p>
            <p className="nums text-xs text-warmgrey">
              {(photo.file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded border border-gold/40 px-3 py-2 text-xs text-ink transition-colors hover:border-gold hover:text-primary"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      ) : (
        <button
          id="co-photo-button"
          type="button"
          onClick={onPick}
          className="mt-2 flex w-full items-center justify-center gap-3 border border-dashed border-gold/60 bg-ivory px-4 py-8 text-sm text-warmgrey transition-colors hover:border-gold hover:text-primary"
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          Choose a photograph
        </button>
      )}
    </div>
  );
}

/**
 * A voice note, recorded in the browser.
 *
 * Offered only where the browser can actually record — the check runs before
 * the button is drawn rather than after it is pressed, because a button that
 * fails on tap is worse than one that was never there, and the form has two
 * other ways to say the same thing.
 */
function VoiceField({
  voice,
  onChange,
  onError,
}: {
  voice: { blob: Blob; url: string; seconds: number } | null;
  onChange: (v: { blob: Blob; url: string; seconds: number } | null) => void;
  onError: (message: string | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  /*
   * Detected after mounting, not during render.
   *
   * canRecordAudio() reads navigator and MediaRecorder, which the server does
   * not have — so deciding here would render "cannot record" on the server and
   * a working button on the client, and React would refuse to hydrate the
   * difference. null means "not known yet" and renders the same in both.
   */
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => setSupported(canRecordAudio()), []);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stream = useRef<MediaStream | null>(null);

  // Recording must not survive the page: the microphone stays open otherwise.
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (supported === null) {
    // The same markup the server produced, so hydration has nothing to argue
    // with. It is replaced a tick later once the browser has been asked.
    return (
      <div>
        <Label htmlFor="co-voice-pending">Or record a voice note</Label>
        <div
          id="co-voice-pending"
          aria-hidden="true"
          className="mt-2 h-[74px] w-full border border-dashed border-gold/30 bg-ivory"
        />
      </div>
    );
  }

  if (!supported) {
    return (
      <div>
        <Label htmlFor="co-voice-unsupported">Or record a voice note</Label>
        <p id="co-voice-unsupported" className="mt-2 text-sm leading-relaxed text-warmgrey">
          This browser cannot record. Write it above instead, or send us a voice note on WhatsApp —
          it reaches the same people.
        </p>
      </div>
    );
  }

  async function start() {
    onError(null);
    const format = pickAudioFormat();
    if (!format) {
      onError("This browser cannot record audio. Please write it or use WhatsApp.");
      return;
    }

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Denied, or no microphone. Either way the other two fields still work.
      onError("We could not reach your microphone. Check the browser's permission, or write it.");
      return;
    }

    chunks.current = [];
    const rec = new MediaRecorder(stream.current, { mimeType: format.mimeType });
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: format.mimeType });
      onChange({ blob, url: URL.createObjectURL(blob), seconds });
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };

    recorder.current = rec;
    rec.start();
    setRecording(true);
    setSeconds(0);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stop();
    setRecording(false);
  }

  return (
    <div>
      <Label htmlFor="co-voice">Or record a voice note</Label>

      {voice ? (
        <div className="mt-2 flex flex-wrap items-center gap-4 border border-gold/40 bg-ivory p-4">
          <audio controls src={voice.url} className="h-10 min-w-0 flex-1">
            <track kind="captions" />
          </audio>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(voice.url);
              onChange(null);
            }}
            className="inline-flex items-center gap-1.5 rounded border border-gold/40 px-3 py-2 text-xs text-ink transition-colors hover:border-gold hover:text-primary"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Record again
          </button>
        </div>
      ) : (
        <button
          id="co-voice"
          type="button"
          onClick={() => (recording ? stop() : void start())}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-3 border px-4 py-6 text-sm transition-colors",
            recording
              ? "border-destructive/50 bg-destructive/5 text-destructive"
              : "border-dashed border-gold/60 bg-ivory text-warmgrey hover:border-gold hover:text-primary",
          )}
        >
          {recording ? (
            <>
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
              <span className="nums">Recording {formatDuration(seconds)} — tap to stop</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              Start recording
            </>
          )}
        </button>
      )}

      <p className="mt-1.5 text-xs leading-relaxed text-warmgrey">
        Speak as you would on WhatsApp. Only we hear it.
      </p>
    </div>
  );
}
