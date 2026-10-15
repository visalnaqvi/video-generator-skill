import { createContext } from 'react';

/** Camera offset shared with layers for parallax: px offset and zoom delta at this frame. */
export const CamCtx = createContext({ dx: 0, dy: 0, dz: 0, parallax: 1 });
