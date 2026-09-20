import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { saveKV, loadKV } from "./itemsCache";

// Returns { session, loading }. session is null when signed out.
// Offline with an expired token we can't refresh, so we fall back to an
// "offline session" for the last signed-in user (offline: true, no token).
// It is replaced by the real session once the connection is back.

const HINT_KEY = "authHint";

const offlineSession = (hint) => ({
  offline: true,
  access_token: null,
  user: { id: hint.id, email: hint.email },
});

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const apply = (s) => {
      if (!cancelled) setSession(s);
    };

    async function fallback() {
      const hint = await loadKV(HINT_KEY).catch(() => null);
      apply(hint ? offlineSession(hint) : null);
    }

    async function resolve() {
      try {
        if (!navigator.onLine) {
          await fallback();
          return;
        }
        const { data, error } = await supabase.auth.getSession();
        if (data.session) apply(data.session);
        else if (error?.name === "AuthRetryableFetchError") await fallback();
        else apply(null);
      } catch {
        await fallback();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (s) apply(s);
      else if (event === "SIGNED_OUT") apply(null);
    });
    const onOnline = () => resolve();
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // Remember the signed-in user for offline reloads.
  useEffect(() => {
    if (session && !session.offline && session.user) {
      saveKV(HINT_KEY, { id: session.user.id, email: session.user.email }).catch(() => {});
    }
  }, [session]);

  return { session, loading };
}
