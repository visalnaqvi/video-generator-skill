// Paste this whole file as the `text` of the built-in browser's javascript_tool
// on the brand's site. Returns compact JSON of what the page actually renders:
// background colours by screen area, text colours by amount of text, button colours,
// heading/body fonts and logo images. Read-only: scrolls the page, then restores it.
await (async () => {
  const cv = document.createElement('canvas').getContext('2d');
  const hex = (c) => {
    if (!c || c === 'transparent') return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
      if (p.length > 3 && p[3] < 0.5) return null;
      return '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    }
    cv.fillStyle = '#000'; cv.fillStyle = c; const n = cv.fillStyle;
    return n.startsWith('#') ? n : null;
  };
  const add = (map, k, w) => { if (k) map.set(k, (map.get(k) || 0) + w); };
  const top = (map, n = 8) => {
    const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ value: k, share: Math.round((v / total) * 100) }));
  };
  const bgOf = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none' && !s.backgroundImage.includes('gradient')) return 'image';
      if (s.backgroundImage.includes('gradient')) return 'gradient:' + (s.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) || []).map(hex).filter(Boolean).slice(0, 3).join('>');
      const h = hex(s.backgroundColor);
      if (h) return h;
    }
    return hex(getComputedStyle(document.body).backgroundColor) || '#ffffff';
  };

  const bg = new Map(), text = new Map(), buttons = new Map(), headingFonts = new Map(), bodyFonts = new Map();
  const startY = scrollY;
  const pageH = document.documentElement.scrollHeight;
  const hidden = !innerWidth || !innerHeight;
  if (hidden) {
    // Pane hidden (0x0 viewport): weight each element's own background by its box area.
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 400) continue;
      const s = getComputedStyle(el);
      const h = hex(s.backgroundColor);
      if (h) add(bg, h, r.width * r.height);
      else if (s.backgroundImage !== 'none') add(bg, s.backgroundImage.includes('gradient') ? 'gradient' : 'image', r.width * r.height);
    }
  }
  const screens = hidden ? 0 : Math.min(10, Math.ceil(pageH / innerHeight));
  for (let i = 0; i < screens; i++) {
    scrollTo(0, i * innerHeight);
    await new Promise((r) => setTimeout(r, 150));
    for (let gx = 0; gx < 12; gx++) for (let gy = 0; gy < 20; gy++) {
      const el = document.elementFromPoint((gx + 0.5) * innerWidth / 12, (gy + 0.5) * innerHeight / 20);
      if (el) add(bg, el.tagName === 'IMG' || el.tagName === 'VIDEO' ? 'image' : bgOf(el), 1);
    }
  }
  scrollTo(0, startY);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim(); const el = n.parentElement;
    if (!t || !el || !el.offsetParent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const s = getComputedStyle(el); const size = parseFloat(s.fontSize);
    const w = t.length * size;
    add(text, hex(s.color), w);
    const fam = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const isHeading = /^H[1-3]$/.test(el.tagName) || el.closest('h1,h2,h3') || size >= 28;
    add(isHeading ? headingFonts : bodyFonts, `${fam} ${s.fontWeight}`, w);
  }

  for (const el of document.querySelectorAll('a, button, [role=button], input[type=submit], .btn, .button')) {
    if (!el.offsetParent) continue;
    const s = getComputedStyle(el); const h = hex(s.backgroundColor);
    const r = el.getBoundingClientRect();
    if (h && r.width > 40 && r.height > 20) add(buttons, `${h} on ${hex(s.color)}`, 1);
  }

  const logos = [...document.querySelectorAll('img')].filter((img) => {
    const hay = `${img.currentSrc} ${img.alt} ${img.className} ${img.id}`.toLowerCase();
    return hay.includes('logo') || img.closest('header, nav, .header, #header');
  }).slice(0, 6).map((img) => ({ src: img.currentSrc || img.src, alt: img.alt, size: `${img.naturalWidth}x${img.naturalHeight}`, bgBehind: bgOf(img.parentElement) }));

  return JSON.stringify({
    url: location.href,
    viewport: hidden ? 'hidden (backgrounds weighted by element area, less exact)' : `${innerWidth}x${innerHeight}`,
    backgroundsByArea: top(bg),
    textColorsByAmount: top(text, 6),
    buttons: top(buttons, 6),
    headingFonts: top(headingFonts, 4),
    bodyFonts: top(bodyFonts, 4),
    loadedFontFaces: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')))].slice(0, 10),
    logos,
  });
})();
