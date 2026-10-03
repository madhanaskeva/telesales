// ==========================================
// 3. LEAD CALLING: upload lead sheets, work the dial queue and follow up on callbacks
// ==========================================
import { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Badge, LeadBadge } from '../components/common/Badge';
import DataTable, { TableRow } from '../components/common/DataTable';
import DateField from '../components/common/DateField';
import EmptyState from '../components/common/EmptyState';
import FilterChips from '../components/common/FilterChips';
import Icon from '../components/common/Icon';
import PageHeader from '../components/common/PageHeader';
import Pager from '../components/common/Pager';
import Progress from '../components/common/Progress';
import UserLink from '../components/common/UserLink';
import {
  LEAD_INTEREST_STATUSES, LEAD_QUEUE_FILTERS, LEAD_QUEUE_PAGE_SIZE, LEAD_REACHED_STATUSES, PERIOD_LABEL, PERIOD_OPTIONS, ROUND_ROBIN,
} from '../data/constants';
import { setFunnelDate, setFunnelPeriod, setUlFilter, setUlPage, setUlSearch } from '../redux/slices/leadsSlice';
import { openBatch, openDial } from '../redux/slices/uiSlice';
import { selectScope, selectScopedLeads } from '../redux/selectors';
import { onKeyActivate } from '../utils/dom';
import { downloadLeadTemplate } from '../utils/excel';
import { fmtTs, formatPhone, istMidnight, last10, roleLabel, validPickerDate } from '../utils/format';
import {
  dialActivityText, isCallbackDue, isCallbackOverdue, isFreshLead, leadAgentName, leadMatches, leadsOf,
} from '../utils/leads';
import { notify } from '../utils/notify';
import { paginate } from '../utils/table';
import { funnelRange } from '../utils/periods';
import { assignPendingUpload, readLeadFile, reassignLeads, removeUploadBatch } from '../utils/actions/leadActions';

const QUEUE_COLS = '1.4fr 1fr 0.9fr 1fr 1.2fr 1.4fr 0.7fr';

// Upload history = server batches (+ the file waiting for ASSIGN), newest first
function buildBatches(scopedLeads, pending) {
  const batches = {};
  scopedLeads.forEach(l => {
    if (!l.batchName) return;
    const b = batches[l.batchName] || (batches[l.batchName] = { name: l.batchName, count: 0, fresh: 0, latest: 0, unassigned: 0, managerId: '' });
    b.count++;
    if (isFreshLead(l)) b.fresh++;
    if (!l.agentId && isFreshLead(l)) b.unassigned++;
    if (l.managerId && !b.managerId) b.managerId = l.managerId;
    const t = l.createdAt ? l.createdAt.getTime() : 0;
    if (t > b.latest) b.latest = t;
  });
  if (pending) {
    const existing = batches[pending.fileName];
    batches[pending.fileName] = {
      ...(existing || {}),
      name: pending.fileName,
      count: Math.max(existing ? existing.count : 0, pending.withPhone),
      fresh: Math.max(existing ? existing.fresh : 0, pending.withPhone),
      latest: Date.now(),
      unassigned: existing ? Math.max(existing.unassigned, pending.withPhone) : pending.withPhone,
      managerId: (existing && existing.managerId) || pending.managerId || '',
      pending: true,
    };
  }
  return Object.values(batches).sort((a, b) => b.latest - a.latest).slice(0, 8);
}

