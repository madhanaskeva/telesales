// A row of filter chips: options = [{ value, label }]; the active one is highlighted
export default function FilterChips({ options, value, onChange, className = 'pill-group', id, children, pressed }) {
  return (
    <div className={className} id={id}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`filter-chip${value === o.value ? ' active' : ''}`}
          aria-pressed={pressed ? String(value === o.value) : undefined}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
      {children}
    </div>
  );
}
