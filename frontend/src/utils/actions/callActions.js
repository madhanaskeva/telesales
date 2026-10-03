// CALL LOG: calls of the chosen range (scoped by the server exactly like the dashboard)
import { CALL_RANGE_DAYS, CALLS_FETCH_LIMIT } from '../../data/constants';
import { selectScope } from '../../redux/selectors';
import { callsFailed, callsLoaded, callsRequested, callsScopeReset, rangeChanged } from '../../redux/slices/callsSlice';
import store from '../../redux/store';
import { istDaysAgoStr, istMidnight } from '../format';
import { mapCall } from '../mappers';
import { callService } from '../services';

const { dispatch, getState } = store;

export async function fetchCalls(append = false) {
  const reqId = getState().calls.reqId + 1;
  dispatch(callsRequested(reqId));
  const state = getState();
  const days = CALL_RANGE_DAYS[state.calls.range] ?? 6;
  const from = istMidnight(istDaysAgoStr(days)).toISOString();
  const to = new Date().toISOString();
  const scopeKey = selectScope(state).scopeParam;
  let qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${CALLS_FETCH_LIMIT}${scopeKey}`;
  if (append && state.calls.meta.oldest) qs += `&before=${encodeURIComponent(state.calls.meta.oldest)}`;
  try {
    const json = await callService.list(qs);
    if (getState().calls.reqId !== reqId) return;   // a newer request was made meanwhile
    dispatch(callsLoaded({
      append,
      list: (json.calls || []).map(mapCall).filter(Boolean),
      total: json.total,
      hasMore: json.hasMore,
      scopeKey,
    }));
  } catch (e) {
    if (getState().calls.reqId === reqId) dispatch(callsFailed(e.message));
  }
}

export async function changeCallRange(val) {
  dispatch(rangeChanged(val));
  await fetchCalls(false);
}

// "View as" changed since these calls were loaded: reload them for the new scope
export function reloadCallsForScope() {
  dispatch(callsScopeReset());
  fetchCalls(false);
}
