import { useEffect, useState } from "react";
import SyncStatus from "../components/SyncStatus.jsx";
import AuthGate from "../components/AuthGate.jsx";
import ItemsScreen from "../components/ItemsScreen.jsx";
import UsersScreen from "../components/UsersScreen.jsx";
import CompletedScreen from "../components/CompletedScreen.jsx";
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

  const navBtn = (id, icon, label) => {
    const active = tab === id;
    return (
      <button
        key={id}
        onClick={() => setTab(id)}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          padding: "10px 0 8px",
          border: "none",
          background: "transparent",
          color: active ? "#60a5fa" : "#94a3b8",
          fontSize: 12,
          fontWeight: active ? 600 : 400,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <AuthGate>
      <main
        style={{
          padding: 16,
          paddingBottom: countRequest ? 16 : 88,
          minHeight: "100vh",
          background: "#0f172a",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <h1 style={{ fontSize: 22, margin: 0 }}>Stock Check</h1>
          <SignOutButton />
        </div>
        {user && (
          <p style={{ color: "#94a3b8", fontSize: 14, margin: "4px 0 12px" }}>
            {user.fullName || user.email} — {user.role}
          </p>
        )}
        <SyncStatus />

        {countRequest ? (
          <CountScreen
            request={countRequest}
            user={user}
            onBack={() => setCountRequest(null)}
          />
        ) : tab === "requests" ? (
          <RequestsScreen user={user} onOpenCount={setCountRequest} />
        ) : tab === "completed" ? (
          <CompletedScreen />
        ) : tab === "items" ? (
          <ItemsScreen user={user} />
        ) : (
          <UsersScreen user={user} />
        )}
      </main>

      {!countRequest && (
        <nav
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: "#111827",
            borderTop: "1px solid #1e293b",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            zIndex: 10,
          }}
        >
          {navBtn("requests", "📋", "Requests")}
          {navBtn("completed", "✅", "Completed")}
          {navBtn("items", "📦", "Items")}
          {user?.role === "admin" && navBtn("users", "👥", "Users")}
        </nav>
      )}
    </AuthGate>
  );
}
