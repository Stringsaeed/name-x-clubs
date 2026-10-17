// Research probe: how well does Wikidata cover the curated club catalog?
// Read-only. Writes docs/research/wikidata-probe.json at the repo root. Does not touch src/.
// Usage: node scripts/wikidata-probe.mjs [--limit N | --only id,id]
// Partial runs write docs/research/wikidata-probe.partial.json instead.
import { mkdir, writeFile } from 'node:fs/promises';
import clubs from '../src/content/clubs.json' with { type: 'json' };

const UA = 'NameXClubs-research/0.1 (stringsaeed@gmail.com)';
const API = 'https://www.wikidata.org/w/api.php';
const SPARQL = 'https://query.wikidata.org/sparql';
const ARWIKI = 'https://ar.wikipedia.org/w/api.php';
const limitArg = process.argv.indexOf('--limit');
const onlyArg = process.argv.indexOf('--only');
let catalog = clubs;
if (onlyArg > 0) {
  catalog = clubs.filter((c) => process.argv[onlyArg + 1].split(',').includes(c.id));
} else if (limitArg > 0) {
  catalog = clubs.slice(0, Number(process.argv[limitArg + 1]));
}
const dryRun = onlyArg > 0 || limitArg > 0; // partial runs don't overwrite the committed report

// Classes that denote a (men's senior) association football club on Wikidata.
const CLUB = new Set(['Q476028', 'Q103229495', 'Q103231176', 'Q14752149', 'Q94579592']);
// Classes that disqualify a candidate for this game (women's, national, youth).
const EXCLUDE = new Set([
  'Q51481377', // women's association football club
  'Q28140340', // women's association football team
  'Q6979593', // national association football team
  'Q135408445', // men's national association football team
  'Q134468886', // football academy / youth (seen on Arsenal U21)
  'Q1194951', // national sports team
]);
// Label words that mark a non-first-team side.
const SQUAD =
  /\b(B|C|II|III|Reserves?|Academy|Youth|Juvenil|Castilla|A2|U-?\d{2}|Under-\d{2}s?|Women|Femenino|Féminine|Feminino|Ladies|Frauen|Futsal|Beach)\b/i;
// Multisport clubs (Boca Juniors, River Plate, San Lorenzo) have no separate football item;
// accept them only when P641 (sport) includes association football (Q2736).
const MULTISPORT = new Set(['Q847017']);
// Catalog country key -> acceptable P17 values (English/Scottish clubs carry UK).
const COUNTRY = {
  england: ['Q145', 'Q21'],
  scotland: ['Q145', 'Q22'],
  spain: ['Q29'],
  italy: ['Q38'],
  germany: ['Q183'],
  france: ['Q142', 'Q235'], // Monaco plays in Ligue 1
  portugal: ['Q45'],
  netherlands: ['Q55'],
  turkey: ['Q43'],
  saudi: ['Q851'],
  uae: ['Q878'],
  egypt: ['Q79'],
  morocco: ['Q1028'],
  brazil: ['Q155'],
  argentina: ['Q414'],
  usa: ['Q30'],
};

