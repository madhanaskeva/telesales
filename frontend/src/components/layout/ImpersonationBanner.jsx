// "View as" banner: shown while an admin looks at the portal scoped to someone else's team
import { useSelector } from 'react-redux';
import { selectScope } from '../../redux/selectors';
import { roleLabel } from '../../utils/format';
import { returnToMyView } from '../../utils/actions/syncActions';

export default function ImpersonationBanner() {
  const { me, isRealAdmin, viewAsId, authId } = useSelector(selectScope);
  if (!(isRealAdmin && viewAsId && viewAsId !== authId)) return null;

  return (
    <div className="impersonation-banner" style={{ display: 'flex' }}>
      <span>VIEWING AS {me.name.toUpperCase()} · {roleLabel(me.role)} VIEW — DATA SCOPED TO THEIR TEAM</span>
      <button type="button" className="btn-return-admin" onClick={() => returnToMyView()}>← Return to my view</button>
    </div>
  );
}
