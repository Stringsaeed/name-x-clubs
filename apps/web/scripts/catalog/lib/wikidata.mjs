// Wikidata / Wikipedia access for the ingest: SPARQL candidate pulls, facts, labels, redirects.
import { cachedJson } from './http.mjs';

const SPARQL = 'https://query.wikidata.org/sparql';
const API = 'https://www.wikidata.org/w/api.php';
const ARWIKI = 'https://ar.wikipedia.org/w/api.php';
const SPARQL_GAP_MS = 1500;
const API_GAP_MS = 400;

/** Direct P31 classes that denote an association football club (national teams excluded). */
export const CLUB_CLASSES = ['Q476028', 'Q103229495', 'Q103231176'];
const DEFUNCT_CLASS = 'Q94579592';
const MULTISPORT_CLASS = 'Q847017';
const FOOTBALL_SPORT = 'Q2736';

const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );

const qidOf = (binding) => binding?.value.split('/').pop();
const values = (ids) => ids.map((id) => `wd:${id}`).join(' ');

async function sparql(query) {
  const json = await cachedJson({
    url: SPARQL,
    method: 'POST',
    params: { query },
    gapMs: SPARQL_GAP_MS,
    accept: 'application/sparql-results+json',
  });

  return json.results.bindings;
}

/** Active direct-P31 football clubs with at least `minLinks` sitelinks, as Map qid -> sitelinks. */
export async function fetchClubCandidates(minLinks) {
  const rows = await sparql(`SELECT ?item ?links WHERE {
    VALUES ?cls { ${values(CLUB_CLASSES)} }
    ?item wdt:P31 ?cls . ?item wikibase:sitelinks ?links .
    FILTER(?links >= ${minLinks})
    FILTER NOT EXISTS { ?item wdt:P576 [] }
    FILTER NOT EXISTS { ?item wdt:P31 wd:${DEFUNCT_CLASS} }
  }`);

  return new Map(rows.map((row) => [qidOf(row.item), Number(row.links.value)]));
}

/** Active multisport clubs whose sport includes football, for clubs with no football item. */
export async function fetchMultisportCandidates(minLinks) {
  const rows = await sparql(`SELECT ?item ?links WHERE {
    ?item wdt:P31 wd:${MULTISPORT_CLASS} . ?item wdt:P641 wd:${FOOTBALL_SPORT} .
    ?item wikibase:sitelinks ?links . FILTER(?links >= ${minLinks})
    FILTER NOT EXISTS { ?item wdt:P576 [] }
    FILTER NOT EXISTS { ?item wdt:P31 wd:${DEFUNCT_CLASS} }
  }`);

  return new Map(rows.map((row) => [qidOf(row.item), Number(row.links.value)]));
}

const FACT_PROPS = {
  P31: 'types',
  P17: 'countries',
  P361: 'partOf',
  P527: 'hasPart',
  P1830: 'owns',
  P641: 'sports',
};
const NAME_PROPS = { P1813: 'shortNames', P1449: 'nicknames' };

function emptyFacts() {
  return {
    links: 0,
    types: new Set(),
    countries: new Set(),
    partOf: new Set(),
    hasPart: new Set(),
    owns: new Set(),
    sports: new Set(),
    shortNames: [],
    nicknames: [],
  };
}

function addFact(facts, row) {
  const prop = qidOf(row.p);
  const text = row.v.value;

  if (FACT_PROPS[prop]) {
    facts[FACT_PROPS[prop]].add(qidOf(row.v));
  } else if (NAME_PROPS[prop] && ['en', 'ar'].includes(row.v['xml:lang'])) {
    facts[NAME_PROPS[prop]].push({ text, lang: row.v['xml:lang'] });
  }
}

/** Types, countries, parents, sports, sitelink count and name statements for a set of QIDs. */
export async function fetchFacts(qids) {
  const out = new Map(qids.map((id) => [id, emptyFacts()]));
  const props = [...Object.keys(FACT_PROPS), ...Object.keys(NAME_PROPS)].map((p) => `wdt:${p}`);

  for (const batch of chunk(qids, 120)) {
    const rows = await sparql(`SELECT ?item ?links ?p ?v WHERE {
      VALUES ?item { ${values(batch)} } VALUES ?p { ${props.join(' ')} }
      ?item wikibase:sitelinks ?links . ?item ?p ?v .
    }`);

    for (const row of rows) {
      const facts = out.get(qidOf(row.item));
      facts.links = Number(row.links.value);
      addFact(facts, { p: { value: row.p.value }, v: row.v });
    }

    await fillSitelinks(batch, out);
  }

  return out;
}

