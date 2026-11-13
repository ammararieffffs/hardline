// Environment flags, resolved once. CSS mirrors these via classes on <html>.
const root = document.documentElement;

export const env = {
  reduced: root.classList.contains('reduced-motion'),
  webgl: !root.classList.contains('no-webgl'),
  touch: window.matchMedia('(hover: none), (pointer: coarse)').matches,
  get w() { return window.innerWidth; },
  get h() { return window.innerHeight; },
  /** phones: plates and culture become vertical sequences */
  isPhone: () => window.innerWidth < 768,
  isNarrow: () => window.innerWidth < 900,
};

// GL is only worth spinning up when motion is allowed and a context exists.
env.useGL = env.webgl && !env.reduced;
if (!env.useGL) root.classList.add('gl-off');

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (v, a, b) => clamp((v - a) / (b - a));
