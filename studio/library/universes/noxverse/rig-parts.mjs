// Noxverse rig parts — the shared body as pure SVG builders (no Node imports), used by rig.mjs
// (PNG stills for decks, sheets and older storyboards) and by the live rig in Remotion
// (studio/remotion/src/compose/rig.tsx), which redraws the character every frame from an
// animation state. Without a state the output is the still pose, pixel for pixel.
//
// Animation state (all optional, rig units — the pose canvas is 640x1000):
//   blink 0..1 (1 = shut) · look [dx, dy] eye offset px · brow dy px · breath -1..1 (chest)
//   head { rot deg, dx, dy } about the neck · body deg, a weight shift about the feet
//   armL / armR deg swing of a hanging arm about its shoulder · strings deg drawstring swing
//   sweat { dy, sx, sy, o } drip of the sweat drop
//   mouth A–H | X talking mouth shape (X / unset = the face's own mouth) · mouthOpen 0..1 loudness
//   tween { from: arms id, p } a pose change in progress (arms blend joint by joint; p may overshoot)
//   shrug 0..1 shoulders + head up, hanging elbows out · squash ± body scale about the feet (+ = squash)
//   yaw deg body turn (0 front · ±45 three-quarter · ±90 profile · 180 back; + = facing screen right)
//   headYaw deg head turn (defaults to yaw) · walk { phase 0..1, stride px, lift px, bob px, swing deg }
//   Setting yaw / headYaw / walk switches the drawing to the turnable body (poseTurned below); without
//   them the drawing is the original front view, pixel for pixel.
// Extend additively: new ARMS / FACE_PARTS entries, or new state fields whose zero value
// draws exactly what the rig draws today (finished videos re-render from these files).

/** Staging facts the scene engine needs for any rig (compose/light.tsx, layers.tsx):
 *  feet = where the full body touches the ground, % of its box height (viewBox -20 0 640 1000, soles at y≈930). */
export const RIG_META = { feet: 93, views: true, walk: { stride: 70 } };

export const RIG_COLORS = {
  out: '#15151a', head: '#f6f4ee', shade: '#dcd8cc', cap: '#1b2231', capHi: '#34405e',
  hood: '#3b4150', hoodDk: '#2a2f3a', jeans: '#27324a', shoe: '#f2f0ea', sweat: '#9fd3ff', strings: '#e9e6dd',
  mouth: '#3a1420', tongue: '#e8708c', teeth: '#ffffff',
};

export const ARMS = {
  down: { L: [[198, 440], [172, 560], [178, 648]], R: [[402, 440], [428, 560], [422, 648]] },
  crossed: { R: [[405, 440], [402, 512], [300, 522], [212, 498]], L: [[195, 440], [198, 528], [300, 548], [392, 520]] },
  up: { L: [[198, 440], [118, 420], [110, 318]], R: [[402, 440], [482, 420], [490, 318]] },
  sign: { L: [[198, 440], [172, 560], [178, 648]], R: [[402, 440], [446, 540], [352, 598]] },
  // right hand holds a phone to the ear; the hand + phone are drawn over the head (see pose())
  phone: { L: [[198, 440], [172, 560], [178, 648]], R: [[402, 440], [500, 520], [478, 352]] },
  // right arm out, pointing at something on the right of frame
  point: { L: [[198, 440], [172, 560], [178, 648]], R: [[402, 440], [492, 476], [578, 442]] },
  // elbows out, hands up and open — "what can you do?"
  shrug: { L: [[198, 440], [128, 548], [96, 476]], R: [[402, 440], [472, 548], [504, 476]] },
};

// How each arm behaves when alive: 'hang' swings from the shoulder, 'head' keeps the hand on the
// head (it follows head moves), 'fixed' keeps the hand where it is (pen on paper), 'body' rides the chest.
const ARM_LIFE = {
  down: { L: 'hang', R: 'hang' }, crossed: { L: 'body', R: 'body' }, up: { L: 'head', R: 'head' },
  sign: { L: 'hang', R: 'fixed' }, phone: { L: 'hang', R: 'head' }, point: { L: 'hang', R: 'body' },
  shrug: { L: 'body', R: 'body' },
};

// Faces split into eyes (blink + look), brows and mouth. Eye kinds: a filled dot ellipse (`hi` =
// catch-light [dx, dy, r]) or an `arc` (eyes already closed, e.g. smug: no blink).
export const FACE_PARTS = (C) => {
  const brow = (d) => `<path d="${d}" stroke="${C.out}" stroke-width="10" stroke-linecap="round"/>`;
  const browC = (d) => `<path d="${d}" fill="none" stroke="${C.out}" stroke-width="10" stroke-linecap="round"/>`;
  const dots = (xl, xr, cy, rx, ry, hi) => [{ cx: xl, cy, rx, ry, hi }, { cx: xr, cy, rx, ry, hi }];
  return {
    worried: {
      eyes: dots(252, 348, 302, 12, 16),
      brows: brow('M224,272 L268,256 M332,256 L376,272'),
      mouth: `<path d="M278,352 Q289,343 300,351 Q311,359 322,350" fill="none" stroke="${C.out}" stroke-width="6" stroke-linecap="round"/>`,
    },
    smug: {
      eyes: [{ kind: 'arc', d: 'M237,304 Q252,292 267,304 M333,304 Q348,292 363,304' }],
      brows: browC('M226,272 L270,270 M330,262 Q352,246 376,260'),
      mouth: `<path d="M280,350 Q314,364 338,338" fill="none" stroke="${C.out}" stroke-width="6" stroke-linecap="round"/>`,
    },
    shock: {
      eyes: dots(252, 348, 304, 15, 22, [5, -8, 4.5]),
      brows: browC('M224,254 Q247,238 270,248 M330,248 Q353,238 376,254'),
      mouth: `<ellipse cx="300" cy="358" rx="13" ry="17" fill="${C.out}"/>`,
    },
    focused: {
      eyes: dots(252, 348, 314, 11, 11),
      brows: brow('M226,282 L270,288 M330,288 L374,282'),
      mouth: `<path d="M286,354 L314,354" stroke="${C.out}" stroke-width="6" stroke-linecap="round"/>`,
    },
    sideeye: {
      eyes: dots(262, 358, 303, 11, 15),
      brows: brow('M224,272 L268,258 M332,258 L376,272'),
      mouth: `<path d="M288,354 L316,350" stroke="${C.out}" stroke-width="6" stroke-linecap="round"/>`,
    },
  };
};

