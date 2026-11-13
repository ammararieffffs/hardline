import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env, range } from '../core/env.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * 05 THE LINE — motion identity: ASSEMBLE / DISPERSE.
 * Dust becomes the machine, the machine becomes the sentence, the sentence
 * gets its line, and the dust is carried away down-wind.
 */
export function initFinale({ stage, scene }) {
  const section = document.querySelector('.finale');
  const lead = section.querySelector('.finale__lead');
  const lines = [...section.querySelectorAll('.finale__title > span')];
  lines.forEach((l) => { l.innerHTML = `<span class="finale__in" style="display:inline-block">${l.innerHTML}</span>`; });
  const ins = section.querySelectorAll('.finale__in');

  if (stage && scene) {
    ScrollTrigger.create({
      trigger: section, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => stage.want('dust', s.isActive),
    });
  }
  if (env.reduced) return;

  gsap.timeline({
    scrollTrigger: {
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (s) => {
        if (!scene) return;
        scene.state.progress = range(s.progress, 0.0, 0.42);
        scene.state.exit = range(s.progress, 0.82, 1.0);
      },
    },
    defaults: { ease: 'none' },
  })
    .fromTo(lead, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.12 }, 0.12)
    .to(lead, { opacity: 0, y: -40, duration: 0.1 }, 0.42)
    .fromTo(section.querySelector('.finale__pre'), { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.02)
    .fromTo(ins, { yPercent: 108 }, { yPercent: 0, duration: 0.14, stagger: 0.06, ease: 'power3.out' }, 0.5)
    .fromTo('.finale__line', { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: 'power2.inOut' }, 0.66)
    .to({}, { duration: 0.001 }, 1);

  // without WebGL the fallback still assembles: grayscale plate sharpening into view
  if (!scene) {
    gsap.fromTo('.finale__fallback', { opacity: 0, filter: 'grayscale(1) blur(18px)' }, {
      opacity: 0.4, filter: 'grayscale(1) blur(0px)', ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: '40% bottom', scrub: true },
    });
  }
}
