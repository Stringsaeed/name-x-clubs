# Name × Clubs

A mobile-first, bilingual football game. Name five clubs in a shared daily challenge or play unlimited untimed practice. English uses Nunito; Arabic uses Alan Sans. Both open-source fonts are bundled with their licenses, with no runtime font service dependency.

## Run locally

Requires Node.js 20.11 or newer. No install or build step.

```sh
npm run dev
```

Open http://127.0.0.1:5173. Run `npm run check` for syntax checks and behavior tests.

## Game rules

- Each UTC calendar day selects one deterministic challenge for all players. Daily rounds last 60 seconds, measured against an absolute deadline. Refreshing does not restart the round.
- Daily progress, completion, and language are saved in browser local storage. Practice is unlimited and untimed.
- All accepted aliases map to a club ID. Repeated aliases for the same club do not increase the score.
- Matching supports English and Arabic names, curated abbreviations, accents, Arabic diacritics, small unambiguous typos, and lists of club names. Shared aliases are resolved only if the challenge leaves exactly one eligible club; otherwise the player must be more specific.
- Country challenges refer to the club's football country, not its current league or division. Monaco is included under France. Letter challenges use the common English display name.
- `dist/clubs.js` is a curated collection, not an exhaustive worldwide registry. Add a bilingual record and aliases to extend it. `dist/engine.js` contains the matcher and challenge selection. `dist/app.js` owns browser state and UI.
- Scores and daily completion are local to a browser. This version has no accounts, online leaderboard, analytics, or server-verified competitive scoring.

## Hosting

The `dist/` directory is a complete static site. `.openai/hosting.json` records the private Sites project. Serve `dist/` over HTTPS on any static host.
