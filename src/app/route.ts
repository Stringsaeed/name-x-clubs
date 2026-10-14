import { NextResponse } from 'next/server';
import { languageCookie, negotiateLocale } from '../i18n/negotiate';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const cookies = request.headers.get('cookie') ?? '';
  const stored = cookies
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === languageCookie)?.[1];
  const locale = negotiateLocale(stored, request.headers.get('accept-language'));
  const response = NextResponse.redirect(new URL(`/${locale}`, request.url), 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie, Accept-Language');
  return response;
}
