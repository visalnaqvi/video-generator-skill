import React from 'react';
import { AbsoluteFill, Audio, CalculateMetadataFunction, Sequence, staticFile } from 'remotion';
import { linearTiming, TransitionPresentation, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide, SlideDirection } from '@remotion/transitions/slide';
import { wipe, WipeDirection } from '@remotion/transitions/wipe';
import { flip } from '@remotion/transitions/flip';
import { iris } from '@remotion/transitions/iris';
import { pushCut } from '@remotion/transitions/push-cut';
import { Brand, fallbackBrand } from './brand';
import { Branded } from './BrandContext';
import { templates } from './templates';
import { StyleTokens } from './style';
import { CaptionData, Captions } from './Captions';
import { LipsyncCtx, LipsyncData, SceneClock } from './timeline';

export type TransitionType = 'none' | 'fade' | 'slide' | 'wipe' | 'flip' | 'iris' | 'pushCut';
export type Transition = { type: TransitionType; direction?: string; durationInFrames?: number };
export type Scene = {
  id?: string;
  template: string;
  durationInFrames: number;
  props: Record<string, unknown>;
  /** Start the template's animation this many frames in (e.g. so a hook is already visible on frame 1). */
  startFrom?: number;
  /** Transition into the NEXT scene. Overlaps both scenes, so it shortens the total. */
  transition?: Transition;
  /** Caption placement for this shot: y in % of the frame, or false to hide captions here. */
  captionY?: number;
  captions?: boolean;
};
export type Format = '9:16' | '16:9' | '1:1' | '4:5';
export type VideoProps = { brand?: Brand; style?: Partial<StyleTokens>; format?: Format; fps?: number; scenes: Scene[]; audio?: string; audioVolume?: number; captions?: CaptionData; lipsync?: LipsyncData };

export const SIZES: Record<Format, [number, number]> = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350] };
const DEFAULT_TRANSITION = 10;

const transitionFrames = (s: Scene, isLast: boolean) => (isLast || !s.transition || s.transition.type === 'none' ? 0 : s.transition.durationInFrames ?? DEFAULT_TRANSITION);

/** Frame where each scene starts, after transition overlaps. Shared with render.mjs's logic. */
export const sceneStarts = (scenes: Scene[]) => {
  const starts: number[] = [];
  let t = 0;
  scenes.forEach((s, i) => {
    starts.push(t);
    t += s.durationInFrames - transitionFrames(s, i === scenes.length - 1);
  });
  return { starts, total: t };
};

export const calculateVideoMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => {
  const [width, height] = SIZES[props.format ?? '9:16'];
  return { durationInFrames: Math.max(1, sceneStarts(props.scenes).total), fps: props.fps ?? 30, width, height };
};

function presentation(t: Transition, width: number, height: number): TransitionPresentation<Record<string, unknown>> {
  switch (t.type) {
    case 'slide': return slide({ direction: (t.direction as SlideDirection) ?? 'from-right' }) as never;
    case 'wipe': return wipe({ direction: (t.direction as WipeDirection) ?? 'from-left' }) as never;
    case 'flip': return flip() as never;
    case 'iris': return iris({ width, height }) as never;
    case 'pushCut': return pushCut() as never;
    default: return fade() as never;
  }
}

const Missing: React.FC<{ name: string }> = ({ name }) => (
  <AbsoluteFill style={{ background: '#b00020', color: '#fff', fontSize: 60, alignItems: 'center', justifyContent: 'center' }}>Unknown template: {name}</AbsoluteFill>
);

// Plays storyboard.json: one template per scene, joined by transitions, with optional audio.
export const Video: React.FC<VideoProps> = ({ brand = fallbackBrand, style, format = '9:16', scenes, audio, audioVolume = 1, captions, lipsync }) => {
  const [width, height] = SIZES[format];
  const { starts } = sceneStarts(scenes);
  const zones = scenes.map((s, i) => ({ from: starts[i], to: starts[i] + s.durationInFrames, y: s.captionY, hide: s.captions === false }));
  return (
    <Branded brand={brand} style={style}>
      <LipsyncCtx.Provider value={lipsync}>
      <AbsoluteFill style={{ background: brand.colors.background.hex }}>
        <TransitionSeries>
          {scenes.flatMap((s, i) => {
            const T = templates[s.template];
            const out = [
              <TransitionSeries.Sequence key={`s${i}`} durationInFrames={s.durationInFrames}>
                <SceneClock.Provider value={{ start: starts[i] - (s.startFrom ?? 0) }}>
                  {T ? (s.startFrom ? <Sequence from={-s.startFrom}><T {...s.props} /></Sequence> : <T {...s.props} />) : <Missing name={s.template} />}
                </SceneClock.Provider>
              </TransitionSeries.Sequence>,
            ];
            const tf = transitionFrames(s, i === scenes.length - 1);
            if (tf > 0 && s.transition) {
              out.push(<TransitionSeries.Transition key={`t${i}`} presentation={presentation(s.transition, width, height)} timing={linearTiming({ durationInFrames: tf })} />);
            }
            return out;
          })}
        </TransitionSeries>
        {captions && captions.phrases.length > 0 && <Captions data={captions} zones={zones} />}
        {audio && <Audio src={staticFile(audio)} volume={audioVolume} />}
      </AbsoluteFill>
      </LipsyncCtx.Provider>
    </Branded>
  );
};
