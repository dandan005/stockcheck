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
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: "16px",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a" }}>
      <form onSubmit={handleSubmit} style={{ width: "min(92vw, 360px)" }}>
        <h1 style={{ color: "#f8fafc", marginBottom: "20px" }}>Stock Check</h1>
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
          style={{ ...input, background: "#2563eb", border: "none", marginBottom: 0, cursor: "pointer" }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
