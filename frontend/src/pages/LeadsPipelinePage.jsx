// ==========================================
// 7. LEADS PIPELINE (server-backed kanban)
// ==========================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LeadBadge } from '../components/common/Badge';
import FilterChips from '../components/common/FilterChips';
import Icon from '../components/common/Icon';
import PageHeader from '../components/common/PageHeader';
import UserLink from '../components/common/UserLink';
import { PIPELINE_PAGE_SIZE, PIPELINE_STAGE_FILTERS, PIPELINE_STAGES, STAGE_CLASS, STATUS_LABEL } from '../data/constants';
import { loadMorePipelineStage, setPipelineAgent, setPipelineSearch, setPipelineStage } from '../redux/slices/leadsSlice';
import { openLeadForm } from '../redux/slices/uiSlice';
import { selectScope, selectScopedLeads } from '../redux/selectors';
import { domKey, formatPhone, roleLabel } from '../utils/format';
import { leadAgentName, leadMatches } from '../utils/leads';
import { moveLeadStage } from '../utils/actions/leadActions';

const colId = (st) => st.replace(/[- ]/g, '_');

export default function LeadsPipelinePage() {
  const dispatch = useDispatch();
  const leadsState = useSelector(s => s.leads);
  const scopedAll = useSelector(selectScopedLeads);
  const { users, scoped } = useSelector(selectScope);
  const { pipelineStage, pipelineAgent, pipelineSearch, pipelinePages } = leadsState;

  const agentValid = pipelineAgent === 'ALL' || scoped.some(u => u.id === pipelineAgent);
  useEffect(() => {
    if (!agentValid) dispatch(setPipelineAgent('ALL'));
  }, [agentValid, dispatch]);
  const agent = agentValid ? pipelineAgent : 'ALL';

  let leads = scopedAll;
  if (agent !== 'ALL') {
    const au = users.find(u => u.id === agent);
    leads = leads.filter(l => (l.agentId ? l.agentId === agent : (au && l.agent === au.name)));
  }
  if (pipelineSearch) leads = leads.filter(l => leadMatches(users, l, pipelineSearch));

  const subtitle = leadsState.error && !leadsState.list.length
    ? 'Could not load leads'
    : `${leads.length} lead${leads.length === 1 ? '' : 's'} in the pipeline`;

  return (
    <>
      <PageHeader title="Leads Pipeline" subtitle={subtitle}>
        <div className="search-field">
          <Icon name="search" size="sm" />
          <label htmlFor="pipelineSearchInput" className="visually-hidden">Search pipeline</label>
          <input type="text" id="pipelineSearchInput" placeholder="Search lead, phone, agent…" defaultValue={pipelineSearch}
            onChange={(e) => dispatch(setPipelineSearch(e.target.value))} />
        </div>
        <label htmlFor="pipelineAgentFilter" className="visually-hidden">Agent</label>
        <select id="pipelineAgentFilter" className="toolbar-select" style={{ height: 34 }} value={agent} onChange={(e) => dispatch(setPipelineAgent(e.target.value))}>
          <option value="ALL">ALL AGENTS</option>
          {scoped.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()} ({roleLabel(u.role)})</option>)}
        </select>
        <button type="button" className="btn btn-primary" onClick={() => dispatch(openLeadForm({}))}><Icon name="plus" size="sm" />Add CRM lead</button>
      </PageHeader>

      {/* STAGE FILTER CHIPS (NEW, INTERESTED, FOLLOW-UP, CONVERTED, NOT INTERESTED) */}
      <div className="toolbar">
        <FilterChips id="pipelineStageChips" options={PIPELINE_STAGE_FILTERS} value={pipelineStage} onChange={(v) => dispatch(setPipelineStage(v))} />
      </div>

      <div className={`kanban-grid${pipelineStage !== 'ALL' ? ' single-stage' : ''}`}>
        {PIPELINE_STAGES.map(st => {
          const cid = colId(st);
          if (pipelineStage !== 'ALL' && pipelineStage !== cid) return null;
          const colLeads = leads.filter(l => l.stage === st);
          const totalPages = Math.max(1, Math.ceil(colLeads.length / PIPELINE_PAGE_SIZE));
          const page = Math.min(Math.max(1, pipelinePages[cid] || 1), totalPages);
          const visible = colLeads.slice(0, page * PIPELINE_PAGE_SIZE);
          return (
            <div className={`kanban-col ${STAGE_CLASS[st]}`} key={st}>
              <div className="kanban-col-head"><span className={`badge ${STAGE_CLASS[st]}`}>{st}</span><span className="chip-count">{colLeads.length}</span></div>
              <div className="kanban-col-body">
                {colLeads.length === 0 ? <div className="empty-box">Empty stage</div> : (
                  <>
                    {visible.map(l => {
                      const selId = `leadStage_${domKey(l.id)}`;
                      const rawLabel = STATUS_LABEL[l.status] || String(l.status).toUpperCase();
                      const agentName = leadAgentName(users, l);
                      return (
                        <div className="kanban-card" key={l.id}>
                          <div className="cell-primary">{l.name}</div>
                          <div className="cell-mono" style={{ marginTop: 2 }}>{formatPhone(l.phone)}</div>
                          <div className="kanban-card-meta">Agent · <UserLink user={{ id: l.agentId, name: agentName }} label={agentName} /></div>
                          {rawLabel !== st && <div style={{ marginTop: 6 }}><LeadBadge lead={l} /></div>}
                          <div className="cell-sub">{l.notes || '—'}</div>
                          <div className="kanban-card-foot">
                            <label htmlFor={selId} className="visually-hidden">Stage for {l.name}</label>
                            <select id={selId} className="select input-sm" value={l.stage} onChange={(e) => moveLeadStage(l.id, e.target.value)}>
                              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                    {visible.length < colLeads.length && (
                      <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={() => dispatch(loadMorePipelineStage(cid))}>
                        View more · {colLeads.length - visible.length} more
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
