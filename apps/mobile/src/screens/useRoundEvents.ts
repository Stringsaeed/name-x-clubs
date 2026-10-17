import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { cue } from '../feedback/feedback';
import type { PlaySnapshot } from '../game/play';

/**
 * When a playing round completes: the keyboard goes, and reaching the target fires `complete`
 * once. A round restored already complete stays quiet.
 */
export function useRoundEvents(view: PlaySnapshot['view']) {
  const round = view.session.round;
  const phase = round.phase;
  const won = phase === 'complete' && round.found.length === view.session.challenge.target;
  const previous = useRef(phase);

  useEffect(() => {
    const was = previous.current;
    previous.current = phase;

    if (phase !== 'complete' || was !== 'playing') {
      return;
    }

    Keyboard.dismiss();

    if (won) {
      cue('complete');
    }
  }, [phase, won]);
}

/** True while the software keyboard is on screen. */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(show, () => setVisible(true));
    const hidden = Keyboard.addListener(hide, () => setVisible(false));

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return visible;
}
