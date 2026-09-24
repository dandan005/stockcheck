import { supabase } from "./supabase";
import { saveItems, loadCachedItems, saveChecks, loadCachedChecks, saveKV, loadKV } from "./itemsCache";
import { enqueueCheck, flushQueue, enqueueStatusUpdate, flushStatusQueue } from "./offlineQueue";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function authHeaders() {
  if (!navigator.onLine) throw new TypeError("Offline");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    if (error?.name === "AuthRetryableFetchError") throw new TypeError("Login server unreachable");
    throw new Error("Not signed in");
  }
  return { Authorization: `Bearer ${token}` };
}

// fetch() wrapper that adds the login token and turns errors into exceptions.
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res;
}

async function fetchMe() {
  return (await apiFetch("/api/me")).json();
}

async function fetchUsers() {
  return (await apiFetch("/api/users")).json();
}

async function fetchRequests() {
  return (await apiFetch("/api/requests")).json();
}

export async function createRequest(request) {
  return (await apiFetch("/api/requests", {
    method: "POST",
    body: JSON.stringify(request),
  })).json();
}

export async function updateRequest(id, patch) {
  return (await apiFetch(`/api/requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  })).json();
}

export async function deleteRequest(id) {
  await apiFetch(`/api/requests/${id}`, { method: "DELETE" });
}

async function fetchChecks(requestId) {
  return (await apiFetch(`/api/requests/${requestId}/checks`)).json();
}

async function sendCheck(check) {
  return (await apiFetch("/api/checks", {
    method: "POST",
    body: JSON.stringify(check),
  })).json();
}

async function fetchItems() {
  return (await apiFetch("/api/items")).json();
}

export async function createItem(item) {
  return (await apiFetch("/api/items", {
    method: "POST",
    body: JSON.stringify(item),
  })).json();
}

// Sends the counts to the backend, then opens the phone's share sheet
// (or falls back to a normal download) with the .xlsx report.
export async function downloadReport(checkData) {
  const res = await apiFetch("/api/reports", {
    method: "POST",
    body: JSON.stringify({ checkData }),
  });
  const blob = await res.blob();
  const file = new File([blob], `stock-report-${new Date().toISOString().slice(0, 10)}.xlsx`, {
    type: blob.type,
  });

 if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      // Fall through to plain download if share isn't allowed here
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}
export async function submitCheck(check) {
  try {
    return await sendCheck(check);
  } catch (err) {
    // TypeError = fetch never reached the server (offline / backend down)
    if (err instanceof TypeError || !navigator.onLine) {
      await enqueueCheck(check);
      return { ...check, queued: true };
    }
    throw err;
  }
}

export function syncPending() {
  return flushQueue(sendCheck);
}
export async function getItems() {
  try {
    const items = await fetchItems();
    saveItems(items).catch(() => {});
    return items;
  } catch (err) {
    if (err instanceof TypeError || !navigator.onLine) {
      const cached = await loadCachedItems();
      if (cached.length) return cached;
    }
    throw err;
  }
}

export async function getChecksForRequest(requestId) {
  try {
    const rows = await fetchChecks(requestId);
    saveChecks(requestId, rows).catch(() => {});
    return rows;
  } catch (err) {
    if (err instanceof TypeError || !navigator.onLine) {
      return (await loadCachedChecks(requestId)) ?? [];
    }
    throw err;
  }
}
async function cached(key, fetcher) {
  try {
    const data = await fetcher();
    saveKV(key, data).catch(() => {});
    return data;
  } catch (err) {
    if (err instanceof TypeError || !navigator.onLine) {
      const saved = await loadKV(key);
      if (saved !== null) return saved;
    }
    throw err;
  }
}

export const getMe = () => cached("me", fetchMe);
export const getUsers = () => cached("users", fetchUsers);
export const getRequests = () => cached("requests", fetchRequests);

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications not supported on this device");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }
  const reg = await navigator.serviceWorker.ready;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error("Missing VAPID public key");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  await apiFetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
        auth: arrayBufferToBase64(sub.getKey("auth")),
      },
    }),
  });

  return sub;
}

export async function updateItem(id, patch) {
  return (await apiFetch(`/api/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  })).json();
}

export async function deleteItem(id) {
  await apiFetch(`/api/items/${id}`, { method: "DELETE" });
}
export async function createUser(user) {
  return (await apiFetch("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(user),
  })).json();
}

export async function updateUser(id, patch) {
  return (await apiFetch(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  })).json();
}

export async function deleteUser(id) {
  await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
}
async function fetchCheckers() {
  return (await apiFetch("/api/checkers")).json();
}
export const getCheckers = () => cached("checkers", fetchCheckers);
async function sendStatusUpdate(update) {
  return updateRequest(update.requestId, { status: update.status });
}

export async function submitStatus(requestId, status) {
  try {
    return await sendStatusUpdate({ requestId, status });
  } catch (err) {
    if (err instanceof TypeError || !navigator.onLine) {
      await enqueueStatusUpdate({ requestId, status });
      return { queued: true };
    }
    throw err;
  }
}

export function syncPendingStatus() {
  return flushStatusQueue(sendStatusUpdate);
}
