import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const webRequire = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const sharp = createRequire(webRequire.resolve('next/package.json'))('sharp');
const output = new URL('./android/', import.meta.url);
const assets = new URL('../../apps/mobile/assets/', import.meta.url);
await mkdir(output, { recursive: true });

const names = ['01-album-card', '02-club-shield', '03-football', '04-name-times-clubs'];
const layers = await Promise.all(
  names.map(async (name) => {
    const source = await readFile(new URL(`./layers/${name}.svg`, import.meta.url), 'utf8');
    return source.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  }),
);
const [card, shield, football, times] = layers;
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><title>Name × Clubs Android icon</title>${body}</svg>`;
const transform = 'translate(512 498) scale(.78) translate(-512 -524)';
const foreground = `<g transform="${transform}">${layers.join('')}</g>`;
const background = '<rect width="1024" height="1024" fill="#123C30"/>';
const whiteCard = card.replaceAll(/#[0-9A-F]{6}/g, '#FFFFFF');
const whiteShield = shield.replace('#D2F571', '#FFFFFF').replace('#E9FFAF', '#000000');
const cutoutBall = football.replaceAll('#163C30', '#FFFFFF').replaceAll('#FFFCED', '#000000');
const cutoutTimes = times.replaceAll('#163C30', '#000000');
const monoMask = `<defs><mask id="mono"><rect width="1024" height="1024" fill="black"/><g transform="${transform}">${whiteCard}${whiteShield}${cutoutBall}${cutoutTimes}</g></mask></defs>`;
const monochrome = `${monoMask}<rect width="1024" height="1024" fill="white" mask="url(#mono)"/>`;

for (const [name, body] of [
  ['foreground', foreground],
  ['background', background],
  ['monochrome', monochrome],
]) {
  const source = svg(body);
  await writeFile(new URL(`${name}.svg`, output), `${source}\n`);
  await sharp(Buffer.from(source))
    .png()
    .toFile(new URL(`android-icon-${name}.png`, assets).pathname);
}

const legacy = svg(`${background}${layers.join('')}`);
await sharp(Buffer.from(legacy)).png().toFile(new URL('android-icon.png', assets).pathname);

const preview = (x, y, shape, body, bg) => {
  const id = `clip-${x}-${y}`;
  const mask =
    shape === 'circle'
      ? '<circle cx="512" cy="512" r="341.333"/>'
      : '<rect x="170.667" y="170.667" width="682.666" height="682.666" rx="164"/>';
  return `<svg x="${x}" y="${y}" width="200" height="200" viewBox="170.667 170.667 682.666 682.666"><defs><clipPath id="${id}">${mask}</clipPath></defs><g clip-path="url(#${id})"><rect width="1024" height="1024" fill="${bg}"/>${body}</g></svg>`;
};
const themed = (color) =>
  `${monoMask}<rect width="1024" height="1024" fill="${color}" mask="url(#mono)"/>`;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="320" viewBox="0 0 1000 320"><rect width="1000" height="320" rx="24" fill="#F5F3EA"/>${preview(34, 34, 'circle', foreground, '#123C30')}${preview(278, 34, 'squircle', foreground, '#123C30')}${preview(522, 34, 'circle', themed('#244C3F'), '#D4E8C5')}${preview(766, 34, 'squircle', themed('#CEE5B8'), '#19382E')}<g font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="#163C30"><text x="134" y="278">Circle</text><text x="378" y="278">Squircle</text><text x="622" y="278">Themed light</text><text x="866" y="278">Themed dark</text></g></svg>`;
await sharp(Buffer.from(sheet)).png().toFile(new URL('preview.png', output).pathname);

const { data, info } = await sharp(new URL('android-icon-foreground.png', assets).pathname)
  .raw()
  .toBuffer({ resolveWithObject: true });
const inset = Math.ceil((1024 * 21) / 108);
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (x < inset || x >= 1024 - inset || y < inset || y >= 1024 - inset) {
      if (data[(y * info.width + x) * info.channels + 3] !== 0) {
        throw new Error(`Foreground extends outside the 66dp safe zone at ${x},${y}`);
      }
    }
  }
}
