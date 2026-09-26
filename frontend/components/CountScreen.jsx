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
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#e8ecf2",
    fontSize: 15,
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
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#e8ecf2", fontSize: 14, marginBottom: 20, cursor: "pointer",
        }}
      >
        ← Back to requests
      </button>

      <div style={{ fontSize: 11, letterSpacing: 3, color: "#8a94a6", textTransform: "uppercase", marginBottom: 6 }}>
        Counting
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fde9b8", margin: "0 0 20px 0", letterSpacing: 0.5 }}>
        {request.notes || "Stock check"}
      </h1>

      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        {scannerOpen ? (
          <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} label="Count" />
        ) : (
          <button
            onClick={() => setScannerOpen(true)}
            style={{ width: "100%", padding: 13, border: "none", borderRadius: 10, background: "#334155", color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 12, cursor: "pointer" }}
          >
            Scan barcode
          </button>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 0 }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <input
              style={input}
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
                top: "100%", left: 0, right: 0, background: "#111827",
                border: "1px solid #1e293b", borderRadius: 10, maxHeight: 240,
                overflowY: "auto", zIndex: 10, marginTop: 4,
              }}>
                {matches.length === 0 ? (
                  <li style={{ padding: 10, color: "#94a3b8", fontSize: 14 }}>No matches</li>
                ) : (
                  matches.map((it) => (
                    <li
                      key={it.id}
                      onClick={() => selectItem(it)}
                      style={{ padding: 10, borderBottom: "1px solid #1e293b", cursor: "pointer", fontSize: 14 }}
                    >
                      <strong>{it.sku}</strong> — {it.name}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          {selectedItem && (
            <p style={{ color: "#94a3b8", margin: "0 0 12px 0", fontSize: 13 }}>📍 {selectedItem.location || "no location"}</p>
          )}
          <input style={{ ...input, marginBottom: 12 }} type="number" placeholder="Counted qty" value={countedQty}
            onChange={(e) => setCountedQty(e.target.value)} required />
          <button
            type="submit"
            disabled={saving || !selectedItemId}
            style={{ width: "100%", padding: 13, border: "none", borderRadius: 10, background: "#3b5bdb", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            {saving ? "Saving…" : "Submit count"}
          </button>
        </form>
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

      <div style={{ fontSize: 15, fontWeight: 700, color: "#e8ecf2", margin: "0 0 12px 0" }}>
        Counted so far ({checks.length + pending.length})
      </div>

      {pending.length > 0 && pending.map((p) => {
        const it = items.find((x) => x.id === p.itemId);
        return (
          <div key={p.itemId} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#111827", border: "1px solid #1e293b", borderLeft: "3px solid #ca8a04",
            borderRadius: 12, padding: "12px 14px", marginBottom: 10,
          }}>
            <div>
              <div style={{ fontSize: 14, color: "#e8ecf2" }}>{it?.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {it?.sku ?? "item"}{it?.location && ` · 📍 ${it.location}`} · waiting to sync
              </div>
            </div>
            <div style={{ fontSize: 13, padding: "4px 10px", borderRadius: 999, background: "#3f2d0a", color: "#fde68a", fontWeight: 600, flexShrink: 0 }}>
              {p.countedQty}
            </div>
          </div>
        );
      })}

      {checks.length === 0 && pending.length === 0 ? (
        <p style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: 14 }}>Nothing counted yet.</p>
      ) : (
        checks.map((c) => (
          <div key={c.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#111827", border: "1px solid #1e293b",
            borderRadius: 12, padding: "12px 14px", marginBottom: 10,
          }}>
            <div>
              <div style={{ fontSize: 14, color: "#e8ecf2" }}>{c.items?.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {c.items?.sku}{c.items?.location && ` · 📍 ${c.items.location}`}
              </div>
            </div>
            <div style={{ fontSize: 13, padding: "4px 10px", borderRadius: 999, background: "#14532d", color: "#86efac", fontWeight: 600, flexShrink: 0 }}>
              {c.counted_qty}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
