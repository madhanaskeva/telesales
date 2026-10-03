// CALL LOG state: calls of the chosen range + the page's filters
import { createSlice } from '@reduxjs/toolkit';
import { CALL_RANGE_DAYS } from '../../data/constants';
import { resetSession } from '../actions';

const emptyMeta = () => ({ total: 0, hasMore: false, oldest: null });

const initialState = {
  list: [],
  meta: emptyMeta(),
  loaded: false,
  error: null,
  scopeKey: null,
  reqId: 0,
  // filters
  filter: 'ALL',
  agent: 'ALL',
  search: '',
  page: 1,
  range: 'today',   // same default period as the dashboard, so the counts match on first view
};

const callsSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    callsRequested(state, { payload }) { state.reqId = payload; },
    callsLoaded(state, { payload }) {
      const { append, list, total, hasMore, scopeKey } = payload;
      let next;
      if (append) {
        const seen = new Set(state.list.map(c => c.id));
        next = state.list.concat(list.filter(c => !seen.has(c.id)));
      } else {
        next = list;
      }
      next.sort((a, b) => b.ts - a.ts);
      const oldest = next.length ? next[next.length - 1].ts.toISOString() : null;
      state.list = next;
      state.meta = { total: Number(total) || next.length, hasMore: !!hasMore, oldest };
      state.scopeKey = scopeKey;
      state.error = null;
      state.loaded = true;
    },
    callsFailed(state, { payload }) { state.error = payload; },
    // "View as" changed since these calls were loaded
    callsScopeReset(state) { state.loaded = false; state.list = []; },
    rangeChanged(state, { payload }) {
      state.range = CALL_RANGE_DAYS[payload] !== undefined ? payload : '7d';
      state.page = 1;
      state.list = [];
      state.meta = emptyMeta();
      state.loaded = false;
    },
    setCallFilter(state, { payload }) { state.filter = payload; state.page = 1; },
    setCallAgent(state, { payload }) { state.agent = payload || 'ALL'; state.page = 1; },
    setCallSearch(state, { payload }) { state.search = payload; state.page = 1; },
    setCallPage(state, { payload }) { state.page = Math.max(1, payload); },
  },
  extraReducers: (b) => {
    b.addCase(resetSession, () => initialState);
  },
});

export const {
  callsRequested, callsLoaded, callsFailed, callsScopeReset, rangeChanged,
  setCallFilter, setCallAgent, setCallSearch, setCallPage,
} = callsSlice.actions;
export default callsSlice.reducer;