const r2 = (v) => Math.round(v * 100) / 100;

// Talking mouths — the 9 classic cartoon shapes (Preston Blair / Rhubarb Lip Sync names):
//   X rest (the face's own mouth) · A M/B/P closed · B most consonants, teeth (K S T EE)
//   C open (EH AE) · D wide (AA) · E rounded (AO ER) · F pucker (OO W) · G F/V · H L
// Each face bends them to its emotion: corner drop (+ = down) per side, x shift, size.
export const MOUTH_SHAPES = {
  A: { w: 34, h: 0 },
  B: { w: 40, h: 13, teeth: 0.5 },
  C: { w: 46, h: 24, teeth: 0.22, tongue: 0.24 },
  D: { w: 54, h: 40, teeth: 0.16, tongue: 0.3 },
  E: { w: 36, h: 30, round: true, tongue: 0.22 },
  F: { w: 22, h: 22, round: true },
  G: { w: 40, h: 13, teeth: 0.65, lip: true },
  H: { w: 44, h: 28, teeth: 0.2, tongue: 0.26, tongueUp: true },
};
const MOUTH_MOOD = {
  worried: { cl: 4, cr: 4, dx: 0, k: 1 },
  smug: { cl: 2, cr: -7, dx: 9, k: 0.95 },
  shock: { cl: 0, cr: 0, dx: 0, k: 1.2 },
  focused: { cl: 1, cr: 1, dx: 0, k: 0.85 },
  sideeye: { cl: 1, cr: -3, dx: 4, k: 0.95 },
};
const MOUTH_C = [300, 352];

function talkMouth(shape, face, C, id, open = 0.6) {
  const m = MOUTH_SHAPES[shape];
  const mood = MOUTH_MOOD[face] ?? MOUTH_MOOD.worried;
  const cx = MOUTH_C[0] + mood.dx, cy = MOUTH_C[1];
  const w = m.w * mood.k, h = m.h * mood.k * (0.8 + 0.4 * Math.min(1, Math.max(0, open)));
  const L = [cx - w / 2, cy + mood.cl], R = [cx + w / 2, cy + mood.cr];
  const P = (x, y) => `${r2(x)},${r2(y)}`;
  if (!h) return `<path d="M${P(...L)} Q${P(cx, cy + (mood.cl + mood.cr) / 2 - 2)} ${P(...R)}" fill="none" stroke="${C.out}" stroke-width="7" stroke-linecap="round"/>`;
  const tilt = (mood.cl + mood.cr) / 4;
  const top = cy - h * 0.25 + tilt, bot = cy + h * 0.75 + tilt, mid = (top + bot) / 2;
  const d = m.round
    ? `M${P(cx - w / 2, mid)} C${P(cx - w / 2, top - h * 0.05)} ${P(cx + w / 2, top - h * 0.05)} ${P(cx + w / 2, mid)} C${P(cx + w / 2, bot + h * 0.08)} ${P(cx - w / 2, bot + h * 0.08)} ${P(cx - w / 2, mid)} Z`
    : `M${P(...L)} C${P(L[0] + w * 0.16, top)} ${P(R[0] - w * 0.16, top)} ${P(...R)} C${P(R[0] - w * 0.1, bot)} ${P(L[0] + w * 0.1, bot)} ${P(...L)} Z`;
  const inner = (m.teeth ? `<rect x="${r2(cx - w / 2)}" y="${r2(top - 4)}" width="${r2(w)}" height="${r2(4 + h * m.teeth)}" fill="${C.teeth}"/>` : '')
    + (m.tongue ? `<ellipse cx="${r2(cx)}" cy="${r2(m.tongueUp ? top + h * 0.42 : bot - h * 0.1)}" rx="${r2(w * 0.3)}" ry="${r2(h * m.tongue)}" fill="${C.tongue}"/>` : '');
  const lip = m.lip ? `<path d="M${P(cx - w * 0.38, bot + 1)} Q${P(cx, bot + 6)} ${P(cx + w * 0.38, bot + 1)}" fill="none" stroke="${C.out}" stroke-width="5" stroke-linecap="round"/>` : '';
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${C.mouth}"/><g clip-path="url(#${id})">${inner}</g><path d="${d}" fill="none" stroke="${C.out}" stroke-width="5" stroke-linejoin="round"/>${lip}`;
}

function eyeSvg(e, C, st) {
  if (e.kind === 'arc') {
    const path = `<path d="${e.d}" fill="none" stroke="${C.out}" stroke-width="8" stroke-linecap="round"/>`;
    if (!st?.look) return path;
    return `<g transform="translate(${r2(st.look[0] * 0.3)},${r2(st.look[1] * 0.3)})">${path}</g>`;
  }
  if (!st) {
    const hi = e.hi ? `<circle cx="${e.cx + e.hi[0]}" cy="${e.cy + e.hi[1]}" r="${e.hi[2]}" fill="#fff"/>` : '';
    return `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${C.out}"/>${hi}`;
  }
  const [lx, ly] = st.look ?? [0, 0];
  const open = 1 - Math.min(1, Math.max(0, st.blink ?? 0));
  const cx = e.cx + lx, cy = e.cy + ly;
  if (open <= 0.22) {
    // shut: a soft lid line, slightly below the eye's centre
    const w = e.rx + 3;
    return `<path d="M${r2(cx - w)},${r2(cy + 3)} Q${r2(cx)},${r2(cy + 9)} ${r2(cx + w)},${r2(cy + 3)}" fill="none" stroke="${C.out}" stroke-width="7" stroke-linecap="round"/>`;
  }
  // closing: the lid comes down from the top, so the eye squashes towards its lower half
  const ry = e.ry * open, y = cy + e.ry * (1 - open) * 0.45;
  const hi = e.hi && open > 0.7 ? `<circle cx="${r2(cx + e.hi[0])}" cy="${r2(y + e.hi[1] * open)}" r="${e.hi[2]}" fill="#fff"/>` : '';
  return `<ellipse cx="${r2(cx)}" cy="${r2(y)}" rx="${e.rx}" ry="${r2(ry)}" fill="${C.out}"/>${hi}`;
}

/** Still faces as one SVG string per face (what the PNG poses use). */
export const FACES = (C) => Object.fromEntries(Object.entries(FACE_PARTS(C)).map(([id, f]) => [id, f.eyes.map((e) => eyeSvg(e, C)).join('') + f.brows + f.mouth]));

const rot = ([x, y], deg, [px, py]) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
};

