import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from '../core/env.js';

gsap.registerPlugin(SplitText, ScrollTrigger);

/** Shared, quiet reveals: [data-reveal] fades up, [data-split] rises line by line from a mask. */
export function initReveals() {
  if (env.reduced) return;

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 28, opacity: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.utils.toArray('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 105, duration: 1.2, stagger: 0.09, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' },
        });
      },
    });
  });
}

/**
 * INTERLUDE — two rows travel against each other with the scroll and lean
 * into it: skew follows scroll velocity, so speed becomes visible.
 */
export function initMarquee(getVelocity) {
  if (env.reduced) return;
  const a = document.querySelector('.marquee__row--a');
  const b = document.querySelector('.marquee__row--b');
  gsap.timeline({
    scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true },
    defaults: { ease: 'none' },
  })
    .fromTo(a, { xPercent: 0 }, { xPercent: -28 }, 0)
    .fromTo(b, { xPercent: -30 }, { xPercent: -4 }, 0);

  const skew = gsap.quickTo([a, b], 'skewX', { duration: 0.5, ease: 'power3' });
  ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onUpdate: () => skew(gsap.utils.clamp(-10, 10, -getVelocity() * 0.35)),
    onLeave: () => skew(0), onLeaveBack: () => skew(0),
  });
}

