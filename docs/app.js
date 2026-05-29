"use strict";

const { FFmpeg } = FFmpegWASM;

const fetchFile = async (file) => new Uint8Array(await file.arrayBuffer());

const FPS = 30;

const state = {
  clips: [], // {file, name, dur}
  music: null, // {file, name}
};

let ffmpeg = null;

// ---- elements ----
const el = (id) => document.getElementById(id);
const clipInput = el("clipInput");
const clipList = el("clipList");
const musicInput = el("musicInput");
const musicName = el("musicName");
const renderBtn = el("renderBtn");
const progressWrap = el("progressWrap");
const resultWrap = el("resultWrap");
const bar = el("bar");
const statusEl = el("status");
const logEl = el("log");
const resultVideo = el("result");
const downloadLink = el("download");
const shareBtn = el("share");

// ---- helpers ----
const ext = (name, fallback) => {
  const m = /\.([a-z0-9]+)$/i.exec(name || "");
  return m ? m[1].toLowerCase() : fallback;
};

const fmtDur = (s) => (isFinite(s) ? `${s.toFixed(1)}s` : "?");

const getDuration = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(NaN);
    };
    v.src = url;
  });

// ---- clip list UI ----
function renderClipList() {
  clipList.innerHTML = "";
  state.clips.forEach((c, i) => {
    const li = document.createElement("li");
    const nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = c.name;
    const dur = document.createElement("span");
    dur.className = "dur";
    dur.textContent = fmtDur(c.dur);
    const up = button("↑", () => move(i, -1), i === 0);
    const down = button("↓", () => move(i, 1), i === state.clips.length - 1);
    const del = button("✕", () => remove(i), false);
    li.append(nm, dur, up, down, del);
    clipList.append(li);
  });
  updateRenderBtn();
}

function button(label, onClick, disabled) {
  const b = document.createElement("button");
  b.textContent = label;
  b.disabled = disabled;
  b.onclick = onClick;
  return b;
}

function move(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= state.clips.length) return;
  [state.clips[i], state.clips[j]] = [state.clips[j], state.clips[i]];
  renderClipList();
}

function remove(i) {
  state.clips.splice(i, 1);
  renderClipList();
}

function updateRenderBtn() {
  const n = state.clips.length;
  renderBtn.disabled = n === 0;
  renderBtn.textContent = n === 0 ? "Add clips to start" : `Make Reel (${n} clip${n > 1 ? "s" : ""})`;
}

// ---- inputs ----
clipInput.addEventListener("change", async (e) => {
  const files = [...e.target.files];
  clipInput.value = "";
  for (const file of files) {
    const dur = await getDuration(file);
    state.clips.push({ file, name: file.name, dur });
  }
  renderClipList();
});

musicInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  musicInput.value = "";
  if (!file) return;
  state.music = { file, name: file.name };
  musicName.textContent = `♪ ${file.name}`;
});

