import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from '../core/env.js';

/**
 * 01 HARDLINE — motion identity: STRETCH.
 * Letters arrive condensed and open up on the width axis like a throttle;
 * scrolling pulls the name apart while the smoke swallows the frame.
 */
export function initHero({ stage, scene }) {
  const hero = document.querySelector('.hero');
  const title = hero.querySelector('.hero__title');
  const word = hero.querySelector('.hero__word');
  const inner = hero.querySelector('.hero__inner');

  // split into masked glyphs
  word.innerHTML = [...word.textContent.trim()]
    .map((c) => `<span class="ch"><span>${c}</span></span>`)
    .join('');
  const chars = word.querySelectorAll('.ch > span');

  // fit the word edge-to-edge of the content column
  const fit = () => {
    title.style.fontSize = '10vw';
    const avail = inner.clientWidth - parseFloat(getComputedStyle(inner).paddingLeft) * 2;
    const w = word.scrollWidth;
    title.style.fontSize = `${(10 * avail) / w}vw`;
  };
  fit();
  window.addEventListener('resize', fit, { passive: true });
  document.fonts?.ready.then(fit);

  if (stage && scene) {
    document.documentElement.classList.add('gl-hero');
    // 'top bottom' → already active at scroll 0, so leaving always fires a toggle
    ScrollTrigger.create({
      trigger: hero, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => stage.want('hero', s.isActive),
    });
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => { scene.state.scroll = s.progress; },
    });
  }

  if (!env.reduced) {
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true },
      defaults: { ease: 'none' },
    })
      .to(word, { letterSpacing: '0.07em', yPercent: -14, duration: 1 }, 0)
      .to('.hero__kicker', { opacity: 0, duration: 0.15 }, 0)
      .to('.hero__row', { y: () => -window.innerHeight * 0.08, opacity: 0, duration: 0.3 }, 0.02)
      .to(word, { opacity: 0, duration: 0.3 }, 0.38)
      .to('.hero__horizon', { scaleX: 0, transformOrigin: '100% 50%', duration: 0.45 }, 0)
      .to('.hero__cue', { opacity: 0, duration: 0.1 }, 0);
  }

  // entrance (called once the loader lifts)
  return function intro() {
    if (env.reduced) {
      if (scene) scene.state.intro = 0;
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (scene) tl.to(scene.state, { intro: 0, duration: 3.2, ease: 'power2.inOut' }, 0);
    tl.fromTo(chars, { yPercent: 108, '--w': '62%' }, { yPercent: 0, duration: 1.4, stagger: 0.055 }, 0.15)
      .fromTo(chars, { '--w': '62%' }, { '--w': '112%', duration: 1.8, stagger: 0.055, ease: 'expo.inOut' }, 0.35)
      .fromTo('[data-hero-in]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.1 }, 0.9)
      .fromTo('.hero__horizon', { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' }, 0.4)
      .fromTo('.hero__cue', { opacity: 0 }, { opacity: 1, duration: 1 }, 1.6);
    return tl;
  };
}
