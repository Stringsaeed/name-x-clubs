import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { clubs } from '../dist/clubs.js';

// Download only the reviewed club-to-source mappings. Never guess a club's badge
// from a similar name: several clubs share names in different countries.
const root = new URL('../dist/assets/crests/', import.meta.url);
const manifestPath = new URL('sources.json', root);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sources = manifest.clubs;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(root, { recursive: true });
const queue = clubs.map(club => {
  const source = sources[club.id];
  if (!source || source.name !== club.name) throw new Error(`Missing reviewed source for ${club.name}`);
  return { club, source };
});
const errors = [];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const { club, source } = queue.shift();
    try {
      if (source.file && source.sha256 && !process.argv.includes('--refresh')) {
        try { if (sha256(await readFile(new URL(source.file, root))) === source.sha256) continue; } catch {}
      }
      let url = new URL(source.url);
      if (url.hostname === 'a.espncdn.com') {
        url = new URL('https://a.espncdn.com/combiner/i');
        url.search = new URLSearchParams({ img: new URL(source.url).pathname, w: '96', h: '96' });
      }
      if (!['a.espncdn.com', 'thumb.wikimedia.org', 'upload.wikimedia.org'].includes(url.hostname)) throw new Error('Unreviewed image host');
      let bytes;
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
        if (response.status === 429 && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 5000)); continue; }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        bytes = Buffer.from(await response.arrayBuffer());
        break;
      }
      if (!bytes || bytes.length > 250000) throw new Error('Invalid image size');
      const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const webp = bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
      if (!png && !webp) throw new Error('Expected PNG or WebP artwork');
      source.file = `${club.id}.${png ? 'png' : 'webp'}`;
      source.sha256 = sha256(bytes);
      await writeFile(new URL(source.file, root), bytes);
    } catch (error) { errors.push({ club: club.name, error: String(error) }); }
  }
}));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
if (errors.length) { console.error(JSON.stringify(errors)); process.exitCode = 1; }
else {
  const paths = Object.fromEntries(clubs.map(c => [c.id, `./assets/crests/${sources[c.id].file}`]));
  await writeFile(new URL('../dist/crests.js', import.meta.url), `// Bundled crests; reviewed provenance is in assets/crests/sources.json.\nexport const clubCrests = ${JSON.stringify(paths, null, 2)};\n`);
  console.log(`Verified and bundled ${clubs.length} club crests.`);
}
