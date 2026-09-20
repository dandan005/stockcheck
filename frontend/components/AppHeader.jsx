import splashIcon from "../lib/splashIcon.js";
import { useState } from "react";
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
        <div style={{ minWidth: 0 }}>
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
              fontSize: 16,
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
                maxWidth: 150,
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
    </header>
  );
}
