// Types for rig-parts.mjs (imported by the live rig in studio/remotion/src/compose/rig.tsx).
export type RigState = {
  blink?: number;
  look?: [number, number];
  brow?: number;
  breath?: number;
  head?: { rot?: number; dx?: number; dy?: number };
  body?: number;
  armL?: number;
  armR?: number;
  strings?: number;
  sweat?: { dy?: number; sx?: number; sy?: number; o?: number };
  mouth?: string;
  mouthOpen?: number;
  tween?: { from: string; p: number };
  shrug?: number;
  squash?: number;
  yaw?: number;
  headYaw?: number;
  walk?: { phase: number; stride?: number; lift?: number; bob?: number; swing?: number };
};
export type PoseCfg = { arms?: string; face?: string; sweat?: boolean };
export declare const RIG_META: { feet: number; views?: boolean; walk?: { stride: number } };
export declare const RIG_COLORS: Record<string, string>;
export declare const MOUTH_SHAPES: Record<string, object>;
export declare const ARMS: Record<string, Record<string, [number, number][]>>;
export declare function makeRig(colors?: Record<string, string>, opts?: { uid?: string }): {
  pose(cfg: PoseCfg, state?: RigState): string;
  bust(face: string, sweat?: boolean, state?: RigState): string;
};
