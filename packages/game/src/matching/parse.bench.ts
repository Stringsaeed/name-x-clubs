import { expect, test } from 'vitest';
import { MAX_ANSWERS_PER_SUBMIT, parseAnswers } from './parse';

function junkPaste(word: (index: number) => string) {
  const parts = Array.from({ length: 2000 }, (_, index) => word(index));

  return parts.join(', ').slice(0, 12_000);
}

function letter(index: number) {
  return String.fromCharCode(97 + (index % 26));
}

const junkPastes = {
  'ten-letter junk words': junkPaste((index) => `qwertyuio${letter(index)}`),
  'near misses of club names': junkPaste((index) => `manchestr unitex${letter(index)}`),
  'one line of junk words': junkPaste((index) => `zx${letter(index)}qv`).replaceAll(',', ''),
};

for (const [label, text] of Object.entries(junkPastes)) {
  test(`a large paste of ${label} (M5)`, async ({ bench }) => {
    let answers = parseAnswers(text);

    await bench('parseAnswers', () => {
      answers = parseAnswers(text);
    }).run();

    expect(answers.length).toBeGreaterThan(0);
    expect(answers.length).toBeLessThanOrEqual(MAX_ANSWERS_PER_SUBMIT);
  });
}
