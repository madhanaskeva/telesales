// Lead helpers shared by Lead Calling, the Leads Pipeline, the batch window and user details
import { CALLBACK_OVERDUE_MS, STATUS_LABEL } from '../data/constants';
import { last10 } from './format';

export function isFreshLead(l) { return l.status === 'new' && !l.attempts; }

export function leadLabel(l) {
  return isFreshLead(l) ? 'FRESH' : (STATUS_LABEL[l.status] || String(l.status).toUpperCase());
}

export function leadAgentName(users, l) {
  if (l.agentId) {
    const u = users.find(x => x.id === l.agentId);
    if (u) return u.name;
  }
  return l.agent || 'UNASSIGNED';
}

export function isCallbackDue(l) {
  return l.status === 'followUp' && !!l.lastCallDate && !isNaN(l.lastCallDate.getTime());
}
export function isCallbackOverdue(l) {
  return isCallbackDue(l) && Date.now() - l.lastCallDate.getTime() > CALLBACK_OVERDUE_MS;
}

export function leadPhoneSet(leads) {
  return new Set(leads.map(l => last10(l.phone)).filter(Boolean));
}

// Search by lead name, phone digits or agent name (lower-case query)
export function leadMatches(users, l, q) {
  if (!q) return true;
  const qDigits = q.replace(/\D/g, '');
  return l.name.toLowerCase().includes(q) ||
    (!!qDigits && l.phone.replace(/\D/g, '').includes(qDigits)) ||
    leadAgentName(users, l).toLowerCase().includes(q);
}

// "Dial activity" cell text
export function dialActivityText(l, fmtTs) {
  return isFreshLead(l) ? 'NOT DIALED YET' : `${l.attempts || 0}× DIALED${l.lastCallDate ? ' · LAST ' + fmtTs(l.lastCallDate) : ''}`;
}

// The leads of one person (by id, or by name on older rows)
export function leadsOf(leads, u) {
  return leads.filter(l => (l.agentId ? l.agentId === u.id : l.agent === u.name));
}
