// Grid table: a header row and body rows sharing the same column template
export function TableHead({ cols, children }) {
  return <div className="table-head-row" style={{ gridTemplateColumns: cols }}>{children}</div>;
}

export function TableRow({ cols, children, style, ...rest }) {
  return <div className="table-body-row" style={{ gridTemplateColumns: cols, ...style }} {...rest}>{children}</div>;
}

// The scrolling body of a neo-table-card: <DataTable cols head={[...]}>{rows}</DataTable>
export default function DataTable({ cols, head, children }) {
  return (
    <div className="table-scroll-wrap">
      <div>
        <TableHead cols={cols}>{head}</TableHead>
        <div>{children}</div>
      </div>
    </div>
  );
}

// Plain-string headers → <span>s
export function Heads({ labels }) {
  return labels.map((h) => <span key={h}>{h}</span>);
}
