import LoadingCards from "./LoadingCards.jsx";
import { useEffect, useState } from "react";
import { getItems, createItem, updateItem, deleteItem } from "../lib/api.js";
import BarcodeScanner from "./BarcodeScanner.jsx";

export default function ItemsScreen({ user }) {
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
    const [form, setForm] = useState({ sku: "", name: "", barcode: "", location: "" });
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
      await createItem({ ...form, barcode: form.barcode.trim() || null });
      setForm({ sku: "", name: "", barcode: "", location: "" });
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

  const [addOpen, setAddOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(200);

  const input = {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: "15px",
  };
  const smallBtn = { ...input, padding: "7px 12px", fontSize: 13, cursor: "pointer" };
  const chip = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    padding: "3px 10px",
    borderRadius: 999,
    background: "#1e1b4b",
    color: "#a5b4fc",
    border: "1px solid #3730a3",
  };
  const tag = {
    fontSize: 12,
    padding: "3px 9px",
    borderRadius: 999,
    background: "#1e293b",
    color: "#cbd5e1",
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

  async function submitAdd(e) {
    await handleAdd(e);
    setAddOpen(false);
  }

  const empty = (text) => (
    <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
      {text}
    </div>
  );

  return (
    <div>
      {isAdmin && !editingId && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setAddOpen((o) => !o)}
            style={{
              ...input,
              width: "100%",
              fontWeight: 600,
              cursor: "pointer",
              background: addOpen ? "#1e293b" : "#2563eb",
              border: addOpen ? "1px solid #334155" : "none",
            }}
          >
            {addOpen ? "Close" : "+ Add item"}
          </button>
          {addOpen && (
            <form
              onSubmit={submitAdd}
              className="sc-card"
              style={{ display: "grid", gap: 8, padding: 14, marginTop: 10 }}
            >
              <input style={input} placeholder="SKU" value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
              <input style={input} placeholder="Barcode (optional)" value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              <input style={input} placeholder="Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input style={input} placeholder="Location (e.g. Ground floor, at the back of Bolton Bowl)" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <button type="submit" disabled={saving}
                style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer" }}>
                {saving ? "Adding…" : "Save item"}
              </button>
            </form>
          )}
        </div>
      )}

      {assigningItem && (
        <div className="sc-card" style={{ padding: 14, marginBottom: 12 }}>
          <p style={{ marginTop: 0 }}>Scan the barcode for <strong>{assigningItem.sku}</strong></p>
          <BarcodeScanner onScan={handleAssign} onClose={() => setAssigningId(null)} />
        </div>
      )}

      <div
        style={{
          position: "sticky",
          top: "64px",
          zIndex: 5,
          margin: "0 -16px 8px",
          padding: "8px 16px",
          backgroundColor: "#0f172a",
        }}
      >
        <input
          style={{ ...input, width: "100%", boxSizing: "border-box" }}
          placeholder="🔍  Search by SKU, name, or barcode…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisibleCount(200); }}
        />
      </div>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {loading ? (
        <LoadingCards />
      ) : items.length === 0 ? (
        empty("No items yet.")
      ) : filteredItems.length === 0 ? (
        empty("No items match your search.")
      ) : (
        <>
          <div className="sc-label">
            {q ? filteredItems.length + " of " + items.length + " items" : items.length + " items"}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filteredItems.slice(0, visibleCount).map((it) => (
              <li key={it.id} className="sc-card" style={{ padding: 12, marginBottom: 10 }}>
                {editingId === it.id ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <input style={input} placeholder="SKU" value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
                    <input style={input} placeholder="Name" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <input style={input} placeholder="Barcode (optional)" value={editForm.barcode}
                      onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })} />
                    <input style={input} placeholder="Location (e.g. Ground floor, at the back of Bolton Bowl)" value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleSaveEdit(it.id)}
                        disabled={savingEdit}
                        style={{ ...smallBtn, background: "#2563eb", border: "none" }}
                      >
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                      <button onClick={cancelEdit} style={smallBtn}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={chip}>{it.sku}</span>
                      {it.barcode && <span style={tag}>barcode {it.barcode}</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, margin: "8px 0 6px" }}>{it.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={tag}>📍 {it.location || "no location"}</span>
                    </div>
                    {isAdmin && (
                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          onClick={() => { setError(""); setAssigningId(it.id); }}
                          style={smallBtn}
                        >
                          {it.barcode ? "Change barcode" : "Scan barcode"}
                        </button>
                        <button onClick={() => startEdit(it)} style={smallBtn}>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(it)}
                          disabled={deletingId === it.id}
                          style={{ ...smallBtn, color: "#f87171", borderColor: "#7f1d1d" }}
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
          {filteredItems.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((c) => c + 200)}
              style={{ ...input, padding: "10px 14px", cursor: "pointer", width: "100%", background: "#1e293b", border: "1px solid #334155", fontWeight: 600 }}
            >
              Load more ({filteredItems.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