/** Items with none of the listed statements would be missed above, so read their links directly. */
async function fillSitelinks(batch, out) {
  const missing = batch.filter((id) => out.get(id).links === 0);

  if (missing.length === 0) {
    return;
  }

  const rows = await sparql(`SELECT ?item ?links WHERE {
    VALUES ?item { ${values(missing)} } ?item wikibase:sitelinks ?links .
  }`);

  for (const row of rows) {
    out.get(qidOf(row.item)).links = Number(row.links.value);
  }
}

/** For clubs whose P17 is the United Kingdom: the constituent country (England ...) via P131. */
export async function fetchUkParts(qids) {
  const out = new Map();

  for (const batch of chunk(qids, 150)) {
    const rows = await sparql(`SELECT ?item ?part WHERE {
      VALUES ?item { ${values(batch)} } VALUES ?part { wd:Q21 wd:Q22 wd:Q25 wd:Q26 }
      ?item (wdt:P159|wdt:P115|wdt:P131)/wdt:P131* ?part .
    }`);

    for (const row of rows) {
      const found = out.get(qidOf(row.item)) ?? new Set();
      found.add(qidOf(row.part));
      out.set(qidOf(row.item), found);
    }
  }

  return out;
}

/** Continent (P30) and ISO 3166-1 alpha-2 code (P297) for country QIDs. */
export async function fetchCountryFacts(qids) {
  const out = new Map(qids.map((id) => [id, { continents: new Set(), iso: null }]));

  for (const batch of chunk(qids, 120)) {
    const rows = await sparql(`SELECT ?item ?cont ?iso WHERE {
      VALUES ?item { ${values(batch)} }
      OPTIONAL { ?item wdt:P30 ?cont } OPTIONAL { ?item wdt:P297 ?iso }
    }`);

    for (const row of rows) {
      const facts = out.get(qidOf(row.item));

      if (row.cont) {
        facts.continents.add(qidOf(row.cont));
      }

      if (row.iso) {
        facts.iso = row.iso.value;
      }
    }
  }

  return out;
}

function termsOf(id, entity) {
  const aliases = (lang) => (entity.aliases?.[lang] ?? []).map((alias) => alias.value);

  return {
    id: entity.id ?? id,
    en: entity.labels?.en?.value ?? null,
    ar: entity.labels?.ar?.value ?? null,
    aliasesEn: aliases('en'),
    aliasesAr: aliases('ar'),
    enwiki: entity.sitelinks?.enwiki?.title ?? null,
    arwiki: entity.sitelinks?.arwiki?.title ?? null,
  };
}

/** en/ar labels, aliases and en/ar wiki titles, 50 QIDs per request. */
export async function fetchTerms(qids) {
  const out = new Map();

  for (const batch of chunk(qids, 50)) {
    const json = await cachedJson({
      url: API,
      gapMs: API_GAP_MS,
      params: {
        action: 'wbgetentities',
        ids: batch.join('|'),
        props: 'labels|aliases|sitelinks',
        languages: 'en|ar',
        sitefilter: 'enwiki|arwiki',
      },
    });

    for (const id of batch) {
      const entity = json.entities?.[id];

      if (entity && entity.missing === undefined) {
        out.set(id, termsOf(id, entity));
      }
    }
  }

  return out;
}

/** Arabic Wikipedia redirects pointing at each article title (extra Arabic spellings). */
export async function fetchArwikiRedirects(titles) {
  const out = new Map();

  for (const batch of chunk(titles, 50)) {
    let cont = {};

    do {
      const json = await cachedJson({
        url: ARWIKI,
        gapMs: API_GAP_MS,
        params: {
          action: 'query',
          prop: 'redirects',
          titles: batch.join('|'),
          rdlimit: 'max',
          rdnamespace: '0',
          redirects: '1',
          ...cont,
        },
      });

      for (const page of Object.values(json.query?.pages ?? {})) {
        const list = out.get(page.title) ?? [];
        list.push(...(page.redirects ?? []).map((redirect) => redirect.title));
        out.set(page.title, list);
      }

      cont = json.continue ?? {};
    } while (cont.rdcontinue);
  }

  return out;
}
