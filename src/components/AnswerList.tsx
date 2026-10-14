import { memo, useEffect, useRef, useState } from 'react';
import type { ClubId } from '../content/catalog';
import { type Club, clubCrests, countryName } from '../content/catalog';
import { namedClubs } from '../game/controller';
import type { Language } from '../game/model';
import { Icon } from './Icon';

function Crest({ club }: { club: Club }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const initials = club.name
    .replace(/^(AC |AS |Al |FC |RB )/, '')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <span className={`crest-frame ${status === 'loaded' ? 'has-logo' : ''}`} aria-hidden="true">
      <span className="club-crest">{initials}</span>
      {clubCrests[club.id] && status !== 'failed' && (
        <img
          className="club-logo"
          src={clubCrests[club.id]}
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
}
export const AnswerList = memo(function AnswerList({
  found,
  language,
  empty,
}: {
  found: readonly ClubId[];
  language: Language;
  empty: React.ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const previous = useRef({ count: 0, language });
  useEffect(() => {
    if (
      container.current &&
      (found.length > previous.current.count || language !== previous.current.language)
    )
      container.current.scrollTop = container.current.scrollHeight;
    previous.current = { count: found.length, language };
  }, [found.length, language]);
  return (
    <div className="conversation" id="conversation" ref={container}>
      {found.length === 0 && empty}
      <ol
        className="answer-list"
        id="answer-list"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={language === 'en' ? 'Accepted clubs' : 'الأندية الصحيحة'}
      >
        {namedClubs(found).map((club, index) => (
          <li className="answer-message" key={club.id} data-club-id={club.id}>
            <span className="answer-index">{String(index + 1).padStart(2, '0')}</span>
            <Crest club={club} />
            <span className="answer-name">
              <strong lang={language}>{language === 'ar' ? club.arabic : club.name}</strong>
              <small>{countryName(club.country, language)}</small>
            </span>
            <span className="answer-tick">
              <Icon name="check" />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
});
