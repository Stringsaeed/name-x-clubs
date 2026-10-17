import { useState } from 'react';
import { Pressable, Share, TextInput, View } from 'react-native';
import type { AnswerEvent } from '../../../web/src/game/engine';
import type { Language, Session } from '../../../web/src/game/model';
import { type Copy, feedbackLine, resultElapsed, shareText } from '../copy';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';

export function Composer({
  session,
  language,
  copy,
  feedback,
  onStart,
  onSubmit,
  onRestart,
}: {
  session: Session;
  language: Language;
  copy: Copy;
  feedback: readonly AnswerEvent[];
  onStart: () => void;
  onSubmit: (text: string) => void;
  onRestart: () => void;
}) {
  const [draft, setDraft] = useState('');
  const phase = session.round.phase;

  if (phase === 'complete') {
    const won = session.round.found.length === session.challenge.target;

    return (
      <View style={{ gap: 10 }}>
        <AppText style={{ fontSize: 22 }}>{won ? copy.youKnowBall : copy.goodShift}</AppText>
        <AppText style={{ color: colors.muted }}>
          {session.round.found.length}/{session.challenge.target} · {resultElapsed(session)}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.shareResult}
            onPress={() => {
              const message = shareText(session, language, resultElapsed(session));

              void Share.share({ message }).catch(() => undefined);
            }}
            style={secondaryButton}
          >
            <AppText>{copy.shareResult}</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onRestart} style={primaryButton}>
            <AppText style={{ color: colors.onAccent }}>{copy.anotherRound}</AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {feedback.map((event) => (
        <AppText key={`${event.kind}:${event.input}`} style={{ color: colors.warning }}>
          {feedbackLine(event, language)}
        </AppText>
      ))}
      {phase === 'idle' ? (
        <Pressable accessibilityRole="button" onPress={onStart} style={primaryButton}>
          <AppText style={{ color: colors.onAccent, fontSize: 18 }}>{copy.letsPlay}</AppText>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={copy.placeholder}
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            autoCapitalize="words"
            spellCheck={false}
            returnKeyType="send"
            onSubmitEditing={() => {
              submitDraft(draft, setDraft, onSubmit);
            }}
            accessibilityLabel={copy.placeholder}
            style={{
              flex: 1,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.white,
              color: colors.ink,
              fontFamily: fonts[language],
              fontSize: 17,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.submit}
            onPress={() => {
              submitDraft(draft, setDraft, onSubmit);
            }}
            style={primaryButton}
          >
            <AppText style={{ color: colors.onAccent }}>{copy.submit}</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function submitDraft(
  draft: string,
  setDraft: (value: string) => void,
  onSubmit: (text: string) => void,
) {
  const text = draft.trim();

  if (text.length === 0) {
    return;
  }

  onSubmit(text);
  setDraft('');
}

const primaryButton = {
  backgroundColor: colors.lime,
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const secondaryButton = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.line,
  paddingHorizontal: 16,
  paddingVertical: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
