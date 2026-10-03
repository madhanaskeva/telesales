// Round avatar: the user's photo, or the first letter of their name
import { initialOf, safeImage } from '../../utils/format';

function avatarPhoto(user) {
  return safeImage(user && user.photoBase64) || safeImage(user && user.avatarUrl);
}

export default function Avatar({ user, className = '', as: Tag = 'span', id, label }) {
  const photo = avatarPhoto(user);
  return (
    <Tag
      id={id}
      className={`avatar ${className}`.trim()}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      style={{ backgroundImage: photo ? `url("${photo}")` : 'none' }}
    >
      {photo ? '' : initialOf(user && user.name)}
    </Tag>
  );
}