export default function LeadCallingPage() {
  const dispatch = useDispatch();
  const leadsState = useSelector(s => s.leads);
  const scopedLeads = useSelector(selectScopedLeads);
  const { users, visible, dialable } = useSelector(selectScope);
  const { pendingUpload: pending, assigningUpload, ulFilter, ulSearch, ulPage, funnelPeriod, funnelDate } = leadsState;

  // Uploads can be assigned to anyone visible except admins (the server import resolves the owning manager)
  const assignTargets = visible.filter(u => u.role !== 'ADMIN');
  const [assignTo, setAssignTo] = useState('');
  const assignValue = assignTo === ROUND_ROBIN || assignTargets.some(u => u.id === assignTo) ? assignTo : '';
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const fromValue = dialable.some(u => u.id === fromId) ? fromId : '';
  const toValue = dialable.some(u => u.id === toId) ? toId : '';
  const fileRef = useRef(null);

  const batchList = useMemo(() => buildBatches(scopedLeads, pending), [scopedLeads, pending]);

  const onFile = (file) => { if (file) readLeadFile(file, assignValue); };

  const onFunnelDate = (val) => {
    if (val && !validPickerDate(val)) {
      notify('PLEASE SELECT A VALID YEAR (2020 - 2030)');
      val = '';
    }
    if (!val) { dispatch(setFunnelPeriod('today')); return; }   // cleared: back to TODAY
    dispatch(setFunnelDate(val));
  };

  const onRemoveBatch = (name) => {
    if (!window.confirm(`Remove ${name} and all leads in this upload? This cannot be undone.`)) return;
    removeUploadBatch(name);
  };

  const startCallSession = () => {
    const fresh = scopedLeads.find(l => isFreshLead(l) && last10(l.phone));
    if (!fresh) { notify('NO FRESH LEADS IN QUEUE TO CALL'); return; }
    dispatch(openDial(fresh.id));
  };

  // Conversion funnel. Period (today / week / month or a picked day): UPLOADED counts leads uploaded
  // in it; the other steps count leads whose latest call (and so their current outcome) falls in it.
  const fRange = funnelRange(funnelPeriod, funnelDate);
  const inPeriod = (d) => d instanceof Date && !isNaN(d.getTime()) && d >= fRange.start && (!fRange.end || d < fRange.end);
  const worked = scopedLeads.filter(l => !isFreshLead(l) && inPeriod(l.lastCallDate || l.updatedAt));
  const fCounts = [
    ['Uploaded', scopedLeads.filter(l => inPeriod(l.createdAt)).length, 'var(--ds-ink-900)'],
    ['Dialed', worked.length, 'var(--ds-green-600)'],
    ['Reached', worked.filter(l => LEAD_REACHED_STATUSES.has(l.status)).length, 'var(--ds-green-500)'],
    ['Interested', worked.filter(l => LEAD_INTEREST_STATUSES.has(l.status)).length, 'var(--ds-green-400)'],
    ['Converted', worked.filter(l => l.status === 'won').length, 'var(--ds-lime-400)'],
  ];
  const maxF = Math.max(1, ...fCounts.map(c => c[1]));
  const funnelLabel = funnelDate
    ? `· ${istMidnight(funnelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).toUpperCase()}`
    : `· ${PERIOD_LABEL[funnelPeriod] || 'TODAY'}`;

  // Callbacks due: follow-up leads that have been called before (oldest first)
  const cbLeads = scopedLeads.filter(isCallbackDue).sort((a, b) => a.lastCallDate - b.lastCallDate).slice(0, 12);

  // Dial queue
  let list = scopedLeads.slice().sort((a, b) => (b.createdAt ? b.createdAt.getTime() : 0) - (a.createdAt ? a.createdAt.getTime() : 0));
  if (ulFilter === 'FRESH') list = list.filter(isFreshLead);
  if (ulFilter === 'CALLED') list = list.filter(l => !isFreshLead(l));
  const uq = ulSearch.trim().toLowerCase();
  if (uq) list = list.filter(l => leadMatches(users, l, uq));
  const pg = paginate(list, ulPage, LEAD_QUEUE_PAGE_SIZE);

  const queueFilters = LEAD_QUEUE_FILTERS.map(f => (f.value === 'ALL'
    ? { ...f, label: <>All <span className="chip-count">{scopedLeads.length}</span></> }
    : f));

  let queueBody;
  if (pg.rows.length === 0) {
    let msg = 'NO LEADS HERE YET — UPLOAD AN EXCEL SHEET TO FILL THE QUEUE.';
    if (leadsState.error) msg = `COULD NOT LOAD LEADS — ${leadsState.error}`;
    else if (!leadsState.loaded) msg = 'LOADING LEADS…';
    queueBody = <EmptyState>{msg}</EmptyState>;
  } else {
    queueBody = pg.rows.map(l => {
      const fresh = isFreshLead(l);
      const hasPhone = !!last10(l.phone);
      const agentName = leadAgentName(users, l);
      return (
        <TableRow cols={QUEUE_COLS} key={l.id}>
          <span className="cell-primary">{l.name}</span>
          <span className="cell-mono">{hasPhone ? formatPhone(l.phone) : <Badge tone="danger">NO PHONE</Badge>}</span>
          <span><UserLink user={{ id: l.agentId, name: agentName }} label={agentName} /></span>
          <LeadBadge lead={l} />
          <span className={fresh ? 'cell-muted' : 'text-success fw-600'} style={{ fontSize: 'var(--ds-fs-sm)' }}>{dialActivityText(l, fmtTs)}</span>
          <span className="cell-muted">{l.notes || '—'}</span>
          <span className="cell-right">
            {hasPhone
              ? <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch(openDial(l.id))}><Icon name="phone" size="sm" />Dial</button>
              : <span className="muted">—</span>}
          </span>
        </TableRow>
      );
    });
  }

  return (
    <>
      <PageHeader title="Lead Calling" subtitle="Upload lead sheets, work the dial queue and follow up on callbacks">
        <div className="search-field">
          <Icon name="search" size="sm" />
          <label htmlFor="ulSearchInput" className="visually-hidden">Search leads</label>
          <input type="text" id="ulSearchInput" placeholder="Search lead, phone, agent…" value={ulSearch} onChange={(e) => dispatch(setUlSearch(e.target.value))} />
        </div>
        <FilterChips id="ulFilterChips" options={queueFilters} value={ulFilter} onChange={(v) => dispatch(setUlFilter(v))} />
      </PageHeader>

      <div className="grid-2-col lead-upload-grid">
        <div className="card lead-upload-card">
          <div className="card-header">
            <div className="card-title">Upload lead sheet</div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={downloadLeadTemplate}><Icon name="download" size="sm" />Template</button>
          </div>
          <label className="dropzone" role="button" tabIndex={0} aria-label="Upload lead sheet (Excel or CSV)"
            onKeyDown={onKeyActivate(() => fileRef.current && fileRef.current.click())}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
            <input type="file" ref={fileRef} accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; onFile(f); }} />
            <div className="dropzone-icon"><Icon name="upload" size="lg" /></div>
            <div className="dropzone-title">Drop an Excel file or click to browse</div>
            <div className="dropzone-help">Columns: Name + Phone (optional Notes) · .xlsx / .csv · rows without a valid phone are skipped</div>
          </label>
          <div className="upload-row">
            <label htmlFor="leadAssignSelect" className="field-label" style={{ margin: 0 }}>Assign to</label>
            <select id="leadAssignSelect" className="select" value={assignValue} onChange={(e) => setAssignTo(e.target.value)}>
              <option value="">SELECT CALLER / MANAGER…</option>
              <option value={ROUND_ROBIN}>AUTO · ROUND-ROBIN</option>
              {assignTargets.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()} ({roleLabel(u.role)})</option>)}
            </select>
          </div>
          <div className="upload-row" style={{ borderTop: '1px solid var(--ds-border)', paddingTop: 14, flexWrap: 'wrap' }}>
            <span className="field-label" style={{ margin: 0 }}>Reassign fresh leads</span>
            <label htmlFor="reassignFromSelect" className="visually-hidden">From agent</label>
            <select id="reassignFromSelect" className="select" style={{ flex: '1 1 140px', minWidth: 0 }} value={fromValue} onChange={(e) => setFromId(e.target.value)}>
              <option value="">FROM…</option>
              {dialable.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
            </select>
            <span className="muted" aria-hidden="true">→</span>
            <label htmlFor="reassignToSelect" className="visually-hidden">To agent</label>
            <select id="reassignToSelect" className="select" style={{ flex: '1 1 140px', minWidth: 0 }} value={toValue} onChange={(e) => setToId(e.target.value)}>
              <option value="">TO…</option>
              {dialable.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
            </select>
            <button type="button" className="btn btn-secondary" onClick={() => reassignLeads(fromValue, toValue)}>Move</button>
          </div>
          {/* The chosen file waits here until ASSIGN */}
          <div className="upload-row" style={{ borderTop: '1px solid var(--ds-border)', paddingTop: 14 }}>
            <span className={`pending-upload${pending ? ' is-ready' : ''}`}>
              {pending ? `READY: ${pending.fileName} · ${pending.withPhone} LEADS${assignValue ? '' : ' · SELECT A CALLER / MANAGER'}` : 'NO FILE SELECTED'}
            </span>
            <button type="button" className="btn btn-primary" disabled={!(pending && assignValue && !assigningUpload)}
              onClick={() => assignPendingUpload(assignValue)}>
              {assigningUpload ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>

        <div className="card lead-history-card">
          <div className="card-header"><div className="card-title">Upload history</div><span className="card-subtitle">Click a file to see its leads</span></div>
          <div className="upload-history-list">
            {batchList.length ? batchList.map(b => {
              const mgr = !b.pending && b.managerId ? users.find(u => u.id === b.managerId) : null;
              const managerText = b.pending ? '· SHEET SNAPSHOT SAVED' : (mgr ? ` · MANAGER ${mgr.name.toUpperCase()}` : '');
              return (
                <div className="upload-item" key={b.name}>
                  <button type="button" className="upload-item-main" onClick={() => dispatch(openBatch(b.name))} title={`View the leads in ${b.name}`}>
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="kpi-icon" style={{ width: 32, height: 32 }}><Icon name="file" /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="upload-item-name truncate">{b.name}</div>
                        <div className="upload-item-meta">
                          {b.latest ? fmtTs(new Date(b.latest)) : '—'} · {b.fresh} NOT DIALED YET{managerText}
                          {b.unassigned > 0 && <> · <strong className="text-warning">{b.unassigned} TO SPLIT</strong></>}
                          {b.pending && <> · <strong className="text-success">WAITING IN HISTORY</strong></>}
                        </div>
                      </div>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <Badge tone={b.pending ? 'dark' : 'neutral'}>{b.count} LEADS</Badge>
                      <span className="text-success fw-600" style={{ fontSize: 'var(--ds-fs-sm)' }}>View ›</span>
                    </span>
                  </button>
                  <button type="button" className="btn btn-danger btn-xs" onClick={() => onRemoveBatch(b.name)}
                    title={`Remove ${b.name} from upload history`} aria-label={`Remove ${b.name} from upload history`}>Remove</button>
                </div>
              );
            }) : <EmptyState error={!!leadsState.error}>{leadsState.error ? `COULD NOT LOAD LEADS — ${leadsState.error}` : 'NO UPLOADED BATCHES YET'}</EmptyState>}
          </div>
        </div>
      </div>

      <div className="lead-calling-row">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Conversion funnel <span className="card-subtitle">{funnelLabel}</span></div>
            <FilterChips id="funnelPeriodChips" options={PERIOD_OPTIONS} value={funnelDate ? null : funnelPeriod} onChange={(p) => dispatch(setFunnelPeriod(p))}>
              <DateField id="funnelDateInput" value={funnelDate} onChange={onFunnelDate} label="Conversion funnel date" title="Show one day (2020-2030)" />
            </FilterChips>
          </div>
          <div className="funnel">
            {fCounts.map(([label, n, color]) => (
              <div className="funnel-row" key={label}>
                <span className="funnel-label">{label}</span>
                <div className="funnel-track"><div className="funnel-fill" style={{ width: `${n ? Math.max(4, Math.round(n / maxF * 100)) : 0}%`, background: color }} /></div>
                <span className="funnel-value">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <button type="button" className="btn btn-dark btn-lg btn-block" onClick={startCallSession}>
            <Icon name="play" />Start call session · <span>{scopedLeads.filter(isFreshLead).length}</span> fresh leads
          </button>
          {cbLeads.length > 0 && (
            <div id="callbacksDueCard" className="card" style={{ display: 'flex' }}>
              <div className="card-header" style={{ marginBottom: 10 }}><div className="card-title">Callbacks due · {cbLeads.length}</div></div>
              <div className="callback-list">
                {cbLeads.map(l => {
                  const overdue = isCallbackOverdue(l);
                  return (
                    <button type="button" className="callback-item" key={l.id} onClick={() => dispatch(openDial(l.id))} title={`Dial ${l.name}`}>
                      <span className="truncate"><strong>{l.name}</strong> <span className="muted">· {fmtTs(l.lastCallDate)}</span></span>
                      <Badge tone={overdue ? 'danger' : 'lime'}>{overdue ? 'OVERDUE' : 'DUE'}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--ds-space-4)' }}>
        <div className="card-header"><div className="card-title">Team call status</div><span className="card-subtitle">Leads called / leads assigned</span></div>
        <div className="lead-team-status-grid">
          {dialable.length ? dialable.map(u => {
            const mine = leadsOf(scopedLeads, u);
            const called = mine.filter(l => !isFreshLead(l)).length;
            return (
              <div className="quota-card" key={u.id}>
                <div className="quota-card-head">
                  <strong className="truncate">{u.name || '—'}</strong>
                  <span className="muted tabular nowrap">{called} / {mine.length}</span>
                </div>
                <Progress pct={mine.length ? Math.round(called / mine.length * 100) : 0} />
              </div>
            );
          }) : <EmptyState>NO CALLERS IN THIS VIEW</EmptyState>}
        </div>
      </div>

      <div className="neo-table-card lead-queue-card">
        <div className="card-header"><div className="card-title">Dial queue</div><span className="card-subtitle">Newest uploads first</span></div>
        <DataTable cols={QUEUE_COLS} head={<>
          <span>Lead</span><span>Phone</span><span>Agent</span><span>Status</span><span>Dial activity</span><span>Follow-up note</span><span style={{ textAlign: 'right' }}>Action</span>
        </>}>
          {queueBody}
        </DataTable>
        <Pager label={`PAGE ${pg.page} / ${pg.totalPages} · ${list.length} LEADS`} page={pg.page} totalPages={pg.totalPages} onPage={(p) => dispatch(setUlPage(p))} />
      </div>
    </>
  );
}
