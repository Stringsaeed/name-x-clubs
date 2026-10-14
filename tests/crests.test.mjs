import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { clubs } from '../dist/clubs.js';
import { clubCrests } from '../dist/crests.js';

test('every club crest has the correct identity, local image and source record', async () => {
  const root = new URL('../dist/assets/crests/', import.meta.url);
  const { clubs: sources } = JSON.parse(await readFile(new URL('sources.json', root), 'utf8'));
  assert.equal(Object.keys(clubCrests).length, clubs.length);
  for (const club of clubs) {
    const source = sources[club.id];
    assert.equal(source.name, club.name);
    assert.equal(clubCrests[club.id], `./assets/crests/${source.file}`);
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.providerName && source.provider);
    const bytes = await readFile(new URL(source.file, root));
    assert.ok(bytes.length > 100 && bytes.length < 250000, club.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, club.name);
    if (source.file.endsWith('.png')) {
      assert.equal(bytes.subarray(1,4).toString(), 'PNG', club.name);
      assert.ok(bytes.readUInt32BE(16) >= 32 && bytes.readUInt32BE(20) >= 32, club.name);
    } else {
      assert.ok(source.file.endsWith('.webp'), club.name);
      assert.equal(bytes.subarray(8,12).toString(), 'WEBP', club.name);
    }
  }
});
