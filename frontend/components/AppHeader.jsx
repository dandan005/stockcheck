import splashIcon from "../lib/splashIcon.js";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import SignOutButton from "./SignOutButton.jsx";

const emblem = {
  width: 44,
  height: 44,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  borderRadius: "10px 10px 22px 22px",
  background: "linear-gradient(160deg, #312e81, #1e1b4b)",
  border: "2px solid #d4a94a",
  boxShadow: "0 0 14px rgba(250, 204, 21, 0.35)",
};

const iconBtn = {
  width: 36,
  height: 36,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e2a4a",
  color: "#c7d2fe",
  fontSize: 18,
  cursor: "pointer",
};

export default function AppHeader({ user }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const unread = notes.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    let ch = null;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid || !alive) return;
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(30);
        if (alive && data) setNotes(data);
        ch = supabase
          .channel("notif-" + uid)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + uid },
            (p) => setNotes((prev) => [p.new, ...prev])
          )
          .subscribe();
      } catch (e) {}
    })();
    return () => {
      alive = false;
      if (ch) supabase.removeChannel(ch);
    };
  }, [user?.email]);

  async function markAllRead() {
    const ids = notes.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await supabase.from("notifications").update({ read: true }).in("id", ids);
    } catch (e) {}
  }
  const name = user?.fullName || user?.email || "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        margin: "-16px -16px 16px",
        position: "sticky",
        top: 0,
        zIndex: 15,
        padding: "calc(10px + env(safe-area-inset-top, 0px)) 16px 10px",
        borderRadius: 0,
        borderBottom: "1px solid #3b4670",
        background: "linear-gradient(180deg, #172036, #111a2e)",
        boxShadow: "0 6px 16px rgba(0,0,0,0.55), 0 1px 0 rgba(99,102,241,0.25)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <img
          src={splashIcon}
          alt=""
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 10,
            objectFit: "contain",
            boxShadow: "0 0 14px rgba(250, 204, 21, 0.35)",
          }}
        />
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: 10,
              letterSpacing: 4,
              color: "#818cf8",
              fontWeight: 700,
            }}
          >
            INVENTORY
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: 15,
              letterSpacing: 1,
              color: "#fde9b8",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            STOCK CHECK
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {user && (
          <button
            onClick={() => { setBellOpen((o) => !o); setOpen(false); }}
            aria-label="Notifications"
            style={{ ...iconBtn, position: "relative" }}
          >
            🔔
            {unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 8,
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        )}
        {user && (
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px 4px 4px",
              borderRadius: 12,
              border: "1px solid #334155",
              background: "#1e2a4a",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                flexShrink: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(160deg, #6366f1, #4338ca)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {initial}
            </span>
            <span
              style={{
                maxWidth: 70,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "var(--display)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
                color: "#fde9b8",
                textTransform: "uppercase",
              }}
            >
              {name}
            </span>
          </button>
        )}
      </div>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 19 }}
          />
          <div
            style={{
              position: "absolute",
              right: 16,
              top: "100%",
              marginTop: 8,
              zIndex: 20,
              minWidth: 180,
              padding: 12,
              borderRadius: 12,
              background: "#111827",
              border: "1px solid #334155",
              display: "grid",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{name}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", textTransform: "capitalize" }}>
                {user?.role}
              </div>
            </div>
            <SignOutButton />
          </div>
        </>
      )}
    {bellOpen && (
        <>
          <div
            onClick={() => setBellOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 19 }}
          />
          <div
            style={{
              position: "absolute",
              right: 16,
              top: "100%",
              marginTop: 8,
              zIndex: 20,
              width: "min(320px, calc(100vw - 32px))",
              maxHeight: "60vh",
              overflowY: "auto",
              padding: 12,
              borderRadius: 12,
              background: "#111827",
              border: "1px solid #334155",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>Notifications</div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 13 }}
                >
                  Mark all read
                </button>
              )}
            </div>
            {notes.length === 0 && (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>No notifications yet</div>
            )}
            {notes.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: n.read ? "transparent" : "#1e2a4a",
                  borderLeft: n.read ? "3px solid transparent" : "3px solid #6366f1",
                }}
              >
                <div style={{ fontSize: 14 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </header>
  );
}
