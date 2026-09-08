import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { fetchIsAdmin } from "@/lib/admin";

export type AdminStatus = "loading" | "signed-out" | "not-admin" | "ready";

export type AdminSession = {
  status: AdminStatus;
  email: string | null;
  /** Set when the admin check itself failed, e.g. the migration is not applied. */
  error: string | null;
  refresh: () => void;
};

/**
 * Who is signed in, and are they staff?
 *
 * Being signed in is not the same as being an administrator — the answer to the
 * second question comes from the database via is_admin(), so a session alone
 * never unlocks the panel. The screens use this only to decide what to render;
 * every actual read and write is gated again by row-level security.
 *
 * Resolution is deliberately client-side: the session lives in localStorage, so
 * the server render is always "loading" and the real state appears on hydration.
 */
export function useAdminSession(): AdminSession {
  const [status, setStatus] = useState<AdminStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  /*
   * Whether the panel has ever finished deciding who this is.
   *
   * Only the first answer is allowed to show the loading screen. Every later
   * re-check runs quietly — see the auth subscription below for why.
   */
  const resolvedOnce = useRef(false);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function resolve(session: Session | null) {
      if (cancelled) return;

      if (!session) {
        setEmail(null);
        setError(null);
        setStatus("signed-out");
        resolvedOnce.current = true;
        return;
      }

      setEmail(session.user.email ?? null);

      try {
        const isAdmin = await fetchIsAdmin();
        if (cancelled) return;
        setError(null);
        setStatus(isAdmin ? "ready" : "not-admin");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not check this account.");
        setStatus("not-admin");
      }

      resolvedOnce.current = true;
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      /*
       * Re-check on every auth event, which keeps a revoked administrator from
       * holding the panel open until they happen to reload.
       *
       * Quietly, though, after the first time. Supabase refreshes the token
       * when a tab is brought back to the front, and that arrives here as an
       * auth event. Dropping to "loading" swaps the whole panel for the
       * checking screen, which unmounts whatever is on it — so switching to
       * another tab and coming back threw away a half-filled product form and
       * returned to the list. The re-check still runs and still signs out
       * anyone who has lost access; it just no longer tears the page down to
       * ask the question.
       */
      if (!resolvedOnce.current) setStatus("loading");
      void resolve(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [nonce]);

  return { status, email, error, refresh };
}
