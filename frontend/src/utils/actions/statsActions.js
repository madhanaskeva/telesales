// DASHBOARD + LEADERBOARD: the server counts every call in MongoDB; these numbers are the source of truth
import { selectDashKey, selectLbKey } from '../../redux/selectors';
import { dashFailed, dashRequested, dashSucceeded } from '../../redux/slices/dashboardSlice';
import { lbFailed, lbRequested, lbSucceeded } from '../../redux/slices/leaderboardSlice';
import store from '../../redux/store';
import { ApiError } from '../api';
import { statsService } from '../services';

const { dispatch, getState } = store;

export async function fetchDashboard() {
  const key = selectDashKey(getState());
  dispatch(dashRequested(key));
  try {
    const json = await statsService.dashboard(key);
    if (!json.data) throw new ApiError('No dashboard data returned', 0, json);
    dispatch(dashSucceeded({ key, data: json.data }));
  } catch (err) {
    dispatch(dashFailed({ key, error: err.message }));
  }
}

export async function fetchLeaderboard() {
  const key = selectLbKey(getState());
  dispatch(lbRequested(key));
  try {
    const json = await statsService.leaderboard(key);
    dispatch(lbSucceeded({ key, data: json.employees || [] }));
  } catch (e) {
    dispatch(lbFailed({ key, error: e.message }));
  }
}
