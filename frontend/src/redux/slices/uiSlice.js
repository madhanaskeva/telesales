// UI state: toast, sidebar, open dialogs, docked audio bar, sync status
import { createSlice } from '@reduxjs/toolkit';
import { resetSession } from '../actions';

const initialState = {
  toast: { msg: '', seq: 0 },
  sidebarOpen: false,
  tab: 'dash',
  dialLeadId: null,          // Lead dial dialog
  leadForm: null,            // Add-lead dialog prefill (null = closed)
  batchOpen: null,           // Uploaded-file details dialog (batch name)
  userForm: { open: false, editingId: null, seq: 0 },
  userView: 'list',
  treeFilter: 'ALL',
  audio: { visible: false, title: 'Call Recording', showNative: false, playing: false, idx: -1, total: 0 },
  lastSync: 0,
  syncing: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showToast(state, { payload }) { state.toast = { msg: String(payload || ''), seq: state.toast.seq + 1 }; },
    hideToast(state) { state.toast.msg = ''; },
    setSidebarOpen(state, { payload }) { state.sidebarOpen = typeof payload === 'boolean' ? payload : !state.sidebarOpen; },
    setTab(state, { payload }) { state.tab = payload; },

    openDial(state, { payload }) { state.dialLeadId = payload; },
    closeDial(state) { state.dialLeadId = null; },
    openLeadForm(state, { payload }) { state.leadForm = payload || {}; },
    closeLeadForm(state) { state.leadForm = null; },
    openBatch(state, { payload }) { state.batchOpen = payload; },
    closeBatch(state) { state.batchOpen = null; },

    // "Add user" toggles the form; "Edit" (with an id) always opens it for that user
    toggleUserForm(state, { payload }) {
      if (state.userForm.open && !payload) {
        state.userForm = { open: false, editingId: null, seq: state.userForm.seq };
        return;
      }
      state.userForm = { open: true, editingId: payload || null, seq: state.userForm.seq + 1 };
    },
    closeUserForm(state) { state.userForm = { open: false, editingId: null, seq: state.userForm.seq }; },
    setUserView(state, { payload }) { state.userView = payload; },
    setTreeFilter(state, { payload }) { state.treeFilter = payload; },

    audioBarShown(state, { payload }) { Object.assign(state.audio, { visible: true, title: payload.title, showNative: payload.showNative }); },
    audioBarHidden(state) { state.audio.visible = false; },
    audioControlsSynced(state, { payload }) { Object.assign(state.audio, payload); },

    setSyncing(state, { payload }) { state.syncing = !!payload; },
    setLastSync(state, { payload }) { state.lastSync = payload; },
  },
  extraReducers: (b) => {
    // Keep the toast so "LOGGED OUT" still shows after the reset
    b.addCase(resetSession, (state) => ({ ...initialState, toast: state.toast }));
  },
});

export const {
  showToast, hideToast, setSidebarOpen, setTab,
  openDial, closeDial, openLeadForm, closeLeadForm, openBatch, closeBatch,
  toggleUserForm, closeUserForm, setUserView, setTreeFilter,
  audioBarShown, audioBarHidden, audioControlsSynced, setSyncing, setLastSync,
} = uiSlice.actions;

export default uiSlice.reducer;
