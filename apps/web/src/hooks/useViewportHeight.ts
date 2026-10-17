import { useLayoutEffect } from 'react';

const KEYBOARD_HEIGHT_THRESHOLD_PX = 100;

/**
 * Mirrors the visual viewport into `--play-height` and `--play-top`, and toggles the
 * `round-active` and `keyboard-open` classes on the body while a round is playing.
 * `--play-top` follows Safari when it pans the page to reveal a focused field.
 */
export function useViewportHeight(roundActive: boolean) {
  useLayoutEffect(() => {
    document.body.classList.toggle('round-active', roundActive);
    // Safari shrinks innerHeight with the keyboard, so a one-time difference misses it.
    // Remember the tallest height from before the keyboard opened.
    let baseline = 0;

    const updateViewport = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      // The keyboard shortens the visual viewport. offsetTop is Safari panning
      // that viewport, not part of the keyboard, so it must not shrink this.
      baseline = Math.max(baseline, window.innerHeight, offsetTop + height);
      const keyboardHeight = baseline - height;
      const keyboardOpen = roundActive && keyboardHeight > KEYBOARD_HEIGHT_THRESHOLD_PX;

      document.documentElement.style.setProperty('--play-height', `${height}px`);
      // Safari pans the visual viewport to keep the field in view. Follow that pan
      // so the card stays on screen instead of leaving a gap above the keyboard.
      document.documentElement.style.setProperty('--play-top', `${offsetTop}px`);
      document.body.classList.toggle('keyboard-open', keyboardOpen);
    };

    const resetBaseline = () => {
      baseline = 0;
      updateViewport();
    };

    updateViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', resetBaseline);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', resetBaseline);
      document.body.classList.remove('round-active', 'keyboard-open');
      document.documentElement.style.removeProperty('--play-top');
    };
  }, [roundActive]);
}
