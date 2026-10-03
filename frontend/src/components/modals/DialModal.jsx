// LEAD DIAL MODAL: records the outcome on the lead (the phone app logs the actual call)
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DIAL_OUTCOMES } from '../../data/constants';
import { closeDial } from '../../redux/slices/uiSlice';
import { formatPhone, initialOf } from '../../utils/format';
import { leadAgentName, leadLabel } from '../../utils/leads';
import { commitDialOutcome } from '../../utils/actions/leadActions';

export default function DialModal() {
  const dispatch = useDispatch();
  const leadId = useSelector(s => s.ui.dialLeadId);
  const leads = useSelector(s => s.leads.list);
  const users = useSelector(s => s.users.list);
  // The lead as it was when the dialog opened
  const [lead] = useState(() => leads.find(l => l.id === leadId) || null);
  const [outcome, setOutcome] = useState('INTERESTED');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const noteRef = useRef(null);

  useEffect(() => {
    if (!lead) { dispatch(closeDial()); return undefined; }
    const t = setTimeout(() => { try { noteRef.current.focus(); } catch { /* ignore */ } }, 50);
    return () => clearTimeout(t);
  }, [lead, dispatch]);

  if (!lead) return null;

  const close = () => dispatch(closeDial());
  const digits = String(lead.phone || '').replace(/[^\d+]/g, '');

  const commit = async () => {
    setBusy(true);
    setError('');
    const res = await commitDialOutcome(lead, outcome || 'INTERESTED', note);
    setBusy(false);
    if (res.ok) close();
    else setError(res.error);
  };

  return (
    <div id="dialModal" className="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="dialModalName"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-card dial-card">
        <div style={{ minWidth: 0 }}>
          <div className="modal-eyebrow" style={{ marginBottom: 14 }}>Call session · record lead outcome</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div className="avatar dial-avatar" aria-hidden="true">{initialOf(lead.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="modal-title" id="dialModalName">{lead.name}</div>
              <a href={digits ? `tel:${digits}` : '#'} className="mono fw-700" style={{ fontSize: 'var(--ds-fs-base)' }} title="Call this number">
                {formatPhone(lead.phone)}
              </a>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div id="dialOutcomeLabel" className="field-label">Call outcome</div>
            <div className="dial-outcomes" role="group" aria-labelledby="dialOutcomeLabel">
              {DIAL_OUTCOMES.map(o => (
                <button key={o.value} type="button" className={`filter-chip${outcome === o.value ? ' active' : ''}`}
                  aria-pressed={outcome === o.value ? 'true' : 'false'} onClick={() => setOutcome(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dialModalNote" className="form-label">Call notes / feedback</label>
            <input type="text" id="dialModalNote" ref={noteRef} className="input" value={note}
              placeholder="E.g. Wants pricing deck, follow up tomorrow..."
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />
          </div>

          <div className="form-error" role="alert" style={{ margin: '0 0 12px', display: error ? 'block' : 'none' }}>{error}</div>

          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={commit}>
            Save outcome &amp; update CRM
          </button>
        </div>

        <div className="dial-side">
          <div>
            <div className="modal-eyebrow" style={{ marginBottom: 10 }}>Lead details</div>
            <div className="detail-list">
              <div className="detail-row"><span className="detail-label">Assigned agent</span><strong className="detail-value">{leadAgentName(users, lead)}</strong></div>
              <div className="detail-row"><span className="detail-label">Status</span><strong className="detail-value">{leadLabel(lead)}</strong></div>
              <div className="detail-row"><span className="detail-label">Dial attempts</span><strong className="detail-value">{lead.attempts || 0}</strong></div>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
