// Search box with the magnifier icon (and an optional clear button)
import Icon from './Icon';

export default function SearchField({ id, label, placeholder, value, onChange, onEnter, onClear, style }) {
  return (
    <div className="search-field" style={style}>
      <Icon name="search" size="sm" />
      <label htmlFor={id} className="visually-hidden">{label}</label>
      <input
        type="text"
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') onEnter(); } : undefined}
      />
      {onClear && (
        <button
          type="button"
          className="search-clear"
          style={{ display: value.length > 0 ? 'block' : 'none' }}
          onClick={onClear}
          aria-label="Clear search"
        >
          <Icon name="x" size="sm" />
        </button>
      )}
    </div>
  );
}