// Same normalization as src/game/engine.ts, plus the key stripping resolveClub applies.
function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/['’]/g, '')
    .replace(/[.]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
function key(value) {
  return normalize(value)
    .replace(/^(?:\p{N}+\s+|\p{N}+(?=\p{L}))/u, '')
    .replace(/\b(?:football club|fc|afc|cf)\b/g, '')
    .replace(/^نادي\s+/, '')
    .trim()
    .replace(/\s+/g, ' ');
}
const keysOf = (s) => [normalize(s), key(s)].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = { requests: 0, retries: 0, ms: 0 };
async function get(url, params, accept = 'application/json', method = 'GET') {
  const u = new URL(url);
  const body = new URLSearchParams({ format: 'json', ...params });
  if (method === 'GET') {
    u.search = body;
  }
  for (let attempt = 0; ; attempt++) {
    const t = Date.now();
    stats.requests++;
    const res = await fetch(u, {
      method,
      body: method === 'POST' ? body : undefined,
      headers: { 'User-Agent': UA, Accept: accept, 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(75000),
    });
    stats.ms += Date.now() - t;
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      stats.retries++;
      await sleep(Number(res.headers.get('retry-after') || 0) * 1000 || 2000 * 2 ** attempt);
      continue;
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${u}`);
    }
    const json = await res.json();
    // Note: we deliberately omit maxlag on these reads. Wikidata folds WDQS update lag into
    // maxlag, so maxlag=5 rejected every read during this probe (lag ~8 s).
    if (json.error) {
      throw new Error(`${json.error.code}: ${json.error.info}`);
    }
    return json;
  }
}
async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
        await sleep(100);
      }
    }),
  );
  return out;
}
const chunks = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// 1. Candidate generation ------------------------------------------------------
const stripSuffix = (name) => name.replace(/\s+(Saudi|UAE|Dubai|Alexandria|Casablanca)$/i, '');
async function candidates(club) {
  const found = new Map(); // qid -> best rank seen
  const add = (id, rank, via) => {
    const prev = found.get(id);
    if (!prev || rank < prev.rank) {
      found.set(id, { rank, via });
    }
  };
  const queries = [...new Set([club.name, stripSuffix(club.name)])];
  for (const q of queries) {
    const en = await get(API, {
      action: 'wbsearchentities',
      search: q,
      language: 'en',
      type: 'item',
      limit: '8',
    });
    en.search?.forEach((r, i) => {
      add(r.id, i, 'wbsearch-en');
    });
    const cs = await get(API, {
      action: 'query',
      list: 'search',
      srsearch: `${q} haswbstatement:P31=Q476028|P31=Q103229495|P31=Q103231176|P31=Q94579592`,
      srlimit: '6',
    });
    cs.query?.search?.forEach((r, i) => {
      add(r.title, i, 'cirrus-haswbstatement');
    });
  }
  const ar = await get(API, {
    action: 'wbsearchentities',
    search: club.arabic,
    language: 'ar',
    uselang: 'ar',
    type: 'item',
    limit: '6',
  });
  ar.search?.forEach((r, i) => {
    add(r.id, i, 'wbsearch-ar');
  });
  return found;
}

// 2. Candidate facts via SPARQL (types, country, sitelinks, name statements) ------
async function facts(ids) {
  const out = new Map();
  for (const batch of chunks(ids, 100)) {
    const query = `SELECT ?item ?p31 ?p17 ?p576 ?p361 ?links ?p154 ?p115 ?p571 ?football ?nameProp ?nameText WHERE {
      VALUES ?item { ${batch.map((id) => `wd:${id}`).join(' ')} }
      OPTIONAL { ?item wikibase:sitelinks ?links }
      { ?item wdt:P31 ?p31 } UNION { ?item wdt:P17 ?p17 } UNION { ?item wdt:P576 ?p576 }
      UNION { ?item wdt:P361 ?p361 } UNION { ?item wdt:P154 ?p154 } UNION { ?item wdt:P115 ?p115 }
      UNION { ?item wdt:P571 ?p571 }
      UNION { ?item wdt:P641 wd:Q2736 BIND(true AS ?football) }
      UNION { VALUES ?nameProp { wdt:P1448 wdt:P1813 wdt:P1449 } ?item ?nameProp ?nameText FILTER(LANG(?nameText) IN ("en","ar")) }
    }`;
    const json = await get(SPARQL, { query }, 'application/sparql-results+json', 'POST');
    for (const b of json.results.bindings) {
      const id = b.item.value.split('/').pop();
      const f = out.get(id) || {
        p31: new Set(),
        p17: new Set(),
        partOf: new Set(),
        names: [],
        links: 0,
        logo: false,
        venue: false,
        football: false,
        inception: null,
        dissolved: null,
      };
      const val = (k) => b[k]?.value.split('/').pop();
      if (b.links) {
        f.links = Number(b.links.value);
      }
      if (b.p31) {
        f.p31.add(val('p31'));
      }
      if (b.p17) {
        f.p17.add(val('p17'));
      }
      if (b.p361) {
        f.partOf.add(val('p361'));
      }
      if (b.p576) {
        f.dissolved = b.p576.value.slice(0, 10);
      }
      if (b.p571) {
        f.inception = b.p571.value.slice(0, 4);
      }
      if (b.p154) {
        f.logo = decodeURIComponent(b.p154.value.split('/').pop());
      }
      if (b.football) {
        f.football = true;
      }
      if (b.p115) {
        f.venue = true;
      }
      if (b.nameText) {
        const prop = { P1448: 'official', P1813: 'short', P1449: 'nickname' }[
          b.nameProp.value.split('/').pop()
        ];
        f.names.push({ prop, text: b.nameText.value, lang: b.nameText['xml:lang'] });
      }
      out.set(id, f);
    }
    await sleep(500);
  }
  return out;
}

// 3. Labels/aliases via wbgetentities (50 per request) ---------------------------
async function terms(ids) {
  const out = new Map();
  await pool(chunks(ids, 50), 2, async (batch) => {
    const json = await get(API, {
      action: 'wbgetentities',
      ids: batch.join('|'),
      props: 'labels|aliases|descriptions|sitelinks',
      languages: 'en|ar',
      sitefilter: 'enwiki|arwiki',
    });
    for (const [id, e] of Object.entries(json.entities || {})) {
      out.set(id, {
        en: e.labels?.en?.value ?? null,
        ar: e.labels?.ar?.value ?? null,
        descEn: e.descriptions?.en?.value ?? null,
        aliasesEn: (e.aliases?.en || []).map((a) => a.value),
        aliasesAr: (e.aliases?.ar || []).map((a) => a.value),
        enwiki: e.sitelinks?.enwiki?.title ?? null,
        arwiki: e.sitelinks?.arwiki?.title ?? null,
      });
    }
  });
  return out;
}

// 4. Arabic Wikipedia redirects as an extra alias source -------------------------
async function arRedirects(titles) {
  const out = new Map();
  await pool(chunks(titles, 50), 2, async (batch) => {
    let cont = {};
    do {
      const json = await get(ARWIKI, {
        action: 'query',
        prop: 'redirects',
        titles: batch.join('|'),
        rdlimit: 'max',
        rdnamespace: '0',
        redirects: '1',
        ...cont,
      });
      const norm = new Map((json.query?.redirects || []).map((r) => [r.to, r.from]));
      for (const p of Object.values(json.query?.pages || {})) {
        const list = out.get(p.title) || [];
        list.push(...(p.redirects || []).map((r) => r.title));
        out.set(p.title, list);
        if (norm.has(p.title)) {
          out.set(norm.get(p.title), list);
        }
      }
      cont = json.continue || {};
    } while (cont.rdcontinue);
  });
  return out;
}

// --- run ---------------------------------------------------------------------
const started = Date.now();
console.log(`Searching candidates for ${catalog.length} clubs...`);
const cands = await pool(catalog, 2, candidates);
const allIds = [...new Set(cands.flatMap((m) => [...m.keys()]))].filter((id) => /^Q\d+$/.test(id));
console.log(`${allIds.length} distinct candidates; fetching facts...`);
const factMap = await facts(allIds);
console.log(`Fetching en/ar terms for ${allIds.length} candidates...`);
const termMap = await terms(allIds);
const termKeys = (id) => {
  const t = termMap.get(id);
  return new Set(
    t
      ? [t.en, t.ar, ...t.aliasesEn, ...t.aliasesAr, t.enwiki, t.arwiki]
          .filter(Boolean)
          .flatMap(keysOf)
      : [],
  );
};

function score(club, id, info) {
  const f = factMap.get(id);
  if (!f) {
    return null;
  }
  const types = [...f.p31];
  const footballClub = types.some((t) => CLUB.has(t));
  const multisport = !footballClub && f.football && types.some((t) => MULTISPORT.has(t));
  const isClub = footballClub || multisport;
  const excluded = types.filter((t) => EXCLUDE.has(t));
  const countryOk = COUNTRY[club.country]?.some((c) => f.p17.has(c)) ?? false;
  const ours = [club.name, club.arabic, ...club.aliases].flatMap(keysOf);
  const tk = termKeys(id);
  const nameMatch = ours.some((k) => tk.has(k));
  const primaryMatch =
    keysOf(club.name).some((k) => tk.has(k)) || keysOf(club.arabic).some((k) => tk.has(k));
  // P361 "part of" is also used for multisport parents (Real Madrid, Besiktas, River Plate),
  // so only treat it as a reserve/youth signal when the parent is itself a football club.
  const parentClub = [...f.partOf].filter((p) =>
    [...(factMap.get(p)?.p31 || [])].some((t) => CLUB.has(t)),
  );
  // Drop dotted abbreviations (F.C., C.F., A.S.) so their letters don't read as squad markers.
  const label = (termMap.get(id)?.en || '').replace(/\b(?:[A-Z]\.)+(?=\s|$)/g, '');
  const squadWord = SQUAD.exec(label)?.[0];
  const ourNames = `${club.name} ${club.aliases.join(' ')}`.toLowerCase();
  const squad =
    squadWord && !ourNames.split(/\s+/).includes(squadWord.toLowerCase()) ? squadWord : null;
  let s = 0;
  if (isClub) {
    s += 50;
  }
  if (primaryMatch) {
    s += 30;
  } else if (nameMatch) {
    s += 15;
  }
  if (excluded.length) {
    s -= 80;
  }
  if (multisport) {
    s -= 10; // usable identity, but prefer a dedicated football-club item when one exists
  }
  if (parentClub.length || squad) {
    s -= 45; // reserve / B / youth / women's side of a parent club
  }
  if (countryOk) {
    s += 40;
  } else if (f.p17.size) {
    s -= 30;
  }
  s += Math.max(0, 8 - info.rank) * 2;
  s += Math.min(25, Math.log2(1 + f.links) * 3.5);
  return {
    id,
    score: Math.round(s),
    nameMatch,
    primaryMatch,
    isClub,
    excluded,
    multisport,
    countryOk,
    links: f.links,
    partOf: [...f.partOf],
    parentClub,
    squad,
    via: info.via,
    p31: types,
  };
}

const scored = catalog.map((club, i) =>
  [...cands[i]]
    .map(([id, info]) => score(club, id, info))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score),
);
const titles = [...new Set([...termMap.values()].map((t) => t.arwiki).filter(Boolean))];
console.log(`Fetching arwiki redirects for ${titles.length} articles...`);
const redirectMap = await arRedirects(titles);

// Our catalog keys, per club and globally (to detect cross-club collisions).
const ourKeysByClub = new Map(
  catalog.map((c) => [c.id, new Set([c.name, c.arabic, ...c.aliases].flatMap(keysOf))]),
);
const ourOwner = new Map();
for (const c of catalog) {
  for (const k of ourKeysByClub.get(c.id)) {
    ourOwner.set(k, [...new Set([...(ourOwner.get(k) || []), c.id])]);
  }
}

const isArabic = (s) => /[\u0600-\u06ff]/.test(s);
const isLatin = (s) => /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]+$/u.test(s);
function noiseReason(alias, club, wdOwners) {
  const k = key(alias);
  if (!k || k.length < 2) {
    return 'too-short';
  }
  if (/[()]/.test(alias)) {
    return 'disambiguator-parenthesis';
  }
  if (!isArabic(alias) && !isLatin(alias)) {
    return 'other-script';
  }
  // Redirects to sections/sub-topics: squad, crest, history, stadium, honours, award, season, reserves.
  if (
    /^(تشكيله|تشكيلة|شعار|معلومات|تاريخ|ملعب|قائمه|قائمة|بطولات|جائزه|جائزة|لاعبو|لاعبي|موسم|مدربو|رؤساء|انصار|جماهير)(?:\s|$)/.test(
      alias,
    ) ||
    /\b(reserves?|academy|youth|women|ladies|season|stadium|history|records?|squad)\b/i.test(alias)
  ) {
    return 'subtopic-redirect';
  }
  if (k.split(' ').length > 6) {
    return 'too-long';
  }
  if (
    /^(al|the|club|united|city|real|sporting|athletic|نادي|الاتحاد|الاهلي|النصر|الشباب)$/.test(k)
  ) {
    return 'generic-word';
  }
  const owners = (ourOwner.get(k) || []).filter((id) => id !== club.id);
  if (owners.length) {
    return `collides-with-catalog:${owners.join(',')}`;
  }
  const wdOthers = (wdOwners.get(k) || []).filter((id) => id !== club.id);
  if (wdOthers.length) {
    return `collides-with-wikidata-alias-of:${wdOthers.join(',')}`;
  }
  return null;
}

// First pass: collect every Wikidata string per matched club so we can detect cross-club collisions.
const rows = catalog.map((club, i) => {
  const list = scored[i];
  const top = list[0];
  // Runner-up = another senior club that also carries one of our primary names (true homonym).
  const second = list.find((c) => c !== top && c.isClub && !c.excluded.length && c.primaryMatch);
  const homonyms = list
    .filter((c) => c !== top && c.isClub && !c.excluded.length && c.primaryMatch)
    .map((c) => c.id);
  const t = top ? termMap.get(top.id) : null;
  const f = top ? factMap.get(top.id) : null;
  const wdStrings = t
    ? [
        ...[t.en, ...t.aliasesEn].filter(Boolean).map((text) => ({ text, src: 'wd-en' })),
        ...[t.ar, ...t.aliasesAr].filter(Boolean).map((text) => ({ text, src: 'wd-ar' })),
        ...f.names.map((n) => ({ text: n.text, src: `wd-${n.prop}-${n.lang}` })),
        ...(t.enwiki ? [{ text: t.enwiki, src: 'enwiki-title' }] : []),
        ...(t.arwiki ? [{ text: t.arwiki, src: 'arwiki-title' }] : []),
      ]
    : [];
  const redirects = t?.arwiki
    ? (redirectMap.get(t.arwiki) || []).map((text) => ({ text, src: 'arwiki-redirect' }))
    : [];
  const nameKeys = new Set(
    wdStrings
      .filter((s) => s.src === 'wd-en' || s.src === 'wd-ar' || s.src.endsWith('title'))
      .flatMap((s) => keysOf(s.text)),
  );
  const ours = ourKeysByClub.get(club.id);
  const nameMatch = [...ours].some((k) => nameKeys.has(k));
  const margin = top && second ? top.score - second.score : 99;
  let status = 'unmatched';
  const reasons = [];
  if (top?.isClub && !top.excluded.length) {
    status = 'matched';
    if (top.multisport) {
      reasons.push('multisport-item');
    }
    if (!top.countryOk) {
      reasons.push('country-mismatch');
    }
    if (!nameMatch) {
      reasons.push('no-name-overlap');
    }
    if (second && margin < 15) {
      reasons.push(`close-second:${second?.id}(${margin})`);
    }
    if (top.parentClub.length || top.squad) {
      reasons.push(`reserve-or-youth:${top.squad || top.parentClub.join(',')}`);
    }
    if (!top.primaryMatch && nameMatch) {
      reasons.push('primary-name-not-in-wikidata');
    }
    if (f?.dissolved) {
      reasons.push(`dissolved:${f.dissolved}`);
    }
    if (reasons.length) {
      status = 'uncertain';
    }
  }
  return { club, top, second, homonyms, t, f, wdStrings, redirects, status, reasons, ours };
});

const wdOwners = new Map();
for (const r of rows) {
  if (r.status !== 'unmatched') {
    for (const s of [...r.wdStrings, ...r.redirects]) {
      const k = key(s.text);
      wdOwners.set(k, [...new Set([...(wdOwners.get(k) || []), r.club.id])]);
    }
  }
}

const results = rows.map((r) => {
  const { club, top, t, f, ours } = r;
  if (r.status === 'unmatched') {
    return {
      id: club.id,
      name: club.name,
      country: club.country,
      status: 'unmatched',
      candidates: scored[catalog.indexOf(club)]
        .slice(0, 4)
        .map(({ id, score, primaryMatch, isClub, p31 }) => ({
          id,
          label: termMap.get(id)?.en,
          score,
          primaryMatch,
          isClub,
          p31,
        })),
    };
  }
  const wdKeys = new Set(r.wdStrings.flatMap((s) => keysOf(s.text)));
  const wdArKeys = new Set(
    r.wdStrings.filter((s) => isArabic(s.text)).flatMap((s) => keysOf(s.text)),
  );
  const redirectKeys = new Set(r.redirects.flatMap((s) => keysOf(s.text)));
  const ourAliases = club.aliases.map((a) => ({
    a,
    covered: keysOf(a).some((k) => wdKeys.has(k) || redirectKeys.has(k)),
    coveredWd: keysOf(a).some((k) => wdKeys.has(k)),
  }));
  const fresh = new Map();
  for (const s of [...r.wdStrings, ...r.redirects]) {
    const k = key(s.text);
    if (!k || ours.has(k) || ours.has(normalize(s.text)) || fresh.has(k)) {
      continue;
    }
    fresh.set(k, { text: s.text, src: s.src, noise: noiseReason(s.text, club, wdOwners) });
  }
  const newAliases = [...fresh.values()];
  return {
    id: club.id,
    name: club.name,
    country: club.country,
    status: r.status,
    reasons: r.reasons,
    qid: top.id,
    score: top.score,
    runnerUp: r.second ? { qid: r.second.id, score: r.second.score } : null,
    homonymClubs: r.homonyms,
    topCandidates: scored[catalog.indexOf(club)]
      .slice(0, 3)
      .map(({ id, score, primaryMatch, countryOk, squad }) => ({
        id,
        label: termMap.get(id)?.en,
        score,
        primaryMatch,
        countryOk,
        squad,
      })),
    wikidata: {
      en: t?.en,
      ar: t?.ar,
      description: t?.descEn,
      enwiki: t?.enwiki,
      arwiki: t?.arwiki,
      sitelinks: f.links,
      p31: top.p31,
      hasLogoP154: Boolean(f.logo),
      logo: f.logo || null,
      hasVenueP115: f.venue,
      inception: f.inception,
      dissolved: f.dissolved,
      nameStatements: f.names,
    },
    coverage: {
      arabicNameInWikidata: keysOf(club.arabic).some((k) => wdArKeys.has(k)),
      arabicNameInWdOrRedirects: keysOf(club.arabic).some(
        (k) => wdArKeys.has(k) || redirectKeys.has(k),
      ),
      ourAliases: ourAliases.length,
      ourAliasesInWikidata: ourAliases.filter((x) => x.coveredWd).length,
      ourAliasesInWdOrRedirects: ourAliases.filter((x) => x.covered).length,
      missingFromWikidata: ourAliases.filter((x) => !x.covered).map((x) => x.a),
      arwikiRedirects: r.redirects.length,
    },
    newAliases: {
      clean: newAliases.filter((a) => !a.noise).map((a) => ({ text: a.text, src: a.src })),
      noisy: newAliases.filter((a) => a.noise),
    },
  };
});

// --- summary -----------------------------------------------------------------
const by = (s) => results.filter((r) => r.status === s);
const matchedOrUncertain = results.filter((r) => r.status !== 'unmatched');
const sum = (fn) => matchedOrUncertain.reduce((a, r) => a + fn(r), 0);
const srcCount = {};
for (const r of matchedOrUncertain) {
  for (const a of r.newAliases.clean) {
    srcCount[a.src] = (srcCount[a.src] || 0) + 1;
  }
}
const noiseCount = {};
for (const r of matchedOrUncertain) {
  for (const a of r.newAliases.noisy) {
    const k = a.noise.split(':')[0];
    noiseCount[k] = (noiseCount[k] || 0) + 1;
  }
}
const qidDupes = Object.entries(Object.groupBy(matchedOrUncertain, (r) => r.qid))
  .filter(([, v]) => v.length > 1)
  .map(([q, v]) => ({ qid: q, clubs: v.map((r) => r.id) }));
const summary = {
  generatedAt: new Date().toISOString(),
  clubs: results.length,
  matched: by('matched').length,
  uncertain: by('uncertain').length,
  unmatched: by('unmatched').length,
  duplicateQidAssignments: qidDupes,
  clubsWithHomonymsAmongCandidates: matchedOrUncertain.filter((r) => r.homonymClubs.length).length,
  withArabicLabel: sum((r) => (r.wikidata.ar ? 1 : 0)),
  withArwikiArticle: sum((r) => (r.wikidata.arwiki ? 1 : 0)),
  withLogoP154: sum((r) => (r.wikidata.hasLogoP154 ? 1 : 0)),
  arabicNameInWikidata: sum((r) => (r.coverage.arabicNameInWikidata ? 1 : 0)),
  arabicNameInWdOrRedirects: sum((r) => (r.coverage.arabicNameInWdOrRedirects ? 1 : 0)),
  ourAliases: sum((r) => r.coverage.ourAliases),
  ourAliasesInWikidata: sum((r) => r.coverage.ourAliasesInWikidata),
  ourAliasesInWdOrRedirects: sum((r) => r.coverage.ourAliasesInWdOrRedirects),
  newAliasesClean: sum((r) => r.newAliases.clean.length),
  newAliasesCleanArabic: sum((r) => r.newAliases.clean.filter((a) => isArabic(a.text)).length),
  newAliasesCleanBySource: srcCount,
  newAliasesNoisy: sum((r) => r.newAliases.noisy.length),
  noisyByReason: noiseCount,
  uncertainReasons: Object.fromEntries(
    Object.entries(
      Object.groupBy(
        by('uncertain').flatMap((r) => r.reasons.map((x) => x.split(':')[0])),
        (x) => x,
      ),
    ).map(([k, v]) => [k, v.length]),
  ),
  requests: stats,
  elapsedSeconds: Math.round((Date.now() - started) / 1000),
};
await mkdir(new URL('../../../docs/research/', import.meta.url), { recursive: true });
await writeFile(
  new URL(`../../../docs/research/wikidata-probe${dryRun ? '.partial' : ''}.json`, import.meta.url),
  `${JSON.stringify({ summary, results }, null, 2)}\n`,
);
console.log(JSON.stringify(summary, null, 2));
for (const r of results.filter((x) => x.status !== 'matched')) {
  console.log(
    `${r.status.padEnd(9)} ${r.id.padEnd(12)} ${r.name.padEnd(24)} ${r.qid ?? ''} ${r.wikidata?.en ?? ''} ${(r.reasons || []).join(' ')}`,
  );
}
