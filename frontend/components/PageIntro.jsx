export default function PageIntro({ label, eyebrow, title, sub }) {
  return (
    <>
      <div className="sc-label">▸ {label}</div>
      <section className="sc-card sc-intro">
        <div className="sc-eyebrow">{eyebrow}</div>
        <h2 className="sc-title">{title}</h2>
        <p className="sc-sub">{sub}</p>
      </section>
    </>
  );
}
