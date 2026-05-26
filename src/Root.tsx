import {Composition} from 'remotion';
import {Reel, type Clip, type ReelProps} from './Reel';
import {config} from './config';
import manifestJson from './manifest.json';

type Manifest = {
  clips: {src: string; durationInSeconds: number}[];
  music: string | null;
};

const manifest = manifestJson as Manifest;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={1}
      fps={config.fps}
      width={config.width}
      height={config.height}
      defaultProps={
        {
          clips: [],
          music: null,
          transitionInFrames: 0,
          musicVolume: config.musicVolume,
          keepClipAudio: config.keepClipAudio,
        } satisfies ReelProps
      }
      calculateMetadata={() => {
        const {fps, maxClipSeconds, transitionSeconds} = config;
        const transitionInFrames = Math.round(transitionSeconds * fps);

        // A clip must be longer than the crossfade it takes part in.
        const minFrames = transitionInFrames + 1;

        const clips: Clip[] = manifest.clips.map((clip) => {
          const seconds =
            maxClipSeconds === null
              ? clip.durationInSeconds
              : Math.min(clip.durationInSeconds, maxClipSeconds);
          return {
            src: clip.src,
            durationInFrames: Math.max(Math.round(seconds * fps), minFrames),
          };
        });

        const sum = clips.reduce((s, c) => s + c.durationInFrames, 0);
        const overlap = transitionInFrames * Math.max(clips.length - 1, 0);
        const durationInFrames = Math.max(sum - overlap, 1);

        return {
          durationInFrames,
          fps,
          width: config.width,
          height: config.height,
          props: {
            clips,
            music: manifest.music,
            transitionInFrames,
            musicVolume: config.musicVolume,
            keepClipAudio: config.keepClipAudio,
          } satisfies ReelProps,
        };
      }}
    />
  );
};
