import type { Locale } from '@nxc/game/i18n/config';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { GameController } from '../game/controller';
import type { RankedApi } from '../game/ranked/api';
import { getBrowserPlay, serverPlaySnapshot } from '../game/ranked/browserPlay';
import { RankedPlay } from '../game/ranked/rankedPlay';
import type { SessionStoragePort } from '../game/ranked/storedRound';

/** Lets tests play ranked rounds against a fake API. */
export type RankedSetup = Readonly<{ api: RankedApi; storage?: SessionStoragePort | null }>;

function injectedPlay(lang: Locale, controller?: GameController, ranked?: RankedSetup) {
  if (controller === undefined) {
    return null;
  }

  return new RankedPlay({
    controller,
    api: ranked?.api ?? null,
    storage: ranked?.storage ?? null,
    lang,
  });
}

/**
 * The game and its current snapshot. An injected controller is played locally unless `ranked`
 * is given; otherwise the tab's browser store is used, ranked against this site's API.
 */
export function useRankedPlay(lang: Locale, controller?: GameController, ranked?: RankedSetup) {
  const [injected] = useState(() => injectedPlay(lang, controller, ranked));
  const getPlay = useCallback(() => injected ?? getBrowserPlay(lang), [injected, lang]);
  const subscribe = useCallback((listener: () => void) => getPlay().subscribe(listener), [getPlay]);
  const getSnapshot = useCallback(() => getPlay().getSnapshot(), [getPlay]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => serverPlaySnapshot);

  useEffect(() => getPlay().connect(window), [getPlay]);

  return { snapshot, getPlay };
}
