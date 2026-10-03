// LEADS: load, upload sheets, reassign, dial outcomes, pipeline stages, batches, splits
import {
  DIAL_OUTCOME_TO_STATUS, LEADS_FETCH_LIMIT, LEADS_MAX_PAGES, MANAGER_ROLES, ROUND_ROBIN, STAGE_TO_STATUS, STATUS_TO_STAGE,
} from '../../data/constants';
import { selectScope } from '../../redux/selectors';
import {
  leadAdded, leadsFailed, leadsLoaded, leadsMerged, leadsReplaced, leadsUpdated, leadUpdated,
  setAssigningUpload, setPendingUpload,
} from '../../redux/slices/leadsSlice';
import store from '../../redux/store';
import { readLeadSheet } from '../excel';
import { formatPhone, last10 } from '../format';
import { isFreshLead } from '../leads';
import { mapLead } from '../mappers';
import { notify } from '../notify';
import { leadService } from '../services';

const { dispatch, getState } = store;

export async function fetchLeads() {
  try {
    const all = [];
    const seen = new Set();
    for (let page = 1; page <= LEADS_MAX_PAGES; page++) {
      const json = await leadService.page(LEADS_FETCH_LIMIT, page);
      const batch = (json.leads || []).map(mapLead).filter(l => l.id);
      const fresh = batch.filter(l => !seen.has(l.id));
      fresh.forEach(l => { seen.add(l.id); all.push(l); });
      if (batch.length < LEADS_FETCH_LIMIT || fresh.length === 0) break;
    }
    dispatch(leadsLoaded(all));
  } catch (e) {
    dispatch(leadsFailed(e.message));
  }
}

const isMgrRole = (u) => !!u && MANAGER_ROLES.includes(String(u.role || '').toUpperCase());
const isDirectCallerRole = (u) => !!u && ['CALLER', 'JR_MANAGER', 'TEAM_LEADER'].includes(String(u.role || '').toUpperCase());

// A chosen Excel / CSV file is held until ASSIGN, so the caller / manager can be picked first
export async function readLeadFile(file, selectedId) {
  let rows;
  try {
    rows = await readLeadSheet(file);
  } catch {
    notify('COULD NOT PARSE EXCEL FILE — CHECK FORMAT');
    return;
  }
  const withPhone = rows.filter(r => last10(r.phone)).length;
  if (!withPhone) {
    notify(`NO ROWS WITH A VALID PHONE NUMBER IN ${file.name.toUpperCase()}`);
    return;
  }
  const users = getState().users.list;
  const selectedUser = selectedId ? users.find(u => u.id === selectedId) : null;
  dispatch(setPendingUpload({
    fileName: file.name,
    rows,
    withPhone,
    managerId: isMgrRole(selectedUser) ? selectedUser.id : '',
    managerName: isMgrRole(selectedUser) ? selectedUser.name : '',
    assignedCallerId: isDirectCallerRole(selectedUser) ? selectedUser.id : '',
    assignedCallerName: selectedUser ? selectedUser.name : '',
    targetCallerId: selectedId && selectedId !== ROUND_ROBIN ? selectedId : '',
  }));
  notify(`${withPhone} LEADS READY · SELECT A MANAGER AND PRESS ASSIGN`);
}

// The server needs a manager-owned upload: a selected caller resolves to their reporting manager
function resolveUploadOwnerManagerId(users, visible, selectedId) {
  const chosen = users.find(u => u.id === selectedId);
  if (!chosen) return '';
  if (MANAGER_ROLES.includes(chosen.role)) return chosen.id;
  const fallbackManager = chosen.mgr ? users.find(u => u.id === chosen.mgr) : null;
  if (fallbackManager && MANAGER_ROLES.includes(fallbackManager.role)) return fallbackManager.id;
  const visibleManager = visible.find(u => MANAGER_ROLES.includes(u.role));
  return visibleManager ? visibleManager.id : '';
}

