import { countries } from '../../content/catalog';
import type { Challenge, Level, Scope } from '../model';
import { eligibleClubs } from './scope';

type ChallengeTemplate = Omit<Challenge, 'target'>;

/** Countries with deep, well-known leagues. */
const EASY_COUNTRIES: ReadonlySet<string> = new Set([
  'england',
  'spain',
  'italy',
  'germany',
  'france',
]);

const LETTERS = ['b', 'a', 's', 'm', 'c'];

const REGIONS = ['europe', 'asia', 'africa', 'americas'] as const;

function countryChallenge(country: string): ChallengeTemplate {
  const scope: Scope = { kind: 'country', country };
  const difficulty = EASY_COUNTRIES.has(country) ? 'easy' : 'medium';

  return { id: country, scope, difficulty };
}

function letterChallenge(letter: string): ChallengeTemplate {
  return { id: `letter-${letter}`, scope: { kind: 'letter', letter }, difficulty: 'medium' };
}

function regionChallenge(region: (typeof REGIONS)[number]): ChallengeTemplate {
  return { id: region, scope: { kind: 'region', region }, difficulty: 'medium' };
}

const worldTemplate: ChallengeTemplate = {
  id: 'world',
  scope: { kind: 'world' },
  difficulty: 'easy',
};

const scopedTemplates: readonly ChallengeTemplate[] = [
  ...Object.keys(countries).map(countryChallenge),
  ...LETTERS.map(letterChallenge),
  ...REGIONS.map(regionChallenge),
];

/** The world challenge first, then every scope with enough clubs to finish this level. */
export function challengesForLevel(target: Level): [Challenge, ...Challenge[]] {
  const playable = scopedTemplates.filter((template) => eligibleClubs(template).length >= target);

  return [{ ...worldTemplate, target }, ...playable.map((template) => ({ ...template, target }))];
}
