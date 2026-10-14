# Broadening club recognition: Wikidata, Wikipedia and where the resolver lives

Status: research, 2026-10-14. Nothing here is implemented. Raw data: `docs/research/wikidata-probe.json`
(regenerate with `node scripts/wikidata-probe.mjs`, about 4 minutes, roughly 720 polite requests).

## Recommendation (short)

- Use **Wikidata QIDs as the club identity** and keep our own curated layer on top. Wikidata is CC0, has
  stable IDs, Arabic labels for every club we ship, and thousands more clubs. Its raw aliases are noisy, though,
  and it doesn't know the colloquial forms players actually type.
- Pick **option C (hybrid)**. A build-time ingest produces a bundled catalog of about 1,200–3,000 clubs,
  keyed by QID, with curated overrides. A small optional server endpoint sits on top as a long-tail
  fallback. It only answers from a prebuilt football-club index and never runs open Wikidata search per answer.
- Ship the build-time half first (phase 1–2). It removes most "unknown club" misses, works offline, and
  needs no server state. Add the endpoint, a Next.js Route Handler (ADR 002 already gives us server
  routes), only if logged misses show players naming clubs outside the bundled set.

## What Wikidata and Wikipedia give us

| Need | Source | Observed quality |
| --- | --- | --- |
| Identity | QID (e.g. Al Ahly SC `Q223566`, Al Ittihad Jeddah `Q309480`) | Stable. Merges leave redirects, so re-resolve QIDs on every ingest |
| Type | P31 `Q476028` association football club, plus `Q103229495` men's team, `Q103231176` men's club, `Q14752149` amateur | Direct P31 counts: 41,608 / 704 / 46 / 2,616 |
| Exclusions | `Q51481377` women's club (674), `Q28140340` women's team (997), `Q94579592` defunct club (1,278), P576 dissolved (3,002) | **Men's national teams (`Q135408445`) are a subclass of `Q103229495`**, so `P279*` traversal pulls in 350 national teams. Use direct P31 values only, or exclude explicitly |
| Country | P17 | English, Scottish and Welsh clubs carry `Q145` (United Kingdom), not England/Scotland. Monaco's P17 is Monaco. Region and country need our own mapping |
| Venue, founding | P115, P571 | Present on all big clubs. Not needed for matching |
| League | P118 | Useful for "top flight" scoping, but players also carry P118, so filter by club class first |
| Official / short name / nickname | P1448 / P1813 / P1449 | Sparse. P1448 mixes in historical names ("Dial Square", "Newton Heath LYR"). P1813 almost never set (4 hits across our 200) |
| Logo | P154 | 83/200 of our clubs, 2,019 clubs overall. Only files Commons accepts as PD (text logos, below originality threshold), all marked trademarked |
| Labels/aliases en+ar | `wbgetentities` | Arabic label on 200/200 of our clubs. Aliases include typos, vandalism and section titles (see noise) |
| Extra Arabic forms | arwiki redirects (`prop=redirects`) | 165 useful new Arabic forms, plus squad/crest/history redirects that must be filtered |
| Ambiguity hints | arwiki disambiguation pages (`pageprops.disambiguation`), e.g. `الاتحاد (توضيح)` | Good input for building clarification lists. Not usable as a live answer |

Structural traps seen in the probe:

- **Multisport clubs model football two ways.** Galatasaray and Fenerbahçe have a separate football item
  ("Galatasaray S.K. (football)"). Boca Juniors and San Lorenzo have only the multisport item (P31 `Q847017`
  sports club, P641 includes football `Q2736`). Al Ahly's main item is the football club, with separate basketball,
  volleyball and handball items labelled "Al Ahly". The ingest has to accept "sports club whose P641 includes football"
  as a fallback, but only when no dedicated football item exists.
- **P361 "part of" can't be trusted to mark reserve sides.** Real Madrid, Beşiktaş, River Plate, Monaco and Al Wasl
  are all "part of" their multisport parent. Treat an item as a reserve or youth side only when its parent is itself a football
  club, or when its label carries B/II/U21/Academy/Youth/A2/Castilla.
- **Bare Arabic short names are often missing or wrong.** Among clubs with at least 10 sitelinks, the alias `الاتحاد` sits on one club
  (Jeddah), and `النصر` sits on NA Hussein Dey (Algeria), not Al Nassr. Meanwhile 20 clubs with at least 5 sitelinks have Arabic
  labels starting `الاتحاد…`, 9 `الأهلي…`, 9 `الشباب…`, 7 `النصر…`. So we have to compute ambiguity ourselves.
