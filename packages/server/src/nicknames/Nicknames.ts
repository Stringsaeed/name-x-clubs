import { createHash } from 'node:crypto';
import { Context, Layer } from 'effect';
import { adjectives, type NicknameWord, nouns } from './words';

export type Nickname = Readonly<{ en: string; ar: string }>;

/** Crockford base32: no I, L, O or U, so a tag never reads as a word or a confusable digit. */
const tagAlphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const tagLength = 4;

function pick(words: readonly NicknameWord[], value: number): NicknameWord {
  const word = words[value % words.length];

  if (!word) {
    throw new Error('Nickname word lists must not be empty');
  }

  return word;
}

function tagFrom(bytes: Uint8Array) {
  let tag = '';

  for (let index = 0; index < tagLength; index++) {
    tag += tagAlphabet[(bytes[index] ?? 0) % tagAlphabet.length];
  }

  return tag;
}

/**
 * The same player id always gives the same nickname. English puts the adjective first ("Swift
 * Striker #4F2A"); Arabic puts it after the noun ("مهاجم سريع #4F2A"). Both share one tag.
 */
export function nicknameFor(playerId: string): Nickname {
  const digest = createHash('sha256').update(playerId, 'utf8').digest();
  const adjective = pick(adjectives, digest.readUInt16BE(0));
  const noun = pick(nouns, digest.readUInt16BE(2));
  const tag = tagFrom(digest.subarray(4));

  return {
    en: `${adjective.en} ${noun.en} #${tag}`,
    ar: `${noun.ar} ${adjective.ar} #${tag}`,
  };
}

export class Nicknames extends Context.Service<
  Nicknames,
  { forPlayer(playerId: string): Nickname }
>()('nxc/server/Nicknames') {
  static readonly layer = Layer.succeed(Nicknames)({ forPlayer: nicknameFor });
}
