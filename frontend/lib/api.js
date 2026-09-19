import { supabase } from "./supabase";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
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

export async function getMe() {
  return (await apiFetch("/api/me")).json();
}

export async function getUsers() {
  return (await apiFetch("/api/users")).json();
}

export async function getRequests() {
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

export async function getItems() {
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
