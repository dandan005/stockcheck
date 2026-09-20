import { useState } from "react";
import { supabase } from "../lib/supabase";
import { clearCaches } from "../lib/itemsCache";
import { getPendingCount, clearQueue } from "../lib/offlineQueue";
import { syncPending } from "../lib/api";

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);
}

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      let pending = 0;
      try {
        pending = await withTimeout(getPendingCount(), 3000);
      } catch {}

      if (pending > 0 && navigator.onLine) {
        try {
          await withTimeout(syncPending(), 5000);
        } catch {}
        try {
          pending = await withTimeout(getPendingCount(), 3000);
        } catch {}
      }

      if (
        pending > 0 &&
        !window.confirm(
          `${pending} count(s) haven't been sent to the server yet. Signing out will delete them. Sign out anyway?`
        )
      ) {
        return;
      }

      await clearQueue();
      await clearCaches();
      await withTimeout(supabase.auth.signOut({ scope: "local" }), 5000);
      window.location.reload();
    } catch (err) {
      alert("Sign out failed: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={busy}
      style={{
        padding: "6px 12px",
        border: "1px solid #475569",
        borderRadius: 8,
        background: "transparent",
        color: "#94a3b8",
        cursor: "pointer",
        marginBottom: 12,
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
