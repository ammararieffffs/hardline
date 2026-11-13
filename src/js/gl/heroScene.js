import * as THREE from 'three';
import { createQuadScene, textureFrom } from './stage.js';
import { NOISE, QUAD_VERT, hex } from './glsl.js';

/**
 * HERO — the photograph re-lit in a shader: domain-warped smoke rolls across
 * the ground, the cursor parts it like a hand through exhaust, and scroll
 * thickens it until the scene is swallowed into night.
 */
const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImg;
uniform vec2 uRes, uImgRes, uFocus, uMouse, uVel;
uniform float uTime, uSmoke, uDark, uZoom;
uniform vec3 uOil, uMist, uMistHi;
${NOISE}

vec2 coverUv(vec2 uv){
  float sa = uRes.x / uRes.y, ia = uImgRes.x / uImgRes.y;
  vec2 frac = sa < ia ? vec2(sa / ia, 1.0) : vec2(1.0, ia / sa);
  vec2 off = clamp(uFocus - frac * 0.5, vec2(0.0), vec2(1.0) - frac);
  return off + uv * frac;
}

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 p = vUv * vec2(aspect, 1.0);
  float t = uTime;

  // smoke field — warped fbm drifting with the wind (right → left)
  vec2 q = p * 1.55 + vec2(t * 0.045, 0.0);
  vec2 w = vec2(fbm(q + vec2(0.0, t * 0.03)), fbm(q + vec2(5.2, 1.3) - t * 0.025));
  float n = fbm(q * 1.25 + 2.3 * w + vec2(t * 0.06, t * 0.008));
  float ground = smoothstep(0.92, 0.0, vUv.y);
  float base = n * (0.32 + 0.78 * ground);
  float d = clamp((base - (0.43 - uSmoke * 0.62)) * 2.3, 0.0, 1.0);

  // the cursor clears a trail through the smoke
  vec2 m = vec2(uMouse.x * aspect, 1.0 - uMouse.y);
  vec2 v = vec2(uVel.x * aspect, -uVel.y) * 0.06;
  float dist = min(length(p - m), length(p - (m - v)) * 1.15);
  float clear = smoothstep(0.34, 0.0, dist + (n - 0.5) * 0.12);
  d *= 1.0 - clear * 0.9 * (1.0 - uSmoke * 0.7);

  // the plate itself: cover-fit, heat haze near the ground, gentle mouse parallax, scroll push-in
  vec2 uv = coverUv(vUv);
  uv = (uv - uFocus) / (1.0 + uZoom) + uFocus;
  uv += (w - 0.5) * 0.007 * (ground + clear);
  uv += (uMouse - 0.5) * vec2(-0.01, 0.008);
  vec3 img = texture2D(uImg, uv).rgb;

  vec3 mist = mix(uMist, uMistHi, smoothstep(0.35, 0.8, n));
  mist = mix(mist, uOil + 0.02 + 0.09 * smoothstep(0.3, 0.9, n), uDark);
  vec3 col = mix(img, mist, d * 0.93);

  // asphalt falloff for legibility at the foot of the frame
  col = mix(col, uOil, smoothstep(0.33, 0.0, vUv.y) * 0.45 * (1.0 - uSmoke));
  // night falls
  col = mix(col, uOil, uDark * uDark);
  // lens: vignette + grain
  float vig = smoothstep(1.25, 0.25, length((vUv - 0.5) * vec2(aspect * 0.62, 1.0)));
  col *= mix(0.78, 1.0, vig);
  col += (hash12(vUv * uRes + fract(t) * 91.7) - 0.5) * 0.045;
  gl_FragColor = vec4(col, 1.0);
}
`;

export class HeroScene {
  constructor(img) {
    this.tex = textureFrom(img);
    this.uniforms = {
      uImg: { value: this.tex },
      uRes: { value: new THREE.Vector2(1, 1) },
      uImgRes: { value: new THREE.Vector2(img.naturalWidth, img.naturalHeight) },
      uFocus: { value: new THREE.Vector2(0.66, 0.42) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uVel: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uSmoke: { value: 1 },
      uDark: { value: 0 },
      uZoom: { value: 0 },
      uOil: { value: new THREE.Vector3(...hex('#0b0a09')) },
      uMist: { value: new THREE.Vector3(...hex('#cfc9be')) },
      uMistHi: { value: new THREE.Vector3(...hex('#f4f0e8')) },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: FRAG,
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
    });
    Object.assign(this, createQuadScene(this.material));
    // state written by the hero section's timelines
    this.state = { intro: 1, scroll: 0 };
  }

  resize(w, h) {
    this.uniforms.uRes.value.set(w, h);
    this.uniforms.uFocus.value.x = w < h ? 0.7 : 0.62;
  }

  update(time, dt, mouse) {
    const u = this.uniforms;
    const s = this.state;
    u.uTime.value = time;
    u.uMouse.value.set(mouse.sx, mouse.sy);
    u.uVel.value.set(mouse.vx, mouse.vy).clampScalar(-2, 2);
    u.uSmoke.value = Math.max(s.intro, Math.min(1, s.scroll * 1.5));
    u.uDark.value = Math.pow(Math.max(0, (s.scroll - 0.4) / 0.6), 1.3);
    u.uZoom.value = s.scroll * 0.14;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.tex.dispose();
  }
}
