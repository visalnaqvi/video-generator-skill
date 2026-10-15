// Schema for composed scenes: a scene = background + layers + camera + effects.
// Colours are brand roles ('primary', 'accent', 'ink'…), 'white'/'black', or a hex the
// brand kit actually contains. Positions are % of the frame; sizes are px at 1080 wide.

export type Color = string;

export type EnterPreset =
  | 'none' | 'fade' | 'rise' | 'drop' | 'slideLeft' | 'slideRight' | 'pop' | 'slam'
  | 'blurIn' | 'maskUp' | 'maskDown' | 'maskLeft' | 'maskRight' | 'zoomOut' | 'spinIn' | 'flipUp';

export type Motion = { preset: EnterPreset; at?: number; dur?: number };
export type Loop = 'float' | 'pulse' | 'sway' | 'spin' | 'breathe';

export type LayerBase = {
  id?: string;
  /** Centre position, % of frame. */
  x?: number;
  y?: number;
  anchor?: 'center' | 'left' | 'right' | 'top' | 'bottom';
  rotate?: number;
  opacity?: number;
  /** Depth for parallax: 0 = far background, 1 = closest. Default 0.5. */
  z?: number;
  enter?: Motion;
  exit?: Motion;
  loop?: Loop;
  shadow?: 'soft' | 'hard' | 'long' | 'none';
  glow?: Color;
  blend?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
  /** Screen overlay: ignores the camera (zoom, pan, shake, parallax) and scene light — HUDs, titles, labels. */
  fixed?: boolean;
  /** Takes the scene's `lights` (shading, rim light, ambient tint). Default: on for rig layers when the scene has lights. */
  lit?: boolean;
  /** Rim light on the edge facing the strongest lights. Default: on for rigs, off for images (a baked ground patch or box edge would glow). */
  rim?: boolean;
  /** Override the atmospheric haze for this layer, 0–1 (0 = none, e.g. a sky that should keep its stars). */
  haze?: number;
  /** Ground shadows: contact shadow at the feet + a shadow cast away from the strongest light.
   *  Default: on for full-body rig layers when the scene has lights. */
  castShadow?: boolean | CastShadow;
  /** Where the layer touches the ground, % of its box height (rig full body 93, images 98). */
  feet?: number;
};

export type CastShadow = {
  /** Shadow length relative to the layer height (default from the light's height). */
  length?: number;
  opacity?: number;
  /** Override the direction: 'front' falls toward the camera (light behind), 'back' away from it. */
  dir?: 'front' | 'back';
  /** Contact shadow only (no cast shadow). */
  contactOnly?: boolean;
};

/** A light source in the scene (compose/light.tsx). Lights shade and rim-light `lit` layers, cast ground
 *  shadows and, with `glow`/`beam`, are visible themselves (bloom, light cone). */
export type Light = {
  id?: string;
  /** point = lamp/headlight/phone (falls off with `radius`); moon = soft directional light from (x, y). */
  kind?: 'point' | 'moon';
  /** Source position, % of frame (may be outside 0–100 for off-screen lights). */
  x: number;
  y: number;
  color?: Color;
  /** 0–1 (more is allowed for very bright sources). Default 0.8. */
  intensity?: number;
  /** Reach in px at 1080 wide (point lights). Default 700. */
  radius?: number;
  /** Visible bloom around the source, px radius (0 = invisible source). */
  glow?: number;
  /** Bloom width ÷ height (3 = a wide horizon glow over a town). Default 1. */
  glowAspect?: number;
  /** Visible light cone: direction in degrees (0 = right, 90 = down), spread degrees, length px. */
  beam?: { angle: number; spread?: number; length?: number; opacity?: number };
  /** Random flicker 0–1 (a failing bulb ≈ 0.4, a candle ≈ 0.2). */
  flicker?: number;
  /** On/off blink period in frames (aircraft or tower warning light). */
  blink?: number;
  /** Switch on at frame, fading in over `dur` frames (e.g. a phone screen lighting up on a word). */
  at?: number;
  dur?: number;
  /** false = lights and rims only, casts no ground shadow (a faint far glow such as a town on the horizon). */
  castShadows?: boolean;
  /** Draw the visible glow/beam behind the layers instead of over them. */
  under?: boolean;
  /** Depth of the visible glow for parallax (default 0.3). */
  z?: number;
};

