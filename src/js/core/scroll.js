import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env.js';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;

/**
 * Lenis drives the scroll position; ScrollTrigger reads it.
 * One clock: Lenis is advanced from GSAP's ticker so tweens, scroll and WebGL
 * all step on the same frame. Reduced motion → native scrolling, no Lenis.
 */
export function initScroll() {
  if (env.reduced) {
    ScrollTrigger.config({ ignoreMobileResize: true });
    return null;
  }
  lenis = new Lenis({
    lerp: 0.095,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
    smoothWheel: true,
    autoRaf: false,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });
  lenis.stop(); // held until the loader releases the page
  return lenis;
}

export const getLenis = () => lenis;

/** Smooth scroll to an element or pixel offset; honours reduced motion. */
export function scrollToTarget(target, opts = {}) {
  const y =
    typeof target === 'number'
      ? target
      : target.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
  if (lenis) {
    lenis.scrollTo(y, { duration: opts.duration ?? 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), force: true, immediate: !!opts.immediate });
  } else {
    window.scrollTo({ top: y, behavior: env.reduced ? 'auto' : 'smooth' });
  }
}

export function lockScroll(lock) {
  if (lenis) lock ? lenis.stop() : lenis.start();
  document.documentElement.style.overflow = lock ? 'hidden' : '';
}

/** Signed scroll velocity in px/frame-ish units (0 without Lenis). */
export const velocity = () => (lenis ? lenis.velocity : 0);
