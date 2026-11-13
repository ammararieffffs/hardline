import * as THREE from 'three';
import { hex } from './glsl.js';

/**
 * DUST — the finale. Thousands of particles sampled from the bobber's own
 * silhouette drift as road dust, assemble into the machine as you scroll,
 * shy away from the cursor, and are finally carried off down-wind.
 */
const VERT = /* glsl */ `
attribute vec3 aTarget;
attribute vec3 aScatter;
attribute float aRand;
uniform float uTime, uProgress, uExit, uSize, uDpr, uScale;
uniform vec2 uOffset, uMouse;
varying float vAlpha;
varying float vHot;

void main(){
  float d = clamp(uProgress * 1.4 - aRand * 0.4, 0.0, 1.0);
  d = d < 0.5 ? 4.0 * d * d * d : 1.0 - pow(-2.0 * d + 2.0, 3.0) / 2.0;

  vec3 target = vec3(aTarget.xy * uScale + uOffset, aTarget.z);
  vec3 pos = mix(aScatter, target, d);

  // breathing: loose particles wander, settled ones only shiver
  float wander = 1.0 - d * 0.85;
  pos.x += sin(uTime * 0.35 + aRand * 43.0) * 0.18 * wander;
  pos.y += cos(uTime * 0.3 + aRand * 31.0) * 0.12 * wander;
  pos.z += sin(uTime * 0.25 + aRand * 17.0) * 0.1 * wander;

  // the hand moves through it
  vec2 dir = pos.xy - uMouse;
  float dist = length(dir);
  pos.xy += (dir / max(dist, 1e-3)) * smoothstep(1.1, 0.0, dist) * 0.45 * d;

  // carried off down-wind
  float e = clamp(uExit * 1.5 - aRand * 0.5, 0.0, 1.0);
  e = e * e;
  pos.x += e * (7.0 + aRand * 9.0);
  pos.y += e * (sin(aRand * 23.0) * 1.8 + 0.9);
  pos.z += e * sin(aRand * 57.0) * 2.5;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uDpr * (0.55 + aRand * 0.9) * (10.0 / -mv.z);
  vAlpha = (0.22 + 0.78 * d) * (1.0 - e);
  vHot = step(0.972, aRand);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uBone, uIgn;
varying float vAlpha;
varying float vHot;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float soft = smoothstep(0.5, 0.05, r);
  vec3 col = mix(uBone, uIgn, vHot);
  gl_FragColor = vec4(col, soft * vAlpha * 0.62);
}
`;

function sample(img, count) {
  const w = 400, h = Math.round((w * img.naturalHeight) / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 140) {
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 765;
        pts.push(x, y, lum);
      }
    }
  }
  const n = pts.length / 3;
  const out = new Float32Array(count * 3);
  const aspect = w / h;
  for (let k = 0; k < count; k++) {
    const j = Math.floor(Math.random() * n) * 3;
    // normalised: width 1, centred, y up
    out[k * 3] = (pts[j] + Math.random()) / w - 0.5;
    out[k * 3 + 1] = (0.5 - (pts[j + 1] + Math.random()) / h) / aspect;
    out[k * 3 + 2] = (pts[j + 2] - 0.5) * 0.25; // brighter parts nearer the lens
  }
  return out;
}

export class DustScene {
  constructor(img, count) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    this.camera.position.set(0, 0, 10);

    const target = sample(img, count);
    const scatter = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      scatter[i * 3] = (Math.random() - 0.5) * 18;
      scatter[i * 3 + 1] = (Math.random() - 0.5) * 9;
      scatter[i * 3 + 2] = -7 + Math.random() * 9;
      rand[i] = Math.random();
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(scatter.slice(), 3));
    this.geometry.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    this.geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    this.geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));

    this.uniforms = {
      uTime: { value: 0 }, uProgress: { value: 0 }, uExit: { value: 0 },
      uSize: { value: 3.2 }, uDpr: { value: 1 }, uScale: { value: 6 },
      uOffset: { value: new THREE.Vector2(0, 0.6) },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uBone: { value: new THREE.Vector3(...hex('#ece6da')) },
      uIgn: { value: new THREE.Vector3(...hex('#ff4d1f')) },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms,
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.state = { progress: 0, exit: 0 };
  }

  resize(w, h, dpr) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const viewH = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const viewW = viewH * this.camera.aspect;
    this.view = { w: viewW, h: viewH };
    const portrait = w < h;
    this.uniforms.uScale.value = Math.min(viewW * (portrait ? 0.92 : 0.56), viewH * 1.2);
    this.uniforms.uOffset.value.set(0, viewH * (portrait ? 0.1 : 0.17));
    this.uniforms.uDpr.value = dpr;
    this.uniforms.uSize.value = portrait ? 3.0 : 3.6;
  }

  update(time, dt, mouse) {
    const u = this.uniforms;
    u.uTime.value = time;
    u.uProgress.value = this.state.progress;
    u.uExit.value = this.state.exit;
    u.uMouse.value.set((mouse.sx - 0.5) * this.view.w, (0.5 - mouse.sy) * this.view.h);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
