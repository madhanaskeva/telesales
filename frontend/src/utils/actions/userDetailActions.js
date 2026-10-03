// USER DETAILS PAGE (/user/:id): the user's numbers, calls and recordings, from the same
// endpoints (and counting) as the other pages
import { CALLS_FETCH_LIMIT, REC_FETCH_LIMIT } from '../../data/constants';
import { selectUdKey } from '../../redux/selectors';
import { recMetaMerged } from '../../redux/slices/recordingsSlice';
import { udLoaded, udRequested, udSettled } from '../../redux/slices/userDetailSlice';
import store from '../../redux/store';
import { mapCall, mapRecording } from '../mappers';
import { periodRange } from '../periods';
import { whenParam } from '../scope';
import { callService, recordingService, statsService } from '../services';

const { dispatch, getState } = store;

export async function fetchUserDetail() {
  const state = getState();
  const { userId: id, period, date } = state.userDetail;
  if (!id) return;
  const key = selectUdKey(state);
  if (state.userDetail.pendingKey === key) return;
  dispatch(udRequested(key));
  const { from, to } = periodRange(period, date);
  const only = `&callerIds=${encodeURIComponent(id)}`;
  const [dash, calls, recs] = await Promise.allSettled([
    statsService.dashboard(`?${whenParam(period, date)}${only}`),
    callService.range({ from, to, limit: CALLS_FETCH_LIMIT, extra: only }),
    recordingService.list(`?limit=${REC_FETCH_LIMIT}${only}`),
  ]);
  dispatch(udSettled(key));
  const now = getState();
  if (selectUdKey(now) !== key) return;   // another user or period was picked meanwhile
  const prev = now.userDetail.ud && now.userDetail.ud.key === key ? now.userDetail.ud : null;
  const why = (r) => (r.status === 'rejected' ? String((r.reason && r.reason.message) || r.reason || 'Request failed') : null);
  const recList = recs.status === 'fulfilled' ? (recs.value.recordings || []).map(mapRecording).filter(r => r.id) : null;
  if (recList) dispatch(recMetaMerged(recList));
  dispatch(udLoaded({
    key,
    dash: dash.status === 'fulfilled' ? (dash.value.data || null) : (prev ? prev.dash : null),
    dashError: why(dash),
    calls: calls.status === 'fulfilled' ? (calls.value.calls || []).map(mapCall).filter(Boolean).sort((a, b) => b.ts - a.ts) : (prev ? prev.calls : null),
    callsTotal: calls.status === 'fulfilled' ? Number(calls.value.total) || 0 : (prev ? prev.callsTotal : 0),
    callsHasMore: calls.status === 'fulfilled' ? !!calls.value.hasMore : (prev ? prev.callsHasMore : false),
    callsError: why(calls),
    recs: recList || (prev ? prev.recs : null),
    recsError: why(recs),
  }));
}
