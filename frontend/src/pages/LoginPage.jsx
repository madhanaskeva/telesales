// LOGIN: admins, managers, junior managers and team leaders (POST /auth/admin-login)
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Logo from '../components/common/Logo';
import PasswordField from '../components/common/PasswordField';
import { clearLoginError } from '../redux/slices/authSlice';
import { login } from '../utils/actions/authActions';

export default function LoginPage() {
  const dispatch = useDispatch();
  const storeError = useSelector(s => s.auth.loginError);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shownError = error || storeError;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    dispatch(clearLoginError());
    const id = identifier.trim();
    if (!id || !password) {
      setError('Enter your email (or phone) and password.');
      return;
    }
    setBusy(true);
    const res = await login(id, password);
    if (res.ok) return;   // the portal opens; this page unmounts
    setBusy(false);
    setError(res.error);
  };

  return (
    <div id="webLoginOverlay">
      <div className="login-card">
        <div className="login-logo"><Logo /></div>
        <div className="login-title">Telesales Monitor</div>
        <div className="login-subtitle">Admin, manager &amp; team leader portal</div>

        <div className="alert-error" role="alert" style={{ display: shownError ? 'block' : 'none' }}>{shownError}</div>
        <form onSubmit={submit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="webLoginEmail">Email or phone</label>
            <input type="text" id="webLoginEmail" className="form-control" autoComplete="username" inputMode="email"
              autoCapitalize="off" spellCheck="false" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="webLoginPassword">Password</label>
            <PasswordField id="webLoginPassword" autoComplete="current-password" required value={password} onChange={setPassword} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 6 }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="login-note">Admins, managers &amp; junior managers only.</div>
        </form>
      </div>
    </div>
  );
}
