import localFont from 'next/font/local';

export const nunito = localFont({
  src: './nunito.ttf',
  weight: '200 1000',
  style: 'normal',
  variable: '--font-nunito',
  display: 'swap',
  preload: true,
  fallback: ['sans-serif'],
});

export const alanSans = localFont({
  src: './alan-sans.ttf',
  weight: '300 900',
  style: 'normal',
  variable: '--font-alan-sans',
  display: 'swap',
  preload: false,
  fallback: ['sans-serif'],
});
