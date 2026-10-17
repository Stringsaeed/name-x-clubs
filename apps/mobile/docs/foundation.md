# Mobile foundation contract

The phone app is its own product. It shares the game engine, catalog, crests and ranked-round
logic with `apps/web`, and borrows the web's palette and type, but the layout and interactions are
designed for a phone. Do not copy web layouts.

## Stack rules

- Expo SDK 58, Expo Router, React Native 0.88, React 19. Dev build required (native modules).
- Styling: `StyleSheet.create` only. No inline style objects created in render except for values
  that depend on props/theme (then memoize or compute once per render in a small object).
- Animations: `react-native-reanimated` v4 only (`Animated.View`, `useSharedValue`,
  `withSpring`, `withTiming`, `FadeIn`/`FadeOut`/layout transitions). No `Animated` from RN.
- Safe areas: `react-native-safe-area-context` (`useSafeAreaInsets`, `SafeAreaView`).
- Images: `expo-image` with `cachePolicy="memory-disk"`, `contentFit="contain"`, `recyclingKey`.
- Haptics: `expo-haptics`; sound: `cuelume-native` (`play(name, { volume })`). Both only through
  `src/feedback/feedback.ts` (never call the libraries directly from screens).
- Keyboard: the answer field keeps the keyboard open after submit (`submitBehavior="submit"`),
  dismisses on confirmed end of round, round completion, or navigation.
- Import the game engine, model, and catalog from `@nxc/game`. Remaining pure ranked-round,
  session, and leaderboard clients use relative paths `../../../web/src/...` (Metro watches it).
  Only import pure modules (no `next/*`, `@lingui/*`, `effect`, `server-only`).
- Biome lint from repo root applies: `pnpm lint` (single quotes, semicolons, trailing commas,
  block statements, no nested ternaries, functions under ~60 lines, no non-null assertions).
- TypeScript strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

## Directory layout (`apps/mobile/src`)

```
app/                 routes only: _layout.tsx, index.tsx (game), leaderboard.tsx
theme/               tokens.ts, ThemeProvider.tsx, fonts.ts
ui/                  AppText, Icon, PressableScale, Button, Segmented, Card
feedback/            feedback.ts (haptics + sound cues + settings store)
game/                play.tsx (providers/hooks), api.ts, leaderboard.ts, storage.ts, engine.ts
copy.ts              bilingual UI strings (en/ar) — add keys here, never inline strings
screens/             GameScreen.tsx, LeaderboardScreen.tsx
components/          feature components (album/, composer/, result/, header/, leaderboard/)
```

## Theme tokens (`src/theme/tokens.ts`)

```ts
export type Scheme = 'dark' | 'light';
export type Colors = Readonly<{
  paper: string;        // screen background
  card: string;         // raised surfaces (web --white)
  ink: string;          // primary text
  muted: string;        // secondary text
  line: string;         // borders
  green: string;        // primary action / focus colour
  lime: string;         // accent (brand mark, badges)
  soft: string;         // subtle fill (inputs, pills)
  onAccent: string;     // text on lime
  onGreen: string;      // text on green
  accentHover: string;
  selected: string;     // selected fill
  selectedLine: string; // selected border
  warning: string; warningBg: string; warningLine: string;
  shadow: string;
  albumDot: string; albumGhost: string;
  key: string; keyPressed: string;
}>;
```

Values (from the web stylesheet):

| token | dark | light |
| --- | --- | --- |
| paper | #111a16 | #f7f8f2 |
| card | #1b2720 | #fffefa |
| ink | #edf3e7 | #203e32 |
| muted | #acb9a4 | #5d6d56 |
| line | #354638 | #dce3d2 |
| green | #b9dc8b | #244f3b |
| lime | #d2f571 | #d2f571 |
| soft | #263529 | #eff3e7 |
| onAccent | #183020 | #183020 |
| onGreen | #183020 | #fffef8 |
| accentHover | #e0ffa0 | #326149 |
| selected | #304527 | #e6f0d6 |
| selectedLine | #799d50 | #789b4d |
| warning | #edbd83 | #865d2e |
| warningBg | #382c20 | #fbf2e9 |
| warningLine | #705437 | #ecdcc8 |
| shadow | #00000040 | #203e3214 |
| albumDot | #344331 | #ccd5be |
| albumGhost | #1b272099 | #fffefa85 |
| key | #435148 | #fffefa |
| keyPressed | #627366 | #c7d2bc |

Also export `radii = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 }` and
`spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }`.

## Theme provider (`src/theme/ThemeProvider.tsx`)

- `ThemeProvider` reads the saved preference (`nxc-theme` = `'dark' | 'light'`) from the entries
  loaded at startup, else follows `useColorScheme()`.
- `useTheme()` → `{ scheme, colors, preference: 'system' | Scheme, setPreference, toggle }`.
  `toggle` flips between dark and light and persists.
- `useColors()` shortcut.

## Fonts (`src/theme/fonts.ts`)

Static TTFs live in `assets/fonts/`: `Nunito-{Medium,SemiBold,Bold,ExtraBold,Black,ExtraBlack}`
and `AlanSans-{Medium,SemiBold,Bold,ExtraBold,Black}`. Register each under its file name.

