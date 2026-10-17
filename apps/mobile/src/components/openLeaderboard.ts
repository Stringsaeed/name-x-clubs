import type { Level } from '@nxc/game/model';
import { router } from 'expo-router';
import { rankedModeFor } from '../../../web/src/game/ranked/rankedView';

/**
 * Opens the leaderboard on the board for `level`. The route reads `mode` (`t10` | `t50` | `t100`)
 * from its search params. The caller fires the `page` cue (its pressable does).
 */
export function openLeaderboard(level: Level) {
  router.push({ pathname: '/leaderboard', params: { mode: rankedModeFor(level) } });
}