- **Open search isn't football-aware.** On arwiki, `الريال` leads to the currency disambiguation page, `برشا` to an Egyptian
  village, and `الليفر` to nothing relevant. In wbsearchentities, `الاتحاد` ranks the Saudi club first, then the
  Confederacy, Russia and the EU. Any live fallback must search a football-only index.

## APIs, limits, latency (measured from the UAE, 2026-10-14)

- Action API `wbsearchentities` / `list=search`: 0.5–0.7 s per call. `wbgetentities` takes up to 50 IDs per call
  (500 with bot rights). With `props=claims` it's heavy: about 58 KB per big club. Use `props=labels|aliases|sitelinks`
  with `sitefilter=enwiki|arwiki` and get claims from SPARQL. There's no hard read limit. Etiquette is serial
  requests plus a descriptive User-Agent.
- **`maxlag` blocked every read during the probe.** Wikidata folds query-service update lag into maxlag (the
  response showed `queryserviceLag: 492` s), so `maxlag=5` returned `maxlag` errors continuously. For reads, drop
  maxlag and throttle instead (the probe uses concurrency 2 with 100 ms gaps: 721 requests, 8 retries).
- CirrusSearch `haswbstatement:P31=Q476028|P31=…` filters search to football clubs. "United" returns 1,378 hits and
  "Al Ahly" returns 12, all clubs. It's the best candidate generator we have.
- REST `wikibase/v1` works (`/entities/items/Q9617/aliases/ar`, 0.47 s). It's handy for a Worker but not needed.
- WDQS (`query.wikidata.org`): 60 s timeout, 60 s of processing per minute per client, 5 parallel per IP,
  30 errors/min, 429 with `Retry-After`. A combined COUNT with label/sitelink OPTIONALs timed out (500 at 60 s), and a
  shared-alias GROUP BY returned 504. Split counts ran in 4–48 s. The graph split (9 May 2025) moved scholarly
  articles to `query-scholarly`. Clubs are in the main graph, so it doesn't affect us. WDQS data trails edits by minutes, which is fine for weekly builds.
- Dumps (`latest-all.json.bz2`, about 100+ GB) are overkill. A filtered SPARQL pull per country/tier is enough.

## Licensing

- Wikidata statements, labels and aliases are **CC0**, so we can bundle and modify them freely. Wikipedia text is
  CC BY-SA. Redirect titles are short names, but credit Wikipedia in the about page if we ship them.
- Crests: enwiki crests are local **non-free "Fair use"** files (checked Arsenal and Real Madrid: `NonFree=true`),
  absent from Commons. Commons-hosted P154 logos (Juventus, Bayern, Dortmund, Liverpool, Marseille) are
  "Public domain, trademarked". Barcelona's is CC0. Today 163/200 bundled crests come from the ESPN CDN and 37 from
  Wikimedia thumbs. That's an existing rights question, and it doesn't scale to thousands of clubs.

## Probe results (200 catalog clubs)

| Metric | Value |
| --- | --- |
| Top candidate correct (manual check of all 200) | 200/200 |
| Auto-confident / flagged for review / unmatched | 186 / 14 / 0 |
| Flag reasons | 8 same-name rival (Crystal Palace 1861, Stalybridge Celtic, Stafford Rangers, old Sounders/Timbers, duplicate Al Nassr/Al Qadsiah items), 4 our primary name absent (Braga, Başakşehir, Al Masry, Estudiantes), 2 multisport-only item (Boca, San Lorenzo) |
| Clubs with a same-name senior club among candidates | 53 |
| Arabic label present / arwiki article | 200 / 200 |
| Our Arabic name found in Wikidata (after engine normalization) | 184 (192 incl. arwiki redirects) |
| Our 564 aliases found in Wikidata | 319 (57%), 347 (62%) incl. redirects |
| Our aliases Wikidata lacks | 217 (101 Arabic): colloquial forms like `ليفر`, `الليفر`, `برايتون`, `barca`, `juve`, `atleti`, `boro`, `مان سيتي` |
| New clean aliases Wikidata + arwiki would add | 961 (409 Arabic), median 4 per club, 159 clubs gain at least 1 Arabic form |
| ...by source | 511 wd-en, 246 wd-ar, 165 arwiki redirects, 18 nicknames, rest official/short/titles |
| Noisy aliases filtered | 111: 60 parenthesised disambiguators, 19 sub-topic redirects (squad, crest, history), 18 shared with another club ("The Blues" ×4, "BFC", "VCF", `النادي الملكي` Real Madrid vs Zamalek), 7 generic ("United", "City"), 5 too long, 2 colliding with our catalog |
| Logo P154 | 83 |

