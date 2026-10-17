import { useLingui } from '@lingui/react/macro';
import type { ClubId } from '@nxc/game/content/catalog';
import { type Club, clubCrests, countryName } from '@nxc/game/content/catalog';
import { clubInitials } from '@nxc/game/content/clubNames';
import type { Language } from '@nxc/game/model';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { namedClubs } from '../game/controller';
import { Icon } from './Icon';

const Crest = memo(function CrestView({ club }: { club: Club }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const crestUrl = clubCrests[club.id];

  return (
    <span className={`crest-frame ${status === 'loaded' ? 'has-logo' : ''}`} aria-hidden="true">
      <span className="club-crest">{clubInitials(club.name)}</span>
      {crestUrl && status !== 'failed' && (
        // biome-ignore lint/performance/noImgElement: plain <img>; the app does not use next/image
        <img
          className="club-logo"
          src={crestUrl}
          width="32"
          height="32"
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

type AnswerRowProps = {
  club: Club;
  position: number;
  language: Language;
  isNew: boolean;
};

const AnswerRow = memo(function AnswerRowView({ club, position, language, isNew }: AnswerRowProps) {
  return (
    <li className={`answer-message ${isNew ? 'is-new' : ''}`} data-club-id={club.id}>
      <span className="answer-index">{String(position).padStart(2, '0')}</span>
      <Crest club={club} />
      <span className="answer-name">
        <strong lang={language}>{language === 'ar' ? club.arabic : club.name}</strong>
        <small>{countryName(club.country, language)}</small>
      </span>
      <span className="answer-tick">
        <Icon name="check" />
      </span>
    </li>
  );
});

type AnswerListProps = {
  found: readonly ClubId[];
  language: Language;
  /** Show the empty-state ball while there are no clubs. */
  showEmpty: boolean;
};

export const AnswerList = memo(function AnswerListView({
  found,
  language,
  showEmpty,
}: AnswerListProps) {
  const { t } = useLingui();
  const container = useRef<HTMLDivElement>(null);
  const previous = useRef({ count: 0, language });
  // Rows present on first render (or before a round restart) must not replay the entrance animation.
  const settledCount = useRef(found.length);
  const clubs = useMemo(() => namedClubs(found), [found]);

  useEffect(() => {
    const grew = found.length > previous.current.count;
    const languageChanged = language !== previous.current.language;

    if (container.current && (grew || languageChanged)) {
      container.current.scrollTop = container.current.scrollHeight;
    }

    if (found.length < settledCount.current) {
      settledCount.current = found.length;
    }

    previous.current = { count: found.length, language };
  }, [found.length, language]);

  return (
    <div className="conversation" id="conversation" ref={container}>
      {found.length === 0 && showEmpty && (
        <div className="chat-empty">
          <span className="empty-ball">
            <Icon name="ball" />
          </span>
        </div>
      )}
      <ol
        className="answer-list"
        id="answer-list"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t`Accepted clubs`}
      >
        {clubs.map((club, index) => (
          <AnswerRow
            key={club.id}
            club={club}
            position={index + 1}
            language={language}
            isNew={index >= settledCount.current}
          />
        ))}
      </ol>
    </div>
  );
});
