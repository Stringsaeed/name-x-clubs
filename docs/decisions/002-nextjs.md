# 002: Next.js App Router

Status: accepted. Supersedes the hosting and frontend choice in [001](001-production-frontend.md).

## Context

001 chose React with Vite and a static `dist/` build. That fit a game with no shared state. Three needs now outweigh it:

- A future club resolver must run on the server, so the project needs server routes rather than a static bundle.
- Arabic needs `lang` and `dir` on the server-rendered HTML, not flipped on the client after load.
- Standard hosting on Vercel or Cloudflare should work without a custom build setup.

## Decision

- Use Next.js 16.4 App Router with default server output (not `export`) and the Node runtime.
- Routes `/en` and `/ar` are prerendered from `src/app/[lang]/layout.tsx`, which renders `<html lang dir>`. `dynamicParams` is false.
- `/` is a route handler that redirects with 307 to a locale, chosen by the `nxc-language` cookie, then `Accept-Language`, then English.
- The language toggle is a link. It sets the cookie on click.
- Browser persistence stays client-only. `browserStore` reads localStorage after hydration. The server renders a fixed idle snapshot.
- Lingui catalogs are precompiled to `messages.ts` by npm pre-hooks. Macros run through the SWC plugin in Next and the Vite plugin in Vitest.
- Fonts load through `next/font/local`. Crests stay plain images.
- Hosting stays open: Vercel needs no config, and Cloudflare will use `@opennextjs/cloudflare` later.

## Consequences

- Switching language is a full page navigation, not an in-place re-render.
- Before hydration, the page shows the idle snapshot for a short time. Saved progress appears once the client mounts.
- Next's type-check path uses the TypeScript 7 checker, which is experimental in Next. Type errors still fail `next build`.
- The Lingui SWC plugin is built against an older `swc_core`. Upgrade Next and `@lingui/swc-plugin` together, and recheck the macro output after each upgrade.
- The server now runs code. Deploys need a Node or Workers runtime, not a static host.
- The pure game logic and controller from 001 are unchanged. Only the shell and persistence wiring moved.
