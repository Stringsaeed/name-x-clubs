import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { Crypto, Effect, Layer } from 'effect';

/** Effect's `Crypto` service backed by `node:crypto`. Ids use its Clock-based UUIDv7. */
export const NodeCryptoLayer = Layer.succeed(Crypto.Crypto)(
  Crypto.make({
    randomBytes: (size) => new Uint8Array(randomBytes(size)),
    digest: (algorithm, data) =>
      Effect.sync(() => {
        const nodeAlgorithm = algorithm.replace('-', '').toLowerCase();

        return new Uint8Array(createHash(nodeAlgorithm).update(data).digest());
      }),
  }),
);

/** Lowercase hex SHA-256 of a UTF-8 string. */
export function sha256Hex(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
