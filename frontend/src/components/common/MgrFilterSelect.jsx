// "Managed by" column header with its filter: every manager-level person in view who has people under them
export default function MgrFilterSelect({ id, value, options, onChange }) {
  return (
    <span className="mgr-filter-cell">
      Managed by
      <label htmlFor={id} className="visually-hidden">Filter by manager</label>
      <select
        id={id}
        className={`mgr-filter-select${value !== 'ALL' ? ' is-active' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="ALL">ALL MANAGERS</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </span>
  );
}
