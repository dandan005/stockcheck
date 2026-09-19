import { useEffect } from "react";
import { syncPending } from "../lib/api.js";
import { usePendingCount } from "../lib/offlineQueue.js";

export default function SyncStatus() {
  const pending = usePendingCount();

  useEffect(() => {
    const run = () => syncPending().catch(() => {});
    run();
    window.addEventListener("online", run);
    // "online" doesn't fire if wifi is up but the backend is down
    const t = setInterval(run, 30000);
    return () => {
      window.removeEventListener("online", run);
      clearInterval(t);
    };
  }, []);

  if (!pending) return null;
  return (
    <p style={{ background: "#78350f", color: "#fde68a", padding: 8, borderRadius: 8 }}>
      ⏳ {pending} count{pending > 1 ? "s" : ""} waiting to sync
    </p>
  );
}
