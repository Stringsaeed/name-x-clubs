import { clubs } from '@nxc/game/content/catalog';
import { parseAnswers } from '@nxc/game/engine';

/** Club names that each resolve to exactly one club worldwide, so every one scores. */
export function uniqueClubNames(count: number): string[] {
  const names = clubs
    .map((club) => club.name)
    .filter((name) => {
      const parsed = parseAnswers(name);

      return parsed.length === 1 && parsed[0]?.kind === 'match';
    });

  if (names.length < count) {
    throw new Error(`Only ${names.length} unambiguous club names`);
  }

  return names.slice(0, count);
}
