import { StyleSheet, View } from 'react-native';
import type { CompletedRound, Session } from '../../../../web/src/game/model';
import { formatRankedTime } from '../../../../web/src/game/ranked/clock';
import type { RankedOutcome } from '../../../../web/src/game/ranked/rankedView';
import { type Copy, formatRankChip } from '../../copy';
import { formatElapsed } from '../../game/engine';
import { useColors } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { AppText, Icon, PressableScale } from '../../ui';
import { Chip } from '../Chip';
import { openLeaderboard } from '../openLeaderboard';

type SettledOutcome = Extract<RankedOutcome, { elapsedMs: number }>;

export type ServerOutcome = SettledOutcome | Readonly<{ kind: 'pending' }>;

export type RankedSummaryProps = Readonly<{
  session: Session;
  round: CompletedRound;
  outcome: ServerOutcome;
  copy: Copy;
}>;

/** The server's verdict: its time, the ranks it earned, and the name it is listed under. */
export function RankedSummary({ session, round, outcome, copy }: RankedSummaryProps) {
  const colors = useColors();
  const target = session.challenge.target;
  const settled = outcome.kind === 'pending' ? null : outcome;
  const time =
    settled === null ? formatElapsed(round.elapsed) : formatRankedTime(settled.elapsedMs);

  return (
    <View style={styles.block}>
      <AppText weight={900} size={10} color={colors.muted} style={styles.label}>
        {copy.roundComplete(target).toLocaleUpperCase()}
      </AppText>
      <AppText latin tabular weight={1000} size={44} lineHeight={50} style={styles.time}>
        {time}
      </AppText>
      <View style={styles.chips}>
        {settled === null ? (
          <Chip label={copy.checkingTime} />
        ) : (
          <RankChips outcome={settled} copy={copy} />
        )}
      </View>
      <View style={styles.footer}>
        {settled?.displayName ? <Player name={settled.displayName} /> : null}
        <PressableScale
          cue="page"
          accessibilityRole="link"
          accessibilityLabel={copy.viewLeaderboard}
          hitSlop={8}
          onPress={() => openLeaderboard(target)}
          style={styles.link}
        >
          <AppText weight={800} size={13} color={colors.green}>
            {copy.viewLeaderboard}
          </AppText>
          <Icon name="arrow" size={15} color={colors.green} strokeWidth={2} flipRtl />
        </PressableScale>
      </View>
    </View>
  );
}

function RankChips({ outcome, copy }: Readonly<{ outcome: SettledOutcome; copy: Copy }>) {
  if (outcome.kind === 'review') {
    return <Chip label={copy.underReviewChip} tone="warning" />;
  }

  if (outcome.kind === 'rejected') {
    return <Chip label={copy.notRankedChip} tone="warning" />;
  }

  const ranks = outcome.ranks;

  if (ranks === null) {
    return null;
  }

  const periods = [
    { key: 'day', rank: ranks.day, label: copy.last24h },
    { key: 'week', rank: ranks.week, label: copy.last7d },
    { key: 'all', rank: ranks.all, label: copy.allTime },
  ] as const;

  return periods.map(({ key, rank, label }) =>
    rank === null ? null : (
      <Chip
        key={key}
        label={`${isolated(formatRankChip(rank))} · ${label}`}
        {...(key === 'day' ? { tone: 'lime' as const, icon: 'trophy' as const } : {})}
      />
    ),
  );
}

/** Keeps a left-to-right run (`#12`, a nickname's tag) in order inside Arabic text. */
function isolated(text: string) {
  return `⁦${text}⁩`;
}

/** A generated nickname ends in a tag such as `#4F2A`; it stays left to right in Arabic. */
function playerLabel(name: string) {
  const tagStart = name.lastIndexOf(' #');

  if (tagStart === -1) {
    return name;
  }

  return `${name.slice(0, tagStart)} ${isolated(name.slice(tagStart + 1))}`;
}

function Player({ name }: Readonly<{ name: string }>) {
  const colors = useColors();

  return (
    <View style={styles.player}>
      <Icon name="ball" size={15} color={colors.muted} />
      <AppText weight={800} size={13} color={colors.muted} numberOfLines={1} style={styles.name}>
        {playerLabel(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    letterSpacing: 1,
    textAlign: 'center',
  },
  time: {
    writingDirection: 'ltr',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  footer: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  name: {
    flexShrink: 1,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginStart: 'auto',
  },
});
