import { Layer } from 'effect';
import type { SqlClient } from 'effect/sql';
import { Captcha } from './captcha/Captcha';
import type { ServerConfig } from './config';
import { NodeCryptoLayer } from './crypto';
import { PlayerStore } from './identity/PlayerStore';
import { Leaderboard } from './leaderboard/Leaderboard';
import { Nicknames } from './nicknames/Nicknames';
import { RateLimit } from './rateLimit/RateLimit';
import { RoundStore } from './rounds/RoundStore';
import { Rounds } from './rounds/Rounds';

const Stores = Layer.mergeAll(
  PlayerStore.layer,
  RoundStore.layer,
  Leaderboard.layer,
  RateLimit.layer,
);

/**
 * Every service the routes use, over a given database and configuration. Production passes the
 * Neon pool and environment config; tests pass PGlite and test settings.
 */
export function appLayer<E1, E2>(
  database: Layer.Layer<SqlClient.SqlClient, E1>,
  config: Layer.Layer<ServerConfig, E2>,
) {
  const base = Layer.mergeAll(
    database,
    config,
    NodeCryptoLayer,
    Nicknames.layer,
    Captcha.layerStub,
  );

  return Rounds.layer.pipe(Layer.provideMerge(Stores), Layer.provideMerge(base));
}
