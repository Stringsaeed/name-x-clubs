import { routes } from '../../../server/runtime';

export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  return routes.startRound(request);
}
