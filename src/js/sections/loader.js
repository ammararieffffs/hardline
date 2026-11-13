import { gsap } from 'gsap';
import { env } from '../core/env.js';

/**
 * 00 IGNITION — the counter reports real loading progress (images + fonts),
 * the gauge fills like a fuel needle, then the whole curtain is cut away
 * upward and the gauge line hands over to the hero's horizon.
 */
export function createLoader() {
  const el = document.querySelector('.loader');
  const num = el.querySelector('.loader__num');
  const fill = el.querySelector('.loader__fill');
  const status = el.querySelector('.loader__status');
  const shown = { p: 0 };
  const born = performance.now();
  const render = () => {
    num.textContent = String(Math.round(shown.p * 100)).padStart(3, '0');
    fill.style.transform = `scaleX(${shown.p})`;
  };
  const words = ['Warming up', 'Fuel on', 'Choke', 'Ignition'];

  return {
    progress(p) {
      status.textContent = words[Math.min(words.length - 1, Math.floor(p * words.length))];
      gsap.to(shown, { p, duration: 0.5, ease: 'power2.out', overwrite: true, onUpdate: render });
    },
    /** resolves when the page underneath should begin its entrance */
    finish() {
      return new Promise((resolve) => {
        const minShow = env.reduced ? 0 : Math.max(0, 1100 - (performance.now() - born)) / 1000;
        gsap.to(shown, {
          p: 1, duration: 0.45, delay: minShow, ease: 'power2.out', overwrite: true, onUpdate: render,
          onComplete: () => {
            status.textContent = 'Ride';
            document.documentElement.classList.remove('is-loading');
            if (env.reduced) {
              gsap.to(el, { autoAlpha: 0, duration: 0.3, onComplete: () => { el.remove(); resolve(); } });
              return;
            }
            const tl = gsap.timeline({ onComplete: () => el.remove() });
            tl.to(num, { yPercent: -30, opacity: 0, duration: 0.5, ease: 'power3.in' })
              .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1.05, ease: 'expo.inOut' }, 0.2)
              .add(resolve, 0.75);
          },
        });
      });
    },
  };
}
