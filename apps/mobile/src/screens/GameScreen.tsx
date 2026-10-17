import { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isRankedRoundOf } from '../../../web/src/game/ranked/rankedView';
import { AlbumShell } from '../components/album';
import { Composer } from '../components/composer/Composer';
import { TopBar } from '../components/header/TopBar';
import { openLeaderboard } from '../components/openLeaderboard';
import { ResultPanel } from '../components/result/ResultPanel';
import { ModeRow, SetupBlock } from '../components/SetupBlock';
import { StorageNotice } from '../components/StorageNotice';
import { CategorySheet } from '../components/sheets/CategorySheet';
import { SettingsSheet } from '../components/sheets/SettingsSheet';
import { Tagline } from '../components/Tagline';
import { type Copy, copyFor } from '../copy';
import {
  type PlayActions,
  type PlaySnapshot,
  useLanguage,
  usePlay,
  useSetLanguage,
} from '../game/play';
import { useColors } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { useKeyboardVisible, useRoundEvents } from './useRoundEvents';

type SheetName = 'settings' | 'category';

/** Below this height (an iPhone SE) the tagline gives its space to the album. */
const taglineMinHeight = 700;

/** Shared by every block in the column, so the album grows and shrinks with the setup. */
const columnLayout = LinearTransition.duration(220);

export function GameScreen() {
  const { snapshot, actions } = usePlay();
  const { view, ranked } = snapshot;
  const language = useLanguage();
  const setLanguage = useSetLanguage();
  const copy = copyFor(language);
  const playing = view.session.round.phase === 'playing';
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const frame = useScreenFrame(language === 'ar');

  useRoundEvents(view);

  function openSheet(name: SheetName) {
    Keyboard.dismiss();
    setSheet(name);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, frame.paper]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.root, frame.root]}>
          <TopBar
            copy={copy}
            onLeaderboard={() => {
              Keyboard.dismiss();
              openLeaderboard(view.level);
            }}
            onLanguage={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            onSettings={() => openSheet('settings')}
          />
          <SetupArea
            snapshot={snapshot}
            actions={actions}
            copy={copy}
            onPickCategory={() => openSheet('category')}
          />
          <Animated.View layout={columnLayout} style={styles.album}>
            <AlbumShell
              style={styles.flex}
              session={view.session}
              level={view.level}
              language={language}
              playing={playing}
              unranked={ranked?.status === 'unranked' && isRankedRoundOf(view, ranked)}
              copy={copy}
            />
          </Animated.View>
          <BottomBlock snapshot={snapshot} actions={actions} copy={copy} />
        </View>
      </KeyboardAvoidingView>
      <SettingsSheet visible={sheet === 'settings'} copy={copy} onClose={() => setSheet(null)} />
      <CategorySheet
        visible={sheet === 'category'}
        level={view.level}
        selectedId={view.session.kind === 'practice' ? view.session.category : ''}
        copy={copy}
        onClose={() => setSheet(null)}
        onSelect={actions.changeCategory}
      />
    </SafeAreaView>
  );
}

/** Theme, direction and the bottom inset (dropped while the keyboard covers it). */
function useScreenFrame(rtl: boolean) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  const bottom = keyboard ? spacing.md : Math.max(insets.bottom, spacing.md);

  return useMemo(
    () => ({
      paper: { backgroundColor: colors.paper },
      root: { direction: rtl ? 'rtl' : 'ltr', paddingBottom: bottom } as const,
    }),
    [colors, rtl, bottom],
  );
}

type SectionProps = Readonly<{ snapshot: PlaySnapshot; actions: PlayActions; copy: Copy }>;

/** Setup controls give their space to the album while playing. */
function SetupArea({
  snapshot,
  actions,
  copy,
  onPickCategory,
}: SectionProps & Readonly<{ onPickCategory: () => void }>) {
  const { view } = snapshot;
  const { height } = useWindowDimensions();
  const phase = view.session.round.phase;
  const showTagline = phase === 'idle' && view.level === 10 && height >= taglineMinHeight;

  if (phase === 'playing') {
    return null;
  }

  return (
    <Animated.View
      key="setup"
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(140)}
      layout={columnLayout}
    >
      <ModeRow view={view} copy={copy} locked={false} onChange={actions.changeMode} />
      {showTagline ? <Tagline copy={copy} /> : null}
      <Animated.View layout={columnLayout} style={styles.setup}>
        <SetupBlock
          view={view}
          copy={copy}
          locked={false}
          actions={actions}
          onPickCategory={onPickCategory}
        />
      </Animated.View>
    </Animated.View>
  );
}

/** `Let’s play` / the composer, or the result rising in when the round is complete. */
function BottomBlock({ snapshot, actions, copy }: SectionProps) {
  const { view } = snapshot;
  const complete = view.session.round.phase === 'complete';

  return (
    <Animated.View layout={columnLayout} style={styles.bottom}>
      {view.storageAvailable ? null : <StorageNotice message={copy.storage} />}
      {complete ? (
        <Animated.View
          key="result"
          entering={FadeInDown.springify().damping(18)}
          layout={columnLayout}
        >
          <ResultPanel snapshot={snapshot} actions={actions} copy={copy} />
        </Animated.View>
      ) : (
        <Animated.View key="composer" entering={FadeIn.duration(180)}>
          <Composer snapshot={snapshot} actions={actions} copy={copy} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  setup: {
    paddingTop: spacing.md,
  },
  album: {
    flex: 1,
    marginTop: spacing.md,
  },
  bottom: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
