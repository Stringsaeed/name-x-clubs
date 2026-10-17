import { msg } from '@lingui/core/macro';
import type { Language, Session } from '@nxc/game/model';
import { challengeLabel } from '../../content/labels';
import { getI18nFor } from '../../i18n/instances';

export type ShareOutcome =
  | { kind: 'shared' | 'copied' | 'cancelled' }
  | { kind: 'manual'; text: string };

export type ShareTarget = Pick<Window, 'navigator' | 'matchMedia'>;

const progressSquares = 10;

const freeTimeTitle = msg`Free time`;

const practiceTitle = msg({ message: 'Practice', context: 'game mode tab' });

function sessionTitle(session: Session, language: Language) {
  const descriptor = session.kind === 'free' ? freeTimeTitle : practiceTitle;

  return getI18nFor(language)._(descriptor);
}

function progressBar(found: number, target: number) {
  const filled = Math.round((found / target) * progressSquares);

  return '🟩'.repeat(filled) + '⬜'.repeat(progressSquares - filled);
}

export type ShareTextInput = Readonly<{
  session: Session;
  language: Language;
  elapsedLabel: string;
  origin: string;
}>;

export function buildShareText({ session, language, elapsedLabel, origin }: ShareTextInput) {
  const found = session.round.found.length;
  const target = session.challenge.target;

  return [
    `name × clubs. ${sessionTitle(session, language)}`,
    challengeLabel(session.challenge, language),
    `${progressBar(found, target)} ${found}/${target} · ${elapsedLabel}`,
    origin,
  ].join('\n');
}

function isUserCancel(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Uses the native share sheet on touch devices, the clipboard elsewhere, and manual copy as a fallback. */
export async function deliverShare(
  target: ShareTarget | null,
  text: string,
): Promise<ShareOutcome> {
  try {
    if (target?.navigator.share && target.matchMedia('(pointer: coarse)').matches) {
      await target.navigator.share({ title: 'Name × Clubs', text });

      return { kind: 'shared' };
    }

    if (!target?.navigator.clipboard) {
      return { kind: 'manual', text };
    }

    await target.navigator.clipboard.writeText(text);

    return { kind: 'copied' };
  } catch (error) {
    if (isUserCancel(error)) {
      return { kind: 'cancelled' };
    }

    return { kind: 'manual', text };
  }
}
