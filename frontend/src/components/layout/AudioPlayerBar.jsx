// DOCKED BOTTOM AUDIO PLAYER BAR (driven by utils/audioController)
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  audioCtlStep, audioCtlToggle, closeBottomAudioBar, onAnyAudioPlay, registerDock, syncAudioControls,
} from '../../utils/audioController';
import Icon from '../common/Icon';

export default function AudioPlayerBar() {
  const audio = useSelector(s => s.ui.audio);
  const dockRef = useCallback((el) => { if (el) registerDock(el); }, []);

  return (
    <div id="bottomAudioPlayerBar" style={{ display: audio.visible ? 'flex' : 'none' }}>
      <div className="audio-title-wrap">
        <span className="presence-dot is-online" aria-hidden="true" />
        <div className="audio-title">{audio.title}</div>
      </div>
      <div className="audio-ctl-group">
        <button type="button" className="audio-ctl-btn" onClick={() => audioCtlStep(-1)} disabled={audio.idx <= 0} title="Previous recording" aria-label="Previous recording">⏮</button>
        <button type="button" className="audio-ctl-btn audio-ctl-play" onClick={audioCtlToggle} title={audio.playing ? 'Pause' : 'Play'} aria-label={audio.playing ? 'Pause' : 'Play'}>
          {audio.playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="audio-ctl-btn" onClick={() => audioCtlStep(1)} disabled={audio.idx < 0 || audio.idx >= audio.total - 1} title="Next recording" aria-label="Next recording">⏭</button>
        <span className="muted mono" style={{ fontSize: 'var(--ds-fs-2xs)', whiteSpace: 'nowrap' }}>
          {audio.idx >= 0 ? `${audio.idx + 1} / ${audio.total}` : ''}
        </span>
      </div>
      <audio
        id="bottomGlobalAudio"
        ref={dockRef}
        controls
        preload="none"
        aria-label="Call recording player"
        style={{ display: audio.showNative ? 'block' : 'none' }}
        onPlay={(e) => onAnyAudioPlay(e.currentTarget)}
        onPause={syncAudioControls}
        onEnded={syncAudioControls}
      />
      <button type="button" className="audio-close" onClick={closeBottomAudioBar} aria-label="Close player" title="Close player">
        <Icon name="x" size="sm" />
      </button>
    </div>
  );
}
