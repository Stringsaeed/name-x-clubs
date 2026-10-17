import { type NextRequest, NextResponse } from 'next/server';
import { languageCookie, negotiateLocale } from './i18n/negotiate';
import { apiOrigin } from './lib/api';

/**
 * Two rewrites, both read at request time:
 *
 * - `/api/*` goes to the API service at `API_ORIGIN`. This only matters locally: on Vercel the
 *   top-level service rewrite in `vercel.json` routes `/api` before Next.js sees the request.
 * - `/` has no locale segment. The server layout still needs one to load Lingui. A rewrite keeps
 *   the browser on the URL it opened. A redirect would change it.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (url.pathname.startsWith('/api/')) {
    return NextResponse.rewrite(new URL(`${url.pathname}${url.search}`, apiOrigin()));
  }

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
  matcher: ['/', '/api/:path*'],
};
