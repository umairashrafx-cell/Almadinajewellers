import { useState, type ReactNode } from "react";
import { Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, LogOut } from "lucide-react";

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
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Checking your session…</p>
      </Centred>
    );
  }

  if (status === "signed-out") return <SignInScreen onSignedIn={refresh} />;
  if (status === "not-admin") return <NotAdminScreen email={email} error={error} />;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <span className="font-display text-lg font-normal tracking-wide text-primary">
            Al-Madina Admin
          </span>

          <nav className="flex gap-1 text-sm">
            <NavTab to="/admin" exact>
              Enquiries
            </NavTab>
            <NavTab to="/admin/products">Products</NavTab>
            <NavTab to="/admin/rates">Gold rate</NavTab>
          </nav>

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <a href="/" className="hover:text-foreground">
              View site
            </a>
            <span className="hidden sm:inline">{email}</span>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavTab({ to, exact, children }: { to: string; exact?: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: exact ?? false }}
      className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}
    >
      {children}
    </Link>
  );
}

function Centred({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm text-center">{children}</div>
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
      <h1 className="font-display text-3xl font-light tracking-wide text-primary">
        Al-Madina Admin
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Staff sign-in.</p>

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

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Accounts are created in the Supabase dashboard, not here. There is no sign-up and no
        password reset by design — ask whoever administers the project.
      </p>
    </Centred>
  );
}

function NotAdminScreen({ email, error }: { email: string | null; error: string | null }) {
  return (
    <Centred>
      <h1 className="font-display text-2xl font-light tracking-wide text-primary">
        Not an administrator
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {error ??
          `${email ?? "This account"} is signed in but is not listed as staff, so there is nothing here to show.`}
      </p>
      <Button variant="outline" className="mt-6" onClick={() => void signOut()}>
        Sign out
      </Button>
    </Centred>
  );
}