"Clean" isn't the same as "safe". The clean list still holds typos that are on Wikidata (`الشيطاين الحمر`,
`مانشتر يونايند`). Those help fuzzy matching, but some are odd. It also holds historical names (`Newton Heath`) and vandalism that
slipped past the filters (the alias "جائزة الكرة الذهبية الأوروبية", an award name, sits on 9 clubs). Ingest has to be
reviewed as a diff, not merged blind.

## Scale

| Slice (direct P31 club classes, national teams excluded) | Clubs | With Arabic label |
| --- | --- | --- |
| All men's/generic football clubs incl. amateur | 44,619 | 6,408 (14%) |
| Active, at least 30 sitelinks | 1,202 | 1,184 |
| Active, 15–29 sitelinks | 1,677 | 1,264 |
| Active, 5–14 sitelinks | 5,678 | 1,717 |
| Active, at least 15 sitelinks, in our 16 countries | 1,084 (UK 258, ES 117, BR 107, IT 104, DE 103, FR 86, ...) | 1,012 |
| P118 = top flight of our 16 countries (any period, active) | 364 | 344 (147 with P154) |
| P118 = second tier (7 countries) | 143 | 141 |

The realistic "a player might name it" universe is about 1,200–3,000 clubs. Sitelink count is a good
popularity proxy, and Arabic coverage is above 85% in that band. Below 15 sitelinks, Arabic labels mostly disappear, so
Arabic players can't name those clubs anyway.

Size: our 200 clubs enriched with clean aliases come to 11.6 KB brotli (58 B/club). 1,200 clubs is about 70 KB
and 3,000 is about 170 KB brotli at most (long-tail clubs have fewer aliases). 8,500 is about 480 KB. Ship the core
set in the client bundle and lazy-load the extended set as a separate chunk.

## Architecture options

**A. Build-time ingestion, bigger bundled catalog.** A script pulls clubs (sitelinks ≥ N, or listed leagues)
via SPARQL and wbgetentities, applies the filters above, and merges with `curated/overrides.json` keyed by QID
(our display names, colloquial aliases, region, crest, `exclude`, `ambiguousWith`). The output is the catalog the
engine already consumes.
Pros: zero runtime dependency, offline, deterministic, instant answers, reviewable diffs. Game state stays
client-only, as ADR 002 keeps it.
Cons: the long tail beyond N is missing, and refresh needs a rebuild. Bundle grows by 70–170 KB.

**B. Server-side resolver.** A Next.js Route Handler (`src/app/api/resolve/route.ts`) runs as a Vercel Function or,
via `@opennextjs/cloudflare`, as a Worker. It's backed by D1/KV (Cloudflare) or Edge Config / Marketplace Redis (Vercel). It checks
curated data first, then Wikidata (cirrus `haswbstatement` search, then `wbgetentities`), and caches by normalized input.
Pros: unbounded coverage, data refreshes without a deploy.
Cons: a cold lookup takes 1–1.5 s (2 sequential Wikidata calls at 0.5–0.7 s), which is too slow for a timed round.
Open search returns non-football items. Errors are opaque to players. It needs abuse controls, and it breaks offline play. Free tiers are
fine for volume (Workers 100k req/day, KV 100k reads/day; D1 free limits are enforced since 2026-09-01), but
latency and correctness are the real costs.

**C. Hybrid (recommended).** Do A for about 1,200–3,000 clubs. Optionally add a small Route Handler,
`GET /api/resolve?q=`, used only when the local resolver returns `unknown`. It answers from a **prebuilt football-only
index** (the same ingest at a lower sitelink threshold, e.g. ≥ 3), not from live Wikidata search. Up to about 10k clubs
(about 0.5 MB brotli) the index can be a JSON module imported only by the Route Handler. That means no database, the same code on
Vercel and Cloudflare, and a refresh that rides the normal deploy. Move it to D1/KV only if it outgrows the function bundle or
needs refreshes between deploys. A live Wikidata call
is used only to backfill the index offline (cron), never on the answer path. The endpoint returns a QID plus display data. The
client caches it in localStorage, so the same input never goes out twice.

## Ambiguity handling

- Run ambiguity detection at ingest: group all keys (normalized name, aliases, generated short forms such as
  stripped `نادي`/`FC`/country suffix/`Al-`) across clubs. Any key owned by more than one QID becomes an
  `ambiguous` key with its candidate list. This replaces the hard-coded regex in `resolveClub`.
- Scope narrows candidates before asking: the existing `choose()` already filters by challenge scope. "Al Ahly" in an
  Egypt round resolves directly. In World it asks "Al Ahly (Egypt) or Al Ahli (Saudi Arabia)?"
- Clarification UI lists at most 3–4 options with country flag and crest/initials, ranked by sitelinks. Keep the
  rest behind "other".
- A curated override can pin a key to one club where usage is overwhelming. Decide "United" → no (ask), and
  `الريال` → Real Madrid, for example. These decisions live in overrides, not code.
