import Dexie from "dexie";
import { useEffect, useState } from "react";

const db = new Dexie("stockcheck-offline");
db.version(2).stores({
  pendingChecks: "&key, queuedAt",
  pendingStatusUpdates: "&requestId, queuedAt",
});

// One pending row per request+item, so recounting replaces the old value
// (matches the server-side upsert).
const keyOf = (c) => `${c.request_id ?? c.requestId}:${c.item_id ?? c.itemId}`;
const notify = () => window.dispatchEvent(new Event("pending-changed"));

export async function enqueueCheck(check) {
  await db.pendingChecks.put({ key: keyOf(check), check, queuedAt: Date.now() });
  notify();
}

let flushing = false;

export async function flushQueue(send) {
  if (flushing) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    const rows = await db.pendingChecks.orderBy("queuedAt").toArray();
    for (const row of rows) {
      try {
        await send(row.check);
        await db.pendingChecks.delete(row.key);
        sent++;
      } catch (err) {
        failed++;
        if (err instanceof TypeError) break; // still unreachable, try later
        await db.pendingChecks.update(row.key, { lastError: err.message });
      }
    }
  } finally {
    flushing = false;
    notify();
  }
  return { sent, failed };
}

export function usePendingCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const refresh = () => db.pendingChecks.count().then(setN).catch(() => {});
    refresh();
    window.addEventListener("pending-changed", refresh);
    return () => window.removeEventListener("pending-changed", refresh);
  }, []);
  return n;
}
export function usePendingChecks() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const refresh = () =>
      db.pendingChecks
        .orderBy("queuedAt")
        .toArray()
        .then((r) => setRows(r.map((x) => x.check)))
        .catch(() => {});
    refresh();
    window.addEventListener("pending-changed", refresh);
    return () => window.removeEventListener("pending-changed", refresh);
  }, []);
  return rows;
}

export function getPendingCount() {
  return db.pendingChecks.count();
}

export async function clearQueue() {
  await db.pendingChecks.clear();
  notify();
}

// Same pattern as pendingChecks, but for request status changes (Start / Mark complete)
// made while offline. One pending row per request — a later status overwrites an earlier one.
export async function enqueueStatusUpdate(update) {
  await db.pendingStatusUpdates.put({ requestId: update.requestId, update, queuedAt: Date.now() });
  notify();
}

let flushingStatus = false;

export async function flushStatusQueue(send) {
  if (flushingStatus) return { sent: 0, failed: 0 };
  flushingStatus = true;
  let sent = 0;
  let failed = 0;
  try {
    const rows = await db.pendingStatusUpdates.orderBy("queuedAt").toArray();
    for (const row of rows) {
      try {
        await send(row.update);
        await db.pendingStatusUpdates.delete(row.requestId);
        sent++;
      } catch (err) {
        failed++;
        if (err instanceof TypeError) break; // still unreachable, try later
        await db.pendingStatusUpdates.update(row.requestId, { lastError: err.message });
      }
    }
  } finally {
    flushingStatus = false;
    notify();
  }
  return { sent, failed };
}

export function usePendingStatusCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const refresh = () => db.pendingStatusUpdates.count().then(setN).catch(() => {});
    refresh();
    window.addEventListener("pending-changed", refresh);
    return () => window.removeEventListener("pending-changed", refresh);
  }, []);
  return n;
}
