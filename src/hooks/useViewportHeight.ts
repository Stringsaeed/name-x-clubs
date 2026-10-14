import { useLayoutEffect } from 'react';

const KEYBOARD_HEIGHT_THRESHOLD_PX = 100;

/**
 * Mirrors the visual viewport into `--play-height` and toggles the
 * `round-active` and `keyboard-open` classes on the body while a round is playing.
 */
export function useViewportHeight(roundActive: boolean) {
  useLayoutEffect(() => {
    document.body.classList.toggle('round-active', roundActive);

    const updateViewport = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      const keyboardOpen =
        roundActive && height < window.innerHeight - KEYBOARD_HEIGHT_THRESHOLD_PX;

      document.documentElement.style.setProperty('--play-height', `${height}px`);
      document.body.classList.toggle('keyboard-open', keyboardOpen);
    };

    updateViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.removeEventListener('resize', updateViewport);
      document.body.classList.remove('round-active', 'keyboard-open');
    };
  }, [roundActive]);
}
