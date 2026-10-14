import { useCallback, useMemo } from 'react';
import * as browserStore from '../game/browserStore';
import type { GameController } from '../game/controller';
import type { Level, Mode } from '../game/model';

/**
 * Stable event-handler callbacks for the game. The controller is resolved lazily inside
 * each handler so the browser store is never touched during render.
 */
export function useGameActions(injected: GameController | undefined) {
  const getController = useCallback(
    (): GameController => injected ?? browserStore.getController(),
    [injected],
  );

  return useMemo(
    () => ({
      changeMode: (mode: Mode) => getController().dispatch({ type: 'mode', mode }),
      changeLevel: (level: Level) => getController().dispatch({ type: 'level', level }),
      changeCategory: (category: string) =>
        getController().dispatch({ type: 'practice', category }),
      startRound: () => getController().dispatch({ type: 'start' }),
      finishRound: () => getController().dispatch({ type: 'finish' }),
      nextRound: () => getController().dispatch({ type: 'restart' }),
      shareResult: ((language) =>
        getController().shareResult(language)) as GameController['shareResult'],
      submitAnswer: (text: string) => {
        const controller = getController();
        const before = controller.getSnapshot().session.round.found.length;

        controller.dispatch({ type: 'answer', text });

        return controller.getSnapshot().session.round.found.length > before;
      },
    }),
    [getController],
  );
}
