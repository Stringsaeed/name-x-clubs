import { type NextRequest, NextResponse } from 'next/server';
import { languageCookie, negotiateLocale } from './i18n/negotiate';

/**
 * `/` has no locale segment. The server layout still needs one to load Lingui.
 * A rewrite keeps the browser on the URL it opened. A redirect would change it.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (url.pathname !== '/') {
    return NextResponse.next();
  }

  const locale = negotiateLocale(
    request.cookies.get(languageCookie)?.value,
    request.headers.get('accept-language'),
  );
  url.pathname = `/${locale}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/',
};
