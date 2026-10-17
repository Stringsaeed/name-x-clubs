import { expect, test } from 'vitest';
import { lookupKeys, normalize, stripClubNoise } from './normalize';

test('normalize folds case, accents, punctuation and spacing', () => {
  expect(normalize('  Atlético   MADRID!! ')).toBe('atletico madrid');
  expect(normalize("Newell's Old Boys")).toBe('newells old boys');
  expect(normalize('M.U.F.C.')).toBe('mufc');
  expect(normalize('Brighton & Hove Albion')).toBe('brighton hove albion');
});

test('normalize folds Arabic diacritics, hamza, tatweel, alef maksura and ta marbuta', () => {
  expect(normalize('أَهْلِــي')).toBe('اهلي');
  expect(normalize('تشيلسى')).toBe('تشيلسي');
  expect(normalize('سموحة')).toBe('سموحه');
});

test('normalize leaves nothing of emoji-only or dash-only input', () => {
  expect(normalize('🙂🔥')).toBe('');
  expect(normalize('---')).toBe('');
});

test('stripClubNoise removes FC words, the Arabic club prefix and edge numbers', () => {
  expect(stripClubNoise('arsenal football club')).toBe('arsenal');
  expect(stripClubNoise('نادي الزمالك')).toBe('الزمالك');
  expect(stripClubNoise('123arsenal')).toBe('arsenal');
  expect(stripClubNoise('1 arsenal')).toBe('arsenal');
  expect(stripClubNoise('04')).toBe('04');
});

test('"Arsenal123" strips like "123Arsenal" (L3)', () => {
  expect(stripClubNoise(normalize('Arsenal123'))).toBe('arsenal');
  expect(stripClubNoise(normalize('Arsenal 123'))).toBe('arsenal');
});

test('lookupKeys tries the official form before the stripped one', () => {
  expect(lookupKeys('Los Angeles FC')).toEqual(['los angeles fc', 'los angeles']);
  expect(lookupKeys('وريال مدريد')).toEqual(['وريال مدريد', 'ريال مدريد']);
  expect(lookupKeys('Arsenal')).toEqual(['arsenal']);
});
