/**
 * Official club names carry legal and sporting boilerplate ("FC", "Club Social y Deportivo",
 * "Sports Club", a founding year). The helpers here strip it so a club shows its recognisable
 * short form: crest initials and "starts with" letters use the part people actually say.
 */

/** Opening words that start a long official name, such as "Club Atlético" or "Associação Desportiva". */
const OPENERS: ReadonlySet<string> = new Set(['club', 'clube', 'associação', 'associacao']);

/** Words that may follow an opener and are still boilerplate ("Club Social y Deportivo"). */
const OPENER_MODIFIERS: ReadonlySet<string> = new Set([
  'social',
  'y',
  'de',
  'do',
  'da',
  'del',
  'deportivo',
  'desportivo',
  'esportivo',
  'atlético',
  'atletico',
  'sport',
  'sports',
  'futebol',
  'fútbol',
  'futbol',
]);

/** Legal-form and sport words that can sit at either end of a name. Compared without dots. */
const AFFIXES: ReadonlySet<string> = new Set([
  'ac',
  'afc',
  'al',
  'as',
  'bk',
  'bsc',
  'boldklub',
  'calcio',
  'cd',
  'cf',
  'club',
  'clube',
  'cs',
  'fc',
  'esporte',
  'ff',
  'fk',
  'fbc',
  'foot',
  'football',
  'futebol',
  'futbol',
  'fútbol',
  'fotbal',
  'fotball',
  'fotboll',
  'gs',
  'hnk',
  'if',
  'ifk',
  'kf',
  'kk',
  'ks',
  'kv',
  'nk',
  'ofk',
  'pfc',
  'rb',
  'rsc',
  'sc',
  'sd',
  'sk',
  'ss',
  'ssc',
  'sv',
  'tc',
  'tsv',
  'us',
]);

/** Linking words that are boilerplate at the end of a name and never carry an initial. */
const CONNECTORS: ReadonlySet<string> = new Set([
  '&',
  'and',
  'da',
  'de',
  'del',
  'di',
  'do',
  'et',
  'of',
  'sports',
  'the',
  'y',
]);

const SPACED_DASH = /\s[–—-]\s/;

const WORD_SEPARATORS = /[\s\-–—]+/;

const NUMBER_ONLY = /^\d+$/;

/** Words like "1929" or "1º" are dates, not part of the name's initials. */
const LETTER_FIRST = /^\p{L}/u;

/** Lower-case without dots, so "F.C.", "FC" and "fc" are the same word. */
function wordKey(word: string) {
  return word.toLowerCase().replaceAll('.', '');
}

function isNumber(word: string) {
  return NUMBER_ONLY.test(wordKey(word));
}

function isBoilerplateWord(word: string) {
  return AFFIXES.has(wordKey(word)) || CONNECTORS.has(wordKey(word)) || isNumber(word);
}

function wordsOf(name: string) {
  const beforeDash = name.split(SPACED_DASH)[0] ?? name;

  return beforeDash.split(WORD_SEPARATORS).filter((word) => word.length > 0);
}

/** Index of the first word that is not a leading opener or legal-form word. */
function firstKeptIndex(words: readonly string[]) {
  const lastIndex = words.length - 1;
  let index = 0;

  if (OPENERS.has(wordKey(words[0] ?? ''))) {
    index = 1;

    while (index < lastIndex && OPENER_MODIFIERS.has(wordKey(words[index] ?? ''))) {
      index += 1;
    }
  }

  while (index < lastIndex && isBoilerplateWord(words[index] ?? '')) {
    index += 1;
  }

  return index;
}

/** Index after the last word that is not a trailing legal-form word or founding year. */
function endOfKept(words: readonly string[], firstKept: number) {
  let end = words.length;

  while (end - 1 > firstKept && isBoilerplateWord(words[end - 1] ?? '')) {
    end -= 1;
  }

  return end;
}

/**
 * The words people actually say: "Club Social y Deportivo Colo-Colo" is "Colo Colo" and
 * "1. FC Heidenheim 1846" is "Heidenheim". A name made only of boilerplate keeps its words.
 */
export function shortClubWords(name: string): readonly string[] {
  const words = wordsOf(name);
  const firstKept = firstKeptIndex(words);
  const kept = words.slice(firstKept, endOfKept(words, firstKept));

  return kept.length > 0 ? kept : words;
}

/** Up to two capital letters for a crest badge: "Bayer 04 Leverkusen" is "BL". */
export function clubInitials(name: string): string {
  return shortClubWords(name)
    .filter((word) => LETTER_FIRST.test(word) && !CONNECTORS.has(wordKey(word)))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** The lower-case letters a name counts under: its first letter, and that of its short form. */
export function startingLetters(name: string): readonly string[] {
  const fullFirst = name.charAt(0).toLowerCase();
  const shortFirst = (shortClubWords(name)[0] ?? '').charAt(0).toLowerCase();

  return fullFirst === shortFirst ? [fullFirst] : [fullFirst, shortFirst];
}