- Women's, youth, reserve and national teams are excluded at ingest, so "Arsenal" can never resolve to Arsenal
  Women or Arsenal U21. Defunct clubs are excluded by default. Allow them per QID if a historical mode appears.
- Multisport: one game identity per football team, using the football item when it exists and the multisport item
  otherwise. Map other QIDs (basketball etc.) to `exclude` so they can't be picked up as homonyms.

## Caching and refresh

- Ingest weekly or monthly in CI (GitHub Action): regenerate, diff against the last snapshot, and require human approval for
  changes to existing clubs (renames, merges, new collisions). Additions under a threshold can auto-merge.
- Store a snapshot (QID, revision ID, fetched date) so a Wikidata vandal edit can't silently reach players.
  Re-resolve redirected QIDs (merges) and keep old QIDs as aliases in saved games.
- For option C's endpoint: send `Cache-Control: public, s-maxage=…` keyed by catalog version so the CDN answers
  repeats, and regenerate the server-side index in the same ingest run.

## Latency and offline budget

- Target under 16 ms per answer locally. The current Levenshtein scan over about 30k aliases (3,000 clubs) is still
  a few ms per unknown token, but bucket aliases by length and first char before scaling further.
- A remote fallback must be async and non-blocking. Show "checking…" on that row, keep the timer running, and accept it when
  resolved. Budget ≤ 300 ms p95 from the edge index. If it times out (1.5 s), mark it unknown with a retry.
- Offline or failed endpoint: the bundled catalog alone is fully playable. Never make the server authoritative.

## Abuse and rate limits

- The endpoint takes only normalized strings of at most 60 chars and at most N items per request (pasted lists are batched
  client-side). It's GET and cacheable, with no Wikidata passthrough.
- Rate-limit per IP at the platform edge, e.g. 60 req/min: a Cloudflare WAF rate-limit rule (or the Workers Rate Limiting
  binding under OpenNext), or a Vercel Firewall rule. Keep the limiter outside app code so it's portable. Log only
  normalized misses (no IP) to drive curation.
- Our own Wikidata traffic is build-time only: serial, descriptive User-Agent, backoff on 429/5xx, SPARQL in batches of
  100 via POST.

## Practice categories with a larger catalog

- Country: map P17 to our country keys, with England/Scotland/Wales split by P131/league or override. Use the region
  table we already have. Only show countries with at least `target` clubs.
- Region and letter: unchanged logic, but restrict challenge eligibility to a "core" tier (e.g. ≥ 30 sitelinks or
  curated) so "Name 10 clubs starting with B" stays fair. Accept any catalog club as a correct answer.
  Eligibility pool and answer pool are separate sets.
- New scopes come cheaply from P118: "top flight", "Saudi Pro League". Snapshot league membership per season
  rather than trusting live P118.
- Solvability tests (`challengesForLevel`) should use the core tier only.

## Crests

- Keep reviewed bundled crests for the core set. For everything else, use the existing initials fallback, tinted by a
  hash of the QID (or by P6364 official colours where present).
- Don't hotlink enwiki non-free crests. Commons P154 files are usable as trademarked PD logos (83/200 of ours, about 40%
  of top-flight clubs). Fetch them at build time, size them down, and store them with source and license in `sources.json`, the
  same as the current reviewed pipeline.
- Review the ESPN-sourced 163 crests separately. They're the largest rights exposure today.

## Next steps

1. **Data model (small):** add `qid` to `clubs.json` entries using the probe's 200 matches (14 flagged ones
   reviewed by hand. All are correct). Add `curated/overrides.json` keyed by QID. No engine change yet.
2. **Ingest script:** `scripts/ingest-clubs.mjs` turns the probe logic into a builder: SPARQL candidate pull by country +
   sitelinks ≥ 15, wbgetentities en/ar, arwiki redirects, noise filters, ambiguity key table, then a merge with overrides.
   Output a generated catalog and a human-readable diff. Unit-test the filters with the probe's noisy examples.
3. **Engine:** derive ambiguous keys from data instead of the regex, and split the eligibility pool from the answer pool.
   Benchmark fuzzy matching at 3,000 clubs. Lazy-load the extended catalog chunk.
4. **Clarification UI:** a multi-candidate picker with flag and crest/initials, available in both RTL and LTR.
5. **Miss logging (optional, privacy-safe):** count normalized unknown inputs to see whether the long tail matters.
6. **Only if step 5 shows demand:** `src/app/api/resolve/route.ts` over a prebuilt, server-only index (a bundled
   JSON module first, then D1/KV or Marketplace Redis if it grows), CDN caching, and an edge rate limit.
