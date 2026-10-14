import type { I18n, MessageDescriptor } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import type { Challenge, Language } from '../game/model';
import { getI18nFor } from '../i18n/instances';
import { countryName } from './catalog';

type Region = Extract<Challenge['scope'], { kind: 'region' }>['region'];

const FOCUS_TAGS = /<\/?focus>/g;

function exhaustive(value: never): never {
  return value;
}

export function clubCountNoun(i18n: I18n, count: number): string {
  return i18n._(msg`${plural(count, { one: '# club', other: '# clubs' })}`);
}

export function regionLabel(i18n: I18n, region: Region): string {
  switch (region) {
    case 'europe':
      return i18n._(msg`Europe`);
    case 'asia':
      return i18n._(msg`Asia`);
    case 'africa':
      return i18n._(msg`Africa`);
    case 'americas':
      return i18n._(msg`the Americas`);
    default:
      return exhaustive(region);
  }
}

/**
 * The challenge sentence as a message with a `<focus>` tag around the part to highlight.
 * Translators can move the tag; render it with `<Trans>` or strip it for plain text.
 */
export function challengeDescriptor(i18n: I18n, challenge: Challenge): MessageDescriptor {
  const scope = challenge.scope;
  const clubs = clubCountNoun(i18n, challenge.target);

  switch (scope.kind) {
    case 'world':
      return msg`Name <focus>${clubs}.</focus>`;
    case 'country': {
      const country = countryName(scope.country, i18n.locale as Language);
      return msg`Name ${clubs} from <focus>${country}.</focus>`;
    }
    case 'region': {
      const region = regionLabel(i18n, scope.region);
      return msg`Name ${clubs} from <focus>${region}.</focus>`;
    }
    case 'letter': {
      const letter = scope.letter.toUpperCase();
      return msg`Name ${clubs} starting with <focus>${letter}.</focus>`;
    }
    default:
      return exhaustive(scope);
  }
}

/** Splits a rendered challenge sentence into the text around and inside its `<focus>` tag. */
export function splitFocus(sentence: string): { before: string; focus: string; after: string } {
  const [before = '', focus = '', after = ''] = sentence.split(FOCUS_TAGS);

  return { before, focus, after };
}

export function challengeText(i18n: I18n, challenge: Challenge): string {
  return i18n._(challengeDescriptor(i18n, challenge)).replace(FOCUS_TAGS, '');
}

/** Plain-text challenge sentence for code outside React (e.g. the share text). */
export function challengeLabel(challenge: Challenge, language: Language): string {
  return challengeText(getI18nFor(language), challenge);
}

export function categoryLabel(i18n: I18n, challenge: Challenge): string {
  const scope = challenge.scope;

  switch (scope.kind) {
    case 'world':
      return i18n._(msg`Anywhere in the world`);
    case 'country':
      return countryName(scope.country, i18n.locale as Language);
    case 'region':
      return regionLabel(i18n, scope.region);
    case 'letter': {
      const letter = scope.letter.toUpperCase();
      return i18n._(msg`Starting with ${letter}`);
    }
    default:
      return exhaustive(scope);
  }
}
