import { routes } from '../../../../server/runtime';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return routes.resumeRound(request, id);
}
