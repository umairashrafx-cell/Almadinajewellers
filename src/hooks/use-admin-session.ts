import { useCallback, useEffect, useState } from "react";
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

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function resolve(session: Session | null) {
      if (cancelled) return;

      if (!session) {
        setEmail(null);
        setError(null);
        setStatus("signed-out");
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
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-checking on every auth event keeps a revoked administrator from
      // keeping the panel open until they happen to reload.
      setStatus("loading");
      void resolve(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [nonce]);

  return { status, email, error, refresh };
}
