import 'server-only';
import { Effect, Option, Schema } from 'effect';

/**
 * Decodes query rows with a schema. A row that does not match is a bug in our SQL, not a request
 * error, so it becomes a defect.
 *
 * Both drivers return camelCase names (`transformResultNames`). Cast numbers in SQL (`::int4`,
 * `::float8`): `@effect/sql-pg` decodes `int8` and `count(*)` as `bigint`, PGlite as `number`.
 */
export function decodeRows<A>(row: Schema.Decoder<A>) {
  const decode = Schema.decodeUnknownEffect(Schema.Array(row));

  return (rows: readonly unknown[]): Effect.Effect<readonly A[]> => Effect.orDie(decode(rows));
}

export function decodeFirstRow<A>(row: Schema.Decoder<A>) {
  const decode = decodeRows(row);

  return (rows: readonly unknown[]): Effect.Effect<Option.Option<A>> =>
    Effect.map(decode(rows.slice(0, 1)), (decoded) => Option.fromNullishOr(decoded[0]));
}

/** Club ids and flags are stored as JSON arrays; the parameter is cast with `::jsonb`. */
export function jsonParam(value: unknown) {
  return JSON.stringify(value);
}
