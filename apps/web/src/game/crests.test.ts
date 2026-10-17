import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'vitest';
import { z } from 'zod';
import { clubCrests, clubs } from '../content/catalog';

const sourcesSchema = z.object({
  clubs: z.record(
    z.string(),
    z.object({
      name: z.string(),
      file: z.string(),
      url: z.url(),
      sha256: z.string(),
      providerName: z.string(),
      provider: z.string(),
      derivedFrom: z.object({
        sha256: z.string().length(64),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        transform: z.string(),
      }),
    }),
  ),
});

// Lossy, lossless and extended WebP headers store the canvas size at different offsets.
function readWebpCanvasSize(bytes: Buffer) {
  const format = bytes.subarray(12, 16).toString();
  if (format === 'VP8X') {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  if (format === 'VP8L') {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}

test('every club crest has the correct identity, optimized local image and source record', async () => {
  const root = resolve('public/assets/crests');
  const { clubs: sources } = sourcesSchema.parse(
    JSON.parse(await readFile(join(root, 'sources.json'), 'utf8')),
  );

  const clubsWithCrest = clubs.filter((club) => clubCrests[club.id] !== undefined);

  assert.equal(
    Object.keys(clubCrests).length,
    clubsWithCrest.length,
    'a crest for an unknown club',
  );
  assert.equal(Object.keys(sources).length, clubsWithCrest.length, 'a source for an unknown club');

  for (const club of clubsWithCrest) {
    const source = sources[club.id];
    assert.ok(source);
    assert.equal(source.name, club.name);
    assert.equal(clubCrests[club.id], `/assets/crests/${source.file}`);
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.providerName && source.provider);

    const bytes = await readFile(join(root, source.file));
    assert.ok(bytes.length > 100 && bytes.length < 20000, club.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, club.name);
    assert.ok(source.file.endsWith('.webp'), club.name);
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', club.name);
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', club.name);
    assert.deepEqual(readWebpCanvasSize(bytes), { width: 64, height: 64 }, club.name);
    assert.ok(source.derivedFrom.width >= 32 && source.derivedFrom.height >= 32, club.name);
  }
});
