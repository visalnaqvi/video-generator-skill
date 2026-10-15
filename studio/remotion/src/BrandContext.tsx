import React, { createContext, useContext, useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { getAvailableFonts } from '@remotion/google-fonts';
import { Brand, fallbackBrand } from './brand';
import { defaultStyle, StyleTokens } from './style';

type Ctx = { brand: Brand; style: StyleTokens; heading: string; body: string };
const BrandCtx = createContext<Ctx>({ brand: fallbackBrand, style: defaultStyle, heading: 'sans-serif', body: 'sans-serif' });
export const useBrand = () => useContext(BrandCtx);

async function loadGoogleFont(family: string, weights: number[], subsets: string[]): Promise<string> {
  const entry = getAvailableFonts().find((f) => f.fontFamily === family);
  if (!entry) return `${family}, sans-serif`;
  const mod = await entry.load();
  const res = mod.loadFont('normal', { weights: weights.map(String), subsets } as never) as {
    fontFamily: string;
    waitUntilDone?: () => Promise<unknown>;
  };
  await res.waitUntilDone?.();
  return `${res.fontFamily}, sans-serif`;
}

/** Provides brand + style to templates and holds rendering until the brand's Google Fonts are loaded. */
export const Branded: React.FC<{ brand?: Brand; style?: Partial<StyleTokens>; children: React.ReactNode }> = ({ brand = fallbackBrand, style, children }) => {
  const [handle] = useState(() => delayRender('Loading brand fonts'));
  const [fonts, setFonts] = useState<{ heading: string; body: string } | null>(null);
  const tokens: StyleTokens = { ...defaultStyle, ...style };

  useEffect(() => {
    const subsets = brand.fonts.subsets ?? ['latin'];
    const h = brand.fonts.heading;
    const b = brand.fonts.body;
    const same = h.family === b.family;
    const headingWeights = [...new Set([...(h.weights ?? [700]), tokens.headingWeight])];
    const hw = same ? [...new Set([...headingWeights, ...(b.weights ?? [400, 500])])] : headingWeights;
    Promise.all([loadGoogleFont(h.family, hw, subsets), same ? null : loadGoogleFont(b.family, b.weights ?? [400, 500], subsets)])
      .then(([heading, body]) => setFonts({ heading, body: body ?? heading }))
      .catch(() => setFonts({ heading: `${h.family}, sans-serif`, body: `${b.family}, sans-serif` }))
      .finally(() => continueRender(handle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, handle, tokens.headingWeight]);

  if (!fonts) return null;
  return <BrandCtx.Provider value={{ brand, style: tokens, ...fonts }}>{children}</BrandCtx.Provider>;
};