/** Ambient life (compose/ambient.tsx): fog, wind-blown grass, twinkling stars, fireflies, moths, dust, rain, snow, distant traffic. */
export type AmbientLayer = LayerBase & {
  type: 'ambient';
  kind: 'fog' | 'grass' | 'stars' | 'fireflies' | 'moths' | 'dust' | 'rain' | 'snow' | 'traffic';
  /** Area it fills, % of frame: [x, y, w, h] (default full frame; grass/fog: a band). */
  area?: [number, number, number, number];
  count?: number;
  color?: Color;
  colors?: Color[];
  /** Size multiplier (blade height, mote size, puff size). */
  size?: number;
  speed?: number;
  /** Wind strength (grass sway, rain angle, fog drift). Default 1. */
  wind?: number;
  /** Rain/snow angle or traffic direction (1 = left→right, -1 = right→left). */
  dir?: number;
  seed?: number;
};

export type Highlight = { words: string[]; style: 'marker' | 'box' | 'underline' | 'color'; color?: Color; textColor?: Color };

export type TextLayer = LayerBase & {
  type: 'text';
  text: string;
  font?: 'heading' | 'body' | 'hand' | 'mono' | 'serif';
  size?: number;
  weight?: number;
  color?: Color;
  case?: 'upper' | 'none';
  tracking?: number;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
  lineHeight?: number;
  /** Animate the text in pieces with the enter preset. */
  split?: 'none' | 'lines' | 'words' | 'letters';
  stagger?: number;
  /** Outline-only text (big background typography). */
  outline?: number;
  highlight?: Highlight;
};

export type ImageLayer = LayerBase & {
  type: 'image';
  src: string;
  w?: number;
  h?: number;
  fit?: 'cover' | 'contain';
  focus?: string;
  radius?: number;
  mask?: 'none' | 'circle' | 'arch' | 'blob' | 'diagonal';
  treatment?: 'none' | 'duotone' | 'grayscale' | 'tint' | 'bright';
  border?: { width: number; color: Color };
  frame?: 'none' | 'polaroid' | 'card';
  /** Fade the image out towards one edge (e.g. a cut-out's waist line). */
  fade?: 'none' | 'bottom' | 'top';
  fadeAmount?: number;
  /** Slow zoom from → to over the scene (Ken Burns). */
  zoom?: [number, number];
};

export type ShapeLayer = LayerBase & {
  type: 'shape';
  shape: 'rect' | 'circle' | 'ring' | 'line' | 'blob' | 'burst' | 'triangle' | 'dots' | 'stripes';
  w?: number;
  h?: number;
  fill?: Color;
  stroke?: Color;
  strokeWidth?: number;
  radius?: number;
  /** For 'rect'/'line': grow from one side instead of the enter preset's motion. */
  grow?: 'left' | 'right' | 'up' | 'down';
};

export type StrokeLayer = LayerBase & {
  type: 'stroke';
  /** Hand-drawn mark (rough.js), drawn on over `enter.dur` frames. */
  kind: 'circle' | 'underline' | 'arrow' | 'scribble' | 'check' | 'cross' | 'box' | 'bracket' | 'star';
  w?: number;
  h?: number;
  color?: Color;
  width?: number;
  roughness?: number;
  seed?: number;
};

export type CounterLayer = LayerBase & {
  type: 'counter';
  from?: number;
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  frames?: number;
  font?: TextLayer['font'];
  size?: number;
  weight?: number;
  color?: Color;
};

export type IconLayer = LayerBase & {
  type: 'icon';
  /** lucide icon name, PascalCase (e.g. "Phone", "GraduationCap", "Star"). */
  name: string;
  size?: number;
  color?: Color;
  strokeWidth?: number;
  bg?: Color;
};

export type ParticlesLayer = LayerBase & {
  type: 'particles';
  kind?: 'dots' | 'sparks' | 'bokeh' | 'confetti';
  count?: number;
  colors?: Color[];
  speed?: number;
  seed?: number;
};

export type PhysicsBody = {
  /** Words on the card (one short word or phrase). */
  text?: string;
  /** lucide icon name, shown before the text (or alone in a circle). */
  icon?: string;
  /** Image in a circle/card: asset path or 'logo'. */
  image?: string;
  shape?: 'pill' | 'card' | 'circle';
  /** Size px at 1080 wide; auto-fitted to the text when omitted. */
  w?: number;
  h?: number;
  size?: number;
  radius?: number;
  fill?: Color;
  color?: Color;
  stroke?: Color;
  /** Spawn point, % of frame. Default: spread across the width, just above the top edge. */
  x?: number;
  y?: number;
  /** Frame the body drops in. Default: layer `at` + index × `stagger`. */
  at?: number;
  /** Start angle (deg), spin (rad/step) and launch velocity (px/step at 1080). */
  angle?: number;
  spin?: number;
  vx?: number;
  vy?: number;
  /** Doesn't move: a shelf, a ramp, a logo the others land on. */
  fixed?: boolean;
};

