import type { Challenge, Language, Level } from '../game/model';
import { countryName } from './catalog';
import { messages } from './messages';
export function clubCountNoun(level: Level, language: Language) {
  return language === 'en' ? `${level} clubs` : `${level} ${level === 10 ? 'أندية' : 'ناديًا'}`;
}
export function challengeParts(challenge: Challenge, language: Language) {
  const scope = challenge.scope;
  const count = clubCountNoun(challenge.target, language);
  const name = language === 'en' ? `Name ${count}` : `اذكر ${count}`;
  switch (scope.kind) {
    case 'world':
      return {
        prefix: language === 'en' ? 'Name ' : 'اذكر ',
        focus: count,
        suffix: '.',
        lineBreak: false,
      };
    case 'country':
      return {
        prefix: `${name}${language === 'en' ? ' from ' : ' من '}`,
        focus: countryName(scope.country, language),
        suffix: '.',
        lineBreak: true,
      };
    case 'region':
      return {
        prefix: `${name}${language === 'en' ? ' from ' : ' من '}`,
        focus: messages[language].regions[scope.region],
        suffix: '.',
        lineBreak: true,
      };
    case 'letter':
      return {
        prefix: `${name}${language === 'en' ? ' starting with ' : ' تبدأ بحرف '}`,
        focus: scope.letter.toUpperCase(),
        suffix: '.',
        lineBreak: true,
      };
    default: {
      const exhaustive: never = scope;
      return exhaustive;
    }
  }
}
export function challengeLabel(challenge: Challenge, language: Language) {
  const parts = challengeParts(challenge, language);
  return `${parts.prefix}${parts.focus}${parts.suffix}`;
}
export function categoryLabel(challenge: Challenge, language: Language) {
  const scope = challenge.scope;
  switch (scope.kind) {
    case 'world':
      return messages[language].allClubs;
    case 'country':
      return countryName(scope.country, language);
    case 'region':
      return messages[language].regions[scope.region];
    case 'letter':
      return language === 'en'
        ? `Starting with ${scope.letter.toUpperCase()}`
        : `حرف ${scope.letter.toUpperCase()}`;
    default: {
      const exhaustive: never = scope;
      return exhaustive;
    }
  }
}
