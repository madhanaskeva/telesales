// ==========================================
// CONFIG · SESSION · API
// ==========================================
import { TOKEN_KEY, USER_KEY } from '../data/constants';
import ENDPOINTS from '../data/endpoints';

// /api goes through the Vite proxy in development (see vite.config.js); set VITE_API_BASE for a
// build hosted away from the backend. VITE_API_FALLBACK is tried when the first base is unreachable.
export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');
const FALLBACK_API_BASE = (import.meta.env.VITE_API_FALLBACK || '').replace(/\/+$/, '') || null;

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
export function setSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  } catch { /* storage blocked */ }
}
export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* storage blocked */ }
}

export class ApiError extends Error {
  constructor(message, status, body, network) {
    super(message);
    this.status = status;
    this.body = body;
    this.network = !!network;
  }
}

// The store registers what happens when the server says the session is gone (back to sign-in)
let onSessionExpired = null;
export function setSessionExpiredHandler(fn) { onSessionExpired = fn; }

// Single entry point for every API call: base URL, auth JSON in/out, and session expiry.
export async function apiFetch(path, opts = {}) {
  const headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
  const token = getToken();
  if (token && !opts.noAuth) headers.Authorization = `Bearer ${token}`;
  let body = opts.body;
  if (body !== undefined && body !== null && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const bases = [API_BASE];
  if (FALLBACK_API_BASE && !bases.includes(FALLBACK_API_BASE)) bases.push(FALLBACK_API_BASE);

  for (const base of bases) {
    let res;
    try {
      res = await fetch(`${base}${path}`, { method: opts.method || 'GET', headers, body });
    } catch {
      continue;
    }

    let json = null;
    try { json = await res.json(); } catch { json = null; }
    if (res.status === 401 && !opts.noAuth && (!json || json.code === 'AUTH_REQUIRED')) {
      if (onSessionExpired) onSessionExpired('Your session has expired — please sign in again.');
      throw new ApiError('Session expired', 401, json);
    }
    if (!res.ok || (json && json.success === false)) {
      const msg = (json && (json.message || json.error)) || `Request failed (HTTP ${res.status})`;
      throw new ApiError(msg, res.status, json);
    }
    return json || {};
  }

  throw new ApiError('Could not reach the server — check your connection.', 0, null, true);
}

// <audio> cannot send headers, so the token rides in the query string
export function recordingAudioUrl(id) {
  return `${API_BASE}${ENDPOINTS.recordingAudio(id)}?token=${encodeURIComponent(getToken())}`;
}
