// Copies the ffmpeg.wasm browser files from node_modules into docs/vendor so the
// PWA is self-contained and works offline. Run after upgrading @ffmpeg/*.
import {copyFileSync, mkdirSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules', '@ffmpeg');
const out = join(root, 'docs', 'vendor');

// The worker chunk name (e.g. 814.ffmpeg.js) is generated and can change between
// versions, so find whichever *.ffmpeg.js sits next to the main bundle.
const umd = join(nm, 'ffmpeg/dist/umd');
const worker = readdirSync(umd).find((f) => /\.ffmpeg\.js$/.test(f) && f !== 'ffmpeg.js');
if (!worker) throw new Error('Could not find the ffmpeg worker chunk in ' + umd);

const files = [
  ['ffmpeg/dist/umd/ffmpeg.js', 'ffmpeg/ffmpeg.js'],
  [`ffmpeg/dist/umd/${worker}`, `ffmpeg/${worker}`],
  ['core/dist/umd/ffmpeg-core.js', 'core/ffmpeg-core.js'],
  ['core/dist/umd/ffmpeg-core.wasm', 'core/ffmpeg-core.wasm'],
];

for (const [src, dest] of files) {
  const to = join(out, dest);
  mkdirSync(dirname(to), {recursive: true});
  copyFileSync(join(nm, src), to);
  console.log('vendored', dest);
}
