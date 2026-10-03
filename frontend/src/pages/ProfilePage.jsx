// ==========================================
// 8. MY PROFILE (saved to the server): account, reporting line and daily call target
// ==========================================
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from '../components/common/Avatar';
import PageHeader from '../components/common/PageHeader';
import { setViewAs } from '../redux/slices/authSlice';
import { selectScope } from '../redux/selectors';
import { onKeyActivate } from '../utils/dom';
import { formatPhone, roleLabel, safeImage } from '../utils/format';
import { notify } from '../utils/notify';
import { isHead } from '../utils/scope';
import { updateUserFields, uploadUserPhoto } from '../utils/actions/userActions';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { users, visible, me, isRealAdmin: admin, realRole, authId } = useSelector(selectScope);
  const editable = admin || (['MANAGER', 'JR_MANAGER', 'TEAM_LEADER'].includes(realRole) && me.role !== 'ADMIN');
  const mgr = users.find(u => u.id === me.mgr);
  const mgrChoices = (admin ? users : visible).filter(u => u.id !== me.id && isHead(u));

  const onProfileUserSwitch = (uid) => {
    if (!admin) return;
    dispatch(setViewAs(!uid || uid === authId ? null : uid));
  };

  const onSaveManager = (newMgrId) => {
    if (!editable) return;
    const m = users.find(u => u.id === newMgrId);
    updateUserFields(me, { managerId: newMgrId || '', managerName: m ? m.name : '' },
      `REPORTS TO UPDATED TO ${m ? m.name.toUpperCase() : 'TOP LEVEL'}`);
  };

  const onSaveTarget = (target) => {
    if (!editable) return;
    const raw = target.trim();
    const val = Number(raw);
    if (raw === '' || !Number.isFinite(val) || val < 0 || val > 1000) {
      notify('PLEASE ENTER A TARGET BETWEEN 0 AND 1000');
      return;
    }
    updateUserFields(me, { dailyTarget: Math.round(val) }, `DAILY CALL TARGET UPDATED TO ${Math.round(val)} CALLS/DAY`);
  };

  // Resize to a small JPEG before upload (keeps the payload small and guarantees a real image)
  const onPhoto = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { notify('PLEASE CHOOSE AN IMAGE FILE'); return; }
    const person = me;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const b64 = safeImage(canvas.toDataURL('image/jpeg', 0.85));
        if (!b64) { notify('COULD NOT READ THIS IMAGE'); return; }
        uploadUserPhoto(person.id, b64, !person.id || person.id === authId);
      };
      img.onerror = () => notify('COULD NOT READ THIS IMAGE');
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader title="My Profile" subtitle="Account, reporting line and daily call target" actionsClass="">
        {admin && (
          <div className="quick-jump-box" style={{ display: 'flex' }}>
            <label htmlFor="profileUserSelect">View profile as</label>
            <select id="profileUserSelect" className="toolbar-select" value={me.id} onChange={(e) => onProfileUserSwitch(e.target.value)}>
              {users.map(u => (
                <option key={u.id} value={u.id}>{roleLabel(u.role)} · {u.name.toUpperCase()}{u.id === authId ? ' (YOU)' : ''}</option>
              ))}
            </select>
          </div>
        )}
      </PageHeader>

      <div className="profile-grid">
        <div className="card profile-card">
          <Avatar user={me} className="avatar-xl" as="div" label="Profile photo" />
          <div className="profile-name">{me.name}</div>
          <span className="badge badge-lime badge-lg">{roleLabel(me.role)}</span>
          {editable && (
            <div style={{ marginTop: 'var(--ds-space-5)' }}>
              <label htmlFor="pfPhotoInput" role="button" tabIndex={0} className="btn btn-dark"
                onKeyDown={onKeyActivate(() => document.getElementById('pfPhotoInput').click())}>Change photo</label>
              <input id="pfPhotoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
            </div>
          )}
          <div className="muted" style={{ fontSize: 'var(--ds-fs-xs)', marginTop: 10 }}>JPG or PNG · saved to the server</div>
        </div>

        <div className="card">
          <div className="card-header" style={{ marginBottom: 4 }}><div className="card-title">Account &amp; hierarchy</div></div>
          <div className="detail-list">
            <div className="detail-row"><span className="detail-label">Full name</span><span className="detail-value">{me.name}</span></div>
            <div className="detail-row"><span className="detail-label">Login email</span><span className="detail-value">{me.email || '—'}</span></div>
            <div className="detail-row"><span className="detail-label">Phone / SIM number</span><span className="detail-value mono">{formatPhone(me.phone)}</span></div>
            <div className="detail-row"><span className="detail-label">Role &amp; permissions</span><span className="detail-value">{roleLabel(me.role)}</span></div>
            <div className="detail-row">
              <div><span className="detail-label">Reports to</span><span className="detail-help">Direct supervisor for performance reviews</span></div>
              <div className="inline-edit">
                <span className="detail-value">
                  {me.role === 'ADMIN' ? 'ORGANIZATION HEAD (BOARD)' : (mgr ? `${mgr.name} (${roleLabel(mgr.role)})` : 'TOP LEVEL (ADMIN)')}
                </span>
                {me.role !== 'ADMIN' && editable && (
                  <select className="select" aria-label="Reports to manager" value={me.mgr || ''} onChange={(e) => onSaveManager(e.target.value)}>
                    <option value="">TOP LEVEL (ADMIN)</option>
                    {mgrChoices.map(u => <option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role)})</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="detail-row">
              <div><span className="detail-label">Daily call target</span><span className="detail-help">Target dials per day (powers dashboard &amp; leaderboard attainment %)</span></div>
              <div className="inline-edit">
                {/* Re-created when the person or their saved target changes */}
                <TargetEditor key={`${me.id}:${me.target}`} initial={String(me.target || 0)} editable={editable} onSave={onSaveTarget} />
              </div>
            </div>
            <div className="detail-row"><span className="detail-label">Account status</span><span className="badge badge-success badge-dot">Active &amp; verified</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

function TargetEditor({ initial, editable, onSave }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <input type="number" className="input" aria-label="Daily call target" min="0" max="1000" disabled={!editable}
        value={value} onChange={(e) => setValue(e.target.value)} />
      {editable && <button type="button" className="btn btn-primary btn-sm" onClick={() => onSave(value)}>Save</button>}
    </>
  );
}
