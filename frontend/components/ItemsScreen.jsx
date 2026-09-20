import { useEffect, useState } from "react";
import { getItems, createItem, updateItem, deleteItem } from "../lib/api.js";
import BarcodeScanner from "./BarcodeScanner.jsx";

export default function ItemsScreen({ user }) {
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ sku: "", name: "", barcode: "", location: "", expectedQty: 0 });
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await getItems());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createItem({ ...form, barcode: form.barcode.trim() || null, expectedQty: Number(form.expectedQty) || 0 });
      setForm({ sku: "", name: "", barcode: "", location: "", expectedQty: 0 });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(code) {
    const target = items.find((x) => x.id === assigningId);
    setAssigningId(null);
    if (!target) return;
    const clash = items.find((x) => x.id !== target.id && x.barcode === code);
    if (clash) {
      setError(`Barcode ${code} is already assigned to ${clash.sku}`);
      return;
    }
    if (
      target.barcode &&
      !window.confirm(`Replace barcode ${target.barcode} on ${target.sku} with ${code}?`)
    ) {
      return;
    }
    setError("");
    try {
      await updateItem(target.id, { barcode: code });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(it) {
    setError("");
    setEditingId(it.id);
    setEditForm({
      sku: it.sku,
      name: it.name,
      barcode: it.barcode || "",
      location: it.location || "",
      expectedQty: it.expected_qty ?? 0,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function handleSaveEdit(id) {
    setSavingEdit(true);
    setError("");
    try {
      await updateItem(id, {
        ...editForm,
        barcode: editForm.barcode.trim() || null,
        expectedQty: Number(editForm.expectedQty) || 0,
      });
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(it) {
    if (!window.confirm(`Delete "${it.sku} — ${it.name}"? This cannot be undone.`)) return;
    setDeletingId(it.id);
    setError("");
    try {
      await deleteItem(it.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
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

  const assigningItem = items.find((x) => x.id === assigningId);

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? items.filter(
        (it) =>
          it.sku?.toLowerCase().includes(q) ||
          it.name?.toLowerCase().includes(q) ||
          it.barcode?.toLowerCase().includes(q)
      )
    : items;

  return (
    <div>
      <h2>Items</h2>

      {isAdmin && !editingId && !q && !searchFocused && (
      <form onSubmit={handleAdd} style={{ display: "grid", gap: 8, marginBottom: 20, maxWidth: 360 }}>
        <input style={input} placeholder="SKU" value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
        <input style={input} placeholder="Barcode (optional)" value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
        <input style={input} placeholder="Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input style={input} placeholder="Location" value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input style={input} type="number" placeholder="Expected qty" value={form.expectedQty}
          onChange={(e) => setForm({ ...form, expectedQty: e.target.value })} />
        <button type="submit" disabled={saving}
          style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer" }}>
          {saving ? "Adding…" : "Add item"}
        </button>
      </form>
      )}

      {assigningItem && (
        <div style={{ marginBottom: 16 }}>
          <p>Scan the barcode for <strong>{assigningItem.sku}</strong></p>
          <BarcodeScanner onScan={handleAssign} onClose={() => setAssigningId(null)} />
        </div>
      )}

      <input
        style={{ ...input, width: "100%", maxWidth: 360, marginBottom: 12, boxSizing: "border-box" }}
        placeholder="Search by SKU, name, or barcode…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
      />

      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No items yet.</p>
      ) : filteredItems.length === 0 ? (
        <p>No items match "{search}".</p>
      ) : (
        <>
          <p style={{ color: "#94a3b8", margin: "0 0 8px" }}>
            {q ? `${filteredItems.length} of ${items.length} items` : `${items.length} items`}
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {filteredItems.slice(0, 200).map((it) => (
              <li key={it.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                {editingId === it.id ? (
                  <div style={{ display: "grid", gap: 6, maxWidth: 360 }}>
                    <input style={input} placeholder="SKU" value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
                    <input style={input} placeholder="Name" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <input style={input} placeholder="Barcode (optional)" value={editForm.barcode}
                      onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })} />
                    <input style={input} placeholder="Location" value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                    <input style={input} type="number" placeholder="Expected qty" value={editForm.expectedQty}
                      onChange={(e) => setEditForm({ ...editForm, expectedQty: e.target.value })} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleSaveEdit(it.id)}
                        disabled={savingEdit}
                        style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer", padding: "6px 12px", fontSize: 13 }}
                      >
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ ...input, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <strong>{it.sku}</strong> — {it.name} ({it.location || "no location"}) — expected {it.expected_qty}
                    {it.barcode ? " — barcode " + it.barcode : ""}
                    {isAdmin && (
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          onClick={() => { setError(""); setAssigningId(it.id); }}
                          style={{ ...input, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
                        >
                          {it.barcode ? "Change barcode" : "Scan barcode"}
                        </button>
                        <button
                          onClick={() => startEdit(it)}
                          style={{ ...input, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(it)}
                          disabled={deletingId === it.id}
                          style={{ ...input, padding: "6px 10px", fontSize: 13, cursor: "pointer", color: "#f87171", borderColor: "#7f1d1d" }}
                        >
                          {deletingId === it.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {filteredItems.length > 200 && (
            <p style={{ color: "#94a3b8" }}>Showing first 200 — keep typing to narrow it down.</p>
          )}
        </>
      )}
    </div>
  );
}
