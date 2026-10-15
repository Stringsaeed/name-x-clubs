import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import { formatElapsed } from '../game/controller';
import type { CompletedRound, Language, Session } from '../game/model';
import { formatRankedTime } from '../game/ranked/clock';
import { type RankedOutcome, rankedModeFor } from '../game/ranked/rankedView';
import type { ShareOutcome } from '../game/session/share';
import { Icon } from './Icon';

type SettledOutcome = Extract<RankedOutcome, { elapsedMs: number }>;

type ServerOutcome = SettledOutcome | Readonly<{ kind: 'pending' }>;

type ResultPanelProps = {
  session: Session;
  outcome: RankedOutcome;
  language: Language;
  onShare: (language: Language) => Promise<ShareOutcome>;
  onNext: () => void;
  notify: (text: string) => void;
};

function isServerOutcome(outcome: RankedOutcome): outcome is ServerOutcome {
  return outcome.kind !== 'local' && outcome.kind !== 'unranked';
}

/** Today's result: the club count and the time, for rounds the server does not rank. */
function LocalSummary({
  session,
  round,
  unranked,
}: {
  session: Session;
  round: CompletedRound;
  unranked: boolean;
}) {
  const { t } = useLingui();
  const target = session.challenge.target;
  const won = round.found.length === target;
  const body = `${round.found.length} / ${target} · ${formatElapsed(round.elapsed)}`;

  return (
    <div className="result-header">
      <span className={`result-icon ${won ? 'celebrate' : ''}`}>
        <Icon name={won ? 'trophy' : 'ball'} />
      </span>
      <div>
        <h3>{won ? t`You know ball.` : t`Good shift.`}</h3>
        <p>{body}</p>
      </div>
      {unranked && <span className="ranked-badge">{t`Not ranked`}</span>}
    </div>
  );
}

function RankChips({ outcome }: { outcome: SettledOutcome }) {
  const { t } = useLingui();
  const ranks = outcome.ranks;

  if (outcome.kind === 'review') {
    return <span className="ranked-chip">{t`Under review`}</span>;
  }

  if (outcome.kind === 'rejected') {
    return <span className="ranked-chip">{t`Not ranked`}</span>;
  }

  if (ranks === null) {
    return null;
  }

  const periods = [
    { key: 'day', rank: ranks.day, label: t`Last 24 hours` },
    { key: 'week', rank: ranks.week, label: t`Last 7 days` },
    { key: 'all', rank: ranks.all, label: t`All time` },
  ];

  return periods.map(({ key, rank, label }) =>
    rank === null ? null : (
      <span className={`ranked-chip ${key === 'day' ? 'is-lead' : ''}`} key={key}>
        {key === 'day' && <Icon name="trophy" />}
        <b dir="ltr">{`#${rank}`}</b>
        {' · '}
        {label}
      </span>
    ),
  );
}

function leaderboardHref(language: Language, session: Session) {
  const mode = rankedModeFor(session.challenge.target);

  return `/${language}/leaderboard?mode=${mode}&period=day`;
}

/** The server's verdict: its time, the ranks it earned, and the name it is listed under. */
function RankedSummary({
  session,
  round,
  outcome,
  language,
}: {
  session: Session;
  round: CompletedRound;
  outcome: ServerOutcome;
  language: Language;
}) {
  const { t } = useLingui();
  const target = session.challenge.target;
  const settled = outcome.kind === 'pending' ? null : outcome;
  const time =
    settled === null ? formatElapsed(round.elapsed) : formatRankedTime(settled.elapsedMs);

  return (
    <div className="ranked-result">
      <p className="ranked-result-label">{t`Round complete · Mode ${target}`}</p>
      <p className="ranked-result-time" dir="ltr">
        {time}
      </p>
      <div className="ranked-result-chips">
        {settled === null ? (
          <span className="ranked-chip">{t`Checking time…`}</span>
        ) : (
          <RankChips outcome={settled} />
        )}
      </div>
      <div className="ranked-result-footer">
        {settled?.displayName && (
          <span className="ranked-result-player">
            <Icon name="ball" />
            <span dir="auto">{settled.displayName}</span>
          </span>
        )}
        <a className="ranked-result-board" href={leaderboardHref(language, session)}>
          {t`Leaderboard`}
          <Icon name="arrow" />
        </a>
      </div>
    </div>
  );
}

export function ResultPanel({
  session,
  outcome,
  language,
  onShare,
  onNext,
  notify,
}: ResultPanelProps) {
  const { t } = useLingui();
  const [manual, setManual] = useState('');
  const copy = useRef<HTMLTextAreaElement>(null);
  const share = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    share.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (manual) {
      copy.current?.focus();
      copy.current?.select();
    }
  }, [manual]);

  const round = session.round;

  if (round.phase !== 'complete') {
    return null;
  }

  const handleShare = async () => {
    const result = await onShare(language);

    if (result.kind === 'copied') {
      notify(t`Result copied. Send it to your football friends.`);
    }

    if (result.kind === 'manual') {
      setManual(result.text);
      notify(t`Select and copy your result below.`);
    }
  };

  const ranked = isServerOutcome(outcome);

  return (
    <div className={`result-panel ${ranked ? 'is-ranked' : ''}`} id="result-panel">
      {ranked ? (
        <RankedSummary session={session} round={round} outcome={outcome} language={language} />
      ) : (
        <LocalSummary session={session} round={round} unranked={outcome.kind === 'unranked'} />
      )}
      <div className="result-actions">
        <button ref={share} className="button button-primary" type="button" onClick={handleShare}>
          <Icon name="share" />
          {t`Share result`}
        </button>
        <button className="button button-outline" type="button" onClick={onNext}>
          {t`Another round`}
          <Icon name="arrow" />
        </button>
      </div>
      {manual && (
        <textarea
          ref={copy}
          className="copy-box"
          aria-label={t`Share result`}
          rows={5}
          value={manual}
          readOnly
        />
      )}
    </div>
  );
}
