import LoadingCards from "./LoadingCards.jsx";
import { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../lib/api.js";
import { loadKV } from "../lib/itemsCache.js";

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
  const [swipeId, setSwipeId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  async function load(showSpinner = true) {
    setError("");
    if (showSpinner) setLoading(true);
    try {
      setUsers(await getUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const cached = await loadKV("users");
      const hadCache = Boolean(cached);
      if (hadCache) {
        setUsers(cached);
        setLoading(false);
      }
      load(!hadCache);
    })();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createUser(form);
      setForm({ email: "", password: "", fullName: "", role: "requester" });
      await load();
      setAddOpen(false);
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
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#e8ecf2",
    fontSize: "15px",
  };
  const smallBtn = { ...input, padding: "7px 12px", fontSize: 13, cursor: "pointer" };
  const roleStyle = {
    admin: { bg: "#78350f", fg: "#fcd34d" },
    requester: { bg: "#1e3a8a", fg: "#93c5fd" },
    checker: { bg: "#14532d", fg: "#86efac" },
  };
  const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

  return (
    <div>
      {!editingId && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setAddOpen((o) => !o)}
            style={{
              ...input,
              width: "100%",
              fontWeight: 600,
              cursor: "pointer",
              background: addOpen ? "#1e293b" : "#3b5bdb",
              border: addOpen ? "1px solid #334155" : "none",
            }}
          >
            {addOpen ? "Close" : "+ Add user"}
          </button>
          {addOpen && (
            <form
              onSubmit={handleAdd}
              className="sc-card"
              style={{ display: "grid", gap: 8, padding: 14, marginTop: 10 }}
            >
              <input style={input} type="email" placeholder="Email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input style={input} type="password" placeholder="Password" autoComplete="new-password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <input style={input} placeholder="Full name (optional)" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <select style={input} value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button type="submit" disabled={saving}
                style={{ ...input, background: "#3b5bdb", border: "none", cursor: "pointer" }}>
                {saving ? "Creating…" : "Create user"}
              </button>
            </form>
          )}
        </div>
      )}

      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {loading ? (
        <LoadingCards />
      ) : users.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
          No users yet.
        </div>
      ) : (
        <>
          <div className="sc-label">{users.length} users</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[...users].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role)).map((u) => {
              const rs = roleStyle[u.role] || roleStyle.requester;
              const name = u.full_name || u.email || "?";
              return (
                <li key={u.id} style={{ marginBottom: 10 }}>
                  <div
                    className="sc-card"
                    onClick={() => { if (editingId !== u.id) setSwipeId(swipeId === u.id ? null : u.id); }}
                    style={{ padding: 12 }}
                  >
                    {editingId === u.id ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontSize: 13, color: "#94a3b8", ...ellipsis }}>{u.email}</div>
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
                            style={{ ...smallBtn, background: "#3b5bdb", border: "none" }}
                          >
                            {savingEdit ? "Saving…" : "Save"}
                          </button>
                          <button onClick={cancelEdit} style={smallBtn}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                          style={{
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "linear-gradient(160deg, #6366f1, #4338ca)",
                            color: "#fff",
                            fontWeight: 700,
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, ...ellipsis }}>
                            {name}
                            {u.id === user?.id && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: "#fde9b8", letterSpacing: 1 }}>
                                YOU
                              </span>
                            )}
                          </div>
                          {u.full_name && (
                            <div style={{ fontSize: 13, color: "#94a3b8", ...ellipsis }}>{u.email}</div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: rs.bg,
                            color: rs.fg,
                            textTransform: "capitalize",
                          }}
                        >
                          {u.role}
                        </span>
                      </div>
                    )}
                  {swipeId === u.id && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => { startEdit(u); setSwipeId(null); }}
                        style={{ ...smallBtn, background: "#3b5bdb", border: "none", width: 70, textAlign: "center" }}
                      >
                        Edit
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => { setSwipeId(null); handleDelete(u); }}
                          disabled={deletingId === u.id}
                          style={{ ...smallBtn, background: "#dc2626", border: "none", width: 70, textAlign: "center" }}
                        >
                          {deletingId === u.id ? "…" : "Delete"}
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
