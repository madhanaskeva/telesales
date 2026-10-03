// Call ↔ recording matching
import { MIN_RECORDING_SECONDS } from '../data/constants';
import { last10 } from './format';

function recTime(r) { return r && r.ts ? r.ts.getTime() : NaN; }

// The server links a call to its recording (recordingId). Fallback for older rows:
// same caller + same customer number + started within 5 minutes (closest wins).
export function findRecordingForCall(recordings, c) {
  if (!c) return null;
  if (c.recordingId) return recordings.find(r => r.id === c.recordingId) || null;
  if (!(c.dur > 0) || c.out !== 'CONNECTED') return null;
  const p = last10(c.phone);
  if (!p) return null;
  const callTs = c.ts.getTime();
  let best = null;
  let bestGap = 5 * 60 * 1000;
  recordings.forEach(r => {
    if (last10(r.phone) !== p) return;
    if (c.callerId && r.callerId && c.callerId !== r.callerId) return;
    if (!(c.callerId && r.callerId) && last10(c.callerPhone) && last10(r.callerPhone) && last10(c.callerPhone) !== last10(r.callerPhone)) return;
    const t = recTime(r);
    if (isNaN(t)) return;
    const gap = Math.abs(t - callTs);
    if (gap <= bestGap) { best = r; bestGap = gap; }
  });
  return best;
}

export function recIdForCall(recordings, c) {
  if (c && c.recordingId) return c.recordingId;
  const r = findRecordingForCall(recordings, c);
  return r ? r.id : null;
}

export function isShortRecording(c) { return !(c.dur > MIN_RECORDING_SECONDS); }

export function reviewAverage(crit) {
  const vals = Object.values(crit).filter(v => v > 0);
  return { scored: vals.length, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
}
