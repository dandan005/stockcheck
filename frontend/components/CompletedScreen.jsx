import LoadingCards from "./LoadingCards.jsx";
import { useEffect, useState } from "react";
import {
  getRequests,
  getCheckers,
  getChecksForRequest,
  downloadReport,
} from "../lib/api.js";

function toReportRows(checks) {
  return checks
    .map((c) => {
      const expected = Number(c.expected_qty ?? 0);
      const counted = Number(c.counted_qty ?? 0);
      return {
        sku: c.items?.sku ?? "",
        name: c.items?.name ?? "",
        location: c.items?.location ?? "",
        expectedQty: expected,
        countedQty: counted,
        variance: counted - expected,
      };
    })
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

const btn = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f8fafc",
  fontSize: 14,
  cursor: "pointer",
};

const headBtn = {
  display: "block",
  width: "100%",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
  textAlign: "left",
};

export default function CompletedScreen() {
  const [requests, setRequests] = useState([]);
  const [checkers, setCheckers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [rowsById, setRowsById] = useState({});
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [reqs, chk] = await Promise.all([getRequests(), getCheckers()]);
        setRequests(reqs.filter((r) => r.status === "completed"));
        setCheckers(chk);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadRows(id) {
    if (rowsById[id]) return rowsById[id];
    const rows = toReportRows(await getChecksForRequest(id));
    setRowsById((prev) => ({ ...prev, [id]: rows }));
    return rows;
  }

  async function toggleCard(id) {
    setError("");
    if (expandedId === id) return setExpandedId(null);
    setExpandedId(id);
    try {
      await loadRows(id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function download(r) {
    setError("");
    setBusyId(r.id);
    try {
      const rows = await loadRows(r.id);
      if (rows.length === 0) throw new Error("No counts recorded for this request.");
      await downloadReport(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const nameOf = (id) => checkers.find((c) => c.id === id)?.full_name || id;

  return (
    <div>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {loading ? (
        <LoadingCards />
      ) : requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          No completed checks yet.
        </div>
      ) : (
        requests.map((r) => {
          const rows = rowsById[r.id];
          const diffs = rows ? rows.filter((x) => x.variance !== 0).length : 0;
          const expanded = expandedId === r.id;
          return (
            <div
              key={r.id}
              style={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <button
                onClick={() => toggleCard(r.id)}
                aria-expanded={expanded}
                style={headBtn}
              >
                <span
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <strong style={{ fontSize: 16 }}>{r.notes || "Stock check"}</strong>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#14532d",
                        color: "#86efac",
                      }}
                    >
                      completed
                    </span>
                    <span
                      style={{
                        color: "#94a3b8",
                        transition: "transform .2s",
                        transform: expanded ? "rotate(180deg)" : "none",
                      }}
                    >
                      ▾
                    </span>
                  </span>
                </span>
                <span style={{ display: "block", fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  Created {new Date(r.created_at).toLocaleDateString()}
                  {r.assigned_to && " · Checked by " + nameOf(r.assigned_to)}
                </span>
              </button>

              {expanded && (
                <div style={{ animation: "sc-fade-up .25s ease-out both", display: "flex", flexDirection: "column" }}>
                  {rows && (
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>
                      {rows.length} item{rows.length === 1 ? "" : "s"} counted · {diffs} with variance
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, order: 99 }}>
                    <button
                      style={{ ...btn, background: "#2563eb", border: "none" }}
                      disabled={busyId === r.id}
                      onClick={() => download(r)}
                    >
                      {busyId === r.id ? "Preparing…" : "Download report"}
                    </button>
                  </div>

                  {!rows && !error && (
                    <div className="sc-skel" style={{ height: 60, marginTop: 12 }} />
                  )}
                  {rows && (
                    <div style={{ overflowX: "auto", marginTop: 12 }}>
                      {rows.length === 0 ? (
                        <p style={{ color: "#94a3b8" }}>No counts recorded.</p>
                      ) : (
                        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                          <thead>
                            <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                              <th style={{ padding: "6px 8px 6px 0" }}>Item</th>
                              <th style={{ padding: 6, textAlign: "right" }}>Exp</th>
                              <th style={{ padding: 6, textAlign: "right" }}>Cnt</th>
                              <th style={{ padding: 6, textAlign: "right" }}>Var</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((x, i) => (
                              <tr key={i} style={{ borderTop: "1px solid #1e293b" }}>
                                <td style={{ padding: "6px 8px 6px 0" }}>
                                  <div>{x.name}</div>
                                  <div style={{ color: "#64748b", fontSize: 12 }}>{x.sku}</div>
                                </td>
                                <td style={{ padding: 6, textAlign: "right" }}>{x.expectedQty}</td>
                                <td style={{ padding: 6, textAlign: "right" }}>{x.countedQty}</td>
                                <td
                                  style={{
                                    padding: 6,
                                    textAlign: "right",
                                    fontWeight: x.variance !== 0 ? 700 : 400,
                                    color: x.variance !== 0 ? "#f87171" : "#94a3b8",
                                  }}
                                >
                                  {x.variance > 0 ? "+" + x.variance : x.variance}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
