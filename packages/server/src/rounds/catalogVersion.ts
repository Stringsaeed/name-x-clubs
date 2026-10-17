import { clubs } from '@nxc/game/content/catalog';
import { sha256Hex } from '../crypto';

/**
 * Identifies the club catalog a round was scored against. A larger catalog changes what a score
 * means, so boards can later be split by it.
 */
export const catalogVersion = `c${clubs.length}-${sha256Hex(clubs.map((club) => club.id).join(',')).slice(0, 10)}`;
