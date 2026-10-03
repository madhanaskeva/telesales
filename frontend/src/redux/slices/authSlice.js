// LOGIN · SESSION state (sign-in logic lives in utils/actions/authActions.js)
import { createSlice } from '@reduxjs/toolkit';
import { resetSession } from '../actions';

const initialState = {
  status: 'checking',   // checking → signedOut | signedIn
  authUser: null,       // the real signed-in account (from /auth/me) — never changed by "view as"
  viewAsId: null,       // admin-only, in-memory "view as" scope; never persisted
  loginError: '',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, { payload }) {
      state.status = 'signedIn';
      state.authUser = payload;
      state.viewAsId = null;
      state.loginError = '';
    },
    loginShown(state, { payload }) {
      state.status = 'signedOut';
      state.authUser = null;
      state.loginError = payload || '';
    },
    clearLoginError(state) { state.loginError = ''; },
    setViewAs(state, { payload }) { state.viewAsId = payload || null; },
  },
  extraReducers: (b) => {
    b.addCase(resetSession, () => initialState);
  },
});

export const { signedIn, loginShown, clearLoginError, setViewAs } = authSlice.actions;
export default authSlice.reducer;
