import LoadingCards from "./LoadingCards.jsx";
import { useEffect, useState, useRef } from "react";
import { getRequests, createRequest, updateRequest, deleteRequest, getCheckers, submitStatus, getChecksForRequest } from "../lib/api.js";
import { usePendingChecks } from "../lib/offlineQueue.js";

export default function RequestsScreen({ user, onOpenCount }) {
  const [requests, setRequests] = useState([]);
  const [checkers, setCheckers] = useState([]);
  const pendingChecks = usePendingChecks();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rowError, setRowError] = useState(null);
  const rowErrorTimeout = useRef(null);

  function showRowError(id, message) {
    if (rowErrorTimeout.current) clearTimeout(rowErrorTimeout.current);
    setRowError({ id, message });
    rowErrorTimeout.current = setTimeout(() => setRowError(null), 5000);
  }
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || user?.role === "requester";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [reqs, checkerList] = await Promise.all([getRequests(), getCheckers()]);
      setRequests(reqs);
      setCheckers(checkerList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createRequest({ assignedTo: assignedTo || null, notes });
      setAssignedTo("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id, status) {
    if (status === "completed") {
      const hasPendingForThis = pendingChecks.some(
        (c) => (c.requestId ?? c.request_id) === id
      );
      if (!hasPendingForThis) {
        try {
          const checks = await getChecksForRequest(id);
          if (!checks || checks.length === 0) {
            showRowError(id, "Count at least one item before marking this complete.");
            return;
          }
        } catch (err) {
          showRowError(id, err.message);
          return;
        }
      }
    }
    // Optimistic local update so Start/Complete reflect immediately even offline
    // (an offline reload would otherwise show stale cached data).
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await submitStatus(id, status);
    } catch (err) {
      showRowError(id, err.message);
      await load(); // roll back to server truth if the update genuinely failed
    }
  }

  async function handleEditSave(id) {
    setError("");
    try {
      await updateRequest(id, { notes: editNotes });
      setEditingId(null);
      await load();
    } catch (err) {
      showRowError(id, err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this request? This cannot be undone and will remove any item counts already logged against it.")) return;
    setError("");
    try {
      await deleteRequest(id);
      await load();
    } catch (err) {
      showRowError(id, err.message);
    }
  }

  async function handleReassign(id, newAssignee) {
    setError("");
    try {
      await updateRequest(id, { assignedTo: newAssignee || null });
      await load();
    } catch (err) {
      setError(err.message);
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

  // Requesters can reassign only their own requests; admins can reassign any.
  const visible = requests.filter((r) => r.status !== "completed");

  function canReassign(r) {
    return isAdmin || (user?.role === "requester" && r.requested_by === user?.id);
  }

  const pill = {
    open: { bg: "#1e3a8a", fg: "#93c5fd" },
    in_progress: { bg: "#78350f", fg: "#fcd34d" },
    completed: { bg: "#14532d", fg: "#86efac" },
  };
  const accent = {
    open: "#3b82f6",
    in_progress: "#f59e0b",
    completed: "#22c55e",
  };
  const card = {
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  };
  const smallBtn = { ...input, padding: "8px 12px", fontSize: 14, cursor: "pointer" };
  const primaryBtn = { ...smallBtn, background: "#2563eb", border: "none" };
  const nameOf = (id) => checkers.find((c) => c.id === id)?.full_name || id;
  const [newRequestOpen, setNewRequestOpen] = useState(false);

  return (
    <div>

      {canCreate && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setNewRequestOpen((o) => !o)}
              style={{
                ...input,
                width: "100%",
                fontWeight: 600,
                cursor: "pointer",
                background: newRequestOpen ? "#1e293b" : "#2563eb",
                border: newRequestOpen ? "1px solid #334155" : "none",
              }}
            >
              {newRequestOpen ? "Close" : "+ New request"}
            </button>
          </div>
          {newRequestOpen && (
          <form onSubmit={handleCreate} style={{ ...card, display: "grid", gap: 8, marginBottom: 20 }}>
            <div style={{ fontWeight: 600 }}>New request</div>
          <select style={input} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {checkers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name || c.id}</option>
            ))}
          </select>
          <input
            style={input}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "Creating…" : "Create request"}
          </button>
          </form>
          )}
        </>
      )}

      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {loading ? (
        <LoadingCards />
      ) : visible.length === 0 ? (
        <div
          style={{
            minHeight: "calc(100vh - 500px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 16px",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {user?.role === "checker" ? "🎉" : "📋"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#f8fafc" }}>
            {user?.role === "checker" ? "All caught up" : "No open requests"}
          </div>
          <div style={{ fontSize: 14, marginTop: 6 }}>
            {user?.role === "checker"
              ? "New stock checks assigned to you will show up here."
              : "Create a request above to get started."}
          </div>
          <button onClick={load} style={{ ...smallBtn, marginTop: 16 }}>
            ↻ Refresh
          </button>
        </div>
      ) : (
        visible.map((r) => {
          const c = pill[r.status] || pill.open;
          const a = accent[r.status] || accent.open;
          const mine = user?.id === r.assigned_to;
          return (
            <div key={r.id} style={{ ...card, borderLeft: "3px solid " + a }}>
             <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                {editingId === r.id ? (
                  <textarea
                    style={{ ...input, flex: 1, fontSize: 15, resize: "vertical", minHeight: 44 }}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                ) : (
                  <strong style={{ fontSize: 16 }}>{r.notes || "Stock check"}</strong>
                )}
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>
                    Created {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: c.bg,
                      color: c.fg,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                  {canReassign(r) && (
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                       style={{ ...smallBtn, padding: "4px 10px", borderRadius: 8, marginRight: -2 }}
                      >
                        ⋮
                      </button>
                      {openMenuId === r.id && (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "110%",
                            background: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: 8,
                            overflow: "hidden",
                            zIndex: 10,
                            minWidth: 110,
                          }}
                        >
                          <button
                            onClick={() => { setEditingId(r.id); setEditNotes(r.notes || ""); setOpenMenuId(null); }}
                            style={{ display: "block", width: "100%", padding: "8px 12px", background: "none", border: "none", color: "#f8fafc", textAlign: "left", cursor: "pointer" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); handleDelete(r.id); }}
                            style={{ display: "block", width: "100%", padding: "8px 12px", background: "none", border: "none", color: "#f87171", textAlign: "left", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {editingId === r.id && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => handleEditSave(r.id)} style={primaryBtn}>Save</button>
                  <button onClick={() => setEditingId(null)} style={smallBtn}>Cancel</button>
                </div>
              )}
              {editingId === r.id ? (
                <select
                  style={{ ...input, marginTop: 8, fontSize: 13, padding: "6px 10px", width: "auto", display: "inline-block", borderRadius: 999, background: "#1e293b" }}
                  value={r.assigned_to || ""}
                  onChange={(e) => handleReassign(r.id, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {checkers.map((ck) => (
                    <option key={ck.id} value={ck.id}>{ck.full_name || ck.id}</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  {r.assigned_to ? "Assigned to: " + nameOf(r.assigned_to) : "Unassigned"}
                </div>
              )}
              {mine && (r.status === "open" || r.status === "in_progress") && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {r.status === "open" && (
                    <button onClick={() => handleStatus(r.id, "in_progress")} style={primaryBtn}>
                      Start
                    </button>
                  )}
                  {r.status === "in_progress" && (
                    <>
                      <button onClick={() => handleStatus(r.id, "completed")} style={smallBtn}>
                        Mark complete
                      </button>
                      <button onClick={() => onOpenCount?.(r)} style={primaryBtn}>
                        Count items
                      </button>
                    </>
                  )}
                </div>
              )}
              {rowError && rowError.id === r.id && (
                <div style={{ fontSize: 13, color: "#f87171", marginTop: 8 }}>
                  {rowError.message}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
