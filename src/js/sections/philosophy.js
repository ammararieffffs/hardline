import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { env } from '../core/env.js';

gsap.registerPlugin(SplitText);

/**
 * 02 PHILOSOPHY — motion identity: ILLUMINATE, then PART.
 * The manifesto lights up word by word under the reader's own scroll; the
 * valley's mist layers drift apart like curtains to let the axioms through.
 */
export function initPhilosophy() {
  if (env.reduced) return;

  const statement = document.querySelector('[data-illuminate]');
  SplitText.create(statement, {
    type: 'words',
    wordsClass: 'w',
    autoSplit: true,
    onSplit(self) {
      return gsap.fromTo(self.words, { opacity: 0.13 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 42%', scrub: true },
      });
    },
  });
  gsap.fromTo('.philo__underline', { scaleX: 0 }, {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: statement, start: 'bottom 52%', end: 'bottom 36%', scrub: true },
  });

  // valley: depth layers move at different rates and part sideways
  gsap.timeline({
    scrollTrigger: { trigger: '.valley', start: 'top bottom', end: 'bottom top', scrub: true },
    defaults: { ease: 'none' },
  })
    .fromTo('.valley__bg', { scale: 1.2, yPercent: -3 }, { scale: 1.02, yPercent: 3 }, 0)
    .fromTo('.valley__mist--l', { xPercent: 8, yPercent: -4 }, { xPercent: -62, yPercent: 8 }, 0)
    .fromTo('.valley__mist--r', { xPercent: -8, yPercent: -2 }, { xPercent: 62, yPercent: 10 }, 0);

  document.querySelectorAll('.axiom').forEach((ax) => {
    const t = ax.querySelector('.axiom__t');
    gsap.timeline({ scrollTrigger: { trigger: ax, start: 'top 78%', toggleActions: 'play none none reverse' } })
      .from(ax.querySelector('.axiom__n'), { opacity: 0, x: -20, duration: 0.6, ease: 'power3.out' })
      .fromTo(t, { clipPath: 'inset(-10% -50% 100% -50%)', yPercent: 30, fontStretch: '62%' },
        { clipPath: 'inset(-10% -50% -10% -50%)', yPercent: 0, fontStretch: '68%', duration: 1.3, ease: 'expo.out' }, 0.05)
      .from(ax.querySelector('p'), { opacity: 0, y: 24, duration: 1, ease: 'expo.out' }, 0.25);
  });
}
