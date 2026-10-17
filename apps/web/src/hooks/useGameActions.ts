import type { Language, Level, Mode } from '@nxc/game/model';
import { useMemo } from 'react';
import type { RankedPlay } from '../game/ranked/rankedPlay';

/**
 * Stable event-handler callbacks for the game. The game is resolved lazily inside each handler
 * so the browser store is never touched during render.
 */
export function useGameActions(getPlay: () => RankedPlay) {
  return useMemo(
    () => ({
      changeMode: (mode: Mode) => getPlay().changeMode(mode),
      changeLevel: (level: Level) => getPlay().changeLevel(level),
      changeCategory: (category: string) => getPlay().changeCategory(category),
      startRound: () => getPlay().startRound(),
      finishRound: () => getPlay().finishRound(),
      nextRound: () => getPlay().nextRound(),
      shareResult: (language: Language) => getPlay().shareResult(language),
      submitAnswer: (text: string) => getPlay().submitAnswer(text),
    }),
    [getPlay],
  );
}
