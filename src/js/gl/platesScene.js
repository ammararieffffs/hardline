import * as THREE from 'three';
import { createQuadScene, textureFrom } from './stage.js';
import { NOISE, QUAD_VERT, hex } from './glsl.js';

/**
 * PLATES — the night garage. One quad paints: lamp light, floor, ghost type,
 * the bike, its reflection, and the transition between plates: a noise-edged
 * "hot cut" in ignition red that sweeps across the frame and smears the
 * machines it passes through.
 */
const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes, uMouse;
uniform float uTime, uMix;
uniform sampler2D uTexA, uTexB, uNameA, uNameB;
uniform vec4 uRectA, uRectB, uNameRect;
uniform vec3 uOil, uBone, uIgn;
${NOISE}

vec4 plate(sampler2D t, vec4 r, vec2 p){
  vec2 uv = (p - r.xy) / r.zw;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(t, vec2(uv.x, 1.0 - uv.y));
}
// bike + wet-floor reflection under its baseline
vec4 bike(sampler2D t, vec4 r, vec2 p){
  float base = r.y + r.w;
  if (p.y <= base) return plate(t, r, p);
  float dd = p.y - base;
  vec2 q = vec2(p.x + sin(p.y * 0.09 + uTime * 1.4) * 1.6, base - dd);
  vec4 c = plate(t, r, q);
  c.a *= (1.0 - smoothstep(0.0, r.w * 0.38, dd)) * 0.17;
  return c;
}
float nameMask(sampler2D t, vec2 p){
  vec4 r = uNameRect;
  vec2 uv = (p - r.xy) / r.zw;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture2D(t, vec2(uv.x, 1.0 - uv.y)).r;
}

