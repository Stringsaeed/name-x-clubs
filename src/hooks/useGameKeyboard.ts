import { useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'nxc-game-keyboard';

/** Phones, including iPhone Safari. Desktop keeps the real keyboard. */
export const PHONE_KEYBOARD_QUERY = '(max-width: 760px) and (pointer: coarse)';

function readDisabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

function writeDisabled(disabled: boolean) {
  try {
    if (disabled) {
      window.localStorage.setItem(STORAGE_KEY, 'off');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private mode can still play; the choice just won't survive a reload.
  }
}

/**
 * The in-page keyboard stands in for the system one on phones, so Safari never
 * pans the page. Players can turn it off and keep the choice.
 */
export function useGameKeyboard(playing: boolean) {
  const [phone, setPhone] = useState(false);
  const [disabled, setDisabled] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia(PHONE_KEYBOARD_QUERY);
    const sync = () => setPhone(media.matches);
    sync();
    setDisabled(readDisabled());
    media.addEventListener('change', sync);

    return () => media.removeEventListener('change', sync);
  }, []);

  const preferred = phone && !disabled;
  const active = playing && preferred;

  useLayoutEffect(() => {
    document.body.classList.toggle('game-keyboard', active);

    return () => document.body.classList.remove('game-keyboard');
  }, [active]);

  const disable = () => {
    writeDisabled(true);
    setDisabled(true);
  };

  const enable = () => {
    writeDisabled(false);
    setDisabled(false);
  };

  return { active, offered: playing && phone, preferred, disable, enable };
}
