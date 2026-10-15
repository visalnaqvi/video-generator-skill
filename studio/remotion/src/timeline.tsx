// Video-wide timing that scenes can read: where the current scene starts on the voice-over track,
// and the lip-sync track (studio/scripts/lipsync.mjs → audio/lipsync.json) for talking characters.
import { createContext, useContext } from 'react';

export type LipsyncData = {
  fps: number;
  frames: number;
  /** One mouth shape per frame: X A B C D E F G H. */
  mouth: string;
  /** Loudness per frame, 0–9. */
  open: string;
  /** Frame range of each line; `speaker` marks a character's dialogue (none = narrator). */
  lines: { id: string; speaker?: string; from: number; to: number }[];
};

/** Global frame where the current scene's frame 0 sits (the voice-over starts at global frame 0). */
export const SceneClock = createContext({ start: 0 });
export const LipsyncCtx = createContext<LipsyncData | undefined>(undefined);

export const useSceneStart = () => useContext(SceneClock).start;
export const useLipsync = () => useContext(LipsyncCtx);
