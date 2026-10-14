/**
 * The game's matching and scoring rules. The implementation lives in `./matching`; this module
 * keeps one import path for the rest of the app.
 */
export { clubs, countries } from '../content/catalog';
export { challengesForLevel } from './matching/challenges';
export { normalize } from './matching/normalize';
export { MAX_ANSWERS_PER_SUBMIT, parseAnswers } from './matching/parse';
export { resolveClub } from './matching/resolve';
export { eligibleClubs } from './matching/scope';
export { scoreAnswers } from './matching/scoring';
export type { AnswerEvent, ParsedAnswer, Resolution } from './matching/types';
export { levels } from './model';