// Imports the rows as one upload owned by the manager; with a caller chosen the leads go to them,
// with ROUND-ROBIN they are dealt to the dialable callers in turn, otherwise they stay unassigned
// until the manager splits them (Upload history → View → Split leads).
async function importLeadRows(rows, fileName, managerId, selectedId) {
  const state = getState();
  const users = state.users.list;
  const valid = [];
  let noPhone = 0;
  const selection = users.find(u => u.id === selectedId) || users.find(u => u.id === managerId);
  const directCallerId = isDirectCallerRole(selection) ? selection.id : '';
  const auto = selectedId === ROUND_ROBIN;
  const rrCallers = auto ? selectScope(state).dialable : [];

  rows.forEach(r => {
    if (!last10(r.phone)) { noPhone++; return; }
    const lead = { name: r.name || `Lead ${formatPhone(r.phone)}`, phone: r.phone };
    if (r.notes) lead.notes = r.notes;
    if (auto) {
      if (rrCallers.length) lead.assignedCallerId = rrCallers[valid.length % rrCallers.length].id;
    } else if (directCallerId) {
      lead.assignedCallerId = directCallerId;
    }
    valid.push(lead);
  });
  if (!valid.length) {
    notify(`NO ROWS WITH A VALID PHONE NUMBER IN ${fileName.toUpperCase()}`);
    return false;
  }
  notify(`UPLOADING ${valid.length} LEADS…`);
  try {
    const json = await leadService.import({
      batchName: fileName,
      managerId,
      assignedCallerId: auto ? '' : (directCallerId || selectedId || ''),
      leads: valid,
    });
    const created = Number(json.created) || 0;
    const skipped = (Number(json.skipped) || 0) + noPhone;
    const targetName = auto ? `${rrCallers.length} CALLERS (ROUND-ROBIN)`
      : (directCallerId ? (selection && selection.name ? selection.name : 'CALLER') : (selection ? selection.name : 'THE MANAGER'));
    notify(`${created} LEADS ASSIGNED TO ${targetName.toUpperCase()} · ${skipped} SKIPPED (DUPLICATE / NO PHONE)`);
    await fetchLeads();
    return {
      ok: true,
      leads: json.leads || [],
      assignedCallerId: directCallerId,
      assignedCallerName: directCallerId && selection ? selection.name : '',
    };
  } catch (e) {
    notify(`⚠️ IMPORT FAILED: ${e.message}`);
    return { ok: false, leads: [] };
  }
}

export async function assignPendingUpload(selectedId) {
  const state = getState();
  const p = state.leads.pendingUpload;
  const scope = selectScope(state);
  if (!p) { notify('CHOOSE AN EXCEL / CSV FILE FIRST'); return; }
  if (!selectedId) { notify('SELECT A CALLER OR MANAGER TO ASSIGN THIS FILE TO'); return; }
  const auto = selectedId === ROUND_ROBIN;
  if (auto && !scope.dialable.length) { notify('NO CALLERS IN THIS VIEW FOR ROUND-ROBIN'); return; }
  // A round-robin upload belongs to the manager in view (none when an admin uploads)
  const managerId = auto
    ? (MANAGER_ROLES.includes(scope.me.role) ? scope.me.id : '')
    : resolveUploadOwnerManagerId(state.users.list, scope.visible, selectedId);
  if (!auto && !managerId) { notify('NO VALID MANAGER IS AVAILABLE FOR THIS ASSIGNMENT'); return; }
  dispatch(setAssigningUpload(true));
  const result = await importLeadRows(p.rows, p.fileName, managerId, selectedId);
  dispatch(setAssigningUpload(false));
  if (result && result.ok) {
    // Keep the server response available while the next list request settles
    const imported = (result.leads || []).map(mapLead).filter(l => l.id);
    dispatch(leadsMerged(imported));
    const users = getState().users.list;
    dispatch(setPendingUpload({
      ...p,
      assignedCallerId: result.assignedCallerId || p.assignedCallerId || (auto ? '' : selectedId),
      assignedCallerName: result.assignedCallerName || p.assignedCallerName || (users.find(u => u.id === selectedId) || {}).name || '',
      managerId,
      managerName: (users.find(u => u.id === managerId) || {}).name || p.managerName || '',
      importedRows: imported,
      importedAt: Date.now(),
    }));
  }
}

// Moves the "from" agent's fresh (never dialed) leads to the "to" agent
export async function reassignLeads(from, to) {
  if (!from || !to || from === to) {
    notify('SELECT TWO DIFFERENT AGENTS (FROM AND TO)');
    return;
  }
  const state = getState();
  const fromUser = state.users.list.find(u => u.id === from);
  const toUser = state.users.list.find(u => u.id === to);
  const targets = state.leads.list.filter(l => isFreshLead(l) && (l.agentId ? l.agentId === from : (fromUser && l.agent === fromUser.name)));
  if (!targets.length) {
    notify('NO FRESH LEADS TO MOVE');
    return;
  }
  notify(`MOVING ${targets.length} LEADS…`);
  const results = await Promise.allSettled(targets.map(l => leadService.update(l.id, { assignedCallerId: to })));
  let ok = 0;
  const updated = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      ok++;
      updated.push(r.value && r.value.lead ? mapLead(r.value.lead) : { ...targets[i], agentId: to, agent: toUser ? toUser.name : '' });
    }
  });
  dispatch(leadsUpdated(updated));
  const failed = targets.length - ok;
  notify(`REASSIGNED ${ok} LEADS TO ${toUser ? toUser.name.toUpperCase() : 'AGENT'}${failed ? ` · ${failed} FAILED` : ''}`);
}

