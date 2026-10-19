// 02b-nodes.js: the material patches in node form, for the WebGPU renderer
"use strict";
// ================= NODE PATCHES (WebGPU) =================
// Under WebGL the app patches its materials' GLSL with onBeforeCompile. WebGPU materials are node materials: a patch there sets their
// colorNode / maskNode / opacityNode / normalNode instead. Each patch is a small object kept in material.userData.np (a list), applied in
// order by npApply(material): `color(c)` takes and returns the surface colour (vec4), `mask()` returns false to discard, `opacity()`
// replaces the opacity. A GLSL onBeforeCompile does nothing on WebGPU but must stay a function (the renderer keys its cache on it).
// Uniforms are shared TSL uniform nodes: the app's `{value}` objects (WASH, FAR_TREES, ...) become uniform nodes the first time a patch
// uses them, and keep their .value, so code that drives them is the same for both renderers.
const NP=window.GPU?TSL:null;
// a TSL uniform node for one of the app's {value} objects (kept on the object, so every patch shares it and .value assignments reach it)
function npU(o,type){if(!o.__u){const u=NP.uniform(o.value,type);Object.defineProperty(o,'value',{get:()=>u.value,set:v=>{u.value=v;}});o.__u=u;}return o.__u;}
// add a patch to a material (WebGPU only); returns the material
function npAdd(m,patch){if(!window.GPU||!m)return m;(m.userData.np||(m.userData.np=[])).push(patch);npApply(m);return m;}
// rebuild the material's nodes from its patch list
function npApply(m){if(!window.GPU)return;const L=m.userData.np||[],{vec4,float}=NP;let color=null,mask=null,opacity=null;
  for(const p of L){if(p.color)color=p.color(color||NP.materialColor.mul(vec4(1,1,1,1)),m);if(p.mask){const k=p.mask(m);mask=mask?mask.and(k):k;}if(p.opacity)opacity=p.opacity(m);}
  m.colorNode=color;m.maskNode=mask;m.opacityNode=opacity;m.needsUpdate=true;}
// a node material standing in for a classic one: same parameters, its patch list copied (clones of patched materials)
function npClonePatches(src,dst){if(window.GPU&&src.userData.np){dst.userData.np=src.userData.np.slice();npApply(dst);}return dst;}
// under WebGPU, material constructors make node materials (MeshStandardNodeMaterial, ...), so every material is a node material
if(window.GPU){for(const n of ['MeshStandardMaterial','MeshPhysicalMaterial','MeshBasicMaterial','MeshLambertMaterial','LineBasicMaterial','LineDashedMaterial','MeshDepthMaterial']){
    const N=n.replace('Material','NodeMaterial');if(THREE[N])THREE[n]=THREE[N];}}
