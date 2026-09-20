import { useEffect } from "react";
import { syncPending, syncPendingStatus } from "../lib/api.js";
import { usePendingCount, usePendingStatusCount } from "../lib/offlineQueue.js";

export default function SyncStatus() {
  const pendingChecks = usePendingCount();
  const pendingStatus = usePendingStatusCount();
  const pending = pendingChecks + pendingStatus;

  useEffect(() => {
    const run = () => {
      syncPending().catch(() => {});
      syncPendingStatus().catch(() => {});
    };
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
      ⏳ {pending} update{pending > 1 ? "s" : ""} waiting to sync
    </p>
  );
}
