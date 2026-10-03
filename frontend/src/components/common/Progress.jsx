// Progress bar with an optional caption (caption may be a node)
export default function Progress({ pct, caption, lg, color }) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="progress-row">
      <div className={`progress${lg ? ' progress-lg' : ''}`}>
        <div className="progress-bar" style={{ width: `${w}%`, ...(color ? { background: color } : {}) }} />
      </div>
      {caption !== undefined && <span className="progress-caption">{caption}</span>}
    </div>
  );
}
