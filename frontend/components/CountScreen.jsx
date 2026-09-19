import { useEffect, useState } from "react";
import { getItems, submitCheck, getChecksForRequest } from "../lib/api.js";
import BarcodeScanner from "./BarcodeScanner.jsx";

export default function CountScreen({ request, onBack }) {
  const [items, setItems] = useState([]);
  const [checks, setChecks] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [countedQty, setCountedQty] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [allItems, existingChecks] = await Promise.all([
        getItems(),
        getChecksForRequest(request.id),
      ]);
      setItems(allItems);
      setChecks(existingChecks);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleScan(code) {
    setScannerOpen(false);
    const match = items.find((it) => it.sku === code || it.barcode === code);
    if (match) {
      setSelectedItemId(match.id);
      setError("");
    } else {
      setError(`No item found for scanned code "${code}"`);
    }
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
      setSelectedItemId("");
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

  return (
    <div>
      <button onClick={onBack} style={{ ...input, marginBottom: 16, cursor: "pointer" }}>
        ← Back to requests
      </button>
      <h2>Counting: {request.notes || "Stock check"}</h2>

      {scannerOpen ? (
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
      ) : (
        <button onClick={() => setScannerOpen(true)}
          style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer", marginBottom: 12 }}>
          Scan barcode
        </button>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 360, marginBottom: 20 }}>
        <select style={input} value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
          <option value="">Select item…</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>{it.sku} — {it.name}</option>
          ))}
        </select>
        {selectedItem && (
          <p style={{ color: "#94a3b8", margin: 0 }}>Expected: {selectedItem.expected_qty}</p>
        )}
        <input style={input} type="number" placeholder="Counted qty" value={countedQty}
          onChange={(e) => setCountedQty(e.target.value)} required />
        <button type="submit" disabled={saving || !selectedItemId}
          style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer" }}>
          {saving ? "Saving…" : "Submit count"}
        </button>
      </form>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      <h3>Counted so far ({checks.length})</h3>
      {checks.length === 0 ? (
        <p>Nothing counted yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {checks.map((c) => (
            <li key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
              <strong>{c.items?.sku}</strong> — {c.items?.name}: expected {c.expected_qty}, counted {c.counted_qty}
              {c.variance !== 0 && <span style={{ color: "#f87171" }}> (variance {c.variance})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
