# Mobile screens

Design brief for the phone app. The web app is reference material for the palette, type and
the sticker-album idea only; these screens are designed for a phone in one hand.

Read `foundation.md` first for tokens, primitives, feedback cues and hooks.

## Principles

- One primary action per state, always within thumb reach (bottom of the screen).
- The album is the hero. Everything else gets out of its way while a round is live.
- Motion explains state changes (a sticker lands, controls fold away, a result rises). Springs,
  short durations (160–360 ms), no bounce on panels, a little bounce on stickers.
- Haptics and sound mark game events (accepted, rejected, complete), not every tap.
- RTL (Arabic) is first class: the root view sets `direction` and icons with a direction flip.
- Dark and light themes from the shared tokens; no hard-coded colours.

## Game screen (`app/index.tsx` → `screens/GameScreen.tsx`)

Vertical layout, top to bottom, inside a `SafeAreaView` (top edge) and a
`KeyboardAvoidingView` (iOS `padding`):

1. **Top bar** (56 px): brand on the start side — lime rounded square (36 px, radius 12,
   rotated −9°) with the ball icon, then the wordmark `name × clubs.` in Nunito 900, 22 px,
   letter-spacing −1 (always LTR, `latin`). End side: trophy icon button (opens the leaderboard),
   globe icon button (switches language, label is the other language's name), gear icon button
   (opens the settings sheet). Icon buttons are 40×40 `PressableScale`s, muted colour.
2. **Mode row**: `Segmented` with `Free time` (clock) and `Practice` (shuffle). Locked while
   playing.
3. **Setup block** (hidden with a fold-away animation while the round is playing; returns on
   complete/idle):
   - `Segmented` of levels `10 · 50 · 100` labelled `Mode 10` etc., size `sm`.
   - In Practice: a category row — a `Card`-styled pressable showing the category label with a
     chevron (opens the category sheet) and a `Surprise me` outline button with the shuffle icon.
4. **Album shell** (flex 1): a `Card` with no padding and `overflow: hidden`:
   - **Album header** (soft background, dashed bottom border): challenge sentence in weight 1000,
     17 px (`focus` part in `green`), under it in Practice-letter mode the letter hint (muted,
     11 px). On the end side a stacked group: count pill (`card` bg, line border, pill radius,
     `3/10` tabular, 12 px 800) and the timer (clock icon + `mm:ss`, 15 px 900 tabular, `green`;
     while playing, the clock icon colour is `lime`). Under the header a 4 px progress track
     (`line` tint) whose fill animates width with a spring to `found / target`.
   - **Album sheet**: dotted paper (render dots with a small repeating pattern: an absolutely
     positioned `Svg` `Pattern` of 0.85 px circles every 14 px in `albumDot`). Slots:
     - Level 10: 2 columns × 5 rows that fill the available height (no scrolling).
     - Level 50/100: 4 columns, square-ish cells (min 92 px), vertical scroll
       (`FlatList`, `numColumns=4`), auto-scroll so the newest sticker is visible, a top/bottom
       fade when scrollable.
     - **Empty slot** ("ghost"): dashed `line` border 1.5 px, radius 12, `albumGhost` fill, inner
       1 px border inset 4 px, slot number (`01`…`100`, Nunito 900, muted, tabular) and a small
       shield silhouette (22×25, `line`, 0.7 opacity). The **next** slot (index === found.length,
       only while playing) uses `selectedLine` dashed 2 px, `selected` fill, number in `green`, a
       lime `NEXT` tag, and a slow breathing scale (1 → 1.015, 1.6 s loop).
     - **Filled sticker**: `soft` fill, 2 px `line` border + inner 1 px inset border, radius 12,
       slight tilt from `[-1.4, 1.1, -0.6, 1.5, -1.1, 0.8, -1.3, 1.2, -0.5, 0.9]` deg by slot,
       shadow. Content: top row with a lime slot-number badge (`#07`, 9–11 px 900, onAccent) and
       the country flag emoji; crest (expo-image, 44 px at level 10, 32 px at 50/100; initials
       fallback in a shield shape when no crest); club short name (900, 13/10.5 px, ink, 2 lines
       max) and country (700, muted, hidden at 50/100 when the cell is short). The latest sticker
       gets a `selectedLine` 2 px outline and `selected` fill.
       On iOS, `shouldRasterizeIOS` composites each filled sticker at display resolution before
       rotation so the outer and inset borders keep smooth edges.
     - **Landing animation** for a new sticker: from `translateY −8, scale 1.08`, rotation 2°
       before its resting tilt, and opacity 0. Transform uses `withSpring` (duration 400 ms,
       dampingRatio 1, overshootClamping true) with a 160 ms fade and a subtle shadow change.
       Stickers restored from storage do not animate; reduced motion skips the landing.
   - A floating `More below ↓` pill (green, onGreen, lime border) at the bottom when the sheet
     can scroll further.
5. **Bottom block**:
   - **Idle**: a full-width `primary` button `Let’s play` with trailing arrow, 52 px tall.
   - **Playing**: the composer — a row inside a rounded input wrapper (`soft` fill, 1.5 px `line`
     border → `selectedLine` when focused, radius 16): ball icon (muted), `TextInput` (ink, 17 px
     700, placeholder muted, `autoCorrect=false`, `autoCapitalize='words'`, `returnKeyType='send'`,
     `submitBehavior='submit'`, `autoFocus` when the round starts, `maxLength` 120 in ranked
     rounds), and a 38 px square submit button (`green` bg, arrow icon, onGreen; dims when the
     draft is empty). On submit: trim, ignore empty, call `actions.submitAnswer(text)`; clear the
     draft only when it returns true; otherwise keep the text selected and shake the wrapper
     (translateX ±6, 3 cycles, 280 ms) with the `rejected` cue. Accepted → `accepted` cue.
     Below the input, the **feedback line** (`view.feedback`): a rounded box (`soft`/`green` text
     for accepted, `warningBg`/`warning` for the rest), fades/slides in (FadeInDown 160 ms) and out.
     A 44 × 52 px X button sits before the input, on the left in English and the right in Arabic.
     It opens a localized native confirmation. Cancelling keeps the draft and keyboard focus;
     confirming dismisses the keyboard and calls `finishRound` with the `finish` cue.
     The album header contains the `Free time · Mode X` or practice label and any `Not ranked`
     warning. There is no separate status row above the card.
   - **Complete**: the result panel (see below) replaces the composer with a rise-in animation
     (translateY 24 → 0, opacity, spring). Keyboard dismissed.
6. **Storage notice**: when `!view.storageAvailable`, a warning strip above the bottom block.

### Result panel

- Local or unranked round: a row with a 44 px lime square (trophy icon when
  `found === target`, ball otherwise; the icon wiggles once on mount when won), title
  `You know ball.` / `Good shift.` (1000, 22 px) and `10 / 10 · 01:42` (muted). `Not ranked` chip
  when the outcome kind is `unranked`.
- Ranked round (`pending`, `verified`, `review`, `rejected`): centred block: label
  `ROUND COMPLETE · MODE 10` (muted, 10 px, 900, letter-spacing 1), the time in Nunito 1000 at
  44 px (`formatRankedTime` when settled; local `formatElapsed` while pending), a row of chips:
  `Checking time…` while pending; `#12 · Last 24 hours` (lime, trophy icon) + `#40 · Last 7 days`
  + `#120 · All time` when verified; `Under review` / `Not ranked` chips otherwise. Below:
  the player's display name with a ball icon, and a `View leaderboard →` link.
- Actions: `Share result` (`primary`, leading share icon) and `Another round` (`outline`,
  trailing arrow). Share uses the native share sheet (`actions.shareResult()`), `share` cue.
- When the round completes with `found === target`, fire the `complete` cue once.

### Category sheet (Practice)

A `Modal` (`presentationStyle: 'pageSheet'` on iOS, `animationType: 'slide'`) with a drag
handle look, title `Pick your pitch`, a search field, a `Random challenge` row, then a
`FlatList` of categories grouped visually by kind (World, Regions, Countries, Letters) with
section headers (muted uppercase 10 px). Selected row has `selected` fill and a check icon.
Selecting closes the sheet (`select` cue).

### Settings sheet

A `Modal` (`pageSheet`) titled `Settings` with rows: Appearance (`Segmented` System / Light /
Dark), Sound (switch), Haptics (switch), Language (`Segmented` English / العربية). Rows are
`Card`s with 16 px padding. Switches use `toggle` cue. Close button top end.

## Leaderboard screen (`app/leaderboard.tsx` → `screens/LeaderboardScreen.tsx`)

Pushed as a full-screen route (`presentation: 'card'`), custom header: back/close icon button on
the start side, title `Leaderboard` (1000, 28 px), and nothing on the end side.

1. **Period** `Segmented` `sm`: `Last 24 hours` · `Last 7 days` · `All time` (default day).
2. **Mode** `Segmented`: `Mode 10` · `Mode 50` · `Mode 100` (default: the player's current level
   when it is a ranked level, passed as a route param `mode`; else `t10`).
3. **Board**:
   - **Podium** for the top 3: three `Card`s in a row aligned to the bottom, order 2–1–3; the
     first is taller with a `selected → card` vertical gradient (use `expo-linear-gradient`? Not
     installed — use two stacked views with the top one `selected` and 55% height instead) and
     `selectedLine` border. Each: a medal circle (lime for 1, `soft` for 2, `warningBg`/`warning`
     for 3, 3 px `paper` border) overlapping the top edge, a shield avatar (initial of the name on a
     hashed colour from `['#244f3b', '#c4553d', '#4f77b8', '#b8873d', '#7b5db0', '#3f8f86']`,
     anonymous → `#9aa58b`), name (900, 14 px, 1 line), time (`formatElapsed` → `mm:ss.t`, 1000,
     22 px / 26 px for first, tabular). Cards enter with staggered `FadeInUp` (delay 0/60/120 ms)
     and the medal pops (scale 0.6 → 1 spring).
   - **Rows** from rank 4 in a `Card` list: rank (muted 1000 tabular, 32 px wide), shield avatar
     (24×28), name (800, 15 px, 1 line; anonymous names muted 700), time (1000 tabular), when
     (`formatRelative`, muted 11 px). Alternating `soft` background. The caller's own row
     (`isMine`) uses `lime` fill + `onAccent` text. Rows enter with a staggered `FadeInDown`
     (20 ms per row, capped at 400 ms total).
   - **Pinned "You" row** when the player has a standing that is not among the visible rows: a
     sticky footer above the safe-area bottom, lime, with rank · `You` · time · when.
   - **Empty**: trophy in a `soft` circle, `No times yet`, `Let’s play` primary button (goes back).
   - **Unavailable**: `The board is unavailable right now` + `Try again` outline button.
   - **Loading**: three skeleton podium cards + 6 skeleton rows (soft blocks pulsing opacity).
   - Pull to refresh (`RefreshControl`, tint `green`).
4. Opening the screen fires the `page` cue.
