import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { levelSchema, levels, type Mode } from '../../../web/src/game/model';
import { categoryLabel, challengeLine, copyFor } from '../copy';
import { elapsedSeconds, formatElapsed } from '../engine';
import { useLanguage, usePlay, useSetLanguage } from '../play';
import { colors } from '../theme';
import { AppText } from './AppText';
import { CategorySheet } from './CategorySheet';
import { Composer } from './Composer';
import { FoundGrid } from './FoundGrid';

export function GameScreen() {
  const { view, dispatch } = usePlay();
  const language = useLanguage();
  const setLanguage = useSetLanguage();
  const copy = copyFor(language);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
          <RoundHeader
            view={view}
            language={language}
            copy={copy}
            onLanguage={() => {
              setLanguage(language === 'ar' ? 'en' : 'ar');
            }}
            dispatch={dispatch}
          />
          <FoundGrid
            found={view.session.round.found}
            level={view.level}
            language={language}
            label={copy.found}
          />
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
            <Composer
              session={view.session}
              language={language}
              copy={copy}
              feedback={view.feedback}
              onStart={() => {
                dispatch({ type: 'start' });
              }}
              onSubmit={(text) => {
                dispatch({ type: 'answer', text });
              }}
              onRestart={() => {
                dispatch({ type: 'restart' });
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function RoundHeader({
  view,
  language,
  copy,
  onLanguage,
  dispatch,
}: {
  view: ReturnType<typeof usePlay>['view'];
  language: ReturnType<typeof useLanguage>;
  copy: ReturnType<typeof copyFor>;
  onLanguage: () => void;
  dispatch: ReturnType<typeof usePlay>['dispatch'];
}) {
  const locked = view.session.round.phase === 'playing';
  const line = challengeLine(view.session.challenge, language);
  const found = view.session.round.found.length;
  const target = view.session.challenge.target;
  const modeOptions: readonly { id: Mode; label: string }[] = [
    { id: 'free', label: copy.freeTime },
    { id: 'practice', label: copy.practice },
  ];

  return (
    <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText style={{ fontSize: 22 }}>name × clubs</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.language}
          onPress={onLanguage}
          hitSlop={8}
        >
          <AppText style={{ color: colors.lime }}>{copy.language}</AppText>
        </Pressable>
      </View>
      <ChoiceRow
        label={copy.modes}
        locked={locked}
        options={modeOptions}
        selected={view.mode}
        onSelect={(mode) => {
          dispatch({ type: 'mode', mode });
        }}
      />
      <ChoiceRow
        label={copy.levels}
        locked={locked}
        options={levels.map((level) => ({ id: level, label: String(level) }))}
        selected={view.level}
        onSelect={(level) => {
          const parsed = levelSchema.safeParse(level);

          if (parsed.success) {
            dispatch({ type: 'level', level: parsed.data });
          }
        }}
      />
      {view.session.kind === 'practice' ? (
        <PracticeRow
          label={categoryLabel(view.session.challenge, language, copy)}
          category={view.session.category}
          locked={locked}
          level={view.level}
          language={language}
          copy={copy}
          onSelect={(category) => {
            dispatch({ type: 'practice', category });
          }}
        />
      ) : null}
      <ChallengeStatus
        before={line.before}
        focus={line.focus}
        after={line.after}
        found={found}
        target={target}
        session={view.session}
        locked={locked}
        doneLabel={copy.done}
        storage={view.storageAvailable ? null : copy.storage}
        onFinish={() => {
          dispatch({ type: 'finish' });
        }}
      />
    </View>
  );
}

function ChallengeStatus({
  before,
  focus,
  after,
  found,
  target,
  session,
  locked,
  doneLabel,
  storage,
  onFinish,
}: {
  before: string;
  focus: string;
  after: string;
  found: number;
  target: number;
  session: Parameters<typeof elapsedSeconds>[0];
  locked: boolean;
  doneLabel: string;
  storage: string | null;
  onFinish: () => void;
}) {
  return (
    <>
      <AppText style={{ fontSize: 28, lineHeight: 34 }}>
        {before}
        <AppText style={{ fontSize: 28, color: colors.lime }}>{focus}</AppText>
        {after}
      </AppText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText style={{ color: colors.muted }}>
          {found}/{target}
        </AppText>
        <Elapsed session={session} />
        <Pressable
          accessibilityRole="button"
          disabled={!locked}
          onPress={onFinish}
          style={{ opacity: locked ? 1 : 0 }}
        >
          <AppText style={{ color: colors.warning }}>{doneLabel}</AppText>
        </Pressable>
      </View>
      <View
        style={{ height: 4, borderRadius: 4, backgroundColor: colors.soft, overflow: 'hidden' }}
      >
        <View
          style={{
            height: 4,
            width: `${Math.min(100, (found / target) * 100)}%`,
            backgroundColor: colors.lime,
          }}
        />
      </View>
      {storage ? <AppText style={{ color: colors.warning }}>{storage}</AppText> : null}
    </>
  );
}

function Elapsed({ session }: { session: Parameters<typeof elapsedSeconds>[0] }) {
  const [now, setNow] = useState(() => Date.now());
  const playing = session.round.phase === 'playing';

  useEffect(() => {
    if (!playing) {
      return;
    }

    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(id);
    };
  }, [playing]);

  const seconds = elapsedSeconds(session, playing ? now : Date.now());

  return (
    <AppText style={{ fontVariant: ['tabular-nums'], fontSize: 18 }}>
      {formatElapsed(seconds)}
    </AppText>
  );
}

function ChoiceRow<T extends string | number>({
  label,
  options,
  selected,
  locked,
  onSelect,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  selected: T;
  locked: boolean;
  onSelect: (id: T) => void;
}) {
  return (
    <View accessibilityLabel={label} style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((option) => {
        const active = option.id === selected;

        return (
          <Pressable
            key={String(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: locked }}
            disabled={locked}
            onPress={() => {
              onSelect(option.id);
            }}
            style={{
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: active ? colors.lime : colors.soft,
              opacity: locked && !active ? 0.45 : 1,
            }}
          >
            <AppText style={{ color: active ? colors.onAccent : colors.ink }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function PracticeRow({
  label,
  category,
  locked,
  copy,
  level,
  language,
  onSelect,
}: {
  label: string;
  category: string;
  locked: boolean;
  copy: ReturnType<typeof copyFor>;
  level: (typeof levels)[number];
  language: ReturnType<typeof useLanguage>;
  onSelect: (category: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.pickPitch}
        disabled={locked}
        onPress={() => {
          setOpen(true);
        }}
        style={{
          flex: 1,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 12,
          paddingVertical: 10,
          opacity: locked ? 0.45 : 1,
        }}
      >
        <AppText numberOfLines={1}>{category === 'random' ? copy.randomChallenge : label}</AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={locked}
        onPress={() => {
          onSelect('random');
        }}
        style={{
          borderRadius: 14,
          backgroundColor: colors.soft,
          paddingHorizontal: 12,
          justifyContent: 'center',
          opacity: locked ? 0.45 : 1,
        }}
      >
        <AppText>{copy.surpriseMe}</AppText>
      </Pressable>
      <CategorySheet
        open={open}
        level={level}
        language={language}
        copy={copy}
        selectedId={category}
        onClose={() => {
          setOpen(false);
        }}
        onSelect={onSelect}
      />
    </View>
  );
}
