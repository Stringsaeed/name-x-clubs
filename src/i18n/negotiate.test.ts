import { describe, expect, it } from 'vitest';
import { negotiateLocale } from './negotiate';

describe('negotiateLocale', () => {
  it('prefers a valid cookie', () => {
    expect(negotiateLocale('ar', 'en')).toBe('ar');
    expect(negotiateLocale('en', 'ar')).toBe('en');
  });
  it('ignores an invalid cookie', () => {
    expect(negotiateLocale('fr', 'ar')).toBe('ar');
  });
  it('picks Arabic when its q is highest', () => {
    expect(negotiateLocale(undefined, 'ar-SA,ar;q=0.9,en;q=0.5')).toBe('ar');
    expect(negotiateLocale(null, 'en;q=0.4, ar;q=0.8')).toBe('ar');
  });
  it('picks English when it ranks higher or on missing header', () => {
    expect(negotiateLocale(undefined, 'en-US,en;q=0.9,ar;q=0.8')).toBe('en');
    expect(negotiateLocale(undefined, 'ar;q=0.3, en;q=0.7')).toBe('en');
    expect(negotiateLocale(undefined, null)).toBe('en');
    expect(negotiateLocale(undefined, 'fr,de;q=0.5')).toBe('en');
  });
  it('treats q=0 as unacceptable', () => {
    expect(negotiateLocale(undefined, 'ar;q=0, en;q=0.1')).toBe('en');
  });
});