// ---- turning (yaw) helpers: the head and torso are treated as round, so a feature drawn at x
// offset `ox` from the centre sits at angle asin(ox / R) and travels round as the body turns ----
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
/** Where a feature drawn at x = xc (front view) goes when its round part (centre cx, radius R) turns yaw deg. */
function around(xc, cx, R, yaw, cheat = 90) {
  let a = Math.asin(clamp((xc - cx) / R, -0.99, 0.99)) + yaw * DEG;
  a = Math.atan2(Math.sin(a), Math.cos(a)); // keep in -180..180
  const shown = clamp(a, -cheat * DEG, cheat * DEG);
  return { x: cx + R * Math.sin(shown), k: Math.cos(a), sq: Math.cos(shown) };
}
/** Wraps SVG drawn around xc so it slides round the part and squeezes with the turn; fades out behind. */
function wrapAround(svg, xc, cx, R, yaw, min = 0.22, cheat = 90, vis = 0.12) {
  if (!svg) return '';
  const { x, k, sq } = around(xc, cx, R, yaw, cheat);
  const o = smoothstep((k + vis) / 0.3);
  if (o <= 0.01) return '';
  return `<g opacity="${r2(o)}" transform="translate(${r2(x)},0) scale(${r2(Math.max(min, sq))},1) translate(${r2(-xc)},0)">${svg}</g>`;
}
/** A detail on the torso's front (or back): the torso is an oval section (130 wide × 85 deep), so the
 *  detail slides round less than on the head; it squeezes and is hidden once it faces away. */
function wrapTorso(svg, xc, yaw, back = false) {
  const Y = (yaw + (back ? 180 : 0)) * DEG, a = 130, b = 85;
  const phi = Math.asin(clamp((xc - 300) / a, -0.99, 0.99));
  const x = 300 + a * Math.sin(phi) * Math.cos(Y) + b * Math.cos(phi) * Math.sin(Y);
  const k = Math.cos(phi + Y), o = smoothstep((k - 0.08) / 0.25);
  if (o <= 0.01) return '';
  return `<g opacity="${r2(o)}" transform="translate(${r2(x)},0) scale(${r2(Math.max(0.2, k))},1) translate(${r2(-xc)},0)">${svg}</g>`;
}
/** Centre x of a path's coordinates (for wrapping a single brow stroke). */
const pathCx = (d) => { const xs = [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])); return xs.reduce((a, b) => a + b, 0) / (xs.length || 1); };

/**
 * makeRig(colors, { uid }) → { pose(cfg, state?), bust(face, sweat, state?) }.
 * `state` animates the drawing (see the top of this file); `uid` keeps clip-path ids unique when
 * several live characters share a page. Live drawings fill their box (width/height 100%).
 */
