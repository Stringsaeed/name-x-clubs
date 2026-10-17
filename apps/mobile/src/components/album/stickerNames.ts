import type { TextStyle } from 'react-native';
import {
  type Club,
  type ClubId,
  clubById,
  countries,
  countryName,
} from '../../../../web/src/content/catalog';
import { clubInitials, shortClubWords } from '../../../../web/src/content/clubNames';
import type { Language, Level } from '../../../../web/src/game/model';
import { displayName } from '../../copy';

/** Degrees of tilt by slot, repeating every ten slots (the web's sticker table). */
const stickerTilts = [-1.4, 1.1, -0.6, 1.5, -1.1, 0.8, -1.3, 1.2, -0.5, 0.9] as const;

/** Slot numbers are what the album prints: `01` to `99`, then `100`. */
export function formatSlotNumber(slot: number): string {
  return slot >= 100 ? String(slot) : String(slot).padStart(2, '0');
}

export function stickerTilt(slot: number): number {
  return stickerTilts[(slot - 1) % stickerTilts.length] ?? 0;
}

/** A name that fits two short lines: long English names drop their legal boilerplate. */
export function clubStickerName(club: Club, language: Language): string {
  if (language === 'ar') {
    return club.arabic;
  }

  if (club.name.length <= 16) {
    return club.name;
  }

  const short = shortClubWords(club.name).join(' ');

  if (club.name.toLowerCase().startsWith('al ') && !short.toLowerCase().startsWith('al ')) {
    return `Al ${short}`;
  }

  return short;
}

export type StickerLabels = Readonly<{
  code: string;
  name: string;
  fullName: string;
  country: string;
  flag: string;
  initials: string;
  tilt: number;
  accessibilityLabel: string;
}>;

export function stickerLabels(club: Club, slot: number, language: Language): StickerLabels {
  const code = formatSlotNumber(slot);
  const fullName = displayName(club, language);
  const country = countryName(club.country, language);

  return {
    code,
    name: clubStickerName(club, language),
    fullName,
    country,
    flag: countries[club.country]?.flag ?? '',
    initials: clubInitials(club.name),
    tilt: stickerTilt(slot),
    accessibilityLabel: `#${code} ${fullName}, ${country}`,
  };
}

/** The found clubs that are still in the catalog, in the order they were named. */
export function namedClubs(found: readonly ClubId[]): readonly Club[] {
  return found.flatMap((id) => {
    const club = clubById.get(id);

    return club ? [club] : [];
  });
}

export type AlbumSlot = Readonly<{
  /** 1-based slot number. */
  slot: number;
  club: Club | null;
  /** The empty slot the next answer lands in (only while playing). */
  isNext: boolean;
  /** The newest sticker placed in this sitting. */
  isLatest: boolean;
  /** Placed after the album mounted, so it lands with an animation. */
  animate: boolean;
}>;

/**
 * `settledCount` stickers were in the album when it showed this round: they never land and none
 * of them is the latest. `restingCount` stickers were on screen before the sheet last changed its
 * layout: they keep their highlight but do not land a second time.
 */
export function albumSlots(
  clubs: readonly Club[],
  level: Level,
  playing: boolean,
  settledCount: number,
  restingCount = 0,
): readonly AlbumSlot[] {
  const latest = clubs.length - 1;
  const landFrom = Math.max(settledCount, restingCount);

  return Array.from({ length: level }, (_, index) => ({
    slot: index + 1,
    club: clubs[index] ?? null,
    isNext: playing && index === clubs.length,
    isLatest: index === latest && index >= settledCount,
    animate: index >= landFrom,
  }));
}

/** Everything a sticker or ghost needs to size itself for its cell. */
export type StickerLook = Readonly<{
  /** `stack`: badge row, crest, name, country. `row`: crest beside the text (short cells). */
  layout: 'stack' | 'row';
  crest: number;
  crestBox: Readonly<{ width: number; height: number }>;
  badge: number;
  name: TextStyle;
  nameLines: 1 | 2;
  country: boolean;
  ghostNumber: number;
  shield: boolean;
}>;

function textSize(size: number): TextStyle {
  return { fontSize: size, lineHeight: Math.round(size * 1.18) };
}

function look(
  layout: StickerLook['layout'],
  crest: number,
  rest: Omit<StickerLook, 'layout' | 'crest' | 'crestBox'>,
): StickerLook {
  return { layout, crest, crestBox: { width: crest, height: crest }, ...rest };
}

/** Level 10 cells fill the sheet, so their content adapts to the height left by the keyboard. */
export function stickerLook(level: Level, cellHeight: number): StickerLook {
  if (level !== 10) {
    return look('stack', 32, {
      badge: 9,
      name: textSize(10.5),
      nameLines: 2,
      country: cellHeight >= 112,
      ghostNumber: 12,
      shield: cellHeight >= 80,
    });
  }

  if (cellHeight >= 124) {
    return look('stack', 44, {
      badge: 11,
      name: textSize(13),
      nameLines: 2,
      country: true,
      ghostNumber: 15,
      shield: true,
    });
  }

  const roomy = cellHeight >= 56;

  return look('row', Math.round(Math.min(44, Math.max(20, cellHeight - 22))), {
    badge: 10,
    name: textSize(roomy ? 13 : 12),
    nameLines: roomy ? 2 : 1,
    country: cellHeight >= 74,
    ghostNumber: 13,
    shield: roomy,
  });
}
