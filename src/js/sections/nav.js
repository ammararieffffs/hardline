import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from '../core/env.js';
import { scrollToTarget, lockScroll } from '../core/scroll.js';

/**
 * Navigation chrome: chapter indicator, progress rail, in-page anchors and
 * the Index overlay. The overlay's mechanics (clip-path polygon wipe, focus
 * trap with focus restore, Esc, reduced-motion fade) were adapted from the
 * 21st.dev "Immersive Full Screen Navigation" component and rewritten in
 * vanilla JS for this page.
 */
export function initNav() {
  initChapters();
  initRail();
  initAnchors();
  initIndex();
}

function initChapters() {
  const num = document.querySelector('.bar__num');
  const name = document.querySelector('.bar__name');
  let current = '01';
  const set = (n, label) => {
    if (n === current) return;
    current = n;
    if (env.reduced) { num.textContent = n; name.textContent = label; return; }
    gsap.timeline()
      .to(name, { yPercent: -110, duration: 0.3, ease: 'power2.in' })
      .add(() => { num.textContent = n; name.textContent = label; })
      .fromTo(name, { yPercent: 110 }, { yPercent: 0, duration: 0.5, ease: 'expo.out' });
  };
  document.querySelectorAll('[data-chapter]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => self.isActive && set(sec.dataset.chapter, sec.dataset.chapterName),
    });
  });
}

function initRail() {
  const fill = document.querySelector('.rail__fill');
  const setX = gsap.quickSetter(fill, 'scaleX');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => setX(s.progress) });
}

function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const go = () => {
      scrollToTarget(id === '#top' ? 0 : target);
      // move focus for keyboard + screen reader users without jumping the view
      const focusEl = id === '#top' ? document.querySelector('#top') : target;
      focusEl.setAttribute('tabindex', '-1');
      focusEl.focus({ preventScroll: true });
    };
    if (a.closest('.index')) closeIndex(go);
    else go();
  });
  document.querySelector('[data-to-top]')?.addEventListener('click', () => {
    scrollToTarget(0);
    document.querySelector('.bar__mark').focus({ preventScroll: true });
  });
}

/* --- Index overlay ------------------------------------------------------- */
let panel, button, links, isOpen = false, tl = null;

const CLIP = {
  closedIn: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
  open: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
  closedOut: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
};

function initIndex() {
  panel = document.querySelector('.index');
  button = document.querySelector('.bar__menu');
  links = [...panel.querySelectorAll('a')];
  links.forEach(setupRoll);
  button.addEventListener('click', () => (isOpen ? closeIndex() : openIndex()));
  document.addEventListener('keydown', onKey);
}

/** character-roll hover: each glyph sits over a text-shadow copy of itself */
function setupRoll(a) {
  const t = a.querySelector('.index__t');
  if (env.reduced) return;
  const label = t.textContent;
  t.setAttribute('aria-hidden', 'true');
  a.setAttribute('aria-label', `${a.querySelector('.index__n').textContent} ${label}`);
  t.innerHTML = [...label]
    .map((c, i) => `<span class="roll" style="transition-delay:${i * 0.018}s">${c === ' ' ? '&nbsp;' : c}</span>`)
    .join('');
}

function openIndex() {
  isOpen = true;
  tl?.kill();
  panel.removeAttribute('inert');
  panel.classList.add('is-open');
  button.setAttribute('aria-expanded', 'true');
  button.querySelector('.bar__menu-label').textContent = 'Close';
  lockScroll(true);
  const items = panel.querySelectorAll('.index__list li > a, .index__eyebrow, .index__foot');
  if (env.reduced) {
    gsap.set(panel, { clipPath: CLIP.open, autoAlpha: 0 });
    tl = gsap.to(panel, { autoAlpha: 1, duration: 0.2 });
  } else {
    tl = gsap.timeline()
      .fromTo(panel, { clipPath: CLIP.closedIn }, { clipPath: CLIP.open, duration: 0.95, ease: 'expo.inOut' })
      .fromTo(items, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'expo.out' }, 0.45);
  }
  requestAnimationFrame(() => links[0].focus({ preventScroll: true }));
}

function closeIndex(after) {
  if (!isOpen) return;
  isOpen = false;
  tl?.kill();
  button.setAttribute('aria-expanded', 'false');
  button.querySelector('.bar__menu-label').textContent = 'Index';
  panel.setAttribute('inert', '');
  const done = () => {
    panel.classList.remove('is-open');
    gsap.set(panel, { clipPath: CLIP.closedIn });
    lockScroll(false);
    if (after) after(); else button.focus({ preventScroll: true });
  };
  if (env.reduced) { tl = gsap.to(panel, { autoAlpha: 0, duration: 0.2, onComplete: () => { gsap.set(panel, { autoAlpha: 1 }); done(); } }); return; }
  tl = gsap.to(panel, { clipPath: CLIP.closedOut, duration: 0.8, ease: 'expo.inOut', onComplete: done });
}

function onKey(e) {
  if (!isOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); closeIndex(); return; }
  if (e.key !== 'Tab') return;
  const ring = [button, ...links];
  const i = ring.indexOf(document.activeElement);
  e.preventDefault();
  const next = e.shiftKey ? (i <= 0 ? ring.length - 1 : i - 1) : (i + 1) % ring.length;
  ring[next].focus();
}