// ---- ffmpeg ----
function log(line) {
  logEl.textContent += line + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

async function ensureFFmpeg() {
  if (ffmpeg) return ffmpeg;
  setStatus("Loading engine (~30 MB, first time only)…");
  ffmpeg = new FFmpeg();
  ffmpeg.on("log", ({ message }) => log(message));
  ffmpeg.on("progress", ({ progress }) => {
    if (progress > 0 && progress <= 1) setBar(10 + progress * 85);
  });
  const base = new URL("vendor/core/", location.href).href;
  await ffmpeg.load({
    coreURL: base + "ffmpeg-core.js",
    wasmURL: base + "ffmpeg-core.wasm",
  });
  return ffmpeg;
}

// Build the ffmpeg argument list for the current state.
function buildArgs(W, H, maxClip, transition, volume) {
  const n = state.clips.length;

  // Trim each clip; never let a clip be shorter than the crossfade.
  const trims = state.clips.map((c) => {
    const d = isFinite(c.dur) && c.dur > 0 ? c.dur : maxClip || 5;
    return maxClip > 0 ? Math.min(d, maxClip) : d;
  });

  const minTrim = Math.min(...trims);
  const eff = n > 1 ? Math.max(0, Math.min(transition, minTrim / 2)) : 0;

  const filters = [];
  trims.forEach((t, i) => {
    filters.push(
      `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,` +
        `crop=${W}:${H},setsar=1,fps=${FPS},trim=0:${t.toFixed(3)},` +
        `setpts=PTS-STARTPTS,format=yuv420p[v${i}]`,
    );
  });

  let vlabel;
  let finalDur;
  if (n === 1) {
    vlabel = "[v0]";
    finalDur = trims[0];
  } else if (eff > 0) {
    let last = "v0";
    let acc = trims[0];
    for (let k = 1; k < n; k++) {
      const out = k === n - 1 ? "vout" : `x${k}`;
      const offset = (acc - eff).toFixed(3);
      filters.push(
        `[${last}][v${k}]xfade=transition=fade:duration=${eff.toFixed(3)}:offset=${offset}[${out}]`,
      );
      last = out;
      acc = acc + trims[k] - eff;
    }
    vlabel = "[vout]";
    finalDur = acc;
  } else {
    const ins = state.clips.map((_, i) => `[v${i}]`).join("");
    filters.push(`${ins}concat=n=${n}:v=1:a=0[vout]`);
    vlabel = "[vout]";
    finalDur = trims.reduce((a, b) => a + b, 0);
  }

  const args = [];
  state.clips.forEach((c, i) => args.push("-i", `in${i}.${ext(c.name, "mp4")}`));

  if (state.music) {
    args.push("-stream_loop", "-1", "-i", `music.${ext(state.music.name, "mp3")}`);
    filters.push(`[${n}:a]volume=${volume.toFixed(3)}[aout]`);
  }

  args.push("-filter_complex", filters.join(";"));
  args.push("-map", vlabel);
  if (state.music) args.push("-map", "[aout]");

  args.push("-r", String(FPS));
  args.push("-t", finalDur.toFixed(3));
  args.push("-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p");
  if (state.music) args.push("-c:a", "aac", "-b:a", "128k");
  args.push("-movflags", "+faststart", "out.mp4");

  return { args, finalDur };
}

function setStatus(t) {
  statusEl.textContent = t;
}
function setBar(pct) {
  bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

async function render() {
  renderBtn.disabled = true;
  resultWrap.classList.add("hidden");
  progressWrap.classList.remove("hidden");
  logEl.textContent = "";
  setBar(2);

  try {
    const [W, H] = el("format").value.split("x").map(Number);
    const maxClip = parseFloat(el("maxClip").value) || 0;
    const transition = parseFloat(el("transition").value) || 0;
    const volume = parseFloat(el("volume").value);

    const ffmpeg = await ensureFFmpeg();
    setBar(8);

    setStatus("Loading your files…");
    for (let i = 0; i < state.clips.length; i++) {
      const c = state.clips[i];
      await ffmpeg.writeFile(`in${i}.${ext(c.name, "mp4")}`, await fetchFile(c.file));
    }
    if (state.music) {
      await ffmpeg.writeFile(
        `music.${ext(state.music.name, "mp3")}`,
        await fetchFile(state.music.file),
      );
    }

    const { args } = buildArgs(W, H, maxClip, transition, volume);
    log("ffmpeg " + args.join(" "));
    setStatus("Rendering… this can take a minute.");
    setBar(10);

    await ffmpeg.exec(args);

    setStatus("Wrapping up…");
    setBar(97);
    const data = await ffmpeg.readFile("out.mp4");
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);

    resultVideo.src = url;
    downloadLink.href = url;
    progressWrap.classList.add("hidden");
    resultWrap.classList.remove("hidden");
    setBar(100);
    resultWrap.scrollIntoView({ behavior: "smooth" });

    setupShare(blob);

    // Clean up the virtual filesystem for the next run.
    for (let i = 0; i < state.clips.length; i++) {
      try {
        await ffmpeg.deleteFile(`in${i}.${ext(state.clips[i].name, "mp4")}`);
      } catch (_) {}
    }
    try {
      await ffmpeg.deleteFile("out.mp4");
    } catch (_) {}
  } catch (err) {
    setStatus("Something went wrong — see the engine log below.");
    log("ERROR: " + (err && err.message ? err.message : String(err)));
  } finally {
    renderBtn.disabled = false;
  }
}

function setupShare(blob) {
  const file = new File([blob], "reel.mp4", { type: "video/mp4" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    shareBtn.classList.remove("hidden");
    shareBtn.onclick = () =>
      navigator
        .share({ files: [file], title: "My Reel" })
        .catch(() => {});
  } else {
    shareBtn.classList.add("hidden");
  }
}

renderBtn.addEventListener("click", render);
updateRenderBtn();

// ---- PWA ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("sw.js").catch(() => {}),
  );
}
