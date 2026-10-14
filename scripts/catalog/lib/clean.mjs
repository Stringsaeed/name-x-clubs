// Name and alias cleaning: turn noisy Wikidata labels/aliases into clean display names and aliases.
// Normalization is the game's own (src/game/matching/normalize.ts, loaded via Node's type stripping).

import { normalize, stripClubNoise } from '../../../src/game/matching/normalize.ts';
import rules from '../rules.json' with { type: 'json' };

export { normalize, stripClubNoise };

/** Direction marks and zero-width characters that Wikidata aliases sometimes carry. */
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\ufeff]/g;
const BRACKETS = /\s*[([（][^)\]）]*[)\]）]\s*/g;
const wordsPattern = (words) =>
  new RegExp(`(?<![\\p{L}\\p{N}-])(?:${words.join('|')})(?![\\p{L}\\p{N}-])`, 'u');
const SQUAD_EN = wordsPattern(rules.squadLabelWords);
const SQUAD_AR = wordsPattern(rules.squadLabelWordsAr);
const NOISE_EN = new RegExp(rules.noiseAliasPattern, 'i');
const NOISE_AR = new RegExp(rules.noiseAliasPatternAr);
const GENERIC = new Set(rules.genericTerms.map(normalize));
const AFFIXES = new Set(rules.affixTokens);
const PREFIXES = new Set(rules.prefixTokens);
const TRAILING_FC = /\s+(?:football club|f\.?\s?c\.?|a\.?\s?f\.?\s?c\.?|c\.?\s?f\.?)$/i;
const ARABIC_CLUB_WORD = /^نادي\s+/;
const ARABIC_FOOTBALL_SUFFIX = /\s+لكرة القدم$/;
/** Bare initials like "BFC" or "AFC": they name dozens of clubs. */
const ABBREVIATION = /^[a-z]{1,2}fc$/;
const MAX_ALIAS_CHARS = 40;
const MAX_ALIAS_WORDS = 6;
const MIN_ALIAS_KEY = 4;

export const isGeneric = (text) => GENERIC.has(normalize(text));

/** Removes parenthesised disambiguators: "Galatasaray S.K. (football)" -> "Galatasaray S.K.". */
export function stripBrackets(text) {
  return text.replace(INVISIBLE, '').replace(BRACKETS, ' ').replace(/\s+/g, ' ').trim();
}

/** True when a label marks a women's, youth or reserve side rather than a first team. */
export function isSquadLabel(en, ar) {
  return Boolean((en && SQUAD_EN.test(en.replaceAll('.', ''))) || (ar && SQUAD_AR.test(ar)));
}

/** "Arsenal F.C." -> "Arsenal". A leading "FC" stays (it is part of the real name). */
export function cleanEnglishName(label) {
  const stripped = stripBrackets(label).replace(TRAILING_FC, '').trim();

  return stripped || stripBrackets(label);
}

/** "نادي ريال مدريد لكرة القدم" -> "ريال مدريد". */
export function cleanArabicName(label) {
  const stripped = stripBrackets(label.replaceAll('"', ' '))
    .replace(ARABIC_FOOTBALL_SUFFIX, '')
    .replace(ARABIC_CLUB_WORD, '')
    .trim();

  return stripped || stripBrackets(label);
}

/** Why an alias must not be kept, or `null` when it is fine. */
export function aliasRejection(text) {
  const clean = stripBrackets(text);
  const key = normalize(clean);

  if (!clean || key.length < MIN_ALIAS_KEY) {
    return 'too-short';
  }

  if (clean.length > MAX_ALIAS_CHARS || key.split(' ').length > MAX_ALIAS_WORDS) {
    return 'too-long';
  }

  if (ABBREVIATION.test(key)) {
    return 'abbreviation';
  }

  if (NOISE_EN.test(clean) || NOISE_AR.test(clean)) {
    return 'sub-topic-or-award';
  }

  return GENERIC.has(key) ? 'generic' : null;
}

const isAffix = (token, extra) => AFFIXES.has(normalize(token)) || extra.has(normalize(token));

function shortenTokens(tokens) {
  let start = 0;
  let end = tokens.length;

  while (start < end - 1 && isAffix(tokens[start], PREFIXES)) {
    start++;
  }

  while (end - 1 > start && AFFIXES.has(normalize(tokens[end - 1]))) {
    end--;
  }

  return tokens.slice(start, end).join(' ');
}

const TRAILING_GENERIC = new Set(rules.trailingGeneric);
const TRAILING_GENERIC_AR = new Set(rules.trailingGenericAr.map(normalize));
const MIN_SHORT_FORM_KEY = 4;

function dropTrailing(text, generic) {
  const tokens = text.split(/\s+/);
  const last = normalize(tokens.at(-1));

  return tokens.length > 1 && generic.has(last) ? tokens.slice(0, -1).join(' ') : null;
}

/** Generated short spellings of an English name: no FC/SC/VfL affixes, and "Al Hilal" -> "AlHilal". */
export function shortForms(name) {
  const forms = [];
  const short = shortenTokens(stripBrackets(name).split(/\s+/));
  const bare = dropTrailing(short, TRAILING_GENERIC);

  if (normalize(short).length >= MIN_SHORT_FORM_KEY && normalize(short) !== normalize(name)) {
    forms.push(short);
  }

  if (bare && normalize(bare).length >= MIN_SHORT_FORM_KEY) {
    forms.push(bare);
  }

  for (const form of [name, short]) {
    const key = normalize(form);

    if (key.startsWith('al ') && key.split(' ').length === 2) {
      forms.push(key.replace(' ', ''));
    }
  }

  return forms;
}

/** "كارديف سيتي" -> "كارديف". */
export function arabicShortForms(arabic) {
  const bare = dropTrailing(arabic, TRAILING_GENERIC_AR);

  return bare && normalize(bare).length >= MIN_SHORT_FORM_KEY ? [bare] : [];
}

/** Whether two names have at least one word in common (after normalization). */
export function sharesWord(a, b) {
  const words = new Set(normalize(a).split(' '));

  return normalize(b)
    .split(' ')
    .some((word) => words.has(word));
}
