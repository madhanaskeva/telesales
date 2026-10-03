// KPI tiles. tone: '' | dark | brand | success | warning | danger | lime
export function Kpi({ num, label, value, meta, tone, title }) {
  return (
    <div className={`kpi${tone ? ` kpi--${tone}` : ''}`} title={title}>
      <div className="kpi-head"><span className="kpi-label">{num ? `${num} · ` : ''}{label}</span></div>
      <div className="kpi-value">{value}</div>
      {meta !== undefined && <div className="kpi-meta">{meta}</div>}
    </div>
  );
}

// A grid of tiles numbered 01, 02, … in order
export function KpiGrid({ items, start = 0 }) {
  return (
    <div className="kpi-grid">
      {items.map((k, i) => <Kpi key={k.label} {...k} num={String(start + i + 1).padStart(2, '0')} />)}
    </div>
  );
}
