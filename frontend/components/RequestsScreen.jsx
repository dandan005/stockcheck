import LoadingCards from "./LoadingCards.jsx";
import { useEffect, useState, useRef } from "react";
import { getRequests, createRequest, updateRequest, deleteRequest, getCheckers, submitStatus, getChecksForRequest } from "../lib/api.js";
import { loadKV } from "../lib/itemsCache.js";
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

  async function load(showSpinner = true) {
    setError("");
    if (showSpinner) setLoading(true);
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
    (async () => {
      const [cr, cc] = await Promise.all([loadKV("requests"), loadKV("checkers")]);
      const hadCache = Boolean(cr || cc);
      if (cr) setRequests(cr);
      if (cc) setCheckers(cc);
      if (hadCache) setLoading(false);
      load(!hadCache);
    })();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createRequest({ assignedTo: assignedTo || null, notes });
      setAssignedTo("");
      setNotes("");
      await load(false);
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
      await load(false); // roll back to server truth if the update genuinely failed
    }
  }

  async function handleEditSave(id) {
    setError("");
    try {
      await updateRequest(id, { notes: editNotes });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, notes: editNotes } : r)));
      setEditingId(null);
    } catch (err) {
      showRowError(id, err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this request? This cannot be undone and will remove any item counts already logged against it.")) return;
    setError("");
    try {
      await deleteRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      showRowError(id, err.message);
    }
  }

  async function handleReassign(id, newAssignee) {
    setError("");
    try {
      await updateRequest(id, { assignedTo: newAssignee || null });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, assigned_to: newAssignee || null } : r)));
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
          const { margin: cardMargin, marginTop: cardMT, marginBottom: cardMB, ...cardBase } = card;
          return (
            <div key={r.id} style={{ display: "flex", overflow: openMenuId === r.id && canReassign(r) ? "hidden" : "visible", margin: cardMargin, marginTop: cardMT, marginBottom: cardMB, borderRadius: card.borderRadius }}>
              {canReassign(r) && (
                <div style={{ order: 2, flex: "none", overflow: "hidden", display: canReassign(r) && openMenuId === r.id ? "flex" : "none", width: 132 }}>
                  <button
                    onClick={() => { setEditingId(r.id); setEditNotes(r.notes || ""); setOpenMenuId(null); }}
                    style={{ flex: 1, minWidth: 66, whiteSpace: "nowrap", border: "none", background: "#2563eb", color: "#fff", fontSize: 14, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { setOpenMenuId(null); handleDelete(r.id); }}
                    style={{ flex: 1, minWidth: 66, whiteSpace: "nowrap", border: "none", background: "#dc2626", color: "#fff", fontSize: 14, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              )}
              <div
                onTouchStart={(e) => {
                  e.currentTarget.dataset.sx = e.touches[0].clientX;
                  e.currentTarget.dataset.sy = e.touches[0].clientY;
                }}
                onTouchEnd={(e) => {
                  if (!canReassign(r) || editingId === r.id) return;
                  const dx = e.changedTouches[0].clientX - Number(e.currentTarget.dataset.sx);
                  const dy = e.changedTouches[0].clientY - Number(e.currentTarget.dataset.sy);
                  if (isNaN(dx) || isNaN(dy)) return;
                  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
                  setOpenMenuId(dx < 0 ? r.id : null);
                }}
                onClick={() => { if (openMenuId === r.id) setOpenMenuId(null); }}
                style={{ ...cardBase, borderLeft: "3px solid " + a, flex: 1, minWidth: 0, touchAction: "pan-y", borderTopLeftRadius: card.borderRadius, borderBottomLeftRadius: card.borderRadius, borderTopRightRadius: canReassign(r) && openMenuId === r.id ? 0 : card.borderRadius, borderBottomRightRadius: canReassign(r) && openMenuId === r.id ? 0 : card.borderRadius }}
              >
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
            </div>
          );
        })
      )}
    </div>
  );
}
