import {Fragment} from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  staticFile,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';

export type Clip = {
  src: string;
  durationInFrames: number;
};

export type ReelProps = {
  clips: Clip[];
  music: string | null;
  transitionInFrames: number;
  musicVolume: number;
  keepClipAudio: boolean;
};

const coverStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

export const Reel: React.FC<ReelProps> = ({
  clips,
  music,
  transitionInFrames,
  musicVolume,
  keepClipAudio,
}) => {
  const {durationInFrames} = useVideoConfig();

  if (clips.length === 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#111',
          color: 'white',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          padding: 80,
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 52,
          lineHeight: 1.3,
        }}
      >
        Drop video files into{'\n'}public/clips/ and re-run.
      </AbsoluteFill>
    );
  }

  const useTransition = transitionInFrames > 0 && clips.length > 1;

  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      <TransitionSeries>
        {clips.map((clip, i) => (
          <Fragment key={clip.src}>
            <TransitionSeries.Sequence durationInFrames={clip.durationInFrames}>
              <OffthreadVideo
                src={staticFile(clip.src)}
                muted={!keepClipAudio}
                style={coverStyle}
              />
            </TransitionSeries.Sequence>
            {useTransition && i < clips.length - 1 ? (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({durationInFrames: transitionInFrames})}
              />
            ) : null}
          </Fragment>
        ))}
      </TransitionSeries>

      {music ? (
        <Audio
          src={staticFile(music)}
          volume={musicVolume}
          loop
          trimAfter={durationInFrames}
        />
      ) : null}
    </AbsoluteFill>
  );
};
