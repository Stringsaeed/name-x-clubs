'use client';

import { useLingui } from '@lingui/react/macro';
import {
  type CSSProperties,
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Club, ClubId } from '../content/catalog';
import { clubCrests, countries, countryName } from '../content/catalog';
import { clubInitials, shortClubWords } from '../content/clubNames';
import { namedClubs } from '../game/controller';
import type { Level } from '../game/model';
import type { Locale } from '../i18n/config';
import { Icon } from './Icon';

const STICKER_TILTS = [
  '-1.4deg',
  '1.1deg',
  '-0.6deg',
  '1.5deg',
  '-1.1deg',
  '0.8deg',
  '-1.3deg',
  '1.2deg',
  '-0.5deg',
  '0.9deg',
] as const;

function stickerTilt(slotNumber: number): string {
  return STICKER_TILTS[(slotNumber - 1) % STICKER_TILTS.length] ?? '0deg';
}

function formatSlotNumber(slotNumber: number): string {
  if (slotNumber === 100) {
    return '100';
  }
  return String(slotNumber).padStart(2, '0');
}

function clubFullName(club: Club, language: Locale): string {
  return language === 'ar' ? club.arabic : club.name;
}

function clubStickerName(club: Club, language: Locale): string {
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

const StickerCrest = memo(function StickerCrestView({ club }: { club: Club }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const crestUrl = clubCrests[club.id];

  return (
    <span
      className={`crest-frame album-crest ${status === 'loaded' ? 'has-logo' : ''}`}
      aria-hidden="true"
    >
      <span className="club-crest">{clubInitials(club.name)}</span>
      {crestUrl && status !== 'failed' && (
        // biome-ignore lint/performance/noImgElement: plain <img>; the app does not use next/image
        <img
          className="club-logo"
          src={crestUrl}
          width="36"
          height="36"
          loading="lazy"
          decoding="async"
          alt=""
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
        />
      )}
    </span>
  );
});

type FilledSlotProps = {
  club: Club;
  slotNumber: number;
  language: Locale;
  isNew: boolean;
  isLatest: boolean;
};

const FilledSticker = memo(function FilledStickerView({
  club,
  slotNumber,
  language,
  isNew,
  isLatest,
}: FilledSlotProps) {
  const slotCode = formatSlotNumber(slotNumber);
  const fullName = clubFullName(club, language);
  const shortName = clubStickerName(club, language);
  const country = countryName(club.country, language);
  const flag = countries[club.country]?.flag ?? '';
  const style = { '--sticker-tilt': stickerTilt(slotNumber) } as CSSProperties;

  return (
    <li
      className={`album-slot is-filled ${isNew ? 'is-new' : ''} ${isLatest ? 'is-latest' : ''}`}
      data-club-id={club.id}
      data-slot={slotNumber}
      style={style}
      aria-label={`#${slotCode} ${fullName}, ${country}`}
    >
      <div className="album-sticker" title={fullName}>
        <span className="album-sticker-top">
          <span className="album-slot-num" dir="ltr">
            #{slotCode}
          </span>
          {flag && (
            <span className="album-flag" aria-hidden="true">
              {flag}
            </span>
          )}
        </span>
        <StickerCrest club={club} />
        <span className="album-sticker-body">
          <strong className="album-club-name" lang={language}>
            {shortName}
          </strong>
          <small className="album-club-country">{country}</small>
        </span>
        <span className="album-tooltip" aria-hidden="true">
          {shortName !== fullName && <strong>{fullName}</strong>}
          <span>{country}</span>
        </span>
      </div>
    </li>
  );
});

type EmptySlotProps = {
  slotNumber: number;
  isNext: boolean;
};

const EmptySlot = memo(function EmptySlotView({ slotNumber, isNext }: EmptySlotProps) {
  const { t } = useLingui();
  const slotCode = formatSlotNumber(slotNumber);

  return (
    <div className={`album-slot is-empty ${isNext ? 'is-next' : ''}`} data-slot={slotNumber}>
      <div className="album-ghost">
        <span className="album-ghost-num" dir="ltr">
          {slotCode}
        </span>
        <span className="album-ghost-crest" aria-hidden="true" />
        {isNext && <span className="album-next-tag">{t`Next`}</span>}
      </div>
    </div>
  );
});

function useAlbumScroll(viewportRef: RefObject<HTMLDivElement | null>, foundCount: number) {
  const [scrollState, setScrollState] = useState({ up: false, down: false });
  const previousCount = useRef(foundCount);

  const updateScrollState = useCallback(() => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const up = el.scrollTop > 6;
    const down = el.scrollHeight - el.scrollTop - el.clientHeight > 6;
    setScrollState((prev) => (prev.up === up && prev.down === down ? prev : { up, down }));
  }, [viewportRef]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    updateScrollState();
    const observer = new ResizeObserver(() => updateScrollState());
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollState, viewportRef]);

  useEffect(() => {
    const grew = foundCount > previousCount.current;
    if (grew && viewportRef.current) {
      const targetSlot = viewportRef.current.querySelector<HTMLElement>(
        `[data-slot="${foundCount}"]`,
      );
      targetSlot?.scrollIntoView?.({ block: 'nearest' });
    }
    previousCount.current = foundCount;
    updateScrollState();
  }, [foundCount, updateScrollState, viewportRef]);

  const scrollMore = useCallback(() => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    el.scrollBy({
      top: Math.max(140, Math.floor(el.clientHeight * 0.65)),
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [viewportRef]);

  return { scrollState, updateScrollState, scrollMore };
}

type AlbumSpreadProps = {
  clubs: readonly Club[];
  level: Level;
  language: Locale;
  playing: boolean;
  settledCount: number;
};

function AlbumSpread({ clubs, level, language, playing, settledCount }: AlbumSpreadProps) {
  const { t } = useLingui();
  const slots = useMemo(() => Array.from({ length: level }, (_, index) => index + 1), [level]);

  return (
    <div className="album-sheet" data-album-level={level}>
      <div className="album-cells album-ghosts" aria-hidden="true">
        {slots.map((slotNumber) => {
          const index = slotNumber - 1;
          if (index < clubs.length) {
            return <div key={slotNumber} className="album-spacer" />;
          }
          return (
            <EmptySlot
              key={slotNumber}
              slotNumber={slotNumber}
              isNext={playing && index === clubs.length}
            />
          );
        })}
      </div>
      <ol
        className="album-cells album-found"
        id="answer-list"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t`Accepted clubs`}
      >
        {clubs.map((club, index) => (
          <FilledSticker
            key={club.id}
            club={club}
            slotNumber={index + 1}
            language={language}
            isNew={index >= settledCount}
            isLatest={index === clubs.length - 1 && index >= settledCount}
          />
        ))}
      </ol>
    </div>
  );
}

