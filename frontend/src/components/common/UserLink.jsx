// A user's name as a link to their details page (plain text when the user is unknown or outside the view)
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { userPath } from '../../data/navigation';
import { selectScope } from '../../redux/selectors';
import { findUserRef } from '../../utils/scope';

export default function UserLink({ user, label }) {
  const { users, visibleIds } = useSelector(selectScope);
  const text = label !== undefined && label !== null ? label : (user && user.name) || '—';
  const u = findUserRef(users, user);
  if (!u || !visibleIds.has(u.id)) return <>{text}</>;
  return (
    <Link to={userPath(u.id)} className="user-link" title={`Open ${u.name}'s details`}>{text}</Link>
  );
}
