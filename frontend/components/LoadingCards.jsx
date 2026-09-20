export default function LoadingCards({ count = 3 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sc-card" style={{ padding: 14, marginBottom: 12 }}>
          <div className="sc-skel" style={{ height: 16, width: "55%" }} />
          <div className="sc-skel" style={{ height: 12, width: "35%", marginTop: 10 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div className="sc-skel" style={{ height: 34, width: 96, borderRadius: 8 }} />
            <div className="sc-skel" style={{ height: 34, width: 120, borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
