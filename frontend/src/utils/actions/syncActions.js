// BACKEND SYNC: everything the portal shows, loaded together and refreshed in the background,
// plus the admin-only "view as"
import { REFRESH_MS } from '../../data/constants';
import { setViewAs } from '../../redux/slices/authSlice';
import { setCallAgent } from '../../redux/slices/callsSlice';
import { dashInvalidated } from '../../redux/slices/dashboardSlice';
import { lbInvalidated } from '../../redux/slices/leaderboardSlice';
import { setPipelineAgent } from '../../redux/slices/leadsSlice';
import { setLastSync, setSyncing } from '../../redux/slices/uiSlice';
import store from '../../redux/store';
import { anyModalOpen, isAudioPlaying, isTyping } from '../dom';
import { roleLabel } from '../format';
import { notify } from '../notify';
import { fetchCalls } from './callActions';
import { fetchDemos } from './demoActions';
import { fetchLeads } from './leadActions';
import { fetchRecordings } from './recordingActions';
import { fetchDashboard, fetchLeaderboard } from './statsActions';
import { fetchUserDetail } from './userDetailActions';
import { fetchTodayStats, fetchUsers } from './userActions';

const { dispatch, getState } = store;

// The first error of the last sync, in the same order the HTML portal reports them
function firstError(s) {
  return s.users.error || s.calls.error || s.leads.error || s.recordings.error || s.users.todayError || s.demos.error || null;
}

export async function syncWithBackend(opts = {}) {
  const start = getState();
  if (start.ui.syncing || !start.auth.authUser) return;
  dispatch(setSyncing(true));
  try {
    // Users first: scope for the dashboard / leaderboard requests depends on them
    await fetchUsers();
    const jobs = [fetchCalls(false), fetchLeads(), fetchRecordings(false), fetchTodayStats(), fetchDemos(), fetchDashboard()];
    if (getState().ui.tab === 'lb') jobs.push(fetchLeaderboard());
    else dispatch(lbInvalidated());   // refetched when the page is opened
    await Promise.allSettled(jobs);
    dispatch(setLastSync(Date.now()));
    if (!opts.background) {
      const err = firstError(getState());
      if (err) notify(`⚠️ SOME DATA COULD NOT BE LOADED: ${err}`);
    }
  } finally {
    dispatch(setSyncing(false));
  }
}

// Background refresh: only while visible, never while typing, in a dialog or listening
export function backgroundRefresh() {
  const s = getState();
  if (!s.auth.authUser || document.hidden) return;
  if (isTyping() || anyModalOpen() || isAudioPlaying()) return;
  if (s.ui.userForm.open) return;
  syncWithBackend({ background: true });
}

export function refreshIfStale() {
  const s = getState();
  if (!document.hidden && s.auth.authUser && Date.now() - s.ui.lastSync > REFRESH_MS) backgroundRefresh();
}

// Live views: every 20 s while open, the numbers of the open page are re-read, so the green / red
// circles and the order follow new calls
export function liveTick() {
  const s = getState();
  if (!s.auth.authUser || document.hidden || s.ui.syncing) return;
  const tab = s.ui.tab;
  if (tab === 'dash') fetchDashboard();
  else if (tab === 'user') { fetchUserDetail(); fetchTodayStats(); }
  else if (tab === 'lb') fetchLeaderboard();   // places follow new connected calls
  else if (tab === 'calls') {
    if (isTyping() || anyModalOpen() || isAudioPlaying()) return;
    fetchCalls(false);
  } else if (['users', 'dial'].includes(tab)) {
    if (isTyping() || anyModalOpen() || s.ui.userForm.open) return;
    fetchTodayStats();
  }
}

// Admin-only "view as": scopes the portal to that person's team. The signed-in identity never changes.
// Returns the page to open ('leads' | 'dash') or null.
export function viewAsUser(uid) {
  const s = getState();
  const role = String((s.auth.authUser && s.auth.authUser.role) || '').toUpperCase();
  if (role !== 'ADMIN') return null;
  const u = s.users.list.find(x => x.id === uid);
  if (!u) return null;
  const myId = String(s.auth.authUser.id || s.auth.authUser._id || '');
  const next = uid === myId ? null : uid;
  dispatch(setViewAs(next));
  dispatch(setCallAgent('ALL'));
  dispatch(setPipelineAgent('ALL'));
  notify(next ? `VIEWING AS ${u.name.toUpperCase()} (${roleLabel(u.role)})` : 'BACK TO YOUR OWN VIEW');
  return ['CALLER', 'JR_MANAGER', 'TEAM_LEADER'].includes(u.role) ? 'leads' : 'dash';
}

export function returnToMyView() {
  dispatch(setViewAs(null));
  notify('RETURNED TO YOUR OWN VIEW');
  dispatch(dashInvalidated());
  dispatch(lbInvalidated());
}
