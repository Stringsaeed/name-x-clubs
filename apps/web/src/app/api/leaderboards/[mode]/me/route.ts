import { routes } from '../../../../../server/runtime';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ mode: string }> }) {
  const { mode } = await context.params;

  return routes.myStanding(request, mode);
}
