import { useEffect, useState } from "react";
import { getItems, submitCheck, getChecksForRequest } from "../lib/api.js";
import BarcodeScanner from "./BarcodeScanner.jsx";
import { usePendingChecks } from "../lib/offlineQueue.js";

export default function CountScreen({ request, onBack }) {
  const [items, setItems] = useState([]);
  const [checks, setChecks] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [countedQty, setCountedQty] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = usePendingChecks().filter((p) => p.requestId === request.id);

  async function load() {
    try {
      const [allItems, existingChecks] = await Promise.all([
        getItems(),
        getChecksForRequest(request.id),
      ]);
      setItems(allItems);
      setChecks(existingChecks);
    } catch (err) {
      if (!(err instanceof TypeError)) setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [pending.length]);

  function handleScan(code) {
    setScannerOpen(false);
    const match = items.find((it) => it.sku === code || it.barcode === code);
    if (match) {
      selectItem(match);
      setError("");
    } else {
      setError(`No item found for scanned code "${code}"`);
    }
  }

  function selectItem(it) {
    setSelectedItemId(it.id);
    setItemSearch(`${it.sku} — ${it.name}`);
  }

  function clearSelection() {
    setSelectedItemId("");
    setItemSearch("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedItemId || countedQty === "") return;
    setSaving(true);
    setError("");
    try {
      await submitCheck({
        requestId: request.id,
        itemId: selectedItemId,
        countedQty: Number(countedQty),
        method: "manual",
      });
      clearSelection();
      setCountedQty("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const input = {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: "15px",
  };

  const selectedItem = items.find((it) => it.id === selectedItemId);

  const q = itemSearch.trim().toLowerCase();
  const showResults = q && !selectedItem;
  const matches = showResults
    ? items
        .filter((it) => it.sku?.toLowerCase().includes(q) || it.name?.toLowerCase().includes(q))
        .slice(0, 30)
    : [];

  return (
    <div>
      <button onClick={onBack} style={{ ...input, marginBottom: 16, cursor: "pointer" }}>
        ← Back to requests
      </button>
      <h2>Counting: {request.notes || "Stock check"}</h2>

      {scannerOpen ? (
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} label="Count" />
      ) : (
        <button onClick={() => setScannerOpen(true)}
          style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer", marginBottom: 12 }}>
          Scan barcode
        </button>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <input
            style={{ ...input, width: "100%", boxSizing: "border-box" }}
            placeholder="Type SKU or item name…"
            value={itemSearch}
            onChange={(e) => {
              setItemSearch(e.target.value);
              if (selectedItemId) setSelectedItemId("");
            }}
          />
          {selectedItemId && (
            <button
              type="button"
              onClick={clearSelection}
              style={{
                position: "absolute", right: 6, top: 6, bottom: 6,
                background: "transparent", border: "none", color: "#94a3b8",
                cursor: "pointer", fontSize: 16, padding: "0 8px",
              }}
            >
              ✕
            </button>
          )}
          {showResults && (
            <ul style={{
              listStyle: "none", margin: 0, padding: 0, position: "absolute",
              top: "100%", left: 0, right: 0, background: "#0f172a",
              border: "1px solid #334155", borderRadius: 8, maxHeight: 240,
              overflowY: "auto", zIndex: 10,
            }}>
              {matches.length === 0 ? (
                <li style={{ padding: "10px", color: "#94a3b8" }}>No matches</li>
              ) : (
                matches.map((it) => (
                  <li
                    key={it.id}
                    onClick={() => selectItem(it)}
                    style={{ padding: "10px", borderBottom: "1px solid #1e293b", cursor: "pointer" }}
                  >
                    <strong>{it.sku}</strong> — {it.name}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {selectedItem && (
          <p style={{ color: "#94a3b8", margin: 0 }}>📍 {selectedItem.location || "no location"}</p>
        )}
        <input style={input} type="number" placeholder="Counted qty" value={countedQty}
          onChange={(e) => setCountedQty(e.target.value)} required />
        <button type="submit" disabled={saving || !selectedItemId}
          style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer" }}>
          {saving ? "Saving…" : "Submit count"}
        </button>
      </form>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      <h3>Counted so far ({checks.length + pending.length})</h3>
{pending.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {pending.map((p) => {
            const it = items.find((x) => x.id === p.itemId);
            return (
              <li key={p.itemId} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b", color: "#fde68a" }}>
                ⏳ <strong>{it?.sku ?? "item"}</strong> — {it?.name}: counted {p.countedQty}
                {it?.location && ` · 📍 ${it.location}`} — waiting to sync
              </li>
            );
          })}
        </ul>
      )}
      {checks.length === 0 && pending.length === 0 ? (
        <p>Nothing counted yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {checks.map((c) => (
            <li key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
              <strong>{c.items?.sku}</strong> — {c.items?.name}: counted {c.counted_qty}
              {c.items?.location && <span style={{ color: "#94a3b8" }}> · 📍 {c.items.location}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
