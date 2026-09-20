import { useEffect, useState } from "react";
import SyncStatus from "../components/SyncStatus.jsx";
import AuthGate from "../components/AuthGate.jsx";
import ItemsScreen from "../components/ItemsScreen.jsx";
import RequestsScreen from "../components/RequestsScreen.jsx";
import CountScreen from "../components/CountScreen.jsx";
import { getMe } from "../lib/api.js";
import { useSession } from "../lib/useSession.js";
import SignOutButton from "../components/SignOutButton.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("requests");
  const [countRequest, setCountRequest] = useState(null);
  const { session } = useSession();

  useEffect(() => {
    if (!session) { setUser(null); return; }
    getMe().then(setUser).catch(() => {});
  }, [session?.user?.id]);

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
        <SyncStatus />
        <SignOutButton />
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
              <ItemsScreen user={user} />
            )}
          </>
        )}
      </main>
    </AuthGate>
  );
}