// Saves the dial outcome on the lead (status / notes / attempt). The call itself is logged by the phone app.
// Resolves to { ok } or { error }.
export async function commitDialOutcome(lead, outcome, rawNote) {
  const status = DIAL_OUTCOME_TO_STATUS[outcome] || 'other';
  let note = rawNote.trim();
  if (outcome === 'WRONG NUMBER') note = note ? `Wrong number — ${note}` : 'Wrong number';
  const body = { status, logAttempt: true };
  if (note) body.notes = note;
  try {
    const json = await leadService.update(lead.id, body);
    const updated = json.lead ? mapLead(json.lead) : {
      ...lead, status, stage: STATUS_TO_STAGE[status] || 'NEW', attempts: lead.attempts + 1, notes: note || lead.notes, lastCallDate: new Date(),
    };
    dispatch(leadUpdated(updated));
    notify(`SAVED ${lead.name.toUpperCase()} · ${outcome}`);
    return { ok: true };
  } catch (e) {
    return { error: `Could not save: ${e.message}` };
  }
}

// Leads Pipeline: stage dropdown on a card
export async function moveLeadStage(leadId, newStage) {
  const l = getState().leads.list.find(x => x.id === leadId);
  const status = STAGE_TO_STATUS[newStage];
  if (!l || !status) return;
  try {
    const json = await leadService.update(leadId, { status });
    dispatch(leadUpdated(json.lead ? mapLead(json.lead) : { ...l, status, stage: newStage }));
    notify(`MOVED ${l.name.toUpperCase()} TO ${newStage}`);
  } catch (e) {
    notify(`⚠️ STAGE NOT SAVED: ${e.message}`);
  }
}

// Removes an upload and all its leads (optimistic; restored when the server refuses)
export async function removeUploadBatch(batchName) {
  const name = String(batchName || '').trim();
  if (!name) return;
  const { pendingUpload: previousPending, list: previousLeads } = getState().leads;
  dispatch(setPendingUpload(previousPending && previousPending.fileName === name ? null : previousPending));
  dispatch(leadsReplaced(previousLeads.filter(l => l.batchName !== name)));
  try {
    await leadService.removeBatch(name);
    notify(`REMOVED ${name.toUpperCase()} FROM UPLOAD HISTORY`);
  } catch (e) {
    dispatch(setPendingUpload(previousPending));
    dispatch(leadsReplaced(previousLeads));
    notify(`⚠️ REMOVE FAILED: ${e.message}`);
  }
}

// Add-lead dialog. Resolves to { ok } or { error }.
export async function createLead({ name, phone, assignedCallerId, notes }) {
  const body = { name, phone, status: 'new' };
  if (assignedCallerId) body.assignedCallerId = assignedCallerId;
  if (notes) body.notes = notes;
  try {
    const json = await leadService.create(body);
    if (json.lead) dispatch(leadAdded(mapLead(json.lead)));
    else await fetchLeads();
    notify(`ADDED ${name.toUpperCase()} TO NEW STAGE`);
    return { ok: true };
  } catch (e) {
    return { error: e.status === 409 ? 'A lead with this phone number already exists.' : `Could not save: ${e.message}` };
  }
}

// Batch window: split a file's unassigned leads among callers. Resolves to { ok, message } or { ok: false }.
export async function distributeBatch(batchName, allocations) {
  try {
    const json = await leadService.distribute(batchName, allocations);
    const done = (json.assigned || []).filter(a => a.count > 0);
    notify(`${done.reduce((s, a) => s + a.count, 0)} LEADS SPLIT AMONG ${done.length} CALLER${done.length === 1 ? '' : 'S'}`);
    await fetchLeads();
    return { ok: true, message: `✓ ASSIGNED ${done.map(a => `${a.count} TO ${String(a.name || '').toUpperCase()}`).join(' · ')}` };
  } catch (e) {
    notify(`⚠️ SPLIT FAILED: ${e.message}`);
    return { ok: false };
  }
}
