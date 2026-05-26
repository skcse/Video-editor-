// Tweak these to change how your Reel is built. No coding required.

export const config = {
  // Output frame rate.
  fps: 30,

  // Instagram Reel canvas (vertical 9:16).
  width: 1080,
  height: 1920,

  // Each clip is trimmed to at most this many seconds (plays from its start).
  // Set to null to use every clip's full length.
  maxClipSeconds: 5 as number | null,

  // Length of the crossfade between two clips, in seconds. Set to 0 to disable.
  transitionSeconds: 0.5,

  // Volume of the background music track (0 = silent, 1 = full).
  musicVolume: 0.6,

  // Keep the original audio from each clip playing under the music?
  keepClipAudio: false,
};
