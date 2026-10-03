// ADD LEAD MODAL (pipeline "+ Add CRM lead" and call-log "+ Lead")
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeLeadForm } from '../../redux/slices/uiSlice';
import { selectScope } from '../../redux/selectors';
import { last10 } from '../../utils/format';
import Icon from '../common/Icon';
import { createLead } from '../../utils/actions/leadActions';

export default function LeadFormModal() {
  const dispatch = useDispatch();
  const prefill = useSelector(s => s.ui.leadForm) || {};
  const { dialable } = useSelector(selectScope);
  const [name, setName] = useState(prefill.name || '');
  const [phone, setPhone] = useState(prefill.phone || '');
  const [agentId, setAgentId] = useState(prefill.agentId && dialable.some(u => u.id === prefill.agentId) ? prefill.agentId : '');
  const [notes, setNotes] = useState(prefill.notes || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => { try { nameRef.current.focus(); } catch { /* ignore */ } }, 50);
    return () => clearTimeout(t);
  }, []);

  const close = () => dispatch(closeLeadForm());

  const save = async (e) => {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    if (!n) { setError('Lead name is required.'); return; }
    if (!last10(p)) { setError('Enter a valid 10-digit phone number.'); return; }
    setBusy(true);
    const res = await createLead({ name: n, phone: p, assignedCallerId: agentId, notes: notes.trim() });
    setBusy(false);
    if (res.ok) close();
    else setError(res.error);
  };

  return (
    <div id="leadFormModal" className="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="leadFormTitle"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <form className="modal-card" style={{ width: 460 }} onSubmit={save} noValidate>
        <div className="modal-header" style={{ marginBottom: 18 }}>
          <div><div className="modal-eyebrow">CRM</div><div id="leadFormTitle" className="modal-title">Add lead</div></div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close} aria-label="Close"><Icon name="x" size="sm" /></button>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="leadFormName">Lead / company name *</label>
          <input type="text" id="leadFormName" ref={nameRef} className="form-control" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="leadFormPhone">Phone *</label>
          <input type="tel" id="leadFormPhone" className="form-control" placeholder="10-digit mobile" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="leadFormAgent">Assign to agent</label>
          <select id="leadFormAgent" className="form-control" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">UNASSIGNED</option>
            {dialable.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="leadFormNotes">Notes</label>
          <input type="text" id="leadFormNotes" className="form-control" autoComplete="off" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="form-error" role="alert" style={{ margin: '0 0 12px', display: error ? 'block' : 'none' }}>{error}</div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>Save lead</button>
        </div>
      </form>
    </div>
  );
}
