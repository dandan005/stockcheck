import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  const input = {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#f8fafc",
    fontSize: "16px",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0d1526" }}>
      <form onSubmit={handleSubmit} style={{ width: "min(92vw, 360px)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#141d30",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="2.6" height="18" fill="#ffffff" />
              <rect x="8.5" y="4" width="2.6" height="18" fill="#ffffff" />
              <rect x="14" y="4" width="2.6" height="18" fill="#ffffff" />
              <rect x="19.5" y="4" width="2.6" height="18" fill="#ffffff" />
              <line x1="2" y1="21" x2="22" y2="3" stroke="#3b5bdb" strokeWidth="3" />
            </svg>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#8a94a6", textTransform: "uppercase", marginBottom: 6 }}>
            Inventory
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fde9b8", letterSpacing: 1, margin: 0 }}>
            STOCK CHECK
          </h1>
        </div>
        <input
          style={input}
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={input}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: "#f87171", margin: "0 0 12px" }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          style={{ ...input, background: "#3b5bdb", border: "none", marginBottom: 0, cursor: "pointer" }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
