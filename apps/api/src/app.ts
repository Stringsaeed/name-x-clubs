/**
 * The ranked API: each route forwards the standard `Request` to `@nxc/server` and returns its
 * `Response` unchanged. The paths are the ones the browser calls, so the site's `/api/*` rewrite
 * reaches them as they are.
 */
import { routes } from '@nxc/server/runtime';
import { Hono } from 'hono';

export const app = new Hono();

app.post('/api/rounds', (c) => routes.startRound(c.req.raw));
app.get('/api/rounds/:id', (c) => routes.resumeRound(c.req.raw, c.req.param('id')));
app.post('/api/rounds/:id/answers', (c) => routes.submitAnswers(c.req.raw, c.req.param('id')));
app.post('/api/rounds/:id/finish', (c) => routes.finishRound(c.req.raw, c.req.param('id')));
app.get('/api/leaderboards/:mode', (c) => routes.leaderboard(c.req.raw, c.req.param('mode')));
app.get('/api/leaderboards/:mode/me', (c) => routes.myStanding(c.req.raw, c.req.param('mode')));
app.get('/api/health', () => routes.health());

app.notFound((c) => c.json({ error: 'NotFound' }, 404));
