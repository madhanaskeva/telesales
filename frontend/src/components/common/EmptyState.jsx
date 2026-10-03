export default function EmptyState({ children, error, style }) {
  return <div className={`empty-state${error ? ' is-error' : ''}`} style={style}>{children}</div>;
}
