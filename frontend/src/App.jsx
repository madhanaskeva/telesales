// Root: the sign-in screen until a portal user is signed in, then the routed portal.
// The toast, icon sprite and docked audio player live outside both.
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import IconSprite from './components/common/IconSprite';
import Toast from './components/common/Toast';
import AudioPlayerBar from './components/layout/AudioPlayerBar';
import LoginPage from './pages/LoginPage';
import AppRoutes from './routes/AppRoutes';
import { checkSession } from './utils/actions/authActions';

export default function App() {
  const status = useSelector(s => s.auth.status);

  useEffect(() => { checkSession(); }, []);

  return (
    <>
      <IconSprite />
      <Toast />
      {status === 'signedIn' ? <AppRoutes /> : <LoginPage />}
      <AudioPlayerBar />
    </>
  );
}
