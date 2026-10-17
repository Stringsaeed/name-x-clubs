import { countries, type Region, regionSchema } from '../../content/catalog';
import type { Challenge, Level, Scope } from '../model';
import { eligibleClubs } from './scope';

type ChallengeTemplate = Omit<Challenge, 'target'>;

/** Every letter is offered; `challengesForLevel` keeps those with enough clubs for the level. */
const LETTERS = [...'abcdefghijklmnopqrstuvwxyz'];

const REGIONS: readonly Region[] = regionSchema.options;

function countryChallenge(country: string): ChallengeTemplate {
  const scope: Scope = { kind: 'country', country };
  return { id: country, scope };
}

function letterChallenge(letter: string): ChallengeTemplate {
  return { id: `letter-${letter}`, scope: { kind: 'letter', letter } };
}

function regionChallenge(region: Region): ChallengeTemplate {
  return { id: region, scope: { kind: 'region', region } };
}

const worldTemplate: ChallengeTemplate = {
  id: 'world',
  scope: { kind: 'world' },
};

const scopedTemplates: readonly ChallengeTemplate[] = [
  ...REGIONS.map(regionChallenge),
  ...Object.keys(countries).map(countryChallenge),
  ...LETTERS.map(letterChallenge),
];

const challengeCache = new Map<Level, readonly [Challenge, ...Challenge[]]>();

function buildChallenges(target: Level): readonly [Challenge, ...Challenge[]] {
  const playable = scopedTemplates.filter((template) => eligibleClubs(template).length >= target);

  return [{ ...worldTemplate, target }, ...playable.map((template) => ({ ...template, target }))];
}

/**
 * The world challenge first, then every scope with enough clubs to finish this level: regions,
 * countries, then letters. Display order within a group is up to the caller.
 */
export function challengesForLevel(target: Level): readonly [Challenge, ...Challenge[]] {
  const cached = challengeCache.get(target);

  if (cached) {
    return cached;
  }

  const challenges = buildChallenges(target);
  challengeCache.set(target, challenges);

  return challenges;
}
