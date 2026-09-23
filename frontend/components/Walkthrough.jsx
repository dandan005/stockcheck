import { useState } from "react";

function stepsFor(role) {
  const admin = role === "admin";
  const checker = role === "checker";
  const steps = [
    {
      icon: "👋",
      title: "Welcome to Stock Check",
      text: "Request stock checks, count items with your phone. Here's a 30-second tour.",
    },
    checker
      ? {
          icon: "📋",
          title: "Your requests",
          text: "Stock checks assigned to you appear under Requests. Tap Start, count the items, then Mark complete.",
        }
      : {
          icon: "📋",
          title: "Create requests",
          text: "Create a stock check under Requests and choose which checker should count it. You can reassign it any time.",
        },
    {
      icon: "🔍",
      title: "Count items",
      text: "Scan a barcode or search by name, enter the quantity and save. Counting works offline and syncs when you are back online.",
    },
    {
      icon: "✅",
      title: "Completed and reports",
      text: "Finished checks move to Completed. View the variances there or download the Excel report.",
    },
    admin
      ? {
          icon: "📦",
          title: "Manage items",
          text: "Add, edit and delete items, and scan barcodes to link them. Use search to find any item fast.",
        }
      : {
          icon: "📦",
          title: "Browse items",
          text: "Search the item catalog by SKU, name or barcode.",
        },
  ];
  if (admin) {
    steps.push({
      icon: "👥",
      title: "Manage users",
      text: "Add people, set their role (admin, requester or checker) and remove access when needed.",
    });
  }
  steps.push({
    icon: "⚙️",
    title: "Settings",
    text: "Change your password, sync offline updates, refresh the item list and install the app. You can replay this tour from Settings.",
  });
  return steps;
}

export default function Walkthrough({ role, onClose }) {
  const steps = stepsFor(role);
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  const s = steps[i];

  const btn = {
    padding: "11px 18px",
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: 15,
    cursor: "pointer",
  };

  return (
    <div className="sc-tour" role="dialog" aria-modal="true">
      <div className="sc-tour-card">
        <div key={i} className="sc-tour-step">
          <div style={{ fontSize: 56, marginBottom: 10 }}>{s.icon}</div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: 18,
              fontWeight: 800,
              color: "#fde9b8",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {s.title}
          </div>
          <p style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.5, margin: "10px 0 0" }}>{s.text}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "18px 0" }}>
          {steps.map((_, n) => (
            <span
              key={n}
              style={{
                width: n === i ? 22 : 7,
                height: 7,
                borderRadius: 999,
                background: n === i ? "#818cf8" : "#334155",
                transition: "all .25s",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          {last ? (
            <button style={btn} onClick={() => setI(i - 1)}>Back</button>
          ) : (
            <button style={btn} onClick={onClose}>Skip</button>
          )}
          <button
            style={{ ...btn, background: "#2563eb", border: "none", fontWeight: 600, flex: 1 }}
            onClick={() => (last ? onClose() : setI(i + 1))}
          >
            {last ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
