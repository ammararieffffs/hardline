# HARDLINE — A Case Study of Bikes

An experimental, cinematic exhibition about motorcycles: machinery, craft and
the people who ride them. It's plain **HTML + CSS + vanilla JavaScript (ES modules)**
with **GSAP** (ScrollTrigger + SplitText), **Three.js** and **Lenis**.
There's no framework, no bundler and no build step.

The creative direction, design system and motion/WebGL architecture are in
[`docs/DESIGN.md`](docs/DESIGN.md). The original project is preserved
untouched in `../hardline-original-backup/`, along with the original zip.

## How the no-build setup works

* The CSS files are linked directly from `index.html`.
* The JavaScript is native ES modules (`src/main.js` and the files it imports).
* The libraries live in `vendor/`, as local minified ESM copies of GSAP 3.13.0,
  Three.js r170 and Lenis 1.3.11. An **import map** in `index.html` maps bare names
  to them, so `import { gsap } from 'gsap'` works with no tooling.
* Edit any file, refresh the browser, and that's the whole workflow.

## Run locally

ES modules don't load from `file://`, so serve the folder with any static server:

```bash
cd hardline && python3 -m http.server 8000
```

Then open http://localhost:8000. Alternatives include `npx serve`, the VS Code
"Live Server" extension, or any other static server.

## Deploy

Upload the whole folder as-is (`index.html`, `src/`, `vendor/`, `media/`,
`favicon.svg`) to any static host: Netlify (drag and drop), Cloudflare Pages,
Vercel, GitHub Pages, S3 or plain Apache/Nginx. There's no build command and
no output directory. All paths are relative, so it works at a domain root
**or** in a subfolder such as `/hardline/`.

Fonts load from Google Fonts. Self-host them if the site must work offline.
To upgrade a library, replace its file in `vendor/` and keep the import-map names.

## Structure

```
index.html                 all content + stylesheet links + import map
favicon.svg
media/                     WebP assets (optimised from the original PNGs: 13 MB → 1.9 MB)
vendor/                    gsap/ (6 ESM files), three/three.module.min.js, lenis/lenis.mjs
src/
  main.js                  boot: Lenis → preload → WebGL scenes → sections → loader exit
  styles/
    base.css               tokens, reset, utilities, global layers
    chrome.css             loader, nav bar, index overlay
    hero-philo.css         hero, philosophy, valley, marquee
    ways.css               Four Ways to Ride plate stage (+ phone / reduced-motion layouts)
    culture-finale.css     culture road, finale, colophon
  js/
    core/  env.js          capability flags + math helpers
           scroll.js       Lenis ⇄ ScrollTrigger sync, scrollTo, lock
           preload.js      decode images with real progress
    gl/    stage.js        ONE renderer, scene registry, priority, sleep, dispose
           glsl.js         shared noise / quad vertex
           heroScene.js    photo + domain-warped smoke, cursor clearing, nightfall
           platesScene.js  bike plates, ghost type, reflection, "hot cut" transition
           dustScene.js    particle bike sampled from the Bobber's silhouette
    sections/              one module per chapter (loader, nav, hero, philosophy,
                           reveals + marquee, ways, culture, finale)
docs/DESIGN.md             creative direction & design system
```

## Accessibility & fallbacks

* Semantic landmarks, a skip link, one `h1`, and the heading hierarchy follows the chapters.
* Every split-text effect keeps an accessible label. Plates stay in the
  accessibility tree when they aren't the visible plate.
* The Index overlay has a focus trap, Esc to close, focus restore and `inert` while closed.
* `prefers-reduced-motion`: no Lenis, no pins, no scrubs and no WebGL. You get a static
  editorial layout with final states.
* No WebGL, or a lost context: DOM images with GSAP clip-path transitions.
* Phones (<768px): the plates and the culture road become vertical sequences.
