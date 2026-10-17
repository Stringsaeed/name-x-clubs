import { createGameController, type GameController, type GameView } from './controller';
import { challengesForLevel } from './engine';

let controller: GameController | null = null;

/** One controller per tab, created on first use and connected to the window exactly once. */
export function getController(): GameController {
  if (!controller) {
    controller = createGameController();
    controller.connect(window);
  }
  return controller;
}

export function subscribe(listener: () => void) {
  return getController().subscribe(listener);
}

export function getSnapshot(): GameView {
  return getController().getSnapshot();
}

/** What the server renders before the browser store has read localStorage. */
const initialView: GameView = {
  mode: 'free',
  level: 10,
  session: {
    kind: 'free',
    challenge: challengesForLevel(10)[0],
    round: { phase: 'idle', found: [] },
  },
  feedback: [],
  storageAvailable: true,
};

export const serverView: GameView = Object.freeze(initialView);

export function resetForTests() {
  controller = null;
}
