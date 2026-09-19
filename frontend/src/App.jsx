import { useEffect, useState } from "react";
import AuthGate from "../components/AuthGate.jsx";
import ItemsScreen from "../components/ItemsScreen.jsx";
import RequestsScreen from "../components/RequestsScreen.jsx";
import CountScreen from "../components/CountScreen.jsx";
import { getMe } from "../lib/api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("requests");
  const [countRequest, setCountRequest] = useState(null);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  const tabBtn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "10px 16px",
        border: "none",
        borderRadius: 8,
        background: tab === id ? "#2563eb" : "#1e293b",
        color: "#f8fafc",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <AuthGate>
      <main style={{ padding: 16, minHeight: "100vh", background: "#0f172a", color: "#f8fafc" }}>
        <h1>Stock Check</h1>
        {user && <p style={{ color: "#94a3b8" }}>{user.fullName || user.email} — {user.role}</p>}

        {countRequest ? (
          <CountScreen
            request={countRequest}
            user={user}
            onBack={() => setCountRequest(null)}
          />
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {tabBtn("requests", "Requests")}
              {tabBtn("items", "Items")}
            </div>
            {tab === "requests" ? (
              <RequestsScreen user={user} onOpenCount={setCountRequest} />
            ) : (
              <ItemsScreen />
            )}
          </>
        )}
      </main>
    </AuthGate>
  );
}
