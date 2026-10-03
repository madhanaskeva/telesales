// GLOBAL TOAST NOTIFICATION (bottom right, 3.2 s)
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TOAST_MS } from '../../data/constants';
import { hideToast } from '../../redux/slices/uiSlice';

export default function Toast() {
  const dispatch = useDispatch();
  const { msg, seq } = useSelector(s => s.ui.toast);

  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => dispatch(hideToast()), TOAST_MS);
    return () => clearTimeout(t);
  }, [msg, seq, dispatch]);

  return (
    <div id="globalToast" role="status" aria-live="polite" style={{ display: msg ? 'block' : 'none' }} key={seq}>
      {msg}
    </div>
  );
}
