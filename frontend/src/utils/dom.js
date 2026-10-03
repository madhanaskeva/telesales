// Guards for the background refresh: never while typing, in a dialog or listening to a recording
export function isTyping() {
  const a = document.activeElement;
  if (!a) return false;
  return a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable;
}

export function anyModalOpen() { return !!document.querySelector('.modal-overlay.active'); }

export function isAudioPlaying() {
  return Array.from(document.querySelectorAll('audio')).some(a => !a.paused && !a.ended);
}

// Non-button elements acting as buttons respond to Enter / Space
export function onKeyActivate(fn) {
  return (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn(e);
    }
  };
}
