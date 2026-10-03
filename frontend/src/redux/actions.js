import { createAction } from '@reduxjs/toolkit';

// Sign-out / expired session: every slice goes back to its initial state
export const resetSession = createAction('session/reset');
