import { useEffect, useState } from "react";
import SyncStatus from "../components/SyncStatus.jsx";
import AuthGate from "../components/AuthGate.jsx";
import ItemsScreen from "../components/ItemsScreen.jsx";
import UsersScreen from "../components/UsersScreen.jsx";
import RequestsScreen from "../components/RequestsScreen.jsx";
import CompletedScreen from "../components/CompletedScreen.jsx";
import SettingsScreen from "../components/SettingsScreen.jsx";
import CountScreen from "../components/CountScreen.jsx";
import AppHeader from "../components/AppHeader.jsx";
import PageIntro from "../components/PageIntro.jsx";
import Splash from "../components/Splash.jsx";
import Walkthrough from "../components/Walkthrough.jsx";
import { getMe } from "../lib/api.js";
import { useSession } from "../lib/useSession.js";

const icons = {
  requests: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </>
  ),
  completed: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  items: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

const intro = {
  requests: {
    label: "Requests",
    eyebrow: "Requests / Assignments",
    title: "Open stock checks.",
    sub: "Start a check, count items, mark it complete.",
  },
  completed: {
    label: "Completed",
    eyebrow: "Completed / Reports",
    title: "Review finished counts.",
    sub: "View variances or download the report.",
  },
  items: {
    label: "Items",
    eyebrow: "Items / Catalog",
    title: "Manage the item list.",
    sub: "Add, edit and scan barcodes.",
  },
  users: {
    label: "Users",
    eyebrow: "Users / Access",
    title: "Manage who can count.",
    sub: "Add users and set their roles.",
  },
};

icons.settings = (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>
);

intro.settings = {
  label: "Settings",
  eyebrow: "Settings / Account",
  title: "Account and sync.",
  sub: "Password, offline data, install.",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("requests");
  const [countRequest, setCountRequest] = useState(null);
  const { session } = useSession();
  const [splash, setSplash] = useState(true);
  const [tour, setTour] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (splash || !user?.id) return;
    try {
      if (!localStorage.getItem("sc_tour_" + user.id)) setTour(true);
    } catch {}
  }, [splash, user?.id]);

  function closeTour() {
    setTour(false);
    try {
      if (user?.id) localStorage.setItem("sc_tour_" + user.id, "1");
    } catch {}
  }

  useEffect(() => {
    if (!session) { setUser(null); return; }
    getMe().then(setUser).catch(() => {});
  }, [session?.user?.id]);

  const navBtn = (id, label) => {
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
          gap: 6,
          padding: "12px 0 10px",
          border: "none",
          background: "transparent",
          color: active ? "#c7d2fe" : "#64748b",
          fontFamily: "var(--display)",
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontWeight: active ? 700 : 400,
          cursor: "pointer",
          filter: active ? "drop-shadow(0 0 6px rgba(129,140,248,.75))" : "none",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icons[id]}
        </svg>
        {label}
      </button>
    );
  };

  return (
    <>
      {splash && <Splash />}
      <AuthGate>
      <main
        style={{
          padding: 16,
          paddingBottom: countRequest ? 16 : 100,
          minHeight: "100vh",
          backgroundColor: "#0f172a",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)",
          color: "#f8fafc",
        }}
      >
        <AppHeader user={user} />
        <SyncStatus />

        {countRequest ? (
          <CountScreen
            request={countRequest}
            user={user}
            onBack={() => setCountRequest(null)}
          />
        ) : (
          <>
            <PageIntro
              {...(tab === "items" && user && user.role !== "admin"
                ? {
                    ...intro.items,
                    title: "Browse the item catalog.",
                    sub: "Search items by SKU, name or barcode.",
                  }
                : intro[tab])}
            />
            {tab === "requests" ? (
              <RequestsScreen user={user} onOpenCount={setCountRequest} />
            ) : tab === "completed" ? (
              <CompletedScreen />
            ) : tab === "settings" ? (
              <SettingsScreen user={user} onReplayTour={() => setTour(true)} />
            ) : tab === "items" ? (
              <ItemsScreen user={user} />
            ) : (
              <UsersScreen user={user} />
            )}
          </>
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
            background: "linear-gradient(180deg, #0f172a, #0b1120)",
            borderTop: "1px solid #3b4670",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            zIndex: 10,
          }}
        >
          {navBtn("requests", "Requests")}
          {navBtn("completed", "Completed")}
          {navBtn("items", "Items")}
          {user?.role === "admin" && navBtn("users", "Users")}
          {navBtn("settings", "Settings")}
        </nav>
      )}
    </AuthGate>
      {tour && <Walkthrough role={user?.role} onClose={closeTour} />}
    </>
  );
}
