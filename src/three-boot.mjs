// three-boot.mjs: loads three.js (an ES module) and hands it to the app's classic scripts as the global THREE, before any of them run.
// index.html loads this module first and the src/*.js scripts with `defer`, so they run after it, in order.
//
// Two renderers:
//  - WebGPU (three/webgpu: WebGPURenderer, node materials, TSL), the default when the browser can hand out a WebGPU adapter.
//    window.GPU is true and window.TSL holds the node functions.
//  - WebGL (three: WebGLRenderer), the classic path: browsers without a WebGPU adapter, or when the page asks for it.
// The choice: ?renderer=webgl|webgpu|auto, else the Renderer menu's choice (localStorage), else auto. A browser can list navigator.gpu
// and still have no adapter (headless Chromium does); WebGPURenderer would then run its own slow WebGL backend, so an adapter is
// required, and the app scripts are loaded only once that is known (they are <script type="text/x-app"> tags, loaded here in order).
// Both builds share three.core.js, so classes (materials, geometry, loaders) are the same objects either way.
//
// Compatibility with the look the app was tuned for under three.js r128, on both renderers:
//  - colour management off: hex colours are used as given (linear), as r128 did, instead of being converted from sRGB
//  - legacy light units: r128 lit with "legacy" units by default, where direct, hemisphere and ambient light were PI x stronger than in
//    the physical units newer releases always use, and a point or spot light faded smoothly to zero at its distance instead of falling off
//    with the inverse square. WebGL: the shader chunks are patched; WebGPU: the light nodes are.
import * as THREE_GL from 'three';
import * as THREE_GPU from 'three/webgpu';
import * as TSL from 'three/tsl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const pick = (() => { const q = new URLSearchParams(location.search).get('renderer'); let s = null; try { s = localStorage.getItem('renderer'); } catch (e) {}
  return q || s || 'auto'; })();
// (the loading screen names each step; an adapter request that hasn't answered in 5 s counts as none, so a browser whose WebGPU hangs
// there, as reported on an iPad, starts on WebGL instead of waiting forever)
const ld = (d) => { try { window.LOADUI && window.LOADUI.stage('engine', d); } catch (e) {} };
ld(pick === 'webgl' || !navigator.gpu ? 'starting WebGL…' : 'checking WebGPU…');
const adapter = pick === 'webgl' || !navigator.gpu ? null : await Promise.race([
  navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).catch(() => null),
  new Promise(r => setTimeout(() => { console.warn('three-boot: WebGPU adapter request timed out; using WebGL'); r(null); }, 5000))]);
ld('loading the app scripts…');
const GPU = pick !== 'webgl' && !!adapter;

THREE_GL.ColorManagement.enabled = false;

// ---------------- WebGL: shader chunks ----------------
const C = THREE_GL.ShaderChunk, fix = (name, from, to, all) => {
  const s = C[name], n = all ? s.split(from).length - 1 : (s.includes(from) ? 1 : 0);
  if (!n) { console.warn('three-boot: shader chunk ' + name + ' has changed; light units may differ from r128'); return; }
  C[name] = all ? s.split(from).join(to) : s.replace(from, to);
};
// direct light (standard, physical, lambert, phong, toon) and clear coat
for (const k of Object.keys(C)) if (typeof C[k] === 'string' && C[k].includes('vec3 irradiance = dotNL * directLight.color;')) fix(k, 'vec3 irradiance = dotNL * directLight.color;', 'vec3 irradiance = dotNL * directLight.color * PI;', true);
for (const k of Object.keys(C)) if (typeof C[k] === 'string' && C[k].includes('vec3 ccIrradiance = dotNLcc * directLight.color;')) fix(k, 'vec3 ccIrradiance = dotNLcc * directLight.color;', 'vec3 ccIrradiance = dotNLcc * directLight.color * PI;', true);
// ambient and hemisphere light
fix('lights_pars_begin', 'vec3 irradiance = ambientLightColor;', 'vec3 irradiance = ambientLightColor * PI;');
fix('lights_pars_begin', 'vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );', 'vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight ) * PI;');
// r128's legacy distance falloff for point and spot lights
{ const s = C.lights_pars_begin, a = s.indexOf('float getDistanceAttenuation('), b = a < 0 ? -1 : s.indexOf('\n}', a);
  if (a < 0 || b < 0) console.warn('three-boot: getDistanceAttenuation not found; point lights will fall off physically');
  else C.lights_pars_begin = s.slice(0, a) + 'float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n\tif ( cutoffDistance > 0.0 && decayExponent > 0.0 ) return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );\n\treturn 1.0;\n}' + s.slice(b + 2); }
