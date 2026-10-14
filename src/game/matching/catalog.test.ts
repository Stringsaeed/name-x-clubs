import { expect, test } from 'vitest';
import type { Scope } from '../model';
import { challengesForLevel } from './challenges';
import { resolveClub } from './resolve';
import type { Resolution } from './types';

function describeResolution(resolution: Resolution) {
  if (resolution.kind === 'match' || resolution.kind === 'wrong-category') {
    return `${resolution.kind}: ${resolution.club.id}`;
  }

  return resolution.kind;
}

function resolveIn(input: string, scope?: Scope) {
  return describeResolution(resolveClub(input, scope ? { scope } : undefined));
}

test.each([
  ['Al Ahly', 'egypt-0'],
  ['الأهلي المصري', 'egypt-0'],
  ['Al Nassr', 'saudi-1'],
  ['النصر السعودي', 'saudi-1'],
])('"%s" is one club anywhere in the world', (input, id) => {
  expect(resolveIn(input)).toBe(`match: ${id}`);
});

test.each(['الأهلي', 'النصر', 'الاتحاد'])('"%s" is ambiguous worldwide', (input) => {
  expect(resolveIn(input)).toBe('ambiguous');
});

test('a famous club keeps a shared name worldwide, and the local club keeps it at home', () => {
  expect(resolveIn('Liverpool')).toBe('match: england-3');
  expect(resolveIn('ليفربول')).toBe('match: england-3');
  expect(resolveIn('Barcelona')).toBe('match: spain-1');
  expect(resolveIn('برشلونة')).toBe('match: spain-1');
  expect(resolveIn('Liverpool', { kind: 'country', country: 'uruguay' })).toBe('match: wd-1131189');
  expect(resolveIn('Barcelona', { kind: 'country', country: 'ecuador' })).toBe('match: wd-248782');
  expect(resolveIn('برشلونة', { kind: 'country', country: 'ecuador' })).toBe('match: wd-248782');
  expect(resolveIn('Sheffield')).toBe('ambiguous');
});

test('a shared Arabic name is settled by the round country', () => {
  expect(resolveIn('الأهلي', { kind: 'country', country: 'egypt' })).toBe('match: egypt-0');
  expect(resolveIn('النصر', { kind: 'country', country: 'oman' })).toBe('match: wd-2829388');
});

test.each([
  ['Colo-Colo', 'wd-207373'],
  ['Colo Colo', 'wd-207373'],
  ['كولو-كولو', 'wd-207373'],
  ['Cremonese', 'wd-759482'],
  ['كريمونيزي', 'wd-759482'],
  ['Samsunspor', 'wd-430107'],
  ['سامسون سبور', 'wd-430107'],
  ['Maribor', 'wd-210530'],
  ['ماريبور', 'wd-210530'],
  ['Urawa Reds', 'wd-218883'],
  ['Kashima Antlers', 'wd-16932'],
])('the newly added club "%s" resolves worldwide', (input, id) => {
  expect(resolveIn(input)).toBe(`match: ${id}`);
});

test('a club from a newly available country counts in its own country only', () => {
  expect(resolveIn('Samsunspor', { kind: 'country', country: 'turkey' })).toBe('match: wd-430107');
  expect(resolveIn('Samsunspor', { kind: 'country', country: 'japan' })).toBe(
    'wrong-category: wd-430107',
  );
});

test('oceania is offered as a region at 10 clubs but not at 50', () => {
  const regionIds = (level: 10 | 50 | 100) =>
    challengesForLevel(level).flatMap((challenge) =>
      challenge.scope.kind === 'region' ? challenge.scope.region : [],
    );

  expect(regionIds(10)).toContain('oceania');
  expect(regionIds(50)).not.toContain('oceania');
});

test('letters are offered only when the level can be finished, and more than the original five', () => {
  const letters = (level: 10 | 50 | 100) =>
    challengesForLevel(level).flatMap((challenge) =>
      challenge.scope.kind === 'letter' ? challenge.scope.letter : [],
    );

  expect(letters(10).length).toBeGreaterThan(5);
  expect(letters(100).length).toBeLessThan(letters(10).length);
  expect(letters(10)).toEqual([...letters(10)].sort());
});
