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
// the material's own surface colour as a vec4 (its colour times its map, through the map's repeat and offset, keeping the map's alpha)
function npBase(m){const c=NP.uniform(m.color||new THREE.Color(1,1,1));if(!m.map)return NP.vec4(c,1);m.map.updateMatrix();
  const t=NP.texture(m.map,NP.uniform(m.map.matrix).mul(NP.vec3(NP.uv(),1)).xy);return NP.vec4(c.mul(t.rgb),t.a);}
// rebuild the material's nodes from its patch list
function npApply(m){if(!window.GPU||!m.userData)return;const L=m.userData.np||[],{vec4,float}=NP;let color=null,mask=null,opacity=null;
  for(const p of L){if(p.color)color=p.color(color||npBase(m),m);if(p.mask){const k=p.mask(m);if(k)mask=mask?mask.and(k):k;}if(p.opacity)opacity=p.opacity(m);}
  const cp=m.clippingPlanes;if(cp&&cp.length){const {dot,positionWorld}=NP;for(const pl of cp){const u=npPlane(pl),k=dot(positionWorld,u.xyz).add(u.w).greaterThanEqual(0);mask=mask?mask.and(k):k;}}
  m.colorNode=color;m.maskNode=mask;m.opacityNode=opacity;m._npClipKey=cp?cp.length:0;m.needsUpdate=true;}
// a node material standing in for a classic one: same parameters, its patch list copied (clones of patched materials)
function npClonePatches(src,dst){if(window.GPU&&src.userData.np){dst.userData.np=src.userData.np.slice();npApply(dst);}return dst;}
// under WebGPU, material constructors make node materials (MeshStandardNodeMaterial, ...), so every material is a node material
if(window.GPU){for(const n of ['MeshStandardMaterial','MeshPhysicalMaterial','MeshBasicMaterial','MeshLambertMaterial','LineBasicMaterial','LineDashedMaterial','MeshDepthMaterial']){
    const N=n.replace('Material','NodeMaterial');if(THREE[N])THREE[n]=THREE[N];}}
// environment maps. A WebGPU material compiles its environment lookup against the texture it had when first built, and materials with
// the same settings share that build, so per-material environment maps would all show whichever came first. Instead there are two
// shared slots, the room and the sky (PMREM nodes whose texture is swapped in place when the light preset changes, so nothing
// recompiles), a material's `envMap` setter picks the slot for the texture it is given, and its program key records the slot.
const ENV_SLOTS={};
function envSlotsSet(room,sky){if(!window.GPU)return;for(const [k,t] of [['room',room],['sky',sky]]){if(!t)continue;if(!ENV_SLOTS[k])ENV_SLOTS[k]=NP.pmremTexture(t);else ENV_SLOTS[k].value=t;}
  // the scene's own environment is the sky slot too: a new scene.environment texture changes every object's cache key, and each preset
  // change then rebuilt every material's node graph (seconds)
  if(typeof scene!=='undefined'&&scene&&ENV_SLOTS.sky){scene.environment=null;scene.environmentNode=ENV_SLOTS.sky;}}
if(window.GPU){const proto=THREE.NodeMaterial.prototype,key0=proto.customProgramCacheKey;
  Object.defineProperty(proto,'envMap',{configurable:true,get(){return this._envMap||null;},set(t){this._envMap=t||null;
    const kind=!t?null:(typeof ROOM_ENV!=='undefined'&&t===ROOM_ENV?'room':(typeof SKY_ENV!=='undefined'&&t===SKY_ENV?'sky':null));
    if(kind&&!ENV_SLOTS[kind])envSlotsSet(kind==='room'?t:null,kind==='sky'?t:null);
    // any other map (the glass's own capture, changing with the preset) gets this material's own PMREM node, whose texture is swapped in
    // place, so a new map never recompiles
    let node=null;if(kind)node=ENV_SLOTS[kind];else if(t){if(this._ownEnv)this._ownEnv.value=t;else this._ownEnv=NP.pmremTexture(t);node=this._ownEnv;}
    this._envKind=kind;if(this.envNode!==node){this.envNode=node;this.needsUpdate=true;}}});
  // the program key always carries the environment slot and, for patched materials, the textures their patches sample (patches bake
  // their textures into the shared build); a material's own customProgramCacheKey (the app sets several) is kept inside it
  // (a patch that reads every per-material value from the material at draw time, through materialReference / materialMap, declares a
  // key; materials whose patches all have keys share their build, so they compile once)
  const npKey=m=>{const L=m.userData&&m.userData.np;if(!L||!L.length)return '';return '|np:'+(L.every(p=>p.key)?L.map(p=>p.key).join(','):m.id);};
  const extra=m=>(m.userData&&m.userData.gi?'|gi':'')+'|env:'+(m._envKind||(m._envMap?'own'+m.id:'-'))+npKey(m);
  // (the function is made once per material: the renderer asks for it for every object it draws)
  Object.defineProperty(proto,'customProgramCacheKey',{configurable:true,get(){return this._cpk||(this._cpk=()=>(this._ownKey||key0).call(this)+extra(this));},set(f){this._ownKey=f;}});}
// clipping planes. WebGPU node materials have no per-material clipping planes (only ClippingGroup objects), so a material's
// `clippingPlanes` setter turns them into a discard in its maskNode, one vec4 uniform per Plane object (normal, constant), refreshed
// from the Plane on every render: the cutaway's sliding CLIP_TOP and the diorama's planes keep animating with no recompile.
const NP_PLANES=new Map();
function npPlane(pl){let u=NP_PLANES.get(pl);if(!u){const v=new THREE.Vector4();u=NP.uniform(v).onRenderUpdate(()=>v.set(pl.normal.x,pl.normal.y,pl.normal.z,pl.constant));NP_PLANES.set(pl,u);}return u;}
if(window.GPU){const proto=THREE.Material.prototype;
  Object.defineProperty(proto,'clippingPlanes',{configurable:true,get(){return this._clipPlanes||null;},set(a){this._clipPlanes=a&&a.length?a:null;if(this.isNodeMaterial)npApply(this);}});}
// shadow passes draw every object with one shared material, copying each object's alphaTest onto it; alphaTest switching between zero
// and non-zero bumps the material's version, and a version change makes the renderer rebuild that object's whole cache key. With a
// dozen shadow maps a frame in Ultra, that rebuilding was the biggest CPU cost. Each object keeps its own shadow pipeline (built with
// its own alphaTest), so the shared shadow material skips the bump.
if(window.GPU){const d=Object.getOwnPropertyDescriptor(THREE.Material.prototype,'alphaTest');
  if(d&&d.set)Object.defineProperty(THREE.NodeMaterial.prototype,'alphaTest',{configurable:true,get:d.get,set(v){if(this.isShadowPassMaterial)this._alphaTest=v;else d.set.call(this,v);}});}
// node materials' copy() (and so clone()) drops alphaTest, which the leaf and grass cards need
if(window.GPU){const proto=THREE.NodeMaterial.prototype,cp=proto.copy;proto.copy=function(src){cp.call(this,src);if(src.alphaTest!==undefined)this.alphaTest=src.alphaTest;
  if(src.alphaToCoverage!==undefined)this.alphaToCoverage=src.alphaToCoverage;return this;};}
