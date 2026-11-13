# HARDLINE — Creative Direction & Design System

## 1. Concept: *the line between rider and machine*

Hardline is staged as an **exhibition catalogue that comes alive**: part workshop
dossier, part film. One recurring device ties it together, a single
**ignition-red line**. It works as:

| Chapter | The line becomes… |
|---|---|
| 00 Ignition (loader) | a fuel gauge filling while the real assets load |
| 01 Hardline (hero) | the horizon under the bike |
| 02 Philosophy | the underline that ignites the key word |
| 03 Four Ways to Ride | the hot cut that sweeps across the screen between plates |
| 04 Culture | the road's centre line under a horizontal journey |
| 05 Finale | the line you ride: it draws edge to edge under the last words |
| Global | the 1px progress rail at the foot of the viewport |

The narrative arc is **daylight → fog → night garage → open road → dust**:
the hero is a cream, smoke-filled morning; scrolling thickens the smoke until it
swallows the scene into black, and the story continues in the dark.

## 2. Visual language

* **Palette.** Warm blacks and bone paper, with one accent. Light is a scarce resource.

| Token | Hex | Use |
|---|---|---|
| `--oil` | `#0b0a09` | ground |
| `--soot` | `#151311` | raised surfaces |
| `--iron` | `#2a2724` | rules, ghost type |
| `--ash` | `#a19a8f` | secondary text (7.1:1 on oil) |
| `--bone` | `#ece6da` | primary text (16:1 on oil) |
| `--ignition` | `#ff4d1f` | the line; used for ≤2% of pixels |

* **Typography.** Three voices:
  * **Archivo** (variable `wdth` 62–125, `wght` 100–900) is the machine. Its
    width axis is *animated*: type stretches like a throttle opening.
  * **Instrument Serif** (italic) is the human. It's used only for the words that matter.
  * **JetBrains Mono** is the technical drawing: plate numbers, field notes, coordinates.
* **Composition.** Asymmetric 12-column grid with deliberate collisions:
  giant type behind machines, notes pinned to parts with leader lines, and
  negative space used as silence between chapters. Corners are square (0px radius),
  with no cards and no gradients except light falling in the dark.
* **Texture.** A static film-grain overlay. Grain and vignette are also computed
  inside the shaders, so WebGL and DOM layers share one surface.

## 3. Section architecture

1. **00 Ignition (loader).** The counter tracks real image loading, then wipes away.
2. **01 Hardline (hero).** WebGL photo plate with domain-warped procedural smoke
   that the cursor parts and that scroll thickens until it swallows the frame. The title
   letters stretch on the `wdth` axis.
3. **02 Philosophy.** A scrubbed word-by-word manifesto, then a valley panel with
   mist layers that part like curtains to reveal three axioms (Machine, Craft, Self).
4. **Interlude.** A scroll-driven double marquee whose skew follows scroll velocity.
5. **03 Four Ways to Ride** (major pinned chapter). There's one WebGL stage. Each
   bike plate dissolves into the next through a noise-driven *hot cut* in
   ignition red, with motion smear, a floor reflection, and the plate name rendered as
   ghost type behind the machine. DOM layers carry the accessible title, history,
   field notes (with leader lines drawn to features visible in the photo) and
   an **editorial reading**, which is explicitly opinion, not factory data.
6. **04 Culture.** A pinned horizontal road trip through five panels (Garage, Road,
   Pack, Mark, Hands). Detail crops of the same machines get inner parallax, and the
   centre line runs underneath. On small screens this becomes a vertical sequence.
7. **05 Finale.** About 9,000 particles sampled from the Bobber's silhouette assemble
   from scattered dust as you scroll, react to the cursor, then blow away down-wind
   as the last line is drawn. A colophon follows.

## 4. Motion system

* `--ease-cut: cubic-bezier(.77,0,.18,1)` for wipes and `expo.out` for reveals.
  `none` is used on every scrubbed tween, so scroll is the only clock.
* Each chapter has its own motion identity: **stretch** (hero), **illuminate**
  (philosophy), **part** (valley), **cut** (four ways), **travel** (culture),
  **assemble / disperse** (finale).
* Only two pins total (Four Ways and Culture). There's no snapping and no scroll-jacking.
  Plate buttons scroll to exact positions.
* Lenis drives scroll and is synced to ScrollTrigger via the GSAP ticker.

## 5. WebGL architecture

* **One `WebGLRenderer`** on one fixed canvas. A `Stage` owns three scenes
  (`hero`, `plates`, `dust`). ScrollTrigger toggles which one is live, and
  the stage renders **only** the live scene. When no scene is live, the canvas is
  hidden and the loop sleeps. Rendering also pauses on `visibilitychange`.
* Pixel ratio is capped (1.5 desktop / 1.25 touch). The noise uses 4 octaves.
  Textures are WebP at ≤1600px.
* Every scene implements `dispose()` (geometry, material and textures), and the
  stage disposes the renderer on `pagehide`.
* **Fallbacks.** If a WebGL context can't be created, `html.no-webgl` swaps in DOM
  images with GSAP clip-path transitions. `prefers-reduced-motion` turns
  off Lenis, pins and scrubs and shows final states, while WebGL renders a still frame.

## 6. Tool usage log

* **UI/UX Pro Max.** `--design-system` (variance 9, motion 9, density 3) returned
  *Brutalism*: square corners, asymmetry, high contrast. We kept those traits and
  rejected its generic monochrome + blue palette. Targeted searches:
  * Typography: condensed editorial. This led to the decision to avoid Bebas
    (the old site's font) and use Archivo's width axis.
  * GSAP: pin/scrub. "Don't pin more than 1–2 sections" became the two-pin budget.
    "Keep scrub tied to scrollbar" informed the tween settings.
  * UX: the reduced-motion and motion-sensitivity rules informed the
    reduced-motion final states.
  * Three.js: the DPR cap, dispose discipline and resize handling.
* **21st.dev Magic MCP.**
  * `search`: text mask reveals, scroll galleries, fullscreen nav, WebGL smoke.
  * `get_inspiration`: cinematic pinned product scroll.
  * `get_component #27229` (*Immersive Full Screen Navigation*): its clip-path
    polygon wipe, focus trap with focus restore, Esc handling, character-roll
    hover and reduced-motion fade were re-implemented in vanilla JS for the
    Index overlay.
  * The "Hero Scrub" and "Scroll Gallery" references informed the pinned plate
    chapter. No template code was copied.

## 7. Delivery format

No build step. Plain HTML/CSS and native ES modules, with the libraries vendored in
`vendor/` and resolved through an import map. Any static server or host works.
