// Scans public/clips and public/music, reads each clip's duration, and writes
// src/manifest.json. Run automatically by `npm run dev` and `npm run render`.
import {readdirSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseMedia} from '@remotion/media-parser';
import {nodeReader} from '@remotion/media-parser/node';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clipsDir = join(root, 'public', 'clips');
const musicDir = join(root, 'public', 'music');

const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.mkv', '.m4v'];
const AUDIO_EXT = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];

const hasExt = (name, exts) => exts.includes(name.slice(name.lastIndexOf('.')).toLowerCase());

// Natural sort so clip2 comes before clip10.
const naturalSort = (a, b) =>
  a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});

const list = (dir, exts) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => !f.startsWith('.') && hasExt(f, exts))
    .sort(naturalSort);
};

const probeDuration = async (absPath) => {
  const {durationInSeconds, slowDurationInSeconds} = await parseMedia({
    src: absPath,
    reader: nodeReader,
    fields: {durationInSeconds: true, slowDurationInSeconds: true},
    acknowledgeRemotionLicense: true,
  });
  return durationInSeconds ?? slowDurationInSeconds;
};

const clipFiles = list(clipsDir, VIDEO_EXT);
const music = list(musicDir, AUDIO_EXT);

const clips = [];
for (const f of clipFiles) {
  const durationInSeconds = await probeDuration(join(clipsDir, f));
  clips.push({src: `clips/${f}`, durationInSeconds});
}

const manifest = {
  clips,
  music: music.length ? `music/${music[0]}` : null,
};

mkdirSync(join(root, 'src'), {recursive: true});
writeFileSync(
  join(root, 'src', 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);

console.log(
  `Found ${clips.length} clip(s)` +
    (manifest.music ? ` and music "${manifest.music}".` : ' and no music.'),
);
if (clips.length === 0) {
  console.log('Drop video files into public/clips/ to get started.');
}
