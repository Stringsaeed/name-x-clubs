import { Config, Context, Effect, Layer } from 'effect';

export type ServerSettings = Readonly<{
  /** Adds `Secure` to the session cookie on HTTPS requests. True in production. */
  secureCookies: boolean;
  /** When on, a completed round waits at `complete` until `finish` passes the captcha. */
  captchaEnabled: boolean;
  /** Extra origins allowed to POST, besides the request's own origin. */
  allowedOrigins: readonly string[];
  /** Keys the daily IP hash used in rate-limit keys. IPs are never stored in the clear. */
  rateLimitSecret: string;
}>;

function splitOrigins(value: string) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
}

const developmentRateLimitSecret = 'nxc-dev-only';

const settingsConfig = Config.all({
  nodeEnv: Config.String('NODE_ENV').pipe(Config.withDefault('development')),
  captchaEnabled: Config.Boolean('CAPTCHA_ENABLED').pipe(Config.withDefault(false)),
  allowedOrigins: Config.String('ALLOWED_ORIGINS').pipe(Config.withDefault('')),
  rateLimitSecret: Config.String('RATE_LIMIT_SECRET').pipe(
    Config.withDefault(developmentRateLimitSecret),
  ),
});

export class ServerConfig extends Context.Service<ServerConfig, ServerSettings>()(
  'nxc/server/ServerConfig',
) {
  static readonly layer = Layer.effect(
    ServerConfig,
    Effect.flatMap(settingsConfig, (settings) => {
      const production = settings.nodeEnv === 'production';

      // Fail closed: a production deploy must never hash IPs with the public dev key.
      if (production && settings.rateLimitSecret === developmentRateLimitSecret) {
        return Effect.die(new Error('RATE_LIMIT_SECRET must be set in production'));
      }

      return Effect.succeed(
        ServerConfig.of({
          secureCookies: production,
          captchaEnabled: settings.captchaEnabled,
          allowedOrigins: splitOrigins(settings.allowedOrigins),
          rateLimitSecret: settings.rateLimitSecret,
        }),
      );
    }),
  );

  static readonly layerTest = (overrides: Partial<ServerSettings> = {}) =>
    Layer.succeed(ServerConfig)({
      secureCookies: false,
      captchaEnabled: false,
      allowedOrigins: [],
      rateLimitSecret: 'test-secret',
      ...overrides,
    });
}
