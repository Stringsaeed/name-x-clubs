import { type Club, countryName, type Region } from '../../web/src/content/catalog';
import type { AnswerEvent } from '../../web/src/game/engine';
import { challengesForLevel } from '../../web/src/game/engine';
import type { Challenge, Language, Session } from '../../web/src/game/model';
import { formatElapsed } from './engine';

const regions: Record<Language, Record<Region, string>> = {
  en: {
    europe: 'Europe',
    asia: 'Asia',
    africa: 'Africa',
    americas: 'the Americas',
    oceania: 'Oceania',
  },
  ar: {
    europe: 'أوروبا',
    asia: 'آسيا',
    africa: 'أفريقيا',
    americas: 'الأمريكتين',
    oceania: 'أوقيانوسيا',
  },
};

export type Copy = Readonly<{
  freeTime: string;
  practice: string;
  letsPlay: string;
  done: string;
  anotherRound: string;
  shareResult: string;
  surpriseMe: string;
  pickPitch: string;
  randomChallenge: string;
  anywhere: string;
  placeholder: string;
  submit: string;
  youKnowBall: string;
  goodShift: string;
  storage: string;
  modes: string;
  levels: string;
  language: string;
  found: string;
}>;

const english: Copy = {
  freeTime: 'Free time',
  practice: 'Practice',
  letsPlay: 'Let’s play',
  done: 'Done',
  anotherRound: 'Another round',
  shareResult: 'Share result',
  surpriseMe: 'Surprise me',
  pickPitch: 'Pick your pitch',
  randomChallenge: 'A random challenge',
  anywhere: 'Anywhere in the world',
  placeholder: 'Type a club name…',
  submit: 'Submit answer',
  youKnowBall: 'You know ball.',
  goodShift: 'Good shift.',
  storage: 'This phone couldn’t save the round. It stays while the app is open.',
  modes: 'Game modes',
  levels: 'How many clubs',
  language: 'العربية',
  found: 'Your clubs',
};

const arabic: Copy = {
  freeTime: 'وقت حر',
  practice: 'تدرّب',
  letsPlay: 'يلا نلعب',
  done: 'تم',
  anotherRound: 'جولة ثانية',
  shareResult: 'شارك النتيجة',
  surpriseMe: 'فاجئني',
  pickPitch: 'اختر ملعبك',
  randomChallenge: 'تحدٍّ عشوائي',
  anywhere: 'أي مكان في العالم',
  placeholder: 'اكتب اسم نادٍ…',
  submit: 'إرسال الإجابة',
  youKnowBall: 'واضح إنك كروي!',
  goodShift: 'محاولة حلوة.',
  storage: 'الجهاز ما قدر يحفظ الجولة. تبقى طالما التطبيق مفتوح.',
  modes: 'أوضاع اللعب',
  levels: 'عدد الأندية',
  language: 'English',
  found: 'قائمة أنديتك',
};

export function copyFor(language: Language): Copy {
  return language === 'ar' ? arabic : english;
}

export function displayName(club: Club, language: Language) {
  return language === 'ar' ? club.arabic : club.name;
}

function clubNoun(language: Language, count: number) {
  if (language === 'en') {
    return count === 1 ? '1 club' : `${count} clubs`;
  }

  if (count === 1) {
    return 'نادٍ واحد';
  }

  if (count === 2) {
    return 'ناديان';
  }

  if (count <= 10) {
    return `${count} أندية`;
  }

  if (count <= 99) {
    return `${count} ناديًا`;
  }

  return `${count} نادٍ`;
}

export type FocusedLine = Readonly<{ before: string; focus: string; after: string }>;

export function challengeLine(challenge: Challenge, language: Language): FocusedLine {
  const clubs = clubNoun(language, challenge.target);
  const scope = challenge.scope;

  if (language === 'ar') {
    return arabicChallenge(scope, clubs);
  }

  return englishChallenge(scope, clubs);
}

function regionName(language: Language, region: Region) {
  return regions[language][region] ?? region;
}

