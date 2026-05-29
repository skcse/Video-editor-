# Instagram Reel Compiler

Turn a bunch of video clips into a single vertical **Instagram Reel** (1080×1920)
with crossfade transitions, background music, and automatic per-clip trimming.

There are **two ways to use it**:

1. **Mobile app (PWA)** — `docs/`. Runs entirely on your phone, no install of
   anything. Best for a quick Reel on the go. See [Mobile app](#mobile-app-pwa).
2. **Desktop CLI** — built with [Remotion](https://remotion.dev). Higher quality
   and faster for lots of / long clips. See [Desktop CLI](#desktop-cli).

---

## Mobile app (PWA)

A self-contained web app (in `docs/`) that stitches your clips **on-device** with
[ffmpeg.wasm](https://ffmpegwasm.netlify.app/) — nothing is uploaded anywhere.

### Put it on your phone (via GitHub Pages)

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a
   branch*, Branch = your branch, Folder = **`/docs`**. Save.
3. Open the published URL on your Android phone in **Chrome**, then
   **⋮ menu → Add to Home screen**. It now behaves like an installed app and
   works offline.

#### Use it

1. Tap **Add clips** and pick your videos (they play in the order shown — drag
   with ↑/↓ or remove with ✕).
2. Optionally **Add music** (one audio file).
3. Set format / max-seconds-per-clip / crossfade / volume.
4. Tap **Make Reel**, wait for it to render, then **Download** or **Share…**
   straight to Instagram.

> ⚠️ Rendering happens on your phone's CPU, so it's best for a handful of short
> clips. Long or 4K footage can be slow or run out of memory — use the desktop
> CLI for those.

### Developing the PWA locally

It's just static files — serve `docs/` with any static server, e.g.
`npx serve docs`, and open it in a browser. The ffmpeg engine is vendored into
`docs/vendor/`. After upgrading the `@ffmpeg/*` packages, refresh those copies
with `npm run vendor:ffmpeg`.

---

## Desktop CLI

Drop clips into a folder and render a Reel with Remotion.

### Setup

```bash
npm install
```

> Requires Node 18+. Remotion renders with a bundled Chromium + ffmpeg, so the
> first render may take a moment to download those.

### Use it

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

### Customize

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

### How it works

- `scripts/scan.mjs` lists your clips/music and reads each clip's real
  duration (via `@remotion/media-parser`) into `src/manifest.json`.
- `src/Root.tsx` trims each clip to `maxClipSeconds` and computes the total
  timeline length (accounting for crossfade overlap).
- `src/Reel.tsx` lays the clips out in a `TransitionSeries` with fades and
  overlays the looping music track.
