import type { Language } from '@nxc/game/model';

export type Weight = 500 | 600 | 700 | 800 | 900 | 1000;

export const fontAssets: Record<string, number> = {
  'Nunito-Medium': require('../../assets/fonts/Nunito-Medium.ttf'),
  'Nunito-SemiBold': require('../../assets/fonts/Nunito-SemiBold.ttf'),
  'Nunito-Bold': require('../../assets/fonts/Nunito-Bold.ttf'),
  'Nunito-ExtraBold': require('../../assets/fonts/Nunito-ExtraBold.ttf'),
  'Nunito-Black': require('../../assets/fonts/Nunito-Black.ttf'),
  'Nunito-ExtraBlack': require('../../assets/fonts/Nunito-ExtraBlack.ttf'),
  'AlanSans-Medium': require('../../assets/fonts/AlanSans-Medium.ttf'),
  'AlanSans-SemiBold': require('../../assets/fonts/AlanSans-SemiBold.ttf'),
  'AlanSans-Bold': require('../../assets/fonts/AlanSans-Bold.ttf'),
  'AlanSans-ExtraBold': require('../../assets/fonts/AlanSans-ExtraBold.ttf'),
  'AlanSans-Black': require('../../assets/fonts/AlanSans-Black.ttf'),
};

const nunito: Readonly<Record<Weight, string>> = {
  500: 'Nunito-Medium',
  600: 'Nunito-SemiBold',
  700: 'Nunito-Bold',
  800: 'Nunito-ExtraBold',
  900: 'Nunito-Black',
  1000: 'Nunito-ExtraBlack',
};

// Alan Sans stops at Black, so the heaviest weight shares it.
const alanSans: Readonly<Record<Weight, string>> = {
  500: 'AlanSans-Medium',
  600: 'AlanSans-SemiBold',
  700: 'AlanSans-Bold',
  800: 'AlanSans-ExtraBold',
  900: 'AlanSans-Black',
  1000: 'AlanSans-Black',
};

/**
 * The static family for a language and weight. Pass `'en'` for digits, times and the brand:
 * Nunito keeps Latin numerals in both languages.
 */
export function fontFamily(language: Language, weight: Weight): string {
  return language === 'ar' ? alanSans[weight] : nunito[weight];
}
