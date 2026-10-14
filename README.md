# Name × Clubs

A mobile-first, bilingual football game. Name 10, 50 or 100 clubs in a shared daily challenge or play unlimited untimed practice. English uses Nunito; Arabic uses Alan Sans. Both open-source fonts are bundled with their licenses, with no runtime font service dependency.

## Run locally

Requires Node.js 20.11 or newer. No install or build step.

```sh
npm run dev
```

Open http://127.0.0.1:5173. Run `npm run check` for syntax checks and behavior tests.

## Game rules

- Each UTC calendar day selects one deterministic challenge per level for all players. The 10, 50 and 100-club levels allow 1, 5 and 10 minutes respectively, measured against an absolute deadline. Refreshing does not restart the round. Progress is saved separately for each level.
- Daily progress, completion, and language are saved in browser local storage. Practice is unlimited and untimed.
- All accepted aliases map to a club ID. Repeated aliases for the same club do not increase the score.
- Matching supports English and Arabic names, curated abbreviations, accents, Arabic diacritics, small unambiguous typos, and lists of club names. Shared aliases are resolved only if the challenge leaves exactly one eligible club; otherwise the player must be more specific.
- Accepted clubs append in submission order to a scrollable conversation. The input stays at the bottom; during mobile play the game fills the available screen.
- Each accepted club displays its bundled crest. Images load as they enter view, with an initials badge if an image is missing or cannot load.
- Every selectable category is filtered to contain at least the chosen target. Higher levels use worldwide or European club pools.
- Country challenges refer to the club's football country, not its current league or division. Monaco is included under France. Letter challenges use the common English display name.
- `dist/clubs.js` is a curated collection, not an exhaustive worldwide registry. Add a bilingual record and aliases to extend it. `dist/engine.js` contains the matcher and challenge selection. `dist/app.js` owns browser state and UI.
- Scores and daily completion are local to a browser. This version has no accounts, online leaderboard, analytics, or server-verified competitive scoring.

## Hosting

The `dist/` directory is a complete static site. `.openai/hosting.json` records the private Sites project. Serve `dist/` over HTTPS on any static host.

## Crest artwork

Club badges are bundled from ESPN's team image CDN and Wikipedia's club articles. Club trademarks and artwork belong to their respective owners. `dist/assets/crests/sources.json` preserves the reviewed club identities, original source URLs, retrieval date and file checksums. `dist/crests.js` maps club IDs to local assets. No third-party sports or image API runs during play.

To restore missing assets from the reviewed sources, run `node scripts/sync-crests.mjs`. Existing files with matching checksums are retained. Use `--refresh` to download the same sources again. Review source mappings before adding or changing a club's identity.