type StickerAlbumProps = {
  found: readonly ClubId[];
  level: Level;
  language: Locale;
  playing: boolean;
};

export const StickerAlbum = memo(function StickerAlbumView({
  found,
  level,
  language,
  playing,
}: StickerAlbumProps) {
  const { t } = useLingui();
  const viewportRef = useRef<HTMLDivElement>(null);
  const settledCount = useRef(found.length);
  const clubs = useMemo(() => namedClubs(found), [found]);
  const { scrollState, updateScrollState, scrollMore } = useAlbumScroll(viewportRef, found.length);

  useEffect(() => {
    if (found.length < settledCount.current) {
      settledCount.current = found.length;
    }
  }, [found.length]);

  const remaining = Math.max(0, level - clubs.length);

  return (
    <div
      className="album-shell"
      data-scroll-up={scrollState.up ? 'true' : undefined}
      data-scroll-down={scrollState.down ? 'true' : undefined}
    >
      <div className="album-kicker">
        <span className="album-edition">
          <Icon name="ball" />
          <span>{t`Sticker album`}</span>
        </span>
        <span className="album-remaining">
          {remaining === 0 ? t`Album complete!` : t`${remaining} left to collect`}
        </span>
      </div>

      <div
        className="album-viewport conversation"
        id="conversation"
        ref={viewportRef}
        onScroll={updateScrollState}
      >
        <AlbumSpread
          clubs={clubs}
          level={level}
          language={language}
          playing={playing}
          settledCount={settledCount.current}
        />
      </div>

      {scrollState.down && (
        <button
          type="button"
          className="album-scroll-cue"
          onClick={scrollMore}
          aria-label={t`Scroll to see more sticker slots`}
        >
          <span>{t`More slots below`}</span>
          <span aria-hidden="true">↓</span>
        </button>
      )}
    </div>
  );
});
