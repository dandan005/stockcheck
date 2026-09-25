import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { syncPending, syncPendingStatus, getItems } from "../lib/api.js";
import { subscribeToPush } from "../lib/api.js";
import { usePendingCount, usePendingStatusCount } from "../lib/offlineQueue.js";
import SignOutButton from "./SignOutButton.jsx";
import pkg from "../package.json";

// Captured at import time so the browser's install prompt isn't missed.
let deferredPrompt = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
  });
}

const input = {
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f8fafc",
  fontSize: 15,
  width: "100%",
  boxSizing: "border-box",
};
const btn = {
  ...input,
  width: "auto",
  padding: "10px 14px",
  cursor: "pointer",
};
const primary = { ...btn, background: "#2563eb", border: "none" };
const muted = { color: "#94a3b8", fontSize: 13 };

function Card({ title, children }) {
  return (
    <section className="sc-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "6px 0",
        borderTop: "1px solid #1e293b",
      }}
    >
      <span style={muted}>{label}</span>
      <span style={{ textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

export default function SettingsScreen({ user, onReplayTour }) {
  const pendingChecks = usePendingCount();
  const pendingStatus = usePendingStatusCount();
  const pending = pendingChecks + pendingStatus;

  const [online, setOnline] = useState(navigator.onLine);
  const [syncMsg, setSyncMsg] = useState("");
  const [itemsMsg, setItemsMsg] = useState("");
  const [busy, setBusy] = useState("");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [canInstall, setCanInstall] = useState(!!deferredPrompt);
  const installed =
    window.matchMedia?.("(display-mode: standalone)").matches || false;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const ready = () => setCanInstall(!!deferredPrompt);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", ready);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", ready);
    };
  }, []);

  async function syncNow() {
    setBusy("sync");
    setSyncMsg("");
    try {
      await syncPending();
      await syncPendingStatus();
      setSyncMsg("Sync finished.");
    } catch (err) {
      setSyncMsg("Couldn't sync: " + err.message);
    } finally {
      setBusy("");
    }
  }

  async function refreshItems() {
    setBusy("items");
    setItemsMsg("");
    try {
      const items = await getItems();
      setItemsMsg(`${items.length} items ready for offline use.`);
    } catch (err) {
      setItemsMsg("Couldn't refresh: " + err.message);
    } finally {
      setBusy("");
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.length < 8) return setPwMsg({ ok: false, text: "Use at least 8 characters." });
    if (pw !== pw2) return setPwMsg({ ok: false, text: "Passwords don't match." });
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) return setPwMsg({ ok: false, text: error.message });
    setPw("");
    setPw2("");
    setPwMsg({ ok: true, text: "Password changed." });
  }

  const [pushMsg, setPushMsg] = useState("");
  const [pushBusy, setPushBusy] = useState(false);

  async function enablePush() {
    setPushBusy(true);
    setPushMsg("");
    try {
      await subscribeToPush();
      setPushMsg("Notifications enabled");
    } catch (e) {
      setPushMsg(e.message || "Failed to enable notifications");
    } finally {
      setPushBusy(false);
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
  }

  return (
    <div>
      <Card title="Account">
        <Row label="Name" value={user?.fullName || "—"} />
        <Row label="Email" value={user?.email || "—"} />
        <Row label="Role" value={<span style={{ textTransform: "capitalize" }}>{user?.role || "—"}</span>} />
        <div style={{ marginTop: 12 }}>
          <SignOutButton />
        </div>
        </Card>

        <Card title="Notifications">
          <button
            onClick={enablePush}
            disabled={pushBusy}
            style={{ ...input, width: "100%", fontWeight: 600, cursor: "pointer", background: "#2563eb", border: "none" }}
          >
            {pushBusy ? "Enabling…" : "Enable notifications"}
          </button>
          {pushMsg && <p style={{ marginTop: 8, color: pushMsg.includes("enabled") ? "#4ade80" : "#f87171" }}>{pushMsg}</p>}
        </Card>

        <Card title="Change password">
        <form onSubmit={changePassword} style={{ display: "grid", gap: 8 }}>
          <input
            style={input}
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <input
            style={input}
            type="password"
            placeholder="Repeat new password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          <button type="submit" disabled={pwBusy || !pw} style={primary}>
            {pwBusy ? "Saving…" : "Update password"}
          </button>
          {pwMsg && (
            <div style={{ fontSize: 13, color: pwMsg.ok ? "#86efac" : "#f87171" }}>
              {pwMsg.text}
            </div>
          )}
        </form>
      </Card>

      <Card title="Sync and offline">
        <Row
          label="Connection"
          value={
            <span style={{ color: online ? "#86efac" : "#fcd34d" }}>
              ● {online ? "Online" : "Offline"}
            </span>
          }
        />
        <Row
          label="Waiting to sync"
          value={pending ? `${pending} update${pending > 1 ? "s" : ""}` : "Nothing"}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button style={primary} onClick={syncNow} disabled={busy === "sync" || !online}>
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
          <button style={btn} onClick={refreshItems} disabled={busy === "items" || !online}>
            {busy === "items" ? "Refreshing…" : "Refresh item list"}
          </button>
        </div>
        {syncMsg && <div style={{ ...muted, marginTop: 8 }}>{syncMsg}</div>}
        {itemsMsg && <div style={{ ...muted, marginTop: 8 }}>{itemsMsg}</div>}
        <div style={{ ...muted, marginTop: 10 }}>
          Refresh the item list while online before counting somewhere with weak signal.
        </div>
      </Card>

      <Card title="Help">
        <button style={btn} onClick={onReplayTour}>
          Replay the walkthrough
        </button>
      </Card>

      <Card title="Install app">
        {installed ? (
          <div style={{ color: "#86efac" }}>Installed on this device ✓</div>
        ) : canInstall ? (
          <button style={primary} onClick={install}>
            Install Stock Check
          </button>
        ) : (
          <div style={muted}>
            To install, open your browser menu and choose “Add to Home screen”.
          </div>
        )}
      </Card>

      <Card title="About">
        <Row label="App" value="Stock Check" />
        <Row label="Version" value={pkg.version} />
        <div style={{ marginTop: 12, marginBottom: 6, fontSize: 13, color: "#94a3b8" }}>
          Request stock checks, count items by hand or barcode scan — built for this workplace's inventory workflow.
        </div>
        <div style={{ marginTop: 12, fontWeight: 600, fontSize: 13 }}>Built with</div>
        <Row label="Frontend" value="React 18, Vite, Dexie, html5-qrcode" />
        <Row label="Backend" value="Node.js, Express, ExcelJS" />
        <Row label="Database & auth" value="Supabase (Postgres + RLS)" />
        <Row label="Installable as" value="Progressive Web App (PWA)" />
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(129,140,248,0.14))",
            border: "1px solid #3b4670",
            fontSize: 13,
            color: "#c7d2fe",
            textAlign: "center",
          }}
        >
          ✨ Built solo by <span style={{ color: "#fde9b8", fontWeight: 700 }}>Daniel Cañete</span>, with <span style={{ color: "#fde9b8", fontWeight: 700 }}>Claude</span> as coding assistant.
        </div>
      </Card>
    </div>
  );
}
