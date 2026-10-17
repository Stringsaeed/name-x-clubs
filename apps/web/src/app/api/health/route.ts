import { routes } from '../../../server/runtime';

export const dynamic = 'force-dynamic';

/** Runs `SELECT 1` through the runtime: `{ db: 'ok' }`, or 503 when the database is unreachable. */
export function GET() {
  return routes.health();
}