```ts
export type Weight = 500 | 600 | 700 | 800 | 900 | 1000;
export const fontAssets: Record<string, number>;          // for useFonts
export function fontFamily(language: Language, weight: Weight): string;
// Arabic has no 1000: map 1000 → AlanSans-Black. Numbers/times always use Nunito (latin digits).
```

## UI primitives (`src/ui`)

- `AppText` — `TextProps & { weight?: Weight; size?: number; lineHeight?: number; color?: string;
  tabular?: boolean; latin?: boolean }`. Defaults: weight 700, color `colors.ink`, family by
  language (`latin` forces Nunito, used for digits/times/brand). Sets `fontVariant` tabular when
  `tabular`.
- `Icon` — `{ name: IconName; size?: number; color?: string; strokeWidth?: number; flipRtl?: boolean }`
  drawn with `react-native-svg`, viewBox 24, stroke-only (round caps/joins), same paths as the
  web's `Icon.tsx` (arrow, check, clock, help, shuffle, globe, share, ball, moon, sun, close,
  trophy) plus `settings` (gear), `sparkle`, `chevronDown`, `volume`, `volumeOff`, `vibrate`.
- `PressableScale` — Pressable wrapper that springs to `scale 0.96` on press-in (reanimated),
  accepts `cue?: CueName` (fires the feedback cue on press), `haptic?: boolean`, `disabled`,
  `style`, `accessibilityRole="button"` default, `hitSlop`. Every tappable control uses it.
- `Button` — `{ variant?: 'primary' | 'lime' | 'outline' | 'ghost' | 'danger'; size?: 'md' | 'sm';
  leadingIcon?: IconName; trailingIcon?: IconName; block?: boolean; label: string; onPress;
  disabled?; cue? }`. primary = green bg + onGreen text + 2px bottom shadow; lime = lime bg +
  onAccent; outline = line border, green text; ghost = transparent, muted text; danger =
  warningBg + warning text + warningLine border. md min-height 46, radius 14; sm min-height 36,
  radius 10. Trailing arrow icon flips in RTL.
- `Segmented<T>` — `{ items: { id: T; label: string; icon?: IconName }[]; value: T;
  onChange(id); locked?: boolean; size?: 'md' | 'sm' }`. Soft track, animated sliding card-coloured
  indicator (spring, measured with onLayout), active label `ink`, inactive `muted`; `locked`
  dims inactive items and ignores presses. Fires the `select` cue.
- `Card` — `View` with card bg, line border, radius xl, 1px, subtle shadow; prop `padded?`.

## Feedback (`src/feedback/feedback.ts`)

```ts
export type CueName =
  | 'tap'       // generic press: light impact, no sound
  | 'select'    // segmented/level change: selection haptic + 'tick' (volume 0.5)
  | 'toggle'    // switches: light impact + 'toggle'
  | 'start'     // round starts: medium impact + 'pulse'
  | 'accepted'  // club accepted: success notification + 'chime'
  | 'rejected'  // unknown/duplicate/wrong: warning notification + 'error' (volume 0.45)
  | 'complete'  // target reached: success notification + 'success'
  | 'finish'    // ended early: light impact + 'droplet'
  | 'page'      // screen/sheet open: soft impact + 'page' (volume 0.5)
  | 'share';    // light impact, no sound
export function cue(name: CueName): void;              // never throws, respects settings
export const feedbackSettings: { get(): { sound: boolean; haptics: boolean };
  set(patch): void; subscribe(listener): () => void };  // persisted keys nxc-sound, nxc-haptics
export function useFeedbackSettings(): [settings, set];
```

Sounds come from `cuelume-native` (`play`, `setEnabled`). Haptics from `expo-haptics`
(`impactAsync`, `notificationAsync`, `selectionAsync`), all wrapped in try/catch and fire-and-forget.

## Game domain (`src/game`)

- `play.tsx` exposes `PlayProvider` and hooks:
  - `usePlay()` → `{ snapshot: PlaySnapshot; actions }` where `PlaySnapshot` is the web's
    `{ view: GameView; ranked: RankedSnapshot | null }` and `actions` =
    `{ changeMode, changeLevel, changeCategory, startRound, finishRound, nextRound,
    submitAnswer(text): boolean, shareResult(): Promise<void> }`.
  - `useLanguage()`, `useSetLanguage()`.
  - `useRankedOutcome()` → the web's `rankedOutcome(view, ranked)`.
- The controller is the web's `createGameController({ storage: memoryPort })`; ranked rounds use
  the web's `RankedPlay` with `createRankedApi(appFetch)` and an AsyncStorage-backed session port.
- `api.ts`: `apiBaseUrl` = `process.env.EXPO_PUBLIC_API_URL ?? 'https://clubs.saeed.sh'`;
  `appFetch` prefixes the base and sets an `Origin` header equal to the base (the server rejects
  POSTs without one).
- `leaderboard.ts`: `fetchBoard(mode, period, lang)`, `fetchMyStanding(mode, period)`,
  `useBoard(mode, period, lang)` → `{ status: 'loading' | 'ready' | 'unavailable'; entries;
  mine; refresh(); refreshing }`. Reuses `apps/web/src/components/leaderboard/{types,query,format}.ts`.

## Copy

All UI strings live in `src/copy.ts` with English and Arabic. Arabic is Modern Standard with the
same friendly tone the existing strings use.
