// Scene art for the studio library (code-drawn, free). Each function returns an SVG; RUN lists the
// files written to this folder. Add a scene: write a function, add it to RUN, run
//   node studio/library/scenes/make.mjs [id ...]
// then describe it (size, kind, placement hints) in index.json.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

const C = {
  out: '#15151a', head: '#f6f4ee', shade: '#dcd8cc', cap: '#1b2231', capHi: '#34405e',
  hood: '#3b4150', hoodDk: '#2a2f3a', jeans: '#27324a', shoe: '#f2f0ea', sweat: '#9fd3ff',
  pink: '#ff3d7f', moon: '#f3ead2',
};

// ---------- scenes ----------
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function seaBg() {
  const r = rng(7);
  let stars = '';
  for (let i = 0; i < 90; i++) stars += `<circle cx="${(r() * 1080).toFixed(0)}" cy="${(r() * 820).toFixed(0)}" r="${(0.8 + r() * 2.2).toFixed(1)}" fill="#fff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
  let waves = '';
  for (let i = 0; i < 70; i++) {
    const y = 1030 + Math.pow(r(), 1.4) * 880, x = r() * 1080, w = 30 + (y - 1000) / 9 * r();
    waves += `<path d="M${x.toFixed(0)},${y.toFixed(0)} q${(w / 2).toFixed(0)},-8 ${w.toFixed(0)},0" fill="none" stroke="#3a5583" stroke-width="${(2 + (y - 1000) / 260).toFixed(1)}" opacity="0.5" stroke-linecap="round"/>`;
  }
  let glints = '';
  for (let i = 0; i < 22; i++) {
    const y = 1020 + i * 22, w = 120 - i * 3.5 + r() * 40;
    glints += `<rect x="${(790 - w / 2 + (r() - 0.5) * 40).toFixed(0)}" y="${y}" width="${w.toFixed(0)}" height="5" rx="2.5" fill="${C.moon}" opacity="${(0.45 - i * 0.017).toFixed(2)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060a15"/><stop offset="1" stop-color="#1c2c4a"/></linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16274a"/><stop offset="1" stop-color="#060b17"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="${C.moon}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.moon}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1080" height="1010" fill="url(#sky)"/>${stars}
  <circle cx="790" cy="380" r="240" fill="url(#glow)"/>
  <circle cx="790" cy="380" r="66" fill="${C.moon}"/><circle cx="770" cy="365" r="12" fill="#e2d6b8"/><circle cx="812" cy="398" r="8" fill="#e2d6b8"/>
  <path d="M0,1012 L0,955 Q110,925 230,962 Q320,990 430,1012 Z" fill="#0a1222"/>
  <path d="M1080,1012 L1080,975 Q1000,960 930,985 Q880,1000 820,1012 Z" fill="#0a1222"/>
  <rect y="1008" width="1080" height="912" fill="url(#sea)"/>${glints}${waves}
</svg>`;
}

const boat = () => `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="250">
  <path d="M150,122 L182,66 L266,66 L288,122 Z" fill="#a9bed6" fill-opacity="0.55" stroke="${C.out}" stroke-width="6"/>
  <rect x="384" y="70" width="34" height="70" rx="8" fill="#2a2f3a" stroke="${C.out}" stroke-width="6"/>
  <path d="M18,120 L412,120 L360,204 L72,204 Z" fill="#e9e5da" stroke="${C.out}" stroke-width="7"/>
  <path d="M34,146 L396,146 L384,166 L48,166 Z" fill="${C.pink}"/>
  <path d="M0,198 Q55,184 110,198 T220,198 T330,198 T440,198 L440,250 L0,250 Z" fill="#10203d"/>
  <path d="M0,198 Q55,184 110,198 T220,198 T330,198 T440,198" fill="none" stroke="#4d6a9c" stroke-width="5"/>
</svg>`;

const shore = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="700">
  <path d="M0,250 Q300,168 600,218 Q850,258 1080,196 L1080,700 L0,700 Z" fill="#11151f"/>
  <path d="M0,250 Q300,168 600,218 Q850,258 1080,196" fill="none" stroke="#2e3f62" stroke-width="7"/>
  <ellipse cx="140" cy="300" rx="90" ry="36" fill="#0b0e16"/><ellipse cx="930" cy="290" rx="70" ry="26" fill="#0b0e16"/>
  <path d="M60,236 l-12,-50 M72,236 l4,-58 M84,238 l16,-46 M990,204 l-10,-44 M1002,204 l6,-52 M1014,206 l14,-40" stroke="#1f2a40" stroke-width="7" stroke-linecap="round"/>
</svg>`;

const W = (w, h, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${defs}
  <filter id="b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="b20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter></defs>${body}</svg>`;

const helicopter = () => W(520, 240, `
  <path d="M20,44 L400,44" stroke="#05070d" stroke-width="9" stroke-linecap="round"/>
  <rect x="196" y="44" width="14" height="30" fill="#05070d"/>
  <path d="M280,104 L470,96 L470,116 L280,128 Z" fill="#05070d"/>
  <circle cx="470" cy="100" r="30" fill="none" stroke="#05070d" stroke-width="7"/>
  <ellipse cx="190" cy="122" rx="122" ry="58" fill="#070a12"/>
  <path d="M96,112 Q110,78 170,76 L170,124 L96,124 Z" fill="#1f3354" opacity="0.9"/>
  <path d="M110,196 L290,196 M140,178 L130,196 M250,178 L262,196" stroke="#05070d" stroke-width="7" stroke-linecap="round"/>
  <circle cx="290" cy="150" r="6" fill="${C.pink}"/><circle cx="290" cy="150" r="16" fill="${C.pink}" opacity="0.35" filter="url(#b6)"/>
  <circle cx="150" cy="176" r="12" fill="#fffbe8"/>`);

const beam = () => W(760, 1500, `
  <path d="M362,0 L398,0 L760,1380 L0,1380 Z" fill="url(#bg)" filter="url(#b6)"/>
  <ellipse cx="380" cy="1390" rx="380" ry="90" fill="#fffbe8" opacity="0.28" filter="url(#b20)"/>`,
  `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe8" stop-opacity="0.75"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0.12"/></linearGradient>`);

function motelExt() {
  const r = rng(11);
  let stars = '', rooms = '';
  for (let i = 0; i < 50; i++) stars += `<circle cx="${(r() * 1080).toFixed(0)}" cy="${(r() * 700).toFixed(0)}" r="${(0.8 + r() * 1.8).toFixed(1)}" fill="#fff" opacity="${(0.2 + r() * 0.5).toFixed(2)}"/>`;
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 205, lit = [1, 0, 1, 1, 0][i];
    rooms += `<rect x="${x}" y="1180" width="78" height="190" rx="4" fill="#3b2f47" stroke="#15151a" stroke-width="5"/>
    <rect x="${x + 100}" y="1200" width="86" height="80" rx="4" fill="${lit ? '#f4c66b' : '#1a1622'}" opacity="${lit ? 0.85 : 1}" stroke="#15151a" stroke-width="5"/>
    <circle cx="${x + 66}" cy="1280" r="5" fill="#d9c08a"/>`;
  }
  return W(1080, 1920, `
  <rect width="1080" height="1920" fill="url(#msky)"/>${stars}
  <rect x="0" y="1060" width="1080" height="110" fill="#1b1622"/>
  <rect x="0" y="1150" width="1080" height="250" fill="#2a2233"/>
  <rect x="0" y="1150" width="1080" height="16" fill="#3a3045"/>${rooms}
  <rect x="0" y="1390" width="1080" height="530" fill="#100e15"/>
  <path d="M120,1560 L230,1920 M470,1560 L520,1920 M820,1560 L800,1920" stroke="#2a2633" stroke-width="10"/>
  <ellipse cx="300" cy="1450" rx="420" ry="90" fill="${C.pink}" opacity="0.18" filter="url(#b20)"/>
  <rect x="290" y="760" width="22" height="640" fill="#1a1720"/>
  <rect x="96" y="560" width="420" height="210" rx="22" fill="#15121c" stroke="#2d2738" stroke-width="8"/>
  <text x="306" y="702" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="112" fill="${C.pink}" filter="url(#b20)" opacity="0.9">MOTEL</text>
  <text x="306" y="702" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="112" fill="#ffd1e1" stroke="${C.pink}" stroke-width="4">MOTEL</text>`,
  `<linearGradient id="msky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060a15"/><stop offset="1" stop-color="#241a33"/></linearGradient>`);
}

function deskBg() {
  let keys = '';
  for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
    const x = 690 + i * 72, y = 600 + row * 130, hang = (row + i) % 3 !== 1;
    keys += `<circle cx="${x}" cy="${y}" r="6" fill="#d4a64a"/>` + (hang ? `<path d="M${x},${y} l0,26" stroke="#d4a64a" stroke-width="5"/><rect x="${x - 15}" y="${y + 26}" width="30" height="46" rx="6" fill="${C.pink}" opacity="0.85"/>` : '');
  }
  let stripes = '';
  for (let x = 0; x < 1080; x += 90) stripes += `<rect x="${x}" y="0" width="44" height="1920" fill="#33283a" opacity="0.6"/>`;
  return W(1080, 1920, `
  <rect width="1080" height="1920" fill="#271e2d"/>${stripes}
  <ellipse cx="200" cy="420" rx="420" ry="360" fill="#f4c66b" opacity="0.16" filter="url(#b20)"/>
  <rect x="640" y="540" width="340" height="320" rx="14" fill="#4a3428" stroke="#15151a" stroke-width="7"/>${keys}
  <rect x="0" y="1460" width="1080" height="460" fill="#1a141e"/>`);
}

const counterFg = () => W(1080, 820, `
  <path d="M0,40 L1080,40 L1080,210 L0,210 Z" fill="#6b4a37"/>
  <path d="M0,40 L1080,40" stroke="#8a6248" stroke-width="10"/>
  <rect x="0" y="200" width="1080" height="620" fill="#3b281f"/>
  <path d="M0,214 L1080,214" stroke="#15151a" stroke-width="8"/>
  ${[180, 400, 680, 900].map((x) => `<rect x="${x - 80}" y="270" width="160" height="480" rx="10" fill="none" stroke="#2c1d16" stroke-width="10"/>`).join('')}
  <path d="M300,70 L780,70 L840,190 L240,190 Z" fill="#f1ead9" stroke="#15151a" stroke-width="6"/>
  <path d="M540,70 L540,190" stroke="#c9bfa6" stroke-width="5"/>
  ${[100, 125, 150].map((y) => `<path d="M${300 - (y - 70) / 2},${y} L${520},${y} M${560},${y} L${780 + (y - 70) / 2},${y}" stroke="#c9bfa6" stroke-width="3"/>`).join('')}
  <ellipse cx="930" cy="150" rx="56" ry="14" fill="#15151a"/><path d="M880,150 Q880,92 930,92 Q980,92 980,150 Z" fill="#d4a64a" stroke="#15151a" stroke-width="5"/><circle cx="930" cy="88" r="9" fill="#d4a64a" stroke="#15151a" stroke-width="4"/>`);

const tvFrame = () => W(1080, 1920, `
  <path fill-rule="evenodd" d="M0,0 H1080 V1920 H0 Z M200,650 Q170,650 170,690 V1160 Q170,1200 200,1200 H880 Q910,1200 910,1160 V690 Q910,650 880,650 Z" fill="#07080c"/>
  <path fill-rule="evenodd" d="M130,570 Q90,570 90,620 V1320 Q90,1370 130,1370 H950 Q990,1370 990,1320 V620 Q990,570 950,570 Z M200,650 Q170,650 170,690 V1160 Q170,1200 200,1200 H880 Q910,1200 910,1160 V690 Q910,650 880,650 Z" fill="#2b2b33" stroke="#15151a" stroke-width="8"/>
  <path fill="none" d="M200,650 Q170,650 170,690 V1160 Q170,1200 200,1200 H880 Q910,1200 910,1160 V690 Q910,650 880,650 Z" stroke="#111116" stroke-width="18"/>
  ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="200" y="${1236 + i * 14}" width="420" height="6" rx="3" fill="#1c1c22"/>`).join('')}
  <circle cx="780" cy="1282" r="34" fill="#1c1c22" stroke="#15151a" stroke-width="5"/><circle cx="870" cy="1282" r="24" fill="#1c1c22" stroke="#15151a" stroke-width="5"/>
  <rect x="200" y="1370" width="60" height="70" fill="#1c1c22"/><rect x="820" y="1370" width="60" height="70" fill="#1c1c22"/>
  <ellipse cx="540" cy="925" rx="560" ry="420" fill="#7fb8ff" opacity="0.08" filter="url(#b20)"/>`);

function roomBg() {
  let blinds = '';
  for (let i = 0; i < 9; i++) blinds += `<path d="M${-120 + i * 70},${300 + i * 34} L${520 + i * 70},${120 + i * 34} L${520 + i * 70},${150 + i * 34} L${-120 + i * 70},${330 + i * 34} Z" fill="${C.pink}" opacity="0.13"/>`;
  return W(1080, 1920, `
  <rect width="1080" height="1920" fill="url(#rwall)"/>${blinds}
  <rect x="620" y="640" width="360" height="900" fill="#0d0f17" stroke="#2a3042" stroke-width="16"/>
  <rect x="640" y="660" width="320" height="870" fill="#232a3a" stroke="#15151a" stroke-width="6"/>
  <rect x="680" y="720" width="240" height="320" rx="6" fill="none" stroke="#1a2030" stroke-width="8"/>
  <rect x="680" y="1110" width="240" height="360" rx="6" fill="none" stroke="#1a2030" stroke-width="8"/>
  <circle cx="800" cy="860" r="9" fill="#0b0d14" stroke="#3a4560" stroke-width="3"/>
  <circle cx="690" cy="1110" r="16" fill="#b9a46a" stroke="#15151a" stroke-width="4"/>
  <rect x="0" y="1530" width="1080" height="390" fill="#0b0d14"/>
  <rect x="640" y="1526" width="320" height="10" fill="#ffe2a8"/>
  <path d="M600,1536 L1000,1536 L1180,1920 L420,1920 Z" fill="#ffe2a8" opacity="0.14" filter="url(#b6)"/>
  <ellipse cx="0" cy="1100" rx="520" ry="900" fill="#7fb8ff" opacity="0.16" filter="url(#b20)"/>`,
  `<linearGradient id="rwall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1d2740"/><stop offset="1" stop-color="#0f121c"/></linearGradient>`);
}


// ---------- The Last Call (2026-10-14): prairie night, car in a ditch, headlights, fence, river, dog, porch ----------
const NIGHT_SKY = '<linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080f"/><stop offset="1" stop-color="#1a2440"/></linearGradient>';
const starsIn = (r, n, h) => { let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${(r() * 1080).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(0.8 + r() * 2).toFixed(1)}" fill="#fff" opacity="${(0.2 + r() * 0.55).toFixed(2)}"/>`; return o; };

function prairieBg() {
  const r = rng(23), H = 1000, VX = 540;
  let town = '';
  for (let i = 0; i < 34; i++) town += `<circle cx="${(690 + r() * 200).toFixed(0)}" cy="${(H - 4 - r() * 16).toFixed(0)}" r="${(1.6 + r() * 2.6).toFixed(1)}" fill="#ffd98a" opacity="${(0.6 + r() * 0.4).toFixed(2)}"/>`;
  let furrows = '';
  for (let i = -14; i <= 14; i++) { if (Math.abs(i) < 3) continue; furrows += `<path d="M${VX},${H} L${VX + i * 130},1920" stroke="#141c2e" stroke-width="${(2 + Math.abs(i) * 0.25).toFixed(1)}" opacity="0.7"/>`; }
  let poles = '';
  const pts = [0.06, 0.13, 0.24, 0.42, 0.7, 1.08].map((t) => [VX + 60 + t * 520, H + t * 640, 18 + t * 420]);
  pts.forEach(([x, y, h], i) => {
    poles += `<path d="M${x.toFixed(0)},${y.toFixed(0)} L${x.toFixed(0)},${(y - h).toFixed(0)} M${(x - h * 0.16).toFixed(0)},${(y - h * 0.92).toFixed(0)} L${(x + h * 0.16).toFixed(0)},${(y - h * 0.92).toFixed(0)}" stroke="#05070d" stroke-width="${(2 + h / 40).toFixed(1)}" stroke-linecap="round"/>`;
    if (i) {
      const [px, py, ph] = pts[i - 1];
      poles += `<path d="M${px.toFixed(0)},${(py - ph * 0.92).toFixed(0)} Q${((px + x) / 2).toFixed(0)},${((py - ph * 0.92 + y - h * 0.92) / 2 + 10 + h * 0.08).toFixed(0)} ${x.toFixed(0)},${(y - h * 0.92).toFixed(0)}" fill="none" stroke="#05070d" stroke-width="2.5"/>`;
    }
  });
  return W(1080, 1920, `<rect width="1080" height="1920" fill="url(#nsky)"/>${starsIn(r, 90, 820)}
  <ellipse cx="790" cy="${H}" rx="300" ry="90" fill="#f4c66b" opacity="0.32" filter="url(#b20)"/>
  <rect x="840" y="${H - 120}" width="34" height="112" fill="#0a0f1b"/><path d="M836,${H - 120} L857,${H - 150} L878,${H - 120} Z" fill="#0a0f1b"/><circle cx="857" cy="${H - 154}" r="4" fill="#ff5a5a"/>${town}
  <rect y="${H}" width="1080" height="${1920 - H}" fill="url(#field)"/>${furrows}
  <path d="M${VX - 6},${H} L${VX + 6},${H} L960,1920 L120,1920 Z" fill="#1c2232"/>
  <path d="M${VX - 6},${H} L120,1920 M${VX + 6},${H} L960,1920" stroke="#2c3550" stroke-width="5"/>
  <path d="M${VX - 8},${H} L40,1920 L0,1920 L0,1700 Z" fill="#070a12" opacity="0.8"/>${poles}`,
  NIGHT_SKY + '<linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1526"/><stop offset="1" stop-color="#06080e"/></linearGradient>');
}

// ---------- Layered prairie set (2026-10-15): the same road split into depth planes for parallax, haze and
// lighting — sky (z 0.05) · far horizon (0.15) · field + road (0.4) · poles (0.5). Light sources (moon, town
// glow, tower beacon) are scene `lights`, so the art leaves them dim; see sets/prairie-road.json.
// Set planes render at 2× (2160 wide) so close-ups and tracking shots stay sharp.
const PH = 1000, PVX = 540;
function prairieSky() {
  const r = rng(41);
  let wisps = '';
  for (let i = 0; i < 7; i++) {
    const y = 380 + r() * 520, x = r() * 1080, w = 260 + r() * 420;
    wisps += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(w / 2).toFixed(0)}" ry="${(14 + r() * 26).toFixed(0)}" fill="#24345a" opacity="${(0.25 + r() * 0.25).toFixed(2)}" filter="url(#b20)"/>`;
  }
  return W(1080, 1920, `<rect width="1080" height="1920" fill="url(#psky)"/>${starsIn(r, 140, 900)}${wisps}
  <ellipse cx="540" cy="${PH}" rx="760" ry="170" fill="#33456e" opacity="0.45" filter="url(#b20)"/>
  <circle cx="196" cy="176" r="46" fill="#f3ead2" mask="url(#crescent)"/>`,
  `<linearGradient id="psky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03060d"/><stop offset="0.5" stop-color="#0d1730"/><stop offset="0.53" stop-color="#1d2a4a"/><stop offset="1" stop-color="#0b1120"/></linearGradient>
  <mask id="crescent"><rect width="1080" height="1920" fill="#fff"/><circle cx="216" cy="160" r="44" fill="#000"/></mask>`);
}

function prairieFar() {
  const r = rng(57);
  // tree line: irregular rounded crowns along the horizon, broken by gaps
  let trees = '';
  for (let x = -20; x < 1100;) {
    const gap = r() < 0.18;
    const w = 24 + r() * 46;
    if (!gap) { const h = 18 + r() * 34; trees += `<ellipse cx="${x.toFixed(0)}" cy="${(PH - h * 0.45).toFixed(0)}" rx="${(w * 0.6).toFixed(0)}" ry="${(h * 0.6).toFixed(0)}" fill="#070b15"/>`; }
    x += gap ? w * 2.2 : w * 0.55;
  }
  // farm (left): house, barn, silo, one lit window
  const farm = `<path d="M150,${PH - 6} L150,${PH - 34} L170,${PH - 50} L190,${PH - 34} L190,${PH - 6} Z" fill="#060a13"/>
  <rect x="160" y="${PH - 28}" width="8" height="7" fill="#ffd27a" opacity="0.9"/>
  <path d="M206,${PH - 6} L206,${PH - 30} L226,${PH - 44} L246,${PH - 30} L246,${PH - 6} Z" fill="#060a13"/>
  <rect x="252" y="${PH - 62}" width="16" height="58" rx="7" fill="#060a13"/>`;
  // town (right): low buildings, grain elevator, water tower, many small lights
  let town = '';
  const blds = [[680, 26, 30], [712, 40, 22], [736, 30, 34], [772, 52, 26], [800, 34, 40], [842, 24, 30], [874, 44, 24], [900, 28, 46], [948, 20, 34]];
  blds.forEach(([x, h, w]) => { town += `<rect x="${x}" y="${PH - h}" width="${w}" height="${h}" fill="#070b15"/>`; });
  town += `<path d="M780,${PH - 52} L780,${PH - 96} L792,${PH - 108} L804,${PH - 96} L804,${PH - 52} Z" fill="#070b15"/>`;
  for (let i = 0; i < 46; i++) town += `<rect x="${(684 + r() * 300).toFixed(0)}" y="${(PH - 6 - r() * 40).toFixed(0)}" width="${(2 + r() * 3).toFixed(1)}" height="${(2 + r() * 2).toFixed(1)}" fill="${r() < 0.8 ? '#ffd98a' : '#bfe0ff'}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
  const tower = `<rect x="852" y="${PH - 120}" width="5" height="114" fill="#070b15"/><rect x="866" y="${PH - 120}" width="5" height="114" fill="#070b15"/>
  <ellipse cx="861" cy="${PH - 136}" rx="30" ry="20" fill="#070b15"/><path d="M831,${PH - 140} L861,${PH - 166} L891,${PH - 140} Z" fill="#070b15"/>`;
  return W(1080, 1920, `${trees}${farm}${town}${tower}<rect y="${PH - 2}" width="1080" height="14" fill="#0a1020"/>`);
}

function prairieField() {
  const r = rng(73);
  let rows = '';
  for (let i = -18; i <= 18; i++) { if (Math.abs(i) < 2) continue; rows += `<path d="M${PVX + i * 6},${PH} L${PVX + i * 120},1920" stroke="#151d31" stroke-width="${(2 + Math.abs(i) * 0.3).toFixed(1)}" opacity="0.75"/>`; }
  // stubble: tiny marks that grow toward the camera (depth cue)
  let stub = '';
  for (let i = 0; i < 900; i++) {
    const t = Math.pow(r(), 1.7), y = PH + 8 + t * 910, x = r() * 1080;
    const edgeL = PVX - 8 - (y - PH) * 0.46, edgeR = PVX + 8 + (y - PH) * 0.46;
    if (x > edgeL - 30 && x < edgeR + 30) continue;
    const s = 1 + t * 7;
    stub += `<path d="M${x.toFixed(0)},${y.toFixed(0)} l${(r() - 0.5) * s * 0.6},${(-s).toFixed(1)}" stroke="${r() < 0.5 ? '#1f2a44' : '#0b101c'}" stroke-width="${(1 + t * 2.5).toFixed(1)}" stroke-linecap="round"/>`;
  }
  // gravel road with two worn ruts, speckle and soft shoulders
  let grav = '';
  for (let i = 0; i < 520; i++) {
    const t = Math.pow(r(), 1.5), y = PH + 4 + t * 916, half = 6 + (y - PH) * 0.45;
    const x = PVX + (r() * 2 - 1) * half, s = 0.6 + t * 3.4;
    grav += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="${r() < 0.6 ? '#2c3550' : '#151b2b'}"/>`;
  }
  const rut = (k) => `<path d="M${PVX + k * 2},${PH} L${PVX + k * 190},1920" stroke="#252e47" stroke-width="10" opacity="0.8"/><path d="M${PVX + k * 2},${PH} L${PVX + k * 190},1920" stroke="#0f1422" stroke-width="3" opacity="0.6"/>`;
  // ditches: dark trenches beside the road, with grass tufts on their lips
  const ditch = (s) => `<path d="M${PVX + s * 10},${PH} L${PVX + s * 560},1920 L${PVX + s * 640},1920 L${PVX + s * 14},${PH} Z" fill="#05080f" opacity="0.85"/>`;
  let tufts = '';
  for (let i = 0; i < 90; i++) {
    const t = Math.pow(r(), 1.3), y = PH + 10 + t * 900, s = r() < 0.5 ? -1 : 1;
    const x = PVX + s * (14 + (y - PH) * 0.62 + r() * 30 * t), h = 4 + t * 34;
    tufts += `<path d="M${x.toFixed(0)},${y.toFixed(0)} q${(-h * 0.2).toFixed(1)},${(-h * 0.6).toFixed(1)} ${(-h * 0.1).toFixed(1)},${(-h).toFixed(1)} M${x.toFixed(0)},${y.toFixed(0)} q${(h * 0.25).toFixed(1)},${(-h * 0.5).toFixed(1)} ${(h * 0.3).toFixed(1)},${(-h * 0.9).toFixed(1)}" stroke="#121a2c" stroke-width="${(1.5 + t * 3).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  }
  // a puddle in the near rut catching the sky
  const puddle = `<ellipse cx="${PVX + 150}" cy="1700" rx="86" ry="16" fill="#2b3d66" opacity="0.7"/><ellipse cx="${PVX + 140}" cy="1696" rx="40" ry="4" fill="#5b74a8" opacity="0.5"/>`;
  return W(1080, 1920, `<rect y="${PH}" width="1080" height="${1920 - PH}" fill="url(#pfield)"/>${rows}${stub}
  ${ditch(-1)}${ditch(1)}
  <path d="M${PVX - 8},${PH} L${PVX + 8},${PH} L${PVX + 420},1920 L${PVX - 420},1920 Z" fill="url(#proad)"/>${rut(-1)}${rut(1)}${grav}${puddle}${tufts}
  <rect y="${PH}" width="1080" height="70" fill="url(#pfade)"/>`,
  `<linearGradient id="pfield" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a2e"/><stop offset="1" stop-color="#05070d"/></linearGradient>
  <linearGradient id="proad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262f48"/><stop offset="1" stop-color="#191f30"/></linearGradient>
  <linearGradient id="pfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2744" stop-opacity="0.8"/><stop offset="1" stop-color="#1b2744" stop-opacity="0"/></linearGradient>`);
}

function prairiePoles() {
  let poles = '';
  const pts = [0.06, 0.13, 0.24, 0.42, 0.7, 1.08].map((t) => [PVX + 60 + t * 520, PH + t * 640, 18 + t * 420]);
  pts.forEach(([x, y, h], i) => {
    poles += `<path d="M${x.toFixed(0)},${y.toFixed(0)} L${x.toFixed(0)},${(y - h).toFixed(0)} M${(x - h * 0.16).toFixed(0)},${(y - h * 0.92).toFixed(0)} L${(x + h * 0.16).toFixed(0)},${(y - h * 0.92).toFixed(0)}" stroke="#05070d" stroke-width="${(2 + h / 40).toFixed(1)}" stroke-linecap="round"/>`;
    if (i) {
      const [px, py, ph] = pts[i - 1];
      for (const o of [-0.12, 0.12]) poles += `<path d="M${(px + ph * o).toFixed(0)},${(py - ph * 0.92).toFixed(0)} Q${((px + x) / 2).toFixed(0)},${((py - ph * 0.92 + y - h * 0.92) / 2 + 10 + h * 0.08).toFixed(0)} ${(x + h * o).toFixed(0)},${(y - h * 0.92).toFixed(0)}" fill="none" stroke="#05070d" stroke-width="${(1.5 + h / 260).toFixed(1)}"/>`;
    }
  });
  return W(1080, 1920, poles);
}

const grassRow = (n, y0, step, col, wdt) => Array.from({ length: n }, (_, i) => {
  const x = (10 + i * step) % 1080, h = 30 + ((i * 37) % 50);
  return `<path d="M${x.toFixed(0)},${y0 + (i % 3) * 8} q${i % 2 ? 6 : -6},-${h / 2} ${i % 2 ? 2 : -2},-${h}" fill="none" stroke="${col}" stroke-width="${wdt}" stroke-linecap="round"/>`;
}).join('');

const CAR_DITCH = `<g transform="translate(0,40) rotate(-14 450 260)">
  <ellipse cx="160" cy="290" rx="200" ry="70" fill="#fff6d8" opacity="0.28" filter="url(#b20)"/>
  <path d="M250,170 L330,98 L600,98 L690,170 Z" fill="#3c4a62" stroke="${C.out}" stroke-width="7"/>
  <path d="M270,166 L338,110 L455,110 L455,166 Z M475,166 L475,110 L592,110 L668,166 Z" fill="#1d2a44"/>
  <path d="M70,180 Q80,166 110,166 L800,166 Q836,170 840,210 L840,272 Q838,300 810,300 L96,300 Q66,300 64,270 Z" fill="#46566e" stroke="${C.out}" stroke-width="7"/>
  <path d="M80,226 L830,226" stroke="#33405a" stroke-width="5"/>
  <rect x="66" y="196" width="40" height="30" rx="8" fill="#fff6d8"/><rect x="806" y="196" width="34" height="34" rx="6" fill="${C.pink}"/>
  <circle cx="230" cy="302" r="58" fill="#15151a"/><circle cx="230" cy="302" r="24" fill="#4a5266"/><circle cx="680" cy="302" r="58" fill="#15151a"/><circle cx="680" cy="302" r="24" fill="#4a5266"/>
  </g>`;
// Prop version without the baked ground patch — the set supplies the ground (lighting and haze stay seamless).
const carDitchProp = () => W(900, 520, CAR_DITCH);
const carDitch = () => W(900, 520, `${CAR_DITCH}
  <path d="M0,360 Q120,420 260,400 Q480,360 620,330 Q780,300 900,320 L900,520 L0,520 Z" fill="#0b0f19"/>
  ${grassRow(46, 372, 19.5, '#141c2c', 7)}`);

const carFront = () => W(900, 900, `
  <path d="M300,250 L0,900 L380,900 Z M600,250 L520,900 L900,900 Z" fill="#fff6d8" opacity="0.12" filter="url(#b20)"/>
  <path d="M220,150 Q240,92 310,86 L590,86 Q660,92 680,150 Z" fill="#26324a" stroke="${C.out}" stroke-width="7"/>
  <path d="M250,146 Q268,104 320,100 L580,100 Q632,104 650,146 Z" fill="#14203a"/>
  <path d="M170,160 Q180,146 220,146 L680,146 Q720,146 730,160 L742,280 Q740,306 712,306 L188,306 Q160,306 158,280 Z" fill="#5a4a44" stroke="${C.out}" stroke-width="7"/>
  <rect x="350" y="232" width="200" height="40" rx="8" fill="#2a2226" stroke="${C.out}" stroke-width="4"/>
  <rect x="186" y="196" width="120" height="44" rx="14" fill="#fffbe8"/><rect x="594" y="196" width="120" height="44" rx="14" fill="#fffbe8"/>
  <circle cx="246" cy="218" r="70" fill="#fff6d8" opacity="0.55" filter="url(#b20)"/><circle cx="654" cy="218" r="70" fill="#fff6d8" opacity="0.55" filter="url(#b20)"/>
  <rect x="180" y="306" width="60" height="52" rx="8" fill="#15151a"/><rect x="660" y="306" width="60" height="52" rx="8" fill="#15151a"/>`);

function fenceFg() {
  const posts = [[90, 210, -3], [400, 250, 2], [730, 230, -2], [1040, 200, 3]];
  let o = '<path d="M0,330 Q260,300 540,322 Q820,344 1080,310 L1080,760 L0,760 Z" fill="#090d16"/>';
  for (let w = 0; w < 3; w++) for (let i = 0; i < posts.length - 1; i++) {
    const [x1, t1] = posts[i], [x2, t2] = posts[i + 1];
    const y1 = 430 - t1 + w * 70, y2 = 430 - t2 + w * 70, qy = (y1 + y2) / 2 + 26;
    o += `<path d="M${x1},${y1} Q${(x1 + x2) / 2},${qy} ${x2},${y2}" fill="none" stroke="#5d6a86" stroke-width="3.5"/>`;
    for (let k = 1; k < 6; k++) {
      const t = k / 6, x = x1 + (x2 - x1) * t, y = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * qy + t * t * y2;
      o += `<path d="M${(x - 7).toFixed(0)},${(y - 7).toFixed(0)} l14,14 M${(x + 7).toFixed(0)},${(y - 7).toFixed(0)} l-14,14" stroke="#5d6a86" stroke-width="3"/>`;
    }
  }
  posts.forEach(([x, t, rot]) => { o += `<rect x="${x - 14}" y="${360 - t}" width="28" height="${t + 120}" rx="5" fill="#2a2420" stroke="${C.out}" stroke-width="6" transform="rotate(${rot} ${x} 480)"/>`; });
  for (let i = 0; i < 70; i++) {
    const x = (i * 15.7) % 1080, h = 60 + ((i * 53) % 110);
    o += `<path d="M${x.toFixed(0)},${470 + (i % 4) * 12} q${i % 2 ? 10 : -10},-${h / 2} ${i % 2 ? 4 : -4},-${h}" fill="none" stroke="#111827" stroke-width="8" stroke-linecap="round"/>`;
  }
  return W(1080, 760, o);
}

function riverBg() {
  const r = rng(31);
  let trees = 'M0,880';
  for (let x = 0; x <= 1080; x += 30) trees += ` L${x},${(820 - r() * 70 - (x % 90 === 0 ? 40 : 0)).toFixed(0)}`;
  trees += ' L1080,900 L0,900 Z';
  let streaks = '';
  for (let i = 0; i < 40; i++) {
    const t = r(), y = 920 + t * t * 1000, cx = 540 + Math.sin(t * 5) * 140 * t, w = 30 + t * 160 * r();
    streaks += `<rect x="${(cx - w / 2).toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(3 + t * 5).toFixed(0)}" rx="3" fill="#7fb8ff" opacity="${(0.1 + r() * 0.25).toFixed(2)}"/>`;
  }
  return W(1080, 1920, `<rect width="1080" height="1920" fill="url(#nsky)"/>${starsIn(r, 70, 760)}
  <rect y="880" width="1080" height="1040" fill="#070b13"/>
  <path d="${trees}" fill="#04060b"/>
  <path d="M520,905 Q600,980 470,1080 Q330,1200 470,1360 Q640,1560 380,1920 L1020,1920 Q860,1560 700,1380 Q560,1220 640,1090 Q720,980 560,905 Z" fill="url(#riv)"/>${streaks}
  <ellipse cx="540" cy="980" rx="620" ry="90" fill="#cfe0ff" opacity="0.10" filter="url(#b20)"/>
  <ellipse cx="300" cy="1200" rx="420" ry="70" fill="#cfe0ff" opacity="0.07" filter="url(#b20)"/>`,
  NIGHT_SKY + '<linearGradient id="riv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b4470"/><stop offset="1" stop-color="#0c1830"/></linearGradient>');
}

const searchDog = () => W(560, 380, `
  <path d="M540,20 Q480,110 196,232" fill="none" stroke="${C.pink}" stroke-width="6" stroke-linecap="round"/>
  <path d="M430,170 Q470,120 500,90" fill="none" stroke="${C.out}" stroke-width="22" stroke-linecap="round"/>
  <path d="M430,170 Q470,120 500,90" fill="none" stroke="#7a5238" stroke-width="12" stroke-linecap="round"/>
  <path d="M190,250 L180,330 M240,260 L238,334 M360,258 L366,334 M410,240 L424,326" stroke="${C.out}" stroke-width="30" stroke-linecap="round"/>
  <path d="M190,250 L180,330 M240,260 L238,334 M360,258 L366,334 M410,240 L424,326" stroke="#7a5238" stroke-width="18" stroke-linecap="round"/>
  <ellipse cx="300" cy="200" rx="150" ry="70" fill="#7a5238" stroke="${C.out}" stroke-width="7"/>
  <path d="M180,180 Q120,170 92,230 L60,300 Q52,326 84,330 L130,322 Q160,290 190,240 Z" fill="#7a5238" stroke="${C.out}" stroke-width="7"/>
  <ellipse cx="66" cy="318" rx="20" ry="14" fill="#15151a"/>
  <path d="M150,206 Q120,250 140,300 Q166,300 170,250 Z" fill="#5a3a28" stroke="${C.out}" stroke-width="6"/>
  <circle cx="118" cy="236" r="6" fill="#15151a"/>
  <path d="M178,196 L196,262" stroke="${C.pink}" stroke-width="12" stroke-linecap="round"/>
  <ellipse cx="300" cy="350" rx="170" ry="16" fill="#000" opacity="0.3"/>`);

function porchBg() {
  const r = rng(41);
  return W(1080, 1920, `<rect width="1080" height="1920" fill="url(#nsky)"/>${starsIn(r, 80, 780)}
  <rect y="1260" width="1080" height="660" fill="#080b13"/>
  <path d="M150,880 L540,600 L930,880 Z" fill="#141a28" stroke="${C.out}" stroke-width="8"/>
  <rect x="190" y="870" width="700" height="420" fill="#1c2334" stroke="${C.out}" stroke-width="8"/>
  <rect x="250" y="940" width="130" height="150" rx="6" fill="#0d111c" stroke="#2a3248" stroke-width="6"/><rect x="700" y="940" width="130" height="150" rx="6" fill="#0d111c" stroke="#2a3248" stroke-width="6"/>
  <rect x="470" y="1040" width="140" height="250" rx="6" fill="#2a2230" stroke="${C.out}" stroke-width="6"/><circle cx="590" cy="1170" r="8" fill="#d4a64a"/>
  <path d="M140,1010 L940,1010 L940,1030 L140,1030 Z" fill="#141a28"/><rect x="160" y="1030" width="18" height="260" fill="#141a28"/><rect x="902" y="1030" width="18" height="260" fill="#141a28"/>
  <rect x="140" y="1286" width="800" height="26" fill="#2a2a34"/><rect x="400" y="1312" width="280" height="22" fill="#24242c"/><rect x="380" y="1334" width="320" height="22" fill="#1e1e26"/>
  <ellipse cx="640" cy="1080" rx="220" ry="200" fill="#ffd98a" opacity="0.16" filter="url(#b20)"/>
  <ellipse cx="560" cy="1330" rx="380" ry="60" fill="#ffd98a" opacity="0.22" filter="url(#b20)"/>
  <path d="M640,1044 L640,1060" stroke="${C.out}" stroke-width="5"/><circle cx="640" cy="1074" r="16" fill="#fff3c4"/><circle cx="640" cy="1074" r="46" fill="#ffd98a" opacity="0.7" filter="url(#b6)"/>`,
  NIGHT_SKY);
}

async function png(svg, file, width) {
  await mkdir(dirname(file), { recursive: true });
  let s = sharp(Buffer.from(svg), { density: 144 });
  if (width) s = s.resize({ width });
  await s.png().toFile(file);
  return file;
}

async function sheet(files, out, w, h) {
  const t = await Promise.all(files.map((f) => sharp(f).resize({ width: w, height: h, fit: 'contain', background: '#8a8f99' }).png().toBuffer()));
  await sharp({ create: { width: w * t.length, height: h, channels: 3, background: '#8a8f99' } }).composite(t.map((input, i) => ({ input, left: i * w, top: 0 }))).png().toFile(out);
}

const RUN = {
  'sea-night': [seaBg, 1080], 'boat-empty': [boat, 880], 'shore-fg': [shore, 1080], helicopter: [helicopter, 1040],
  'searchlight-beam': [beam, 760], 'motel-exterior': [motelExt, 1080], 'front-desk-bg': [deskBg, 1080],
  'counter-fg': [counterFg, 1080], 'tv-frame': [tvFrame, 1080], 'room-door': [roomBg, 1080],
  'prairie-night': [prairieBg, 1080], 'car-ditch': [carDitch, 900], 'car-ditch-prop': [carDitchProp, 1800], 'car-front': [carFront, 900], 'fence-fg': [fenceFg, 1080],
  'river-night': [riverBg, 1080], 'prairie-sky': [prairieSky, 2160], 'prairie-far': [prairieFar, 2160], 'prairie-field': [prairieField, 2160], 'prairie-poles': [prairiePoles, 2160], 'search-dog': [searchDog, 560], 'porch-light': [porchBg, 1080],
};
const pick = process.argv.slice(2).filter((a) => RUN[a]);
const made = [];
for (const [id, [fn, w]] of Object.entries(RUN)) if (!pick.length || pick.includes(id)) made.push(await png(fn(), join(ROOT, `${id}.png`), w));
await sheet(Object.keys(RUN).map((id) => join(ROOT, `${id}.png`)), join(ROOT, 'sheet.png'), 240, 426);
console.log(JSON.stringify({ made: made.map((f) => f.slice(ROOT.length + 1)) }));
