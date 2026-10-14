import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'vitest';
import { z } from 'zod';
import { clubCrests, clubs } from '../content/catalog';

test('every club crest has the correct identity, local image and source record', async () => {
  const root = resolve('public/assets/crests');
  const { clubs: sources } = z
    .object({
      clubs: z.record(
        z.string(),
        z.object({
          name: z.string(),
          file: z.string(),
          url: z.url(),
          sha256: z.string(),
          providerName: z.string(),
          provider: z.string(),
        }),
      ),
    })
    .parse(JSON.parse(await readFile(join(root, 'sources.json'), 'utf8')));
  assert.equal(Object.keys(clubCrests).length, clubs.length);
  for (const club of clubs) {
    const source = sources[club.id];
    assert.ok(source);
    assert.equal(source.name, club.name);
    assert.equal(clubCrests[club.id], `/assets/crests/${source.file}`);
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.providerName && source.provider);
    const bytes = await readFile(join(root, source.file));
    assert.ok(bytes.length > 100 && bytes.length < 250000, club.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, club.name);
    if (source.file.endsWith('.png')) {
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG', club.name);
      assert.ok(bytes.readUInt32BE(16) >= 32 && bytes.readUInt32BE(20) >= 32, club.name);
    } else {
      assert.ok(source.file.endsWith('.webp'), club.name);
      assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', club.name);
    }
  }
});
