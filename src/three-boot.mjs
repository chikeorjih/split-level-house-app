// three-boot.mjs: loads three.js (an ES module) and hands it to the app's classic scripts as the global THREE, before any of them run.
// index.html loads this module first and the src/*.js scripts with `defer`, so they run after it, in order.
//
// Compatibility with the look the app was tuned for under three.js r128:
//  - colour management off: hex colours are used as given (linear), as r128 did, instead of being converted from sRGB
//  - legacy light units: r128 lit with "legacy" units by default, where direct, hemisphere and ambient light were PI x stronger than in
//    the physical units newer releases always use, and a point or spot light faded smoothly to zero at its distance instead of falling off
//    with the inverse square. The shader chunks are patched back to that, so every light strength in the app keeps its meaning.
import * as THREE_NS from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

THREE_NS.ColorManagement.enabled = false;

const C = THREE_NS.ShaderChunk, fix = (name, from, to, all) => {
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

// the global the classic scripts use: a plain copy of the module namespace (which is read-only), plus the add-ons they need
window.THREE = Object.assign({}, THREE_NS, { GLTFLoader });
