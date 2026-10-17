import type { Locale } from '@nxc/game/i18n/config';
import * as browserStore from '../browserStore';
import { createRankedApi } from './api';
import { type PlaySnapshot, RankedPlay } from './rankedPlay';
import type { SessionStoragePort } from './storedRound';

let play: RankedPlay | null = null;

function tabStorage(): SessionStoragePort | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** One game per tab, on the browser store's controller, ranked against this site's API. */
export function getBrowserPlay(lang: Locale): RankedPlay {
  if (play === null) {
    play = new RankedPlay({
      controller: browserStore.getController(),
      api: createRankedApi((input, init) => window.fetch(input, init)),
      storage: tabStorage(),
      lang,
    });
  }

  return play;
}

/** What the server renders: the browser store's first view, with no ranked round. */
export const serverPlaySnapshot: PlaySnapshot = Object.freeze({
  view: browserStore.serverView,
  ranked: null,
});
