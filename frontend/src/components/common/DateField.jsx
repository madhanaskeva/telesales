// Calendar date picker limited to 2020–2030 (the page validates the value)
import Icon from './Icon';

export default function DateField({ value, onChange, label, title, id }) {
  return (
    <label className="date-field" title={title}>
      <Icon name="calendar" size="sm" />
      <input
        type="date"
        id={id}
        min="2020-01-01"
        max="2030-12-31"
        aria-label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
