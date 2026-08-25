import { useState, type ComponentType, type ReactNode } from "react";
import { Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Coins, Inbox, Loader2, LogOut, Gem, ExternalLink, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/admin/ui";

import { useAdminSession } from "@/hooks/use-admin-session";
import { signIn, signOut } from "@/lib/admin";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: `Admin — ${SITE.name}` },
      // Staff tooling. It must never appear in a search result, and there is
      // nothing here worth following links out of.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

/**
 * The admin shell.
 *
 * Deliberately plain: this is a working tool for the shop, not part of the
 * storefront's visual language, and staff use it on a phone behind the counter.
 * What it renders depends only on who is signed in — the database refuses every
 * read and write independently, so nothing here is load-bearing for security.
 */
function AdminLayout() {
  const { status, email, error, refresh } = useAdminSession();

  if (status === "loading") {
    return (
      <Centred>
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" />
        <p className="mt-4 text-sm text-champagne/80">Checking your session…</p>
      </Centred>
    );
  }

  if (status === "signed-out") return <SignInScreen onSignedIn={refresh} />;
  if (status === "not-admin") return <NotAdminScreen email={email} error={error} />;

  return (
    <div className="min-h-screen bg-ivory">
      {/*
        Deep green chrome carrying the brand into the back office, with a gold
        hairline under it. The storefront's restraint is the right call for
        customers; behind the counter, a screen someone looks at every morning
        can afford to look like it belongs to this shop.
      */}
      <header className="bg-gradient-to-br from-primary-deep via-primary to-primary-deep">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold">
              <Gem className="h-5 w-5" strokeWidth={1.4} />
            </span>
            <span>
              <span className="block font-display text-lg leading-tight tracking-wide text-ivory">
                Al-Madina
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">
                Admin
              </span>
            </span>
          </div>

          <nav className="order-3 flex w-full gap-1 text-sm sm:order-none sm:w-auto">
            <NavTab to="/admin" exact icon={Inbox}>
              Enquiries
            </NavTab>
            <NavTab to="/admin/orders" icon={Package}>
              Orders
            </NavTab>
            <NavTab to="/admin/products" icon={Gem}>
              Products
            </NavTab>
            <NavTab to="/admin/rates" icon={Coins}>
              Gold rate
            </NavTab>
          </nav>

          <div className="ml-auto flex items-center gap-4 text-xs">
            <a
              href="/"
              className="hidden items-center gap-1.5 text-champagne/70 transition-colors hover:text-gold sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View site
            </a>
            <span className="hidden text-champagne/60 md:inline">{email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 px-3 py-1.5 font-medium text-champagne transition-colors hover:bg-gold hover:text-primary"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavTab({
  to,
  exact,
  icon: Icon,
  children,
}: {
  to: string;
  exact?: boolean;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: exact ?? false }}
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 font-medium text-champagne/70 transition-colors hover:bg-ivory/10 hover:text-ivory sm:flex-none"
      activeProps={{ className: "bg-gold text-primary hover:bg-gold hover:text-primary" }}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function Centred({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary-deep via-primary to-primary-deep px-4 py-10">
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  );
}

/**
 * A light card to stand content on.
 *
 * The gradient behind it is the brand's deep green, and text placed straight
 * onto it has to be light — which is a trap, because every shared control here
 * (labels, inputs, the primary button, field errors) is built for a light
 * ground. Giving the form its own surface keeps all of those correct instead of
 * re-colouring each one and missing some.
 */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-lift)]">
      <div className="h-1 bg-gradient-to-r from-gold via-champagne to-gold" aria-hidden="true" />
      <div className="p-8">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.string().trim().email("Please check the email address."),
  password: z.string().min(1, "Please enter your password."),
});

type SignInValues = z.infer<typeof signInSchema>;

function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: SignInValues) {
    setFailure(null);
    try {
      await signIn(values.email, values.password);
      // The auth listener picks the new session up; this covers the case where
      // it fired before the component mounted.
      onSignedIn();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not sign in.");
    }
  }

  return (
    <Centred>
      <Panel>
        <h1 className="font-display text-3xl font-light tracking-wide text-primary">
          Al-Madina Admin
        </h1>
        {/* ink/70 not warmgrey: warmgrey lands at 3.96:1 on white, under AA. */}
        <p className="mt-2 text-sm text-ink/70">Staff sign-in.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4 text-left">
          <div>
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              className="mt-1.5"
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>

          <div>
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              className="mt-1.5"
              {...register("password")}
            />
            <FieldError message={errors.password?.message} />
          </div>

          {failure ? (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Sign in
          </Button>
        </form>
      </Panel>

      <p className="mt-6 text-xs leading-relaxed text-champagne/70">
        Accounts are created in the Supabase dashboard, not here. There is no sign-up and no
        password reset by design — ask whoever administers the project.
      </p>
    </Centred>
  );
}

function NotAdminScreen({ email, error }: { email: string | null; error: string | null }) {
  return (
    <Centred>
      <Panel>
        <h1 className="font-display text-2xl font-light tracking-wide text-primary">
          Not an administrator
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          {error ??
            `${email ?? "This account"} is signed in but is not listed as staff, so there is nothing here to show.`}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => void signOut()}>
          Sign out
        </Button>
      </Panel>
    </Centred>
  );
}
