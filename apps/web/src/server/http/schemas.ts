import 'server-only';
import { Schema } from 'effect';
import { locales } from '../../i18n/config';
import { periods } from '../leaderboard/Leaderboard';
import { rankedModes } from '../rounds/modes';

/** A ranked entry is one line from the composer, not a pasted list. */
export const maxEntryLength = 120;

export const maxEntriesPerRequest = 10;

const ClientMs = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 2_147_483_647 }));

export const StartBody = Schema.Struct({
  mode: Schema.Literals(rankedModes),
  lang: Schema.Literals(locales),
});

export const AnswersBody = Schema.Struct({
  seq: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  entries: Schema.Array(
    Schema.Struct({
      text: Schema.String.check(Schema.isMaxLength(maxEntryLength)),
      clientMs: ClientMs,
    }),
  ).check(Schema.isBetweenLength(1, maxEntriesPerRequest)),
});

export const FinishBody = Schema.Struct({
  captchaToken: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048))),
  lang: Schema.optionalKey(Schema.Literals(locales)),
});

/** `GET /api/rounds/:id?lang=` names the player in `lang`; without it, in the round's language. */
export const ResumeQuery = Schema.Struct({
  lang: Schema.optionalKey(Schema.Literals(locales)),
});

export const RoundId = Schema.String.check(Schema.isUUID());

export const BoardMode = Schema.Literals(rankedModes);

export const BoardQuery = Schema.Struct({
  period: Schema.Literals(periods),
  lang: Schema.Literals(locales),
});