export function makeRig(colors = {}, opts = {}) {
  const C = { ...RIG_COLORS, ...colors };
  const parts = FACE_PARTS(C);
  const uid = opts.uid ?? '';
  const limb = (pts, w, fill) => {
    const d = 'M' + pts.map((p) => p.map(r2).join(',')).join(' L');
    return `<path d="${d}" fill="none" stroke="${C.out}" stroke-width="${w + 13}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const hand = ([x, y]) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="27" fill="${C.head}" stroke="${C.out}" stroke-width="6"/>`;
  const SWEAT = `<path d="M182,262 Q198,290 182,304 Q166,290 182,262 Z" fill="${C.sweat}" stroke="${C.out}" stroke-width="4"/>`;

  const sweatSvg = (st) => {
    const s = st?.sweat;
    if (!s) return SWEAT;
    if ((s.o ?? 1) <= 0.01) return '';
    return `<g opacity="${r2(s.o ?? 1)}" transform="translate(182,${r2(262 + (s.dy ?? 0))}) scale(${r2(s.sx ?? 1)},${r2(s.sy ?? 1)}) translate(-182,-262)">${SWEAT}</g>`;
  };

  const faceSvg = (face, st) => {
    const f = parts[face];
    const eyes = f.eyes.map((e) => eyeSvg(e, C, st)).join('');
    const brows = st?.brow ? `<g transform="translate(0,${r2(st.brow)})">${f.brows}</g>` : f.brows;
    const mouth = st?.mouth && st.mouth !== 'X' && MOUTH_SHAPES[st.mouth] ? talkMouth(st.mouth, face, C, `${uid}m`, st.mouthOpen) : f.mouth;
    return eyes + brows + mouth;
  };

  const headFront = (face, sweat, st) => `
  <clipPath id="${uid}hc"><ellipse cx="300" cy="258" rx="150" ry="140"/></clipPath>
  <ellipse cx="300" cy="258" rx="150" ry="140" fill="${C.shade}"/>
  <g clip-path="url(#${uid}hc)">
    <ellipse cx="284" cy="250" rx="140" ry="134" fill="${C.head}"/>
    <ellipse cx="300" cy="268" rx="160" ry="26" fill="#000" opacity="0.12"/>
  </g>
  <ellipse cx="300" cy="258" rx="150" ry="140" fill="none" stroke="${C.out}" stroke-width="7"/>
  <path d="M156,236 C156,138 230,106 300,106 C370,106 444,138 444,236 Z" fill="${C.cap}" stroke="${C.out}" stroke-width="7"/>
  <path d="M300,110 L300,230" stroke="${C.capHi}" stroke-width="4"/>
  <path d="M198,166 Q232,126 284,118" fill="none" stroke="${C.capHi}" stroke-width="12" stroke-linecap="round" opacity="0.7"/>
  <circle cx="300" cy="108" r="9" fill="${C.cap}" stroke="${C.out}" stroke-width="5"/>
  <path d="M146,232 Q300,258 446,228 Q506,226 528,252 Q492,282 420,276 Q300,276 152,260 Q134,248 146,232 Z" fill="${C.cap}" stroke="${C.out}" stroke-width="7"/>
  <path d="M172,248 Q300,270 440,244 Q490,244 512,254" fill="none" stroke="${C.capHi}" stroke-width="4" opacity="0.6"/>
  ${faceSvg(face, st)}
  ${sweat ? sweatSvg(st) : ''}`;

  // a 3-point arm (shoulder, elbow, hand) as 4 points, so any two poses blend joint by joint
  const four = (pts) => (pts.length === 4 ? pts : [pts[0], pts[1], [(pts[1][0] + pts[2][0]) / 2, (pts[1][1] + pts[2][1]) / 2], pts[2]]);

  const headSvg = (face, sweat, st) => (isTurned(st) ? headTurned(face, sweat, st) : headFront(face, sweat, st));

  // ---------- turnable body (yaw / headYaw / walk set) ----------
  const isTurned = (st) => !!st && (st.yaw !== undefined || st.headYaw !== undefined || !!st.walk);

  // one <path d="M… M…" …/> holding two strokes (brows, arc eyes) → each stroke wrapped round the head
  const wrapStrokes = (pathEl, yaw) => {
    const m = pathEl.match(/<path d="([^"]+)"([^>]*)\/>/);
    if (!m) return wrapAround(pathEl, 300, 300, 150, yaw);
    return m[1].split(/(?=M)/).map((d) => wrapAround(`<path d="${d.trim()}"${m[2]}/>`, pathCx(d), 300, 150, yaw, 0.62, 55, 0.3)).join('');
  };

  // cap peak worn to one side: a plate round the cap band at angle th (0 = toward camera)
  const capPeak = (yaw) => {
    const th = (76 + yaw) * DEG, half = 0.62, N = 18, R0 = 146, yb = 244;
    const P = (phi, r) => [300 + r * Math.sin(phi), yb + r * Math.cos(phi) * 0.1 + (r - R0) * 0.12];
    const outer = [], inner = [], hi = [];
    for (let i = 0; i <= N; i++) {
      const phi = th - half + (2 * half * i) / N, u = (phi - th) / half;
      const r = R0 + 92 * Math.pow(Math.max(0, Math.cos((u * Math.PI) / 2)), 0.7);
      outer.push(P(phi, r)); inner.push(P(phi, R0)); hi.push(P(phi, R0 + (r - R0) * 0.55));
    }
    const pts = (a) => a.map((p) => p.map(r2).join(',')).join(' L');
    const d = `M${pts(outer)} L${pts(inner.reverse())} Z`;
    const svg = `<path d="${d}" fill="${C.cap}" stroke="${C.out}" stroke-width="7" stroke-linejoin="round"/><path d="M${pts(hi.slice(3, -3))}" fill="none" stroke="${C.capHi}" stroke-width="4" opacity="0.6"/>`;
    return { svg, front: Math.cos(th) > -0.05 };
  };

  const headTurned = (face, sweat, st) => {
    const hy = st.headYaw ?? st.yaw ?? 0, hr = hy * DEG;
    const f = parts[face];
    const eyes = f.eyes.map((e) => (e.kind === 'arc' ? wrapStrokes(eyeSvg(e, C, st), hy) : wrapAround(eyeSvg(e, C, st), e.cx, 300, 150, hy, 0.62, 55, 0.3))).join('');
    const browsRaw = wrapStrokes(f.brows, hy);
    const brows = st.brow ? `<g transform="translate(0,${r2(st.brow)})">${browsRaw}</g>` : browsRaw;
    const mouthSvg = st.mouth && st.mouth !== 'X' && MOUTH_SHAPES[st.mouth] ? talkMouth(st.mouth, face, C, `${uid}m`, st.mouthOpen) : f.mouth;
    const mouth = wrapAround(mouthSvg, 300, 300, 150, hy, 0.5, 55, 0.3);
    const peak = capPeak(hy);
    // the strap opening at the back of the cap shows when he turns away
    const bk = around(300, 300, 150, hy + 180);
    const strap = bk.k > 0.05 ? `<g opacity="${r2(smoothstep((bk.k - 0.05) / 0.3))}" transform="translate(${r2(bk.x)},0) scale(${r2(Math.max(0.2, bk.k))},1)"><path d="M-30,236 Q0,188 30,236 Z" fill="${C.head}" stroke="${C.out}" stroke-width="6"/><path d="M-34,234 L34,234" stroke="${C.capHi}" stroke-width="6"/></g>` : '';
    const seam = wrapAround(`<path d="M300,110 L300,230" stroke="${C.capHi}" stroke-width="4"/>`, 300, 300, 150, hy);
    const shine = wrapAround(`<path d="M198,166 Q232,126 284,118" fill="none" stroke="${C.capHi}" stroke-width="12" stroke-linecap="round" opacity="0.7"/>`, 240, 300, 150, hy, 0.4);
    const shadeX = 284 + 16 * Math.sin(hr);
    return `
  ${peak.front ? '' : peak.svg}
  <clipPath id="${uid}hc"><ellipse cx="300" cy="258" rx="150" ry="140"/></clipPath>
  <ellipse cx="300" cy="258" rx="150" ry="140" fill="${C.shade}"/>
  <g clip-path="url(#${uid}hc)">
    <ellipse cx="${r2(shadeX)}" cy="250" rx="140" ry="134" fill="${C.head}"/>
    <ellipse cx="300" cy="268" rx="160" ry="26" fill="#000" opacity="0.12"/>
    ${eyes}${brows}${mouth}
    ${sweat ? wrapAround(sweatSvg(st), 182, 300, 150, hy) : ''}
  </g>
  <ellipse cx="300" cy="258" rx="150" ry="140" fill="none" stroke="${C.out}" stroke-width="7"/>
  <path d="M156,236 C156,138 230,106 300,106 C370,106 444,138 444,236 Z" fill="${C.cap}" stroke="${C.out}" stroke-width="7"/>
  <clipPath id="${uid}cd"><path d="M156,236 C156,138 230,106 300,106 C370,106 444,138 444,236 Z"/></clipPath>
  <g clip-path="url(#${uid}cd)">${seam}${shine}${strap}</g>
  <circle cx="300" cy="108" r="9" fill="${C.cap}" stroke="${C.out}" stroke-width="5"/>
  <path d="M146,232 Q300,258 446,228 Q456,250 440,270 Q300,280 152,260 Q134,248 146,232 Z" fill="${C.cap}" stroke="${C.out}" stroke-width="7"/>
  ${peak.front ? peak.svg : ''}`;
  };

  const poseTurned = ({ arms, face, sweat }, s) => {
    const by = s.yaw ?? 0, hy = s.headYaw ?? by, bR = by * DEG, hR = hy * DEG;
    const sinB = Math.sin(bR), cosB = Math.cos(bR);
    const tw = s.tween && s.tween.from !== arms && ARMS[s.tween.from] ? s.tween : null;
    const lay = tw && tw.p < 0.5 ? tw.from : arms;
    const shrug = s.shrug ?? 0;
    const k = 0.014 * (s.breath ?? 0);
    const shoulderRise = 228 * k + 16 * shrug, headRise = 270 * k + 12 * shrug;
    const hd = s.head ?? {};
    const HP = [300, 420];

    // walk: phase 0..1 = two steps; stance feet slide back at the body's speed (planted on the ground)
    const wk = s.walk;
    const ph = wk?.phase ?? 0, S = wk?.stride ?? 0, LIFT = wk?.lift ?? S * 0.5;
    const bob = wk ? (wk.bob ?? S * 0.1) * Math.cos(4 * Math.PI * ph) : 0;
    const legStep = (i) => {
      if (!wk) return { f: 0, up: 0 };
      const q = (((ph + i * 0.5) % 1) + 1) % 1;
      if (q < 0.5) return { f: S * (1 - 4 * q), up: 0 };
      const u = (q - 0.5) / 0.5;
      return { f: S * (-1 + 2 * smoothstep(u)), up: LIFT * Math.sin(Math.PI * u) };
    };
    const armFwd = (i) => (wk ? -Math.cos(2 * Math.PI * (ph + i * 0.5)) : 0);

    // head: rotation, rise and the turn (points on the head keep their place round it)
    const headPt = (p) => {
      const q = rot([300 + (p[0] - 300) * Math.cos(hR), p[1]], hd.rot ?? 0, HP);
      return [q[0] + (hd.dx ?? 0), q[1] + (hd.dy ?? 0) - headRise];
    };
    const headT = `translate(${r2(hd.dx ?? 0)},${r2((hd.dy ?? 0) - headRise)}) rotate(${r2(hd.rot ?? 0)} ${HP[0]} ${HP[1]})`;

    // arms: shoulders sit round the torso; front-view offsets from the shoulder squeeze with cos(yaw)
    const SH = { L: ARMS.down.L[0], R: ARMS.down.R[0] };
    const shX = (side) => 300 + (side === 'L' ? -1 : 1) * 102 * cosB;
    const depth = (side) => (side === 'L' ? sinB : -sinB); // > 0 = nearer the camera
    const armPts = (side) => {
      let base = ARMS[arms][side];
      if (tw) { const a = four(ARMS[tw.from][side]), b = four(base); base = a.map((p, i) => [p[0] + (b[i][0] - p[0]) * tw.p, p[1] + (b[i][1] - p[1]) * tw.p]); }
      const life = ARM_LIFE[lay]?.[side] ?? 'body';
      const s0 = SH[side], sx = shX(side);
      const turn = (p) => [sx + (p[0] - s0[0]) * cosB, p[1]];
      const up = (p) => [p[0], p[1] - shoulderRise];
      if (life === 'hang') {
        const swing = -(wk?.swing ?? 22) * armFwd(side === 'L' ? 0 : 1) * sinB;
        const a = (side === 'L' ? s.armL ?? 0 : s.armR ?? 0) + (side === 'L' ? 8 : -8) * shrug + swing;
        const sh = up(turn(base[0]));
        return base.map((p) => rot(up(turn(p)), a, sh));
      }
      if (life === 'fixed') return base.map((p, i) => { const t = turn(p); return i === 0 ? up(t) : i === base.length - 1 ? t : [t[0], t[1] - shoulderRise / 2]; });
      if (life === 'head') return base.map((p, i) => {
        if (i === 0) return up(turn(p));
        if (i === base.length - 1) return headPt(p);
        const h = headPt(p), t = turn(p); return [(t[0] + h[0]) / 2, (t[1] - shoulderRise + h[1]) / 2];
      });
      return base.map((p) => up(turn(p)));
    };
    const L = armPts('L'), R = armPts('R');
    const armSvg = (pts) => limb(pts, 56, C.hood) + hand(pts.at(-1));
    const side3 = Math.abs(sinB) > 0.25;
    const far = depth('L') < 0 ? 'L' : 'R', near = far === 'L' ? 'R' : 'L';
    const P = { L, R };
    let armsBack = '', armsFront = '';
    if (lay === 'up') armsBack = armSvg(L) + armSvg(R);
    else if (lay === 'crossed') armsFront = armSvg(R) + armSvg(L);
    else if (side3) { armsBack = armSvg(P[far]); armsFront = armSvg(P[near]); }
    else armsFront = limb(L, 56, C.hood) + limb(R, 56, C.hood) + hand(L.at(-1)) + hand(R.at(-1));

    const holds = (id) => (arms === id && (!tw || tw.p > 0.75)) || (tw?.from === id && tw.p < 0.25);
    const atHand = (base, art, spin = 0) => {
      const h = R.at(-1);
      return `<g transform="translate(${r2(h[0] - base[0])},${r2(h[1] - base[1])})${spin ? ` rotate(${r2(spin)} ${base[0]} ${base[1]})` : ''}">${art}</g>`;
    };
    const phoneArt = `<g transform="rotate(14 474 318)"><rect x="452" y="262" width="44" height="88" rx="10" fill="#10141f" stroke="${C.out}" stroke-width="6"/><rect x="459" y="272" width="30" height="62" rx="5" fill="#9fd3ff" opacity="0.85"/></g>` + hand([478, 352]);
    const phone = holds('phone') ? atHand([478, 352], phoneArt, hd.rot ?? 0) : '';
    const phoneBehind = Math.sin(hR) > 0.3; // his left ear (phone side) turns away from camera
    const pen = holds('sign') ? atHand([352, 598], `<path d="M366,574 L326,650" stroke="${C.out}" stroke-width="10" stroke-linecap="round"/>`) : '';

    // torso: round in section (deeper than wide is not true — 0.65 deep), so it narrows in profile
    const twf = Math.sqrt(cosB * cosB + 0.42 * sinB * sinB);
    const strAng = (s.strings ?? 0) * DEG;
    const front = `<path d="M226,586 L374,586 L392,650 L208,650 Z" fill="${C.hoodDk}" stroke="${C.out}" stroke-width="4" opacity="0.85"/><path d="M282,424 L${r2(276 + Math.sin(strAng) * 82)},506 M318,424 L${r2(324 + Math.sin(strAng) * 82)},506" stroke="${C.strings}" stroke-width="6" stroke-linecap="round"/>`;
    const hoodBack = `<path d="M226,404 Q300,382 374,404 Q388,480 300,512 Q212,480 226,404 Z" fill="${C.hoodDk}" stroke="${C.out}" stroke-width="6"/><path d="M300,424 L300,500" stroke="${C.out}" stroke-width="3" opacity="0.35"/>`;
    const torso = `<g transform="translate(300,0) scale(${r2(twf)},1) translate(-300,0)">
  <ellipse cx="300" cy="398" rx="118" ry="40" fill="${C.hoodDk}" stroke="${C.out}" stroke-width="6"/>
  <path d="M185,420 C215,392 385,392 415,420 L446,668 C380,692 220,692 154,668 Z" fill="${C.hood}" stroke="${C.out}" stroke-width="7"/></g>
  ${wrapTorso(front, 300, by)}${wrapTorso(hoodBack, 300, by, true)}`;

    // legs: hips round the pelvis; feet step along the facing direction (x in profile, depth in front)
    const legSvg = (i) => {
      const side = i ? 1 : -1, { f, up } = legStep(i);
      const hx = 300 + side * 50 * cosB, hyy = 660 + bob;
      const fx = hx + side * 10 * cosB + f * sinB, fy = 880 - up + f * cosB * 0.07;
      const bend = (8 + up * 0.55) * (Math.abs(sinB) > 0.05 ? Math.sign(sinB) : 0);
      const kx = (hx + fx) / 2 + bend * Math.abs(sinB), ky = (hyy + fy) / 2;
      const rx = 58 + 14 * Math.abs(sinB);
      const toe = 22 * sinB;
      const tilt = -Math.sign(sinB || 1) * up * 0.35;
      return limb([[hx, hyy], [kx, ky], [fx, fy]], 60, C.jeans)
        + `<ellipse cx="${r2(fx + toe - side * 18 * cosB)}" cy="${r2(fy + 22)}" rx="${r2(rx)}" ry="27" fill="${C.shoe}" stroke="${C.out}" stroke-width="6" transform="rotate(${r2(tilt)} ${r2(fx)} ${r2(fy + 22)})"/>`;
    };
    const legL = legSvg(0), legR = legSvg(1);
    const legs = depth('L') >= 0 ? legR + legL : legL + legR;

    const head = `<g transform="translate(300,402) scale(1.22) translate(-300,-398)">${headSvg(face, sweat, s)}</g>`;
    const upper = `
  ${armsBack}
  <g transform="translate(300,668) scale(${r2(1 + k * 0.3)},${r2(1 + k)}) translate(-300,-668)">${torso}</g>
  ${armsFront}${pen}
  ${phoneBehind ? phone : ''}
  <g transform="${headT}">${head}</g>
  ${phoneBehind ? '' : phone}`;
    const body = `${legs}<g transform="translate(0,${r2(bob)})">${upper}</g>`;
    const lean = (s.body ?? 0) + (wk ? 2.5 * sinB : 0);
    const t = `${lean ? `rotate(${r2(lean)} 300 905)` : ''}${s.squash ? ` translate(300,905) scale(${r2(1 + s.squash * 0.5)},${r2(1 - s.squash)}) translate(-300,-905)` : ''}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-20 0 640 1000">
  <ellipse cx="300" cy="928" rx="${r2(170 * (0.75 + 0.25 * Math.abs(cosB)))}" ry="20" fill="#000" opacity="0.28"/>
  ${t ? `<g transform="${t}">${body}</g>` : body}
</svg>`;
  };

  const pose = ({ arms = 'down', face = 'worried', sweat = false }, st) => {
    if (isTurned(st)) return poseTurned({ arms, face, sweat }, st);
    const live = !!st;
    const s = st ?? {};
    // pose change in progress: arms blend from `tween.from` (p 0 → 1, may overshoot past 1)
    const tw = live && s.tween && s.tween.from !== arms && ARMS[s.tween.from] ? s.tween : null;
    const early = tw && tw.p < 0.5; // layering and arm behaviour switch halfway through the move
    const lay = early ? tw.from : arms;
    const shrug = s.shrug ?? 0;
    // breathing: the torso stretches up from the hip line; shoulders and head ride on top (+ shrug)
    const k = 0.014 * (s.breath ?? 0);
    const shoulderRise = 228 * k + 16 * shrug, headRise = 270 * k + 12 * shrug;
    const hd = s.head ?? {};
    const HP = [300, 420]; // neck pivot
    const headPt = (p) => { const q = rot(p, hd.rot ?? 0, HP); return [q[0] + (hd.dx ?? 0), q[1] + (hd.dy ?? 0) - headRise]; };
    const headT = `translate(${r2(hd.dx ?? 0)},${r2((hd.dy ?? 0) - headRise)}) rotate(${r2(hd.rot ?? 0)} ${HP[0]} ${HP[1]})`;

    const armPts = (side) => {
      if (!live) return ARMS[arms][side];
      let base = ARMS[arms][side];
      if (tw) { const a = four(ARMS[tw.from][side]), b = four(base); base = a.map((p, i) => [p[0] + (b[i][0] - p[0]) * tw.p, p[1] + (b[i][1] - p[1]) * tw.p]); }
      const life = ARM_LIFE[lay]?.[side] ?? 'body';
      const up = (p) => [p[0], p[1] - shoulderRise];
      if (life === 'hang') { const sh = up(base[0]); const a = (side === 'L' ? s.armL ?? 0 : s.armR ?? 0) + (side === 'L' ? 8 : -8) * shrug; return base.map((p) => rot(up(p), a, sh)); }
      if (life === 'fixed') return base.map((p, i) => (i === 0 ? up(p) : i === base.length - 1 ? p : [p[0], p[1] - shoulderRise / 2]));
      if (life === 'head') return base.map((p, i) => {
        if (i === 0) return up(p);
        if (i === base.length - 1) return headPt(p);
        const h = headPt(p); return [(p[0] + h[0]) / 2, (p[1] - shoulderRise + h[1]) / 2];
      });
      return base.map(up);
    };
    const L = armPts('L'), R = armPts('R');
    const back = lay === 'crossed' ? '' : limb(L, 56, C.hood) + limb(R, 56, C.hood);
    const front = lay === 'crossed' ? limb(R, 56, C.hood) + hand(R.at(-1)) + limb(L, 56, C.hood) + hand(L.at(-1)) : '';
    const hands = lay === 'crossed' ? '' : hand(L.at(-1)) + hand(R.at(-1));
    // props ride on the right hand; while the arm travels they show only near their own pose
    const holds = (id) => (arms === id && (!tw || tw.p > 0.75)) || (tw?.from === id && tw.p < 0.25);
    const atHand = (base, art, spin = 0) => {
      if (!live) return art;
      const h = R.at(-1);
      return `<g transform="translate(${r2(h[0] - base[0])},${r2(h[1] - base[1])})${spin ? ` rotate(${r2(spin)} ${base[0]} ${base[1]})` : ''}">${art}</g>`;
    };
    const phoneArt = `<g transform="rotate(14 474 318)"><rect x="452" y="262" width="44" height="88" rx="10" fill="#10141f" stroke="${C.out}" stroke-width="6"/><rect x="459" y="272" width="30" height="62" rx="5" fill="#9fd3ff" opacity="0.85"/></g>` + hand([478, 352]);
    const phone = holds('phone') ? atHand([478, 352], phoneArt, hd.rot ?? 0) : '';
    const pen = holds('sign') ? atHand([352, 598], `<path d="M366,574 L326,650" stroke="${C.out}" stroke-width="10" stroke-linecap="round"/>`) : '';
    // arms raised go behind the torso; hanging arms sit in front of it
    const armsBehind = lay === 'up';
    const strings = s.strings
      ? `<path d="M282,424 L${r2(276 + Math.sin((s.strings * Math.PI) / 180) * 82)},506 M318,424 L${r2(324 + Math.sin((s.strings * Math.PI) / 180) * 82)},506" stroke="${C.strings}" stroke-width="6" stroke-linecap="round"/>`
      : `<path d="M282,424 L276,506 M318,424 L324,506" stroke="${C.strings}" stroke-width="6" stroke-linecap="round"/>`;
    const torso = `<ellipse cx="300" cy="398" rx="118" ry="40" fill="${C.hoodDk}" stroke="${C.out}" stroke-width="6"/>
  <path d="M185,420 C215,392 385,392 415,420 L446,668 C380,692 220,692 154,668 Z" fill="${C.hood}" stroke="${C.out}" stroke-width="7"/>
  <path d="M226,586 L374,586 L392,650 L208,650 Z" fill="${C.hoodDk}" stroke="${C.out}" stroke-width="4" opacity="0.85"/>
  ${strings}`;
    const head = `<g transform="translate(300,402) scale(1.22) translate(-300,-398)">${headSvg(face, sweat, st)}</g>`;
    const body = `${limb([[250, 660], [240, 880]], 60, C.jeans)}${limb([[350, 660], [360, 880]], 60, C.jeans)}
  <ellipse cx="222" cy="902" rx="58" ry="27" fill="${C.shoe}" stroke="${C.out}" stroke-width="6"/>
  <ellipse cx="378" cy="902" rx="58" ry="27" fill="${C.shoe}" stroke="${C.out}" stroke-width="6"/>
  <path d="M168,912 Q222,924 276,912 M324,912 Q378,924 432,912" fill="none" stroke="${C.out}" stroke-width="4" opacity="0.5"/>
  ${armsBehind ? back + hands : ''}
  ${live ? `<g transform="translate(300,668) scale(${r2(1 + k * 0.3)},${r2(1 + k)}) translate(-300,-668)">${torso}</g>` : torso}
  ${armsBehind ? '' : back + hands}
  ${front}${pen}
  ${live ? `<g transform="${headT}">${head}</g>` : head}
  ${phone}`;
    const size = live ? 'width="100%" height="100%"' : 'width="640" height="1000"';
    return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="-20 0 640 1000">
  <ellipse cx="300" cy="928" rx="170" ry="20" fill="#000" opacity="0.28"/>
  ${live && (s.body || s.squash) ? `<g transform="${s.body ? `rotate(${r2(s.body)} 300 905)` : ''}${s.squash ? ` translate(300,905) scale(${r2(1 + s.squash * 0.5)},${r2(1 - s.squash)}) translate(-300,-905)` : ''}">${body}</g>` : body}
</svg>`;
  };

  const bust = (face, sweat, st) => {
    const live = !!st;
    const s = st ?? {};
    const k = 0.014 * (s.breath ?? 0);
    const hd = s.head ?? {};
    const shoulders = `<path d="M70,690 C70,540 170,462 300,462 C430,462 530,540 530,690 Z" fill="${C.hood}" stroke="${C.out}" stroke-width="7"/>
  <path d="M282,470 L276,560 M318,470 L324,560" stroke="${C.strings}" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="300" cy="420" rx="130" ry="44" fill="${C.hoodDk}" stroke="${C.out}" stroke-width="6"/>`;
    const head = `<g transform="translate(0,20)">${headSvg(face, sweat, st)}</g>`;
    const size = live ? 'width="100%" height="100%"' : 'width="680" height="640"';
    if (!live) return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="-40 40 680 640">
  ${shoulders}
  ${head}
</svg>`;
    const shrug = s.shrug ?? 0, sq = s.squash ?? 0;
    const inner = `<g transform="translate(300,700) scale(${r2(1 + k * 0.3)},${r2(1 + k + shrug * 0.07)}) translate(-300,-700)">${shoulders}</g>
  <g transform="translate(${r2(hd.dx ?? 0)},${r2((hd.dy ?? 0) - 240 * k - 14 * shrug)}) rotate(${r2(hd.rot ?? 0)} 300 450)">${head}</g>`;
    const t = [s.body ? `rotate(${r2(s.body * 0.6)} 300 720)` : '', sq ? `translate(300,700) scale(${r2(1 + sq * 0.5)},${r2(1 - sq)}) translate(-300,-700)` : ''].filter(Boolean).join(' ');
    return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="-40 40 680 640">
  ${t ? `<g transform="${t}">${inner}</g>` : inner}
</svg>`;
  };

  return { pose, bust };
}
