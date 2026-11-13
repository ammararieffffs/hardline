
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './js/core/env.js';
import { initScroll, velocity, getLenis } from './js/core/scroll.js';
import { preloadImages } from './js/core/preload.js';
import { Stage } from './js/gl/stage.js';
import { HeroScene } from './js/gl/heroScene.js';
import { PlatesScene } from './js/gl/platesScene.js';
import { DustScene } from './js/gl/dustScene.js';
import { createLoader } from './js/sections/loader.js';
import { initNav } from './js/sections/nav.js';
import { initHero } from './js/sections/hero.js';
import { initPhilosophy } from './js/sections/philosophy.js';
import { initReveals, initMarquee } from './js/sections/reveals.js';
import { initWays } from './js/sections/ways.js';
import { initCulture } from './js/sections/culture.js';
import { initFinale } from './js/sections/finale.js';

gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  const root = document.documentElement;
  initScroll();
  const loader = createLoader();

  // --- WebGL stage (one renderer for the whole page) -----------------------
  let stage = null;
  if (env.useGL) {
    stage = new Stage(document.querySelector('.gl'));
    if (!stage.ok) { stage = null; root.classList.add('no-webgl', 'gl-off'); }
  }

  const plates = [...document.querySelectorAll('.plate')];
  const plateUrls = plates.map((p) => (window.innerWidth < 1100 ? p.dataset.srcSm : p.dataset.src));
  const urls = stage ? ['media/herobg.webp', ...plateUrls, 'media/bobber-sm.webp'] : ['media/herobg.webp'];

  const [images] = await Promise.all([
    preloadImages(urls, (p) => loader.progress(p * 0.9)),
    Promise.race([document.fonts?.ready ?? Promise.resolve(), wait(3500)]),
  ]);

  // --- scenes ----------------------------------------------------------------
  const scenes = {};
  if (stage) {
    try {
      const hero = images.get('media/herobg.webp');
      const bikes = plateUrls.map((u) => images.get(u));
      const dust = images.get('media/bobber-sm.webp');
      if (hero) scenes.hero = stage.add('hero', new HeroScene(hero));
      if (bikes.every(Boolean)) scenes.plates = stage.add('plates', new PlatesScene(bikes, plates.map((p) => p.dataset.name)));
      if (dust) scenes.dust = stage.add('dust', new DustScene(dust, env.touch || window.innerWidth < 768 ? 7000 : 16000));
    } catch (e) {
      console.warn('[hardline] scene setup failed, falling back to DOM.', e);
      stage.dispose(); stage = null;
      root.classList.add('no-webgl', 'gl-off');
    }
  }

  // --- sections ----------------------------------------------------------------
  const heroIntro = initHero({ stage, scene: scenes.hero });
  initPhilosophy();
  initReveals();
  initMarquee(velocity);
  initWays({ stage, scene: scenes.plates });
  initCulture(velocity);
  initFinale({ stage, scene: scenes.dust });
  initNav(); // after pins, so chapter triggers measure the pinned layout

  ScrollTrigger.refresh();
  window.scrollTo(0, 0);

  await loader.finish();
  heroIntro();
  getLenis()?.start();
}

boot().catch((err) => {
  console.error('[hardline] boot failed', err);
  document.documentElement.classList.remove('is-loading');
  document.querySelector('.loader')?.remove();
});