// alpha to coverage as r128 did it (the fast renderer's grass blades and leaf cards): cut below alphaTest and let the texture's own alpha
// set the coverage, instead of sharpening it to all-or-nothing, which made the lawn and canopies read lighter and blockier
fix('alphatest_fragment', '\tdiffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );\n\tif ( diffuseColor.a == 0.0 ) discard;', '\tif ( diffuseColor.a < alphaTest ) discard;');

// ---------------- WebGPU: light nodes ----------------
// colour spaces: with ColorManagement off, WebGPU's colour-space nodes skip every conversion, including the final linear-to-sRGB output
// (the WebGL renderer always encodes the output). They are built with it on; hex colours are still read as linear.
{ const CS = THREE_GPU.ColorSpaceNode.prototype, csSetup = CS.setup;
  CS.setup = function (builder) { const e = THREE_GL.ColorManagement.enabled; THREE_GL.ColorManagement.enabled = true; try { return csSetup.call(this, builder); } finally { THREE_GL.ColorManagement.enabled = e; } }; }
{ const PI = Math.PI, { Fn, float } = TSL;
  const AL = THREE_GPU.AnalyticLightNode.prototype, alUpdate = AL.update;
  AL.update = function (frame) { alUpdate.call(this, frame); this.color.multiplyScalar(PI); };
  const HL = THREE_GPU.HemisphereLightNode.prototype, hlUpdate = HL.update;
  HL.update = function (frame) { hlUpdate.call(this, frame); this.groundColorNode.value.multiplyScalar(PI); };
  const legacyAtten = Fn(([d, cutoff, decay]) => cutoff.greaterThan(0).and(decay.greaterThan(0)).select(d.div(cutoff).negate().add(1).clamp().pow(decay), float(1)));
  THREE_GPU.PointLightNode.prototype.setupDirect = function (builder) {
    const v = this.getLightVector(builder);
    return { lightDirection: v.normalize(), lightColor: this.colorNode.mul(legacyAtten(v.length(), this.cutoffDistanceNode, this.decayExponentNode)) };
  };
  THREE_GPU.SpotLightNode.prototype.setupDirect = function (builder) {
    const v = this.getLightVector(builder), dir = v.normalize(), cos = dir.dot(TSL.lightTargetDirection(this.light));
    return { lightDirection: dir, lightColor: this.colorNode.mul(this.getSpotAttenuation(builder, cos)).mul(legacyAtten(v.length(), this.cutoffDistanceNode, this.decayExponentNode)) };
  };
}

// the global the classic scripts use: a plain copy of the module namespace (which is read-only), plus the add-ons they need
window.THREE = Object.assign({}, GPU ? THREE_GPU : THREE_GL, { GLTFLoader, MeshoptDecoder });
window.GPU = GPU;
window.TSL = TSL;
window.RENDERER_PICK = { pick, webgpu: !!adapter || (pick === 'webgl' && !!navigator.gpu) };
// the adapter's real buffer limits (the default device allows 128 MB storage bindings; the path tracer's scene buffers are larger)
window.GPU_LIMITS = adapter ? { maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize, maxBufferSize: adapter.limits.maxBufferSize } : null;
// the app's scripts, in order (the single-file build runs its inlined copy of them after this instead)
// (loaded in order with async off; a last one starts the app once they have all run)
{ const tags = document.querySelectorAll('script[type="text/x-app"]'), add = src => { const e = document.createElement('script'); e.src = src; e.async = false; document.body.appendChild(e); };
  if (tags.length) { window.__APP_SCRIPTS = true; for (const t of tags) add(t.getAttribute('src')); add(URL.createObjectURL(new Blob(['requestAnimationFrame(()=>setTimeout(start,30));'], { type: 'text/javascript' }))); } }
