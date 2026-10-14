import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import clubs from '../src/content/clubs.json' with { type: 'json' };
import { CREST_SIZE, toCrestWebp } from './optimize-assets.mjs';

// Download only the reviewed club-to-source mappings. Never guess a club's badge
// from a similar name: several clubs share names in different countries.
//
// The committed artifact is a 64x64 WebP derived from the original badge. sources.json
// keeps the original source URL and records `derivedFrom` (sha256 and size of the
// original bytes), so the original can be re-downloaded, verified and re-encoded.
const root = new URL('../public/assets/crests/', import.meta.url);
const manifestPath = new URL('sources.json', root);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sources = manifest.clubs;
const refresh = process.argv.includes('--refresh');
const allowedHosts = ['a.espncdn.com', 'thumb.wikimedia.org', 'upload.wikimedia.org'];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isPng(bytes) {
  return bytes.subarray(0, 8).equals(pngSignature);
}

function isWebp(bytes) {
  return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}

async function readIfPresent(fileName) {
  try {
    return await readFile(new URL(fileName, root));
  } catch {
    return undefined;
  }
}

function resolveDownloadUrl(sourceUrl) {
  const url = new URL(sourceUrl);
  if (!allowedHosts.includes(url.hostname)) {
    throw new Error('Unreviewed image host');
  }
  if (url.hostname !== 'a.espncdn.com') {
    return url;
  }

  const sized = new URL('https://a.espncdn.com/combiner/i');
  sized.search = new URLSearchParams({ img: url.pathname, w: '96', h: '96' });
  return sized;
}

async function download(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error('Download failed');
}

async function fetchOriginal(source) {
  // A legacy entry still has the original file on disk; reuse it when it matches.
  const legacyBytes = source.derivedFrom ? undefined : await readIfPresent(source.file);
  if (legacyBytes && sha256(legacyBytes) === source.sha256) {
    return { bytes: legacyBytes, sha256: source.sha256 };
  }

  const bytes = await download(resolveDownloadUrl(source.url));
  if (bytes.length > 250000) {
    throw new Error('Invalid image size');
  }
  if (!isPng(bytes) && !isWebp(bytes)) {
    throw new Error('Expected PNG or WebP artwork');
  }

  const hash = sha256(bytes);
  if (source.derivedFrom && !refresh && hash !== source.derivedFrom.sha256) {
    throw new Error('Source artwork changed; rerun with --refresh to accept it');
  }
  return { bytes, sha256: hash };
}

async function isUpToDate(source, targetFile) {
  if (refresh || source.file !== targetFile || !source.sha256 || !source.derivedFrom) {
    return false;
  }
  const existing = await readIfPresent(source.file);
  return Boolean(existing) && sha256(existing) === source.sha256;
}

async function syncClub(club, source) {
  const targetFile = `${club.id}.webp`;
  if (await isUpToDate(source, targetFile)) {
    return;
  }

  const original = await fetchOriginal(source);
  const crest = await toCrestWebp(original.bytes);
  const previousFile = source.file;

  await writeFile(new URL(targetFile, root), crest.bytes);
  source.file = targetFile;
  source.sha256 = sha256(crest.bytes);
  source.derivedFrom = {
    sha256: original.sha256,
    width: crest.width,
    height: crest.height,
    transform: `sharp contain ${CREST_SIZE}x${CREST_SIZE} webp`,
  };

  if (previousFile && previousFile !== targetFile) {
    await unlink(new URL(previousFile, root)).catch(() => {});
  }
}

await mkdir(root, { recursive: true });

const queue = clubs.map((club) => {
  const source = sources[club.id];
  if (!source || source.name !== club.name) {
    throw new Error(`Missing reviewed source for ${club.name}`);
  }
  return { club, source };
});
const errors = [];

async function worker() {
  while (queue.length) {
    const { club, source } = queue.shift();
    try {
      await syncClub(club, source);
    } catch (error) {
      errors.push({ club: club.name, error: String(error) });
    }
  }
}

await Promise.all(Array.from({ length: 4 }, worker));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (errors.length) {
  console.error(JSON.stringify(errors));
  process.exitCode = 1;
} else {
  const paths = Object.fromEntries(
    clubs.map((club) => [club.id, `/assets/crests/${sources[club.id].file}`]),
  );
  await writeFile(
    new URL('../src/content/crests.json', import.meta.url),
    `${JSON.stringify(paths, null, 2)}\n`,
  );
  console.log(`Verified and bundled ${clubs.length} club crests.`);
}
