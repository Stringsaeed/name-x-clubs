import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import sharp from 'sharp';

// Shared asset optimisation. Two jobs:
//   - toCrestWebp(): turn an original club badge into the committed 64x64 WebP.
//     Imported by scripts/sync-crests.mjs so `pnpm assets:restore` is deterministic
//     for a given sharp version (pinned in package.json).
//   - `node scripts/optimize-assets.mjs fonts`: subset the variable fonts to woff2.
//     Needs `uv` (uvx) for fonttools + brotli; the generated woff2 files are committed.

export const CREST_SIZE = 64;

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

function squareCrest(bytes) {
  return sharp(bytes).resize(CREST_SIZE, CREST_SIZE, { fit: 'contain', background: transparent });
}

// Flat logos are often smaller lossless; keep whichever encoding is smaller.
export async function toCrestWebp(originalBytes) {
  const { width, height } = await sharp(originalBytes).metadata();
  const lossless = await squareCrest(originalBytes).webp({ lossless: true, effort: 6 }).toBuffer();
  const lossy = await squareCrest(originalBytes)
    .webp({ quality: 82, alphaQuality: 100, effort: 6 })
    .toBuffer();

  return {
    bytes: lossless.length <= lossy.length ? lossless : lossy,
    width,
    height,
  };
}

const fontJobs = [
  {
    input: 'src/fonts/nunito.ttf',
    output: 'src/fonts/nunito.woff2',
    // Basic Latin, Latin-1, General Punctuation, multiplication sign.
    unicodes: 'U+0020-007E,U+00A0-00FF,U+2000-206F,U+00D7',
  },
  {
    input: 'src/fonts/alan-sans.ttf',
    output: 'src/fonts/alan-sans.woff2',
    // Arabic blocks, Arabic-Indic digits, general punctuation, Basic Latin, Latin-1.
    unicodes:
      'U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+0020-007E,U+00A0-00FF,U+2000-206F,U+00D7',
  },
];

function subsetFonts() {
  for (const job of fontJobs) {
    // Variable axes (wght) are kept: pyftsubset preserves fvar/gvar by default.
    execFileSync(
      'uvx',
      [
        '--from',
        'fonttools',
        '--with',
        'brotli',
        'pyftsubset',
        job.input,
        `--unicodes=${job.unicodes}`,
        '--flavor=woff2',
        '--layout-features=*',
        '--no-hinting',
        `--output-file=${job.output}`,
      ],
      { stdio: 'inherit' },
    );
    console.log(`${job.output}: ${statSync(job.output).size} bytes`);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (process.argv[2] === 'fonts') {
    subsetFonts();
  } else {
    console.error('Usage: node scripts/optimize-assets.mjs fonts');
    process.exitCode = 1;
  }
}
