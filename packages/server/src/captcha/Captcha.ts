import { Context, Effect, Layer } from 'effect';
import type { CaptchaFailed } from '../errors';

/**
 * Checks a captcha token before a round enters a public board. Turnstile is not wired yet: this
 * stub always passes. It only runs when `CAPTCHA_ENABLED` is on (see `ServerConfig`).
 */
export class Captcha extends Context.Service<
  Captcha,
  { verify(token: string | undefined): Effect.Effect<void, CaptchaFailed> }
>()('nxc/server/Captcha') {
  static readonly layerStub = Layer.succeed(Captcha)({ verify: () => Effect.void });
}
