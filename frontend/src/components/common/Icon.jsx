// One icon from the sprite (IconSprite.jsx): <Icon name="phone" size="sm" />
export default function Icon({ name, size, className = '' }) {
  const cls = ['ico', size ? `ico-${size}` : '', className].filter(Boolean).join(' ');
  return (
    <svg className={cls} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
