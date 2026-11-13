import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from '../core/env.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * 04 CULTURE — motion identity: TRAVEL.
 * The chapter turns ninety degrees and becomes a road: panels pass like
 * roadside scenes, photographs slide inside their frames (depth), the centre
 * line streams underneath, and everything leans with your speed.
 */
export function initCulture(getVelocity) {
  if (env.reduced) return;
  const section = document.querySelector('.culture');
  const pinEl = section.querySelector('.culture__pin');
  const track = section.querySelector('.culture__track');
  const road = section.querySelector('.culture__road span');
  const frames = gsap.utils.toArray('.panel__frame', section);

  const mm = gsap.matchMedia();

  mm.add('(min-width: 900px)', () => {
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const setRoad = gsap.quickSetter(road, 'x', 'px');
    const lean = gsap.quickTo(frames, 'skewX', { duration: 0.6, ease: 'power3' });

    const travel = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + dist(),
        pin: pinEl,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          setRoad(-((self.progress * dist() * 1.6) % 128));
          lean(gsap.utils.clamp(-6, 6, getVelocity() * 0.25));
        },
        onLeave: () => lean(0),
        onLeaveBack: () => lean(0),
      },
    });

    section.querySelectorAll('.panel').forEach((panel) => {
      const img = panel.querySelector('.panel__frame img');
      if (img) {
        gsap.fromTo(img, { xPercent: -7 }, {
          xPercent: 7, ease: 'none',
          scrollTrigger: { trigger: panel, containerAnimation: travel, start: 'left right', end: 'right left', scrub: true },
        });
        gsap.from(panel.querySelector('.panel__frame'), {
          clipPath: 'inset(0% 0% 0% 100%)', duration: 1.3, ease: 'expo.inOut',
          scrollTrigger: { trigger: panel, containerAnimation: travel, start: 'left 85%', toggleActions: 'play none none reverse' },
        });
      }
      const words = panel.querySelectorAll('figcaption > *, .panel__huge, .panel--type .panel__n');
      if (words.length) {
        gsap.from(words, {
          y: 40, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: panel, containerAnimation: travel, start: 'left 70%', toggleActions: 'play none none reverse' },
        });
      }
    });
    return () => gsap.set([track, ...frames], { clearProps: 'all' });
  });

  mm.add('(max-width: 899px)', () => {
    section.querySelectorAll('.panel').forEach((panel) => {
      gsap.from(panel.children, {
        y: 40, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: panel, start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      const img = panel.querySelector('.panel__frame img');
      if (img) gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });
}
