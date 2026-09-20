import LoadingCards from "./LoadingCards.jsx";
import { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../lib/api.js";

const ROLES = ["admin", "requester", "checker"];

export default function UsersScreen({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "requester" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setUsers(await getUsers());
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
      await createUser(form);
      setForm({ email: "", password: "", fullName: "", role: "requester" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(u) {
    setError("");
    setEditingId(u.id);
    setEditForm({ fullName: u.full_name || "", role: u.role });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function handleSaveEdit(id) {
    setSavingEdit(true);
    setError("");
    try {
      await updateUser(id, editForm);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete "${u.email}"? This permanently removes their login. Cannot be undone.`)) return;
    setDeletingId(u.id);
    setError("");
    try {
      await deleteUser(u.id);
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

  return (
    <div>

      {!editingId && (
        <form onSubmit={handleAdd} style={{ display: "grid", gap: 8, marginBottom: 20, maxWidth: 360 }}>
          <input style={input} type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={input} type="password" placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input style={input} placeholder="Full name (optional)" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <select style={input} value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" disabled={saving}
            style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer" }}>
            {saving ? "Adding…" : "Add user"}
          </button>
        </form>
      )}

      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {loading ? (
        <LoadingCards />
      ) : users.length === 0 ? (
        <p>No users yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {users.map((u) => (
            <li key={u.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
              {editingId === u.id ? (
                <div style={{ display: "grid", gap: 6, maxWidth: 360 }}>
                  <input style={input} placeholder="Full name" value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
                  <select style={input} value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleSaveEdit(u.id)}
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
                  <strong>{u.email}</strong>
                  {u.full_name ? ` — ${u.full_name}` : ""} — {u.role}
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => startEdit(u)}
                      style={{ ...input, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        style={{ ...input, padding: "6px 10px", fontSize: 13, cursor: "pointer", color: "#f87171", borderColor: "#7f1d1d" }}
                      >
                        {deletingId === u.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
