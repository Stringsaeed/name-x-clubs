import { routes } from '../../../../server/runtime';

/** Rendered per request; the CDN caches the response from its `s-maxage` header. */
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ mode: string }> }) {
  const { mode } = await context.params;

  return routes.leaderboard(request, mode);
}