export type PhysicsLayer = LayerBase & {
  type: 'physics';
  bodies: PhysicsBody[];
  font?: TextLayer['font'];
  size?: number;
  weight?: number;
  fill?: Color;
  color?: Color;
  stroke?: Color;
  strokeWidth?: number;
  /** First drop frame and frames between drops (bodies without their own `at`). */
  at?: number;
  stagger?: number;
  /** 1 = normal gravity, 0 = floating, negative = falls up. */
  gravity?: number;
  /** Bounciness 0–1 (default 0.3) and air drag (default 0.012). */
  bounce?: number;
  air?: number;
  /** Floor line, % from top (default 88). 0 = no floor. */
  floor?: number;
  /** Side walls, % from left [left, right] (default [2, 98]). */
  walls?: [number, number];
  /** Blast every body away from a point at a frame. */
  burst?: { at: number; x?: number; y?: number; strength?: number };
  /** Frame the floor disappears and everything falls out of frame (an exit). */
  release?: number;
  seed?: number;
};

export type BrushMark = {
  /** Preset drawn inside the mark's box (x, y, w, h in % of the layer); ignored when `points` is given. */
  kind?: 'ring' | 'underline' | 'arrow' | 'check' | 'cross' | 'scribble' | 'wave' | 'box' | 'blob';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /** Free path, % of the layer box. 2 points = straight line; more = a smooth curve. */
  points?: [number, number][];
  closed?: boolean;
  curve?: number;
  brush?: 'pencil' | 'soft-pencil' | 'hard-pencil' | 'color-pencil' | 'pen' | 'fineliner' | 'charcoal' | 'marker' | 'spray';
  color?: Color;
  weight?: number;
  /** 'none' = fill/hatch only, no outline. */
  stroke?: 'none';
  /** Watercolour fill (closed shapes): colour, opacity 0–255, bleed 0–1, paper texture 0–1. */
  fill?: Color;
  fillOpacity?: number;
  bleed?: number;
  texture?: number;
  hatch?: { gap?: number; angle?: number };
  /** Reveal timing and style. Default: lines draw on along their direction, rings/boxes draw round, fills bloom. */
  at?: number;
  dur?: number;
  reveal?: 'draw' | 'round' | 'bloom' | 'fade' | 'wipeRight' | 'wipeLeft' | 'wipeDown' | 'wipeUp';
  blend?: LayerBase['blend'];
};

export type BrushLayer = LayerBase & {
  type: 'brush';
  /** Layer box, px at 1080 wide. Marks are placed in % of this box. */
  w?: number;
  h?: number;
  marks: BrushMark[];
  color?: Color;
  /** Frames between marks that have no `at` (default 8). */
  stagger?: number;
  seed?: number;
};

export type GroupLayer = LayerBase & { type: 'group'; layers: Layer[]; w?: number; h?: number };

/** Idle acting presets for a live character (see compose/rig.tsx). */
export type RigIdle = 'calm' | 'nervous' | 'smug' | 'shock' | 'focused' | 'still';
export type RigLook = 'center' | 'left' | 'right' | 'up' | 'down';
export type RigGesture = 'nod' | 'shake' | 'shrug' | 'flinch' | 'gulp' | 'take' | 'lookBack' | 'point';
/** An acting beat (compose/acting.ts): at a frame (usually from `sync` on a spoken word), change
 *  pose / face / sweat, move where the eyes rest, and/or play a gesture (`hold` frames). */
export type RigActBeat = { at?: number; pose?: { arms?: string; face?: string; sweat?: boolean }; face?: string; sweat?: boolean; do?: RigGesture; look?: RigLook; hold?: number;
  /** Turn the whole body to a view (the head leads, the body follows ~4 frames later). */
  turn?: RigView;
  /** Turn only the head (look over a shoulder); "body" returns it to where the body faces. */
  turnHead?: RigView | 'body';
  /** Frames the turn takes (default 10). */
  dur?: number };
/** Which way a live character faces: a named view or degrees (0 front, 90 = facing screen right, 180 back). */
export type RigView = number | 'front' | '3/4-right' | 'profile-right' | 'back-3/4-right' | 'back' | 'back-3/4-left' | 'profile-left' | '3/4-left';
/** A walk: the character moves to `to` (% of frame) between frames at and at + dur, stepping with planted feet,
 *  facing the way it walks (profile across the frame, front toward camera, back away), then turns to `end`. */
export type RigWalk = { to: [number, number]; at?: number; dur?: number; h?: number; end?: RigView; view?: RigView; stride?: number };

