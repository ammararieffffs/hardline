import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { env } from '../core/env.js';
import { scrollToTarget } from '../core/scroll.js';
import { fitContain } from '../gl/platesScene.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const SVG = 'http://www.w3.org/2000/svg';

/**
 * 03 FOUR WAYS TO RIDE — motion identity: CUT.
 * One pinned stage, four plates. Scroll position maps to a float 0…3:
 * WebGL dissolves the machines through a hot cut, the DOM swaps the
 * accessible content when the cut passes the middle of the frame.
 */
export function initWays({ stage, scene }) {
  const section = document.querySelector('.stage');
  const pin = section.querySelector('.stage__pin');
  const plates = [...pin.querySelectorAll('.plate')];
  const tabs = [...pin.querySelectorAll('.stage__tab')];
  const cur = pin.querySelector('.stage__cur');

  const box = document.createElement('div');
  box.className = 'stage__bikebox';
  pin.prepend(box);

  buildReadings(plates);
  const marks = plates.map(buildMarks);
  const names = plates.map((p) =>
    SplitText.create(p.querySelector('.plate__name'), { type: 'words,chars', mask: 'chars', charsClass: 'c', wordsClass: 'wd' })
  );

  let active = 0;
  let st = null;
  let tl = null;

  /* ---------- layout: bike box → GL rects + marker positions ---------- */
  const layout = () => {
    if (!pinned()) return;
    const pr = pin.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const local = { left: b.left - pr.left, top: b.top - pr.top, width: b.width, height: b.height };
    plates.forEach((p, i) => {
      const r = fitContain(local, +p.dataset.aspect);
      placeMarks(marks[i], r, pr);
    });
    // GL works in viewport px; while pinned, pin top = 0
    if (scene) scene.layout({ left: local.left, top: local.top, width: local.width, height: local.height }, window.innerWidth, window.innerHeight);
  };

  const pinned = () => window.innerWidth >= 768 && !env.reduced;

  /* ---------- plate switching ---------- */
  function activate(i, instant = false) {
    if (i === active && !instant) return;
    const prev = plates[active];
    const next = plates[i];
    active = i;
    tabs.forEach((t, k) => {
      t.classList.toggle('is-active', k === i);
      t.setAttribute('aria-pressed', String(k === i));
    });
    cur.textContent = String(i + 1).padStart(2, '0');
    if (!pinned()) return;

    tl?.progress(1).kill();
    plates.forEach((p) => p !== next && p.classList.remove('is-active'));
    next.classList.add('is-active');
    if (instant) { gsap.set(plates, { opacity: (k) => (k === i ? 1 : 0) }); return; }

    const m = marks[i];
    tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(prev, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .set(next, { opacity: 1 }, 0.15)
      .from(names[i].chars, { yPercent: 110, duration: 0.9, stagger: 0.025 }, 0.15)
      .from(next.querySelectorAll('.plate__era, .plate__tag, .plate__body'), { y: 18, opacity: 0, duration: 0.9, stagger: 0.06 }, 0.25)
      .from(next.querySelectorAll('.plate__notes li'), { x: 24, opacity: 0, duration: 0.8, stagger: 0.06 }, 0.3)
      .from(m.dots, { scale: 0, duration: 0.7, stagger: 0.07, ease: 'back.out(2)' }, 0.45)
      .fromTo(m.paths, { strokeDashoffset: (k, el) => el.__len }, { strokeDashoffset: 0, duration: 1, stagger: 0.07, ease: 'power3.inOut' }, 0.5)
      .fromTo(next.querySelectorAll('.plate__reading b'), { scaleX: 0 }, { scaleX: (k, el) => +el.dataset.on, duration: 0.5, stagger: 0.025, ease: 'power3.out' }, 0.4);

    // DOM fallback when WebGL isn't painting the machines
    if (!scene) {
      gsap.fromTo(next.querySelector('.plate__img'), { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' });
    }
  }

  /* ---------- responsive behaviour ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    if (scene) document.documentElement.classList.add('gl-plates');
    layout();
    activate(0, true);

    st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => '+=' + window.innerHeight * 3.4,
      pin,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: layout,
      onUpdate: (self) => {
        const f = self.progress * 3;
        scene?.setPosition(f);
        activate(Math.round(f));
      },
    });
    let glST;
    if (stage && scene) {
      glST = ScrollTrigger.create({
        trigger: section, start: 'top bottom', end: 'bottom top',
        onToggle: (s) => stage.want('plates', s.isActive),
      });
    }
    return () => {
      document.documentElement.classList.remove('gl-plates');
      stage?.want('plates', false);
      glST?.kill();
      st = null;
      gsap.set(plates, { clearProps: 'opacity' });
    };
  });

  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      const i = +t.dataset.goto;
      if (!st) return;
      scrollToTarget(st.start + ((st.end - st.start) * i) / 3 + 2, { duration: 1.4 + Math.abs(i - active) * 0.25 });
    })
  );
  window.addEventListener('resize', layout, { passive: true });
}

/* ---------- builders ---------- */
function buildReadings(plates) {
  plates.forEach((p) =>
    p.querySelectorAll('.plate__reading dd').forEach((dd) => {
      const v = +dd.dataset.v;
      for (let i = 0; i < 5; i++) {
        const seg = document.createElement('i');
        seg.setAttribute('aria-hidden', 'true');
        if (v === 5 && i === 4) seg.classList.add('is-hot');
        const fill = document.createElement('b');
        fill.dataset.on = i < v ? '1' : '0';
        fill.style.transform = `scaleX(${i < v ? 1 : 0})`;
        seg.append(fill);
        dd.append(seg);
      }
    })
  );
}

function buildMarks(plate) {
  const wrap = document.createElement('div');
  wrap.className = 'plate__marks';
  wrap.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'plate__leaders');
  wrap.append(svg);
  const items = [...plate.querySelectorAll('.plate__notes li')];
  const dots = [], paths = [];
  items.forEach((li, i) => {
    const path = document.createElementNS(SVG, 'path');
    svg.append(path);
    const dot = document.createElement('span');
    dot.className = 'mark';
    dot.textContent = String(i + 1).padStart(2, '0');
    wrap.append(dot);
    dots.push(dot); paths.push(path);
  });
  plate.append(wrap);
  return { wrap, svg, items, dots, paths };
}

function placeMarks(m, r, pinRect) {
  m.items.forEach((li, i) => {
    const x = r[0] + +li.dataset.x * r[2];
    const y = r[1] + +li.dataset.y * r[3];
    m.dots[i].style.left = `${x}px`;
    m.dots[i].style.top = `${y}px`;
    const lr = li.getBoundingClientRect();
    const lx = lr.left - pinRect.left;
    const ly = lr.top - pinRect.top + Math.min(lr.height / 2, 22);
    const right = lx > x;
    const ex = right ? lx - 8 : lx + 4;
    const elbow = right ? ex - 36 : ex - 20;
    const d = `M${x + (right ? 13 : -13) * 0.7},${y} L${elbow},${ly} L${ex},${ly}`;
    m.paths[i].setAttribute('d', d);
    const len = m.paths[i].getTotalLength?.() || 600;
    m.paths[i].__len = len;
    m.paths[i].style.strokeDasharray = `${len}`;
  });
}