function englishChallenge(scope: Challenge['scope'], clubs: string): FocusedLine {
  switch (scope.kind) {
    case 'world':
      return { before: 'Name ', focus: clubs, after: '.' };
    case 'country':
      return {
        before: `Name ${clubs} from `,
        focus: countryName(scope.country, 'en'),
        after: '.',
      };
    case 'region':
      return { before: `Name ${clubs} from `, focus: regionName('en', scope.region), after: '.' };
    case 'letter':
      return {
        before: `Name ${clubs} starting with `,
        focus: scope.letter.toUpperCase(),
        after: '.',
      };
  }
}

function arabicChallenge(scope: Challenge['scope'], clubs: string): FocusedLine {
  switch (scope.kind) {
    case 'world':
      return { before: 'اذكر ', focus: clubs, after: '.' };
    case 'country':
      return { before: `اذكر ${clubs} من `, focus: countryName(scope.country, 'ar'), after: '.' };
    case 'region':
      return { before: `اذكر ${clubs} من `, focus: regionName('ar', scope.region), after: '.' };
    case 'letter':
      return { before: `اذكر ${clubs} تبدأ بحرف `, focus: scope.letter.toUpperCase(), after: '.' };
  }
}

export function categoryLabel(challenge: Challenge, language: Language, copy: Copy) {
  const scope = challenge.scope;

  switch (scope.kind) {
    case 'world':
      return copy.anywhere;
    case 'country':
      return countryName(scope.country, language);
    case 'region':
      return regionName(language, scope.region);
    case 'letter':
      return language === 'ar'
        ? `حرف ${scope.letter.toUpperCase()}`
        : `Starting with ${scope.letter.toUpperCase()}`;
  }
}

const kindOrder: Record<Challenge['scope']['kind'], number> = {
  world: 0,
  region: 1,
  country: 2,
  letter: 3,
};

export function practiceChoices(level: Challenge['target'], language: Language) {
  const collator = new Intl.Collator(language);

  return [...challengesForLevel(level)].sort((first, second) => {
    const byKind = kindOrder[first.scope.kind] - kindOrder[second.scope.kind];
    const firstCountry = first.scope.kind === 'country' ? first.scope.country : null;
    const secondCountry = second.scope.kind === 'country' ? second.scope.country : null;

    if (byKind !== 0 || firstCountry === null || secondCountry === null) {
      return byKind;
    }

    return collator.compare(
      countryName(firstCountry, language),
      countryName(secondCountry, language),
    );
  });
}

export function feedbackLine(event: AnswerEvent, language: Language) {
  switch (event.kind) {
    case 'accepted':
      return language === 'ar'
        ? `${displayName(event.club, language)}. إجابة صحيحة!`
        : `${displayName(event.club, language)}. That’s one!`;
    case 'duplicate':
      return language === 'ar'
        ? `${displayName(event.club, language)} موجود في تشكيلتك. جرّب ناديًا ثانيًا.`
        : `${displayName(event.club, language)} is already on your list. Try another club.`;
    case 'wrong-category':
      return language === 'ar'
        ? `${displayName(event.club, language)} نادٍ معروف، لكنه لا يناسب هذا التحدي.`
        : `${displayName(event.club, language)} is a club, but doesn’t fit this challenge.`;
    case 'ambiguous':
      return language === 'ar'
        ? `«${event.input}» ممكن يشير لأكثر من نادٍ. جرّب الاسم الكامل.`
        : `“${event.input}” could mean more than one club. Try the full name.`;
    case 'unknown':
      return language === 'ar'
        ? `ما تعرّفنا على «${event.input}». جرّب الاسم الكامل أو كتابة مختلفة.`
        : `We couldn’t match “${event.input}”. Try the full name or another spelling.`;
  }
}

const squares = 10;

export function shareText(session: Session, language: Language, elapsedLabel: string) {
  const found = session.round.found.length;
  const target = session.challenge.target;
  const filled = Math.round((found / target) * squares);
  const bar = '🟩'.repeat(filled) + '⬜'.repeat(squares - filled);
  const title = session.kind === 'free' ? copyFor(language).freeTime : copyFor(language).practice;
  const line = challengeLine(session.challenge, language);

  return [
    `name × clubs. ${title}`,
    `${line.before}${line.focus}${line.after}`,
    `${bar} ${found}/${target} · ${elapsedLabel}`,
    'https://clubs.saeed.sh',
  ].join('\n');
}

export function resultElapsed(session: Session) {
  return formatElapsed(session.round.phase === 'complete' ? session.round.elapsed : 0);
}