void main(){
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;         // CSS px, y down
  vec2 par = (uMouse - 0.5) * vec2(14.0, 8.0);       // depth parallax

  // transition field: a ragged vertical front sweeping left → right
  float n = fbm(vec2(p.x * 0.0022, p.y * 0.0016) + vec2(0.0, uTime * 0.05));
  float f = (p.x / uRes.x) * 0.84 + n * 0.22;
  float e = mix(-0.12, 1.22, uMix);
  float toB = 1.0 - smoothstep(e - 0.006, e + 0.006, f);
  float near = 1.0 - smoothstep(0.0, 0.06, abs(f - e));
  float live = step(0.0005, uMix) * step(uMix, 0.9995);
  float edge = (1.0 - smoothstep(0.0004, 0.0011, abs(f - e))) * live;

  // light: one lamp over the machine, floor below
  vec4 R = mix(uRectA, uRectB, toB);
  float base = R.y + R.w;
  vec3 col = uOil;
  vec2 lamp = vec2(R.x + R.z * 0.5, R.y - R.w * 0.15);
  float ld = length((p - lamp) / vec2(uRes.x * 0.42, uRes.y * 0.6));
  col += uBone * 0.075 * exp(-ld * ld * 2.2);
  col += uBone * 0.018 * smoothstep(base - 2.0, base + 60.0, p.y) * (1.0 - smoothstep(base, uRes.y, p.y));
  col = mix(col, uBone, 0.16 * (1.0 - smoothstep(0.0, 1.2, abs(p.y - base))));  // floor line

  // ghost type behind the machine
  vec2 pn = p - par * 1.6;
  float nm = mix(nameMask(uNameA, pn), nameMask(uNameB, pn), toB);
  col = mix(col, mix(uOil, uBone, 0.085), nm);

  // machines, smeared by the passing cut
  vec2 pb = p + par;
  pb.x -= near * near * live * 22.0;
  vec4 a = bike(uTexA, uRectA, pb);
  vec4 b = bike(uTexB, uRectB, pb);
  vec4 c = mix(a, b, toB);
  col = mix(col, c.rgb, c.a);

  // the hot cut
  col += uIgn * near * near * live * 0.035;
  col = mix(col, uIgn, edge * 0.95);

  // lens
  float vig = smoothstep(1.3, 0.2, length((vUv - 0.5) * vec2(uRes.x / uRes.y * 0.6, 1.0)));
  col *= mix(0.72, 1.0, vig);
  col += (hash12(vUv * uRes + fract(uTime) * 97.1) - 0.5) * 0.04;
  gl_FragColor = vec4(col, 1.0);
}
`;

function nameTexture(text) {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 400;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  if ('fontStretch' in ctx) ctx.fontStretch = 'condensed';
  let size = 400;
  ctx.font = `850 ${size}px Archivo, 'Arial Narrow', sans-serif`;
  const w = ctx.measureText(text).width;
  size = Math.min(size * (c.width * 0.98) / w, 470);
  ctx.font = `850 ${size}px Archivo, 'Arial Narrow', sans-serif`;
  const m = ctx.measureText(text);
  const asc = m.actualBoundingBoxAscent || size * 0.72;
  ctx.fillText(text, (c.width - m.width) / 2, (c.height + asc) / 2);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

export class PlatesScene {
  constructor(images, names) {
    this.texs = images.map((img) => textureFrom(img));
    this.names = names.map(nameTexture);
    this.aspects = images.map((img) => img.naturalWidth / img.naturalHeight);
    const v4 = () => new THREE.Vector4(0, 0, 1, 1);
    this.uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uMix: { value: 0 },
      uTexA: { value: this.texs[0] }, uTexB: { value: this.texs[1] },
      uNameA: { value: this.names[0] }, uNameB: { value: this.names[1] },
      uRectA: { value: v4() }, uRectB: { value: v4() }, uNameRect: { value: v4() },
      uOil: { value: new THREE.Vector3(...hex('#0b0a09')) },
      uBone: { value: new THREE.Vector3(...hex('#ece6da')) },
      uIgn: { value: new THREE.Vector3(...hex('#ff4d1f')) },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: FRAG, uniforms: this.uniforms,
      depthTest: false, depthWrite: false,
    });
    Object.assign(this, createQuadScene(this.material));
    this.rects = this.aspects.map(() => [0, 0, 1, 1]);
    this.pair = [0, 1];
  }

  /** box: the CSS bike box (DOMRect-like, viewport px). */
  layout(box, w, h) {
    this.rects = this.aspects.map((a) => fitContain(box, a));
    const nw = w * 1.04, nh = nw * (400 / 2048);
    const cy = box.top + box.height * 0.5 - h * 0.02;
    this.uniforms.uNameRect.value.set((w - nw) / 2, cy - nh / 2, nw, nh);
    this.setPair(this.pair[0], this.pair[1]);
  }

  /** float position along the four plates: 0 … 3 */
  setPosition(f) {
    const i = Math.min(Math.floor(f), this.texs.length - 2);
    const t = f - i;
    const mix = Math.min(1, Math.max(0, (t - 0.3) / 0.4));
    this.setPair(i, i + 1);
    this.uniforms.uMix.value = mix;
  }

  setPair(a, b) {
    this.pair = [a, b];
    const u = this.uniforms;
    u.uTexA.value = this.texs[a]; u.uTexB.value = this.texs[b];
    u.uNameA.value = this.names[a]; u.uNameB.value = this.names[b];
    u.uRectA.value.set(...this.rects[a]); u.uRectB.value.set(...this.rects[b]);
  }

  resize(w, h) { this.uniforms.uRes.value.set(w, h); }

  update(time, dt, mouse) {
    this.uniforms.uTime.value = time;
    this.uniforms.uMouse.value.set(mouse.sx, mouse.sy);
  }

  dispose() {
    this.geometry.dispose(); this.material.dispose();
    this.texs.forEach((t) => t.dispose()); this.names.forEach((t) => t.dispose());
  }
}

/** contain-fit an image of aspect `a` into box, bottom-aligned, centred. */
export function fitContain(box, a) {
  let w = box.width, h = w / a;
  if (h > box.height) { h = box.height; w = h * a; }
  return [box.left + (box.width - w) / 2, box.top + box.height - h, w, h];
}