export type RigLayer = LayerBase & {
  type: 'rig';
  /** Universe whose rig draws the character ('noxverse'). */
  rig: string;
  /** The character's colour overrides (character.json `colors`). */
  colors?: Record<string, string>;
  /** Full body: { arms, face, sweat } (a character.json pose). */
  pose?: { arms?: string; face?: string; sweat?: boolean };
  /** Head-and-shoulders bust instead of the full body. */
  bust?: { face: string; sweat?: boolean };
  w?: number;
  h?: number;
  /** Idle acting; default follows the face (worried/sideeye → nervous, smug → smug, …). */
  idle?: RigIdle;
  /** Where the eyes rest. */
  look?: RigLook;
  /** Timed acting beats: pose/face changes, look shifts, gestures. */
  acting?: RigActBeat[];
  /** Scales all continuous motion (0 = frozen, 1 = default). */
  amount?: number;
  blink?: boolean;
  /** Lip-sync: true = this character's own dialogue lines (every line when the track has no speakers),
   *  'all' = every line (an on-screen narrator), or explicit line ids. */
  talk?: boolean | 'all' | string[];
  /** Character id — matches the `speaker` of its dialogue lines (talk: true). */
  character?: string;
  /** Which way it faces (rigs that support views — RIG_META.views). Default front. */
  view?: RigView;
  /** One walk or several in order (each starts where the last ended). */
  walk?: RigWalk | RigWalk[];
  /** Varies blink/glance timing between shots and characters. */
  seed?: string | number;
};

export type Layer = TextLayer | ImageLayer | ShapeLayer | StrokeLayer | CounterLayer | IconLayer | ParticlesLayer | PhysicsLayer | BrushLayer | RigLayer | AmbientLayer | GroupLayer;

export type Background = {
  kind: 'solid' | 'gradient' | 'radial' | 'mesh' | 'paper' | 'grid-paper' | 'lined-paper' | 'photo' | 'stripes';
  colors?: Color[];
  angle?: number;
  image?: string;
  blur?: number;
  dim?: number;
  treatment?: ImageLayer['treatment'];
  animate?: boolean;
};

export type CameraState = { zoom?: number; x?: number; y?: number; rotate?: number; tiltX?: number; tiltY?: number };
export type Camera = {
  from?: CameraState;
  to?: CameraState;
  ease?: 'inOut' | 'out' | 'in' | 'linear';
  shake?: { at: number; frames?: number; intensity?: number }[];
  /** Parallax strength: how much depth (z) exaggerates camera movement. Default 1. */
  parallax?: number;
  /** Frame a layer (by its `id`) at a shot size; the camera follows it if it walks. `shot` animates
   *  from → to (push in / pull out); `from`/`to` still add rotate/tilt. compose/camera.ts. */
  target?: string;
  shot?: ShotSize | [ShotSize, ShotSize];
  /** Where the framed part sits on screen, % of frame [x, y] (default centre, a little above the middle). */
  screen?: [number, number];
  /** Camera angle on the subject. */
  angle?: 'eye' | 'low' | 'high' | 'dutch' | 'dutch-left';
  /** Hand-held drift, 0–1 (0.3 subtle, 1 nervous). */
  handheld?: number;
  /** Keep the pan inside the set's art (default true). */
  clamp?: boolean;
};
export type ShotSize = 'extreme-wide' | 'wide' | 'full' | 'medium' | 'medium-close' | 'close' | 'extreme-close';

export type Effect =
  | { kind: 'grain'; amount?: number }
  | { kind: 'vignette'; amount?: number }
  | { kind: 'lightSweep'; at?: number; dur?: number; angle?: number; color?: Color; opacity?: number }
  | { kind: 'lightLeak'; at?: number; dur?: number; colors?: Color[]; opacity?: number }
  | { kind: 'flash'; at: number; dur?: number; color?: Color }
  | { kind: 'scanlines'; amount?: number };

export type ComposedProps = {
  background?: Background;
  layers: Layer[];
  /** Light sources: shade + rim-light lit layers, cast shadows, draw glows/beams. */
  lights?: Light[];
  /** Scene light level on lit layers: tint colour (e.g. night navy) and amount 0–1 (how dark the unlit side gets). */
  ambient?: { color?: Color; amount?: number };
  /** Atmospheric haze: far layers (low z) fade toward this colour by amount × (1 − z). */
  atmosphere?: { color?: Color; amount?: number };
  /** Depth of field: scene layers blur by `blur` px per unit of |z − focus.z|; `to` pulls focus to another
   *  depth from frame `at` over `dur` frames (rack focus). */
  focus?: { z: number; blur?: number; to?: number; at?: number; dur?: number };
  camera?: Camera;
  effects?: Effect[];
  motionBlur?: boolean;
};
