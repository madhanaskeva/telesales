// USER DETAILS PAGE state (/user/:id): one person's numbers, calls and recordings
import { createSlice } from '@reduxjs/toolkit';
import { resetSession } from '../actions';

const initialState = {
  userId: null,
  ud: null,            // { key, dash, dashError, calls, callsTotal, callsHasMore, callsError, recs, recsError }
  pendingKey: null,
  period: 'today',
  date: null,
  page: 1,
};

const userDetailSlice = createSlice({
  name: 'userDetail',
  initialState,
  reducers: {
    udUserSet(state, { payload }) {
      if (state.userId !== payload) {
        state.userId = payload;
        state.page = 1;
      }
    },
    setUdPeriod(state, { payload }) { state.period = payload; state.date = null; state.page = 1; },
    setUdDate(state, { payload }) { state.date = payload; state.page = 1; },
    setUdPage(state, { payload }) { state.page = Math.max(1, payload); },
    udRequested(state, { payload }) { state.pendingKey = payload; },
    udSettled(state, { payload }) { if (state.pendingKey === payload) state.pendingKey = null; },
    udLoaded(state, { payload }) { state.ud = payload; },
  },
  extraReducers: (b) => {
    b.addCase(resetSession, () => initialState);
  },
});

export const { udUserSet, setUdPeriod, setUdDate, setUdPage, udRequested, udSettled, udLoaded } = userDetailSlice.actions;
export default userDetailSlice.reducer;
