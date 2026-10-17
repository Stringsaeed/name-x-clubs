/** Latin accents left over by NFKD (é → e + ◌́), Arabic harakat and Quranic marks, and tatweel (ـ). */
const DIACRITICS = /[̀-ͯؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Alef with hamza or madda, and alef wasla, are typed interchangeably with a bare alef. */
const ALEF_VARIANTS = /[أإآٱ]/g;

/** A final alef maksura (ى) is often typed for ya (ي). */
const ALEF_MAKSURA = /ى/g;

/** A final ta marbuta (ة) is often typed as ha (ه). */
const TA_MARBUTA = /ة/g;

/** Apostrophes and dots join their neighbours: "Newell's" → "newells", "M.U.F.C." → "mufc". */
const JOINING_PUNCTUATION = /['’.]/g;

/** Every other run of punctuation, symbols (including "&") or spaces becomes one space. */
const SEPARATORS = /[^\p{L}\p{N}]+/gu;

/** Words that only say "football club": "Arsenal FC" and "Barcelona SC" are the bare name. */
const CLUB_SUFFIXES = /\b(?:football club|fc|afc|cf|sc)\b/g;

/** The Arabic word for "club" in front of a name: "نادي الزمالك" is الزمالك. */
const ARABIC_CLUB_PREFIX = /^نادي\s+/;

/** A number stuck to either end of a name: list numbering ("123Arsenal") or noise ("Arsenal123"). */
const EDGE_NUMBERS = /^\p{N}+\s*|\s*\p{N}+$/gu;

const WHITESPACE_RUNS = /\s+/g;

/** The Arabic conjunction "and", written joined to the next word: "وريال مدريد". */
export const ARABIC_AND_PREFIX = 'و';

/**
 * Folds the ways people type a club name into one form: lower case, no accents or Arabic
 * diacritics, unified alef, ya and ta marbuta, and single spaces between words.
 */
export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .replace(ALEF_VARIANTS, 'ا')
    .replace(ALEF_MAKSURA, 'ي')
    .replace(TA_MARBUTA, 'ه')
    .replace(JOINING_PUNCTUATION, '')
    .replace(SEPARATORS, ' ')
    .trim();
}

/** Removes the words around a name that do not identify the club. */
export function stripClubNoise(key: string) {
  const stripped = key
    .replace(CLUB_SUFFIXES, '')
    .replace(ARABIC_CLUB_PREFIX, '')
    .replace(EDGE_NUMBERS, '')
    .replace(WHITESPACE_RUNS, ' ')
    .trim();

  return stripped || key;
}

/**
 * The keys to look a typed name up by, most specific first. The untouched form comes first so
 * official names that contain "FC" or a number ("Los Angeles FC", "Como 1907") still match.
 */
export function lookupKeys(value: string): string[] {
  const full = normalize(value);
  const stripped = stripClubNoise(full);
  const keys = [full, stripped];

  if (stripped.startsWith(ARABIC_AND_PREFIX)) {
    keys.push(stripped.slice(ARABIC_AND_PREFIX.length));
  }

  return [...new Set(keys)].filter(Boolean);
}
