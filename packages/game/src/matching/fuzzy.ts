import type { Club } from '../content/catalog';
import { isCatalogWord, namesWithWordCount } from './aliases';

/** Shorter names are too easy to confuse with other clubs to correct at all. */
const MIN_FUZZY_LENGTH = 5;

/** Two typos are tolerated only in long names, where they cannot turn into another real name. */
const TWO_EDIT_LENGTH = 10;

/** In names shorter than this, one wrong letter is more often another club than a typo. */
const SUBSTITUTION_LENGTH = 8;

/** How many typos a name of this length may contain. */
export function allowedEdits(length: number) {
  if (length < MIN_FUZZY_LENGTH) {
    return 0;
  }

  if (length < TWO_EDIT_LENGTH) {
    return 1;
  }

  return 2;
}

/**
 * Edit distance where a missing, extra or wrong letter, or two neighbouring letters swapped,
 * each count as one edit ("optimal string alignment" distance).
 */
export function editDistance(typed: string, expected: string) {
  // Row-major table: the cell for (typedCount, expectedCount) holds the edits between the first
  // `typedCount` typed letters and the first `expectedCount` expected letters.
  const width = expected.length + 1;
  const table: number[] = [];

  function cell(typedCount: number, expectedCount: number) {
    return table[typedCount * width + expectedCount] ?? Number.POSITIVE_INFINITY;
  }

  for (let typedCount = 0; typedCount <= typed.length; typedCount++) {
    for (let expectedCount = 0; expectedCount <= expected.length; expectedCount++) {
      table.push(cheapestEdit(typed, expected, typedCount, expectedCount, cell));
    }
  }

  return cell(typed.length, expected.length);
}

/** Fills one table cell from its neighbours, which are already known. */
function cheapestEdit(
  typed: string,
  expected: string,
  typedCount: number,
  expectedCount: number,
  cell: (typedCount: number, expectedCount: number) => number,
) {
  if (typedCount === 0 || expectedCount === 0) {
    return typedCount + expectedCount;
  }

  const typedLetter = typed[typedCount - 1];
  const expectedLetter = expected[expectedCount - 1];
  const letterCost = typedLetter === expectedLetter ? 0 : 1;

  const extraLetter = cell(typedCount - 1, expectedCount) + 1;
  const missingLetter = cell(typedCount, expectedCount - 1) + 1;
  const keptOrWrongLetter = cell(typedCount - 1, expectedCount - 1) + letterCost;
  const cheapest = Math.min(extraLetter, missingLetter, keptOrWrongLetter);

  const swappedWithPrevious =
    typedCount > 1 &&
    expectedCount > 1 &&
    typedLetter === expected[expectedCount - 2] &&
    typed[typedCount - 2] === expectedLetter;

  if (!swappedWithPrevious) {
    return cheapest;
  }

  return Math.min(cheapest, cell(typedCount - 2, expectedCount - 2) + 1);
}

/** How many edits turn one typed word into an alias word, or `null` if it is not a plausible typo. */
function typoEdits(typed: string, expected: string) {
  if (typed === expected) {
    return 0;
  }

  // A correctly spelled name of some club ("Bayer") is not a typo of another ("Bayern").
  if (isCatalogWord(typed)) {
    return null;
  }

  // People rarely get the first letter wrong: "Angers" is not a typo of "Rangers".
  if (typed[0] !== expected[0]) {
    return null;
  }

  const allowed = allowedEdits(expected.length);

  if (Math.abs(typed.length - expected.length) > allowed) {
    return null;
  }

  const edits = editDistance(typed, expected);

  if (edits > allowed) {
    return null;
  }

  // Same length means a swap or a wrong letter. Short names only forgive the swap ("Randers").
  const wrongLetter = typed.length === expected.length && !isSwap(typed, expected);

  if (wrongLetter && expected.length < SUBSTITUTION_LENGTH) {
    return null;
  }

  return edits;
}

function isSwap(typed: string, expected: string) {
  const differences: number[] = [];

  for (let index = 0; index < typed.length; index++) {
    if (typed[index] !== expected[index]) {
      differences.push(index);
    }
  }

  const [first, second] = differences;

  return (
    differences.length === 2 &&
    first !== undefined &&
    second === first + 1 &&
    typed[first] === expected[second] &&
    typed[second] === expected[first]
  );
}

/** Total edits between a typed name and an alias, compared word by word, or `null` if too many. */
function aliasEdits(typedWords: readonly string[], aliasWords: readonly string[], allowed: number) {
  let total = 0;

  for (let index = 0; index < typedWords.length; index++) {
    const edits = typoEdits(typedWords[index] ?? '', aliasWords[index] ?? '');

    if (edits === null) {
      return null;
    }

    total += edits;

    if (total > allowed) {
      return null;
    }
  }

  return total;
}

/**
 * The clubs whose name is the closest plausible misspelling of `key`, or none. Each word must be
 * a typo of the matching alias word, so "الاهلي القطري" (a real name plus a different qualifier)
 * never turns into "الاهلي القاهري".
 */
export function clubsNamedApproximately(key: string): readonly Club[] {
  const allowed = allowedEdits(key.length);

  if (allowed === 0) {
    return [];
  }

  const typedWords = key.split(' ');
  let fewestEdits = allowed + 1;
  let closest = new Set<Club>();

  for (const alias of namesWithWordCount(typedWords.length)) {
    const edits = aliasEdits(typedWords, alias.words, allowed);

    if (edits === null || edits > fewestEdits) {
      continue;
    }

    if (edits < fewestEdits) {
      fewestEdits = edits;
      closest = new Set();
    }

    for (const club of alias.clubs) {
      closest.add(club);
    }
  }

  return [...closest];
}
