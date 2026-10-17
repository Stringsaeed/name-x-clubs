/** Serves the API locally on Node: `pnpm dev` or `pnpm start` in `apps/api`. */
import { serve } from '@hono/node-server';
import { app } from './app';

const port = Number(process.env.PORT ?? 4100);
const hostname = '127.0.0.1';

serve({ fetch: app.fetch, port, hostname }, () => {
  console.log(`API listening on http://${hostname}:${port}`);
});
