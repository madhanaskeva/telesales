// Badges & status pills (the look lives in style.css)
import { STAGE_CLASS, STATUS_TO_STAGE } from '../../data/constants';
import { roleLabel } from '../../utils/format';
import { isFreshLead, leadLabel } from '../../utils/leads';
import { roleBadgeClass } from '../../utils/scope';
import Icon from './Icon';

// tone: neutral | success | warning | danger | dark | lime | outline
export function Badge({ children, tone = 'neutral', dot, lg, className = '', title }) {
  const cls = ['badge', `badge-${tone}`, dot ? 'badge-dot' : '', lg ? 'badge-lg' : '', className].filter(Boolean).join(' ');
  return <span className={cls} title={title}>{children}</span>;
}

export function StageBadge({ stage, label, lg }) {
  return <span className={`badge ${STAGE_CLASS[stage] || 'stage-new'}${lg ? ' badge-lg' : ''}`}>{label || stage}</span>;
}

// A lead's current status, coloured by its pipeline stage (no-answer / busy in amber)
export function LeadBadge({ lead }) {
  const label = leadLabel(lead);
  if (isFreshLead(lead)) return <Badge tone="neutral">{label}</Badge>;
  if (['notPickup', 'busyOnCall', 'warned'].includes(lead.status)) return <Badge tone="warning">{label}</Badge>;
  if (lead.status === 'lost') return <Badge tone="danger">{label}</Badge>;
  if (lead.status === 'interestedLater') return <StageBadge stage="INTERESTED" label={label} />;
  const stage = STATUS_TO_STAGE[lead.status];
  return stage ? <StageBadge stage={stage} label={label} /> : <Badge tone="neutral">{label}</Badge>;
}

export function DirBadge({ dir }) {
  if (dir === 'IN') return <span className="badge badge-success"><Icon name="in" size="sm" />Inbound</span>;
  if (dir === 'OUT') return <span className="badge badge-dark"><Icon name="out" size="sm" />Outbound</span>;
  return <Badge tone="neutral">Unknown</Badge>;
}

export function OutcomeBadge({ out }) {
  const tone = out === 'CONNECTED' ? 'success' : (out === 'MISSED' ? 'danger' : 'warning');
  return <Badge tone={tone} dot>{out}</Badge>;
}

export function CountPill({ n }) {
  return <span className={`count-pill ${n > 0 ? 'is-good' : 'is-bad'}`}>{n}</span>;
}

export function RoleBadge({ role }) {
  return <span className={`role-badge ${roleBadgeClass(role)}`}>{roleLabel(role)}</span>;
}

// Green / red presence dot + text (agents with / without connected calls)
export function PresenceDot({ online, label }) {
  return (
    <span
      className={`presence-dot ${online ? 'is-online' : 'is-offline'}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      title={label}
    />
  );
}
