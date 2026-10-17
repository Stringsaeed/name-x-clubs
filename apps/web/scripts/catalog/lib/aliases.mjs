// Builds each club's display names and cleaned alias list from Wikidata + curated overrides.
import rules from '../rules.json' with { type: 'json' };
import {
  aliasRejection,
  arabicShortForms,
  cleanArabicName,
  cleanEnglishName,
  normalize,
  sharesWord,
  shortForms,
  stripClubNoise,
} from './clean.mjs';

/** Alias kinds a curated (core) club accepts from Wikidata: its own list is already reviewed. */
const CORE_KINDS = new Set(['short', 'nick', 'alias-ar', 'redirect']);
/** Kinds that name the club by one of its own words ("Hotspur", "Villa") and are too loose. */
const FRAGMENT_CHECKED = new Set(['alias-en', 'alias-ar', 'nick', 'title', 'redirect']);
const CORPORATE_SUFFIX = /\b(?:sad|gmbh|ev|spa|s p a|ltd|limited|plc|srl|inc)$/;

const interleave = (a, b) => {
  const out = [];

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    out.push(...[a[i], b[i]].filter(Boolean));
  }

  return out;
};

const kinded = (kind, texts) => texts.map((text) => ({ text, kind }));

const arabicSource = (terms) => (terms?.ar ? 'wikidata-label' : 'arwiki-title');

/** The names of a club, from its override when curated, otherwise from Wikidata labels. */
export function displayNames(terms, override) {
  const label = terms?.en ?? terms?.enwiki ?? '';
  const mismatch = Boolean(terms?.en && terms.enwiki && !sharesWord(terms.en, terms.enwiki));
  const arabic = terms?.ar ?? terms?.arwiki ?? '';

  return {
    name: override?.name ?? cleanEnglishName(label),
    arabic: override?.arabic ?? cleanArabicName(arabic),
    arabicFrom: override?.arabic ? 'curated' : arabicSource(terms),
    labelMismatch: mismatch && !override?.name ? `${terms.en} <> ${terms.enwiki}` : null,
  };
}

/** Alias candidates from Wikidata in priority order (the first ones survive the per-club cap). */
function wikidataAliasCandidates({ name, arabic, terms, facts, redirects, generate }) {
  const short = (lang) =>
    facts.shortNames.filter((entry) => entry.lang === lang).map((entry) => entry.text);
  const interleaved = interleave(
    kinded('alias-en', terms?.aliasesEn ?? []),
    kinded('alias-ar', terms?.aliasesAr ?? []),
  );

  return [
    ...kinded('short', [...short('en'), ...short('ar')]),
    ...kinded('gen', generate ? [...shortForms(name), ...arabicShortForms(arabic)] : []),
    ...kinded(
      'nick',
      facts.nicknames.map((entry) => entry.text),
    ),
    ...interleaved,
    ...kinded('title', [terms?.enwiki, terms?.arwiki].filter(Boolean)),
    ...kinded('redirect', redirects),
  ];
}

/** A one-word alias that is just a piece of the club's own name. */
const isNameFragment = (key, nameKeys) =>
  !key.includes(' ') && nameKeys.some((nameKey) => nameKey.split(' ').includes(key));

/** Why a Wikidata-derived candidate is not kept, or null. */
function candidateRejection({ text, kind }, ctx) {
  const key = normalize(text);

  if (ctx.core && !CORE_KINDS.has(kind)) {
    return 'core-english-aliases-skipped';
  }

  if (ctx.seen.has(key) || ctx.seen.has(stripClubNoise(key)) || ctx.removed.has(key)) {
    return 'duplicate';
  }

  if (ctx.blocked.has(key)) {
    return 'curated-ambiguous-term';
  }

  if (text.includes(',') || CORPORATE_SUFFIX.test(key)) {
    return 'legal-form-or-list';
  }

  if (FRAGMENT_CHECKED.has(kind) && isNameFragment(key, ctx.nameKeys)) {
    return 'fragment-of-name';
  }

  return aliasRejection(text);
}

function curatedAliases(override, ctx) {
  const kept = [];

  for (const text of override?.aliases ?? []) {
    if (!ctx.seen.has(normalize(text)) && !ctx.removed.has(normalize(text))) {
      ctx.seen.add(normalize(text));
      kept.push({ text, level: 'curated' });
    }
  }

  return kept;
}

/**
 * Final alias list. Curated aliases are kept as given (minus removals). Wikidata-derived ones pass
 * the noise filter, are deduplicated against the names, and are capped.
 * `blocked` is the set of normalized curated ambiguous terms: they never become plain aliases.
 */
export function buildAliases({ names, terms, facts, override, redirects, blocked }) {
  const nameKeys = [normalize(names.name), normalize(names.arabic)];
  const ctx = {
    core: Boolean(override?.id),
    seen: new Set(nameKeys),
    removed: new Set((override?.removeAliases ?? []).map(normalize)),
    blocked,
    nameKeys,
  };
  const stats = { rejected: {} };
  const curated = curatedAliases(override, ctx);
  const derived = [];
  const candidates = wikidataAliasCandidates({
    name: names.name,
    arabic: names.arabic,
    terms,
    facts,
    redirects,
    generate: !ctx.core,
  });

  for (const candidate of candidates) {
    const text = cleanArabicName(cleanEnglishName(candidate.text));
    const reason = candidateRejection({ text, kind: candidate.kind }, ctx);

    if (reason) {
      stats.rejected[reason] = (stats.rejected[reason] ?? 0) + 1;
    } else {
      ctx.seen.add(normalize(text));
      derived.push({ text, level: 'wd' });
    }
  }

  const cap = ctx.core ? rules.maxCoreWikidataAliases : rules.maxNonCoreAliases;

  return { aliases: [...curated, ...derived.slice(0, cap)], stats };
}
