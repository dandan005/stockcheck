import { useEffect, useState } from "react";
import { getRequests, createRequest, updateRequest, getCheckers, submitStatus } from "../lib/api.js";

export default function RequestsScreen({ user, onOpenCount }) {
  const [requests, setRequests] = useState([]);
  const [checkers, setCheckers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
    setError("");
    // Optimistic local update so Start/Complete reflect immediately even offline
    // (an offline reload would otherwise show stale cached data).
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await submitStatus(id, status);
    } catch (err) {
      setError(err.message);
      await load(); // roll back to server truth if the update genuinely failed
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

  return (
    <div>
      <h2>Stock Check Requests</h2>

      {canCreate && (
        <form onSubmit={handleCreate} style={{ display: "grid", gap: 8, marginBottom: 20, maxWidth: 360 }}>
          <select style={input} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {checkers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name || c.id}</option>
            ))}
          </select>
          <input style={input} placeholder="Notes (optional)" value={notes}
            onChange={(e) => setNotes(e.target.value)} />
          <button type="submit" disabled={saving}
            style={{ ...input, background: "#2563eb", border: "none", cursor: "pointer" }}>
            {saving ? "Creating…" : "New request"}
          </button>
        </form>
      )}

      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : visible.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {visible.map((r) => (
            <li key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
              <div><strong>{r.status}</strong> {r.notes ? `— ${r.notes}` : ""}</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                Created {new Date(r.created_at).toLocaleDateString()}
              </div>
              {canReassign(r) ? (
                <select
                  style={{ ...input, marginTop: 6, fontSize: 13, padding: "6px 8px" }}
                  value={r.assigned_to || ""}
                  onChange={(e) => handleReassign(r.id, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {checkers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name || c.id}</option>
                  ))}
                </select>
              ) : (
                r.assigned_to && (
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>
                    Assigned to: {checkers.find((c) => c.id === r.assigned_to)?.full_name || r.assigned_to}
                  </div>
                )
              )}
              {r.status === "open" && user?.id === r.assigned_to && (
                <button onClick={() => handleStatus(r.id, "in_progress")}
                  style={{ ...input, marginTop: 6, cursor: "pointer" }}>
                  Start
                </button>
              )}
              {r.status === "in_progress" && user?.id === r.assigned_to && (
                <button onClick={() => handleStatus(r.id, "completed")}
                  style={{ ...input, marginTop: 6, cursor: "pointer" }}>
                  Mark complete
                </button>
              )}
              {r.status === "in_progress" && user?.id === r.assigned_to && (
                <button onClick={() => onOpenCount?.(r)}
                  style={{ ...input, marginTop: 6, marginLeft: 6, background: "#2563eb", border: "none", cursor: "pointer" }}>
                  Count items
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
