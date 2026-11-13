import * as THREE from 'three';
import { gsap } from 'gsap';
import { env } from '../core/env.js';

/**
 * One renderer, one canvas, several scenes. Sections declare when they want
 * a scene to be live; the stage renders only the highest-priority live scene
 * and sleeps (canvas hidden, no draw calls) when none is needed.
 */
export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.scenes = new Map();
    this.order = [];
    this.wanted = new Set();
    this.current = null;
    this.mouse = { x: 0.78, y: 1.3, sx: 0.78, sy: 1.3, vx: 0, vy: 0 }; // 0..1, y down; parked off-frame until a pointer moves
    this.ok = false;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.warn('[hardline] WebGL unavailable, using DOM fallbacks.', e);
      return;
    }
    this.ok = true;
    this.renderer.setClearColor(0x0b0a09, 1);
    this.dprCap = env.touch ? 1.25 : 1.5;

    this._onResize = this.resize.bind(this);
    this._onMove = this.onMove.bind(this);
    this._tick = this.tick.bind(this);
    this._onLost = (e) => {
      e.preventDefault();
      document.documentElement.classList.add('no-webgl');
      document.documentElement.classList.remove('gl-hero', 'gl-plates');
      this.stop();
    };

    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('pointermove', this._onMove, { passive: true });
    canvas.addEventListener('webglcontextlost', this._onLost);
    window.addEventListener('pagehide', () => this.dispose(), { once: true });
    this.resize();
    gsap.ticker.add(this._tick);
  }

  add(name, scene) {
    this.scenes.set(name, scene);
    this.order.push(name);
    scene.resize(this.w, this.h, this.dpr);
    return scene;
  }

  /** Sections toggle their wish; priority follows registration order. */
  want(name, on) {
    on ? this.wanted.add(name) : this.wanted.delete(name);
    const next = this.order.find((n) => this.wanted.has(n)) || null;
    if (next === this.current) return;
    this.current = next;
    this.canvas.classList.toggle('is-live', !!next);
    if (next) this.scenes.get(next).onShow?.();
  }

  onMove(e) {
    this.mouse.x = e.clientX / this.w;
    this.mouse.y = e.clientY / this.h;
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.scenes.forEach((s) => s.resize(this.w, this.h, this.dpr));
  }

  tick(time, deltaMs) {
    if (!this.current || document.hidden) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    const m = this.mouse;
    const k = 1 - Math.pow(0.0015, dt); // frame-rate independent smoothing
    const px = m.sx, py = m.sy;
    m.sx += (m.x - m.sx) * k;
    m.sy += (m.y - m.sy) * k;
    m.vx = (m.sx - px) / Math.max(dt, 1e-3);
    m.vy = (m.sy - py) / Math.max(dt, 1e-3);
    const s = this.scenes.get(this.current);
    s.update(time, dt, m);
    this.renderer.render(s.scene, s.camera);
  }

  stop() {
    gsap.ticker.remove(this._tick);
    this.canvas.classList.remove('is-live');
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onMove);
    this.scenes.forEach((s) => s.dispose());
    this.scenes.clear();
    this.renderer?.dispose();
  }
}

/** Full-screen quad scene helper shared by the shader scenes. */
export function createQuadScene(material) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { scene, camera, geometry, mesh };
}

/** Texture from an already-decoded image (raw sRGB values, no conversion). */
export function textureFrom(img) {
  const t = new THREE.Texture(img);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}
