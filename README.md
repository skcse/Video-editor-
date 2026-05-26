# Instagram Reel Compiler

Drop a bunch of video clips into a folder and render a single vertical
**Instagram Reel** (1080×1920) with crossfade transitions, background music,
and automatic per-clip trimming. Built with [Remotion](https://remotion.dev).

## Setup

```bash
npm install
```

> Requires Node 18+. Remotion renders with a bundled Chromium + ffmpeg, so the
> first render may take a moment to download those.

## Use it

1. **Add your clips.** Put your video files in `public/clips/`.
   Supported: `.mp4 .mov .webm .mkv .m4v`.
   They play in filename order (`clip1`, `clip2`, … `clip10` sorts naturally).

2. **(Optional) Add music.** Drop one audio file in `public/music/`
   (`.mp3 .wav .m4a .aac .ogg`). The first one found is used and loops to fit.

3. **Preview in the studio:**

   ```bash
   npm run dev
   ```

   This scans your folders and opens the Remotion Studio in your browser so you
   can scrub through the result.

4. **Render the final video:**

   ```bash
   npm run render
   ```

   The Reel is written to `out/reel.mp4`. Upload that to Instagram.

## Customize

Open `src/config.ts` — every option is commented:

| Option              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `maxClipSeconds`    | Trim each clip to at most N seconds (`null` = full clip). |
| `transitionSeconds` | Crossfade length between clips (`0` = hard cuts).         |
| `musicVolume`       | Background music volume, `0`–`1`.                         |
| `keepClipAudio`     | Keep each clip's own audio under the music.               |
| `fps` / `width` / `height` | Frame rate and canvas size.                        |

After changing clips or music, just re-run `npm run dev` / `npm run render` —
the folders are re-scanned automatically.

## How it works

- `scripts/scan.mjs` lists your clips/music and reads each clip's real
  duration (via `@remotion/media-parser`) into `src/manifest.json`.
- `src/Root.tsx` trims each clip to `maxClipSeconds` and computes the total
  timeline length (accounting for crossfade overlap).
- `src/Reel.tsx` lays the clips out in a `TransitionSeries` with fades and
  overlays the looping music track.
