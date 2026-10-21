// 15-pathtrace.js: the "Path" quality, a path-traced Ultra (WebGPU only)
"use strict";
// ================= PATH TRACING =================
// three-gpu-pathtracer (WebGPU compute shaders over a three-mesh-bvh BVH, loaded on first use) traces the view as soon as the camera
// rests, while the Ultra raster image of it goes on refining on screen (they share the GPU); the finished, denoised trace then fades in
// over it (PTRACE_FADE). Moving the camera shows the Ultra preview again.
//  - The traced scene is a copy of what the view shows: the visible meshes sharing their geometry's position, normal and uv arrays (the
//    tracer adds tangents to its copies, not to the app's geometry), with materials read as plain PBR (colour, map, roughness, metalness,
//    normal map, emission); glass becomes real transmission; the app's node patches (wash, anti-tiling, ...) are left out.
//  - Lights are physical: the sun is a far spot light whose radius gives Ultra's soft shadow edge; the lamps are point lights matched to
//    the legacy falloff at a typical distance (PTRACE_R0); the sky is the sky shader captured into a cube map; the hemisphere and ambient
//    fills and the lamp "fill" lights are left out, as the traced bounce light replaces them.
//  - Cutaway, plan and diorama: the camera rays start where they enter the space the clip planes keep, so what the cut removes is never
//    seen but still shades and bounces: the 3/4 cutaway is lit as if its ceilings and roof were on (the shadow proxy is traced too).
//  - Denoising: while samples accumulate, an edge-aware a-trous filter (4 passes) on the lighting with the surface colour divided out (so
//    textures stay sharp), guided by Ultra's own normal, depth and albedo passes for the same camera. At a few dozen samples per pixel the
//    trace stops and Open Image Denoise (oidn-web, a trained network in WebGPU; weights in assets/weights, embedded in the single-file
//    build) gives the final image from those same guides. Without it (it fails to load), the trace runs to the old, higher sample counts.
//  - Exposure: matched to the Ultra raster image of the same view (log-average luminance), so a room lit only through its windows reads
//    as a photograph exposed for the room, not as the physically much darker interior.
//  - Where no opaque surface is hit (the backdrop, the cutaway's faded "ghost" levels, faded trees), the Ultra raster image of the same
//    view shows instead, so those keep their look.
//  - A light touch of screen-space ambient occlusion (Ultra's AO pass on the guides' depth, PTRACE_AO) deepens contact shadows.
//  - The result goes through the same output pass as the raster pipeline (ACES, grade), with its own material instance.
const PTRACE={lib:null,bvh:null,loading:null,err:null,tracer:null,sig:'',camSig:'',cam:null,scene:null,mats:new Map(),geos:new Map(),env:new Map(),
  out:null,calls:0,t0:0,doneAt:0,finalAt:0,proxyMat:null,spp:0,sppAt:0,expK:1,expDone:false,den:null,rts:null,oidn:null,oidnErr:null,dn:0,aux:null};
const ptrOidnOK=()=>!!PTRACE.oidn&&!PTRACE.oidnErr;
// samples per pixel (the least sampled pixel) before the trace stops: few with the trained denoiser, many without it
const PTRACE_CFG={spp:[40,32],sppNoDn:[160,128],bounces:6,centerAbove:150000,scale:1,perFrame:2,dayLamps:.35,preview:48};   // ...; tracer calls per frame (each is a fixed amount of work: two
// nearly halved the time with the frame rate unchanged; more only made the page choppier); the 3/4 cutaway's daytime lamps (traced, they
// are real point lights, far stronger near the fixtures than the raster's soft glow, and lit the rooms as if the ceilings were off)   // ...; meshes above this many triangles get the quick (centre-split) BVH   // samples per pixel [walk, other views], with and without the denoiser
const PTRACE_SPP=()=>{const a=ptrOidnOK()?PTRACE_CFG.spp:PTRACE_CFG.sppNoDn;return ST.view==='walk'?a[0]:a[1];};
const PTRACE_R0=5,PTRACE_ENVK=1,PTRACE_AO=.3,PTRACE_FADE=800;   // ...; AO strength; ms the finished trace takes to fade in                            // ft: the lamp falloff match distance; sky strength
const ptrOn=()=>LOOK.quality==='path',_ptrBox=new THREE.Box3();
// the trace runs only when nothing is animating and the camera has been still for a moment
function ptrWant(now){return ptrOn()&&!!window.GPU&&!PTRACE.err&&!ST.pending&&!CT&&!Object.keys(FTW).length&&CLIPT.t>=CLIPT.dur&&SKYT.t>=SKYT.dur&&now-(LOOK.lastMove||0)>=350&&
  !(typeof ARR!=='undefined'&&ARR.drag)&&!(typeof PHOTO!=='undefined'&&PHOTO.busy);}
function ptrLoad(){if(PTRACE.loading)return PTRACE.loading;
  PTRACE.loading=Promise.all([import('three-gpu-pathtracer/webgpu'),import('three-mesh-bvh/webgpu'),import('three-mesh-bvh')]).then(([lib,bvh,mbvh])=>{PTRACE.lib=lib;PTRACE.bvh=bvh;PTRACE.mbvh=mbvh;
    const t=new lib.WebGPUPathTracer(renderer);t.dynamicLowRes=false;t.renderDelay=0;t.fadeDuration=0;t.minSamples=0;t.maxBounces=PTRACE_CFG.bounces;t.frameBudget=600000;
    t.filterGlossyFactor=.5;t.clampIndirect=3;t.synchronizeRenderSize=false;PTRACE.tracer=t;PTRACE.out=gpuOut();dirty=true;
    // the trained denoiser (optional: without it the trace just runs longer)
    import('oidn-web').then(o=>{const D=new lib.OIDNDenoiser({initUNetFromURL:o.initUNetFromURL,auxWeightsUrl:window.__OIDN_WEIGHTS||'assets/weights/rt_hdr_alb_nrm_small.tza'});
      D.init(renderer);PTRACE.oidn=D;}).catch(e=>{PTRACE.oidnErr=e;console.warn('path tracer: no denoiser',e);});})
    .catch(e=>{PTRACE.err=e;console.warn('path tracer',e);setQuality('ultra','Path tracing could not start on this device, so Ultra is on.');});
  return PTRACE.loading;}
// ---------- what the trace shows: signatures of what changes the traced scene (not the camera) ----------
// geometry (what is shown: a rebuild), furniture moves (Arrange: the copies' transforms are updated), light (preset, sun, lamps: the
// lights and sky are swapped)
function ptrSigGeo(){const f=[];for(const t in FCUR)f.push(t+(FCUR[t]>=.5?1:0));
  return [ST.view,ST.cutL,ST.trees,ST.surround,!!(SHADOW_PROXY&&SHADOW_PROXY.visible),f.join(''),MODELS_READY?1:0].join('|');}
const ptrSigXf=()=>INSTS.map(i=>(i.dx||0).toFixed(3)+','+(i.dz||0).toFixed(3)+','+(i.ry||0).toFixed(4)).join(';');
function ptrSigLight(){const P=PRESETS[LOOK.preset];return [LOOK.preset,LOOK.sunTurn||0,LOOK.studio?1:0,P.lamps?1:(lampsDim()?.5:0),ULTRA.overhead||1].join('|');}
// ---------- materials ----------
function ptrMat(m,g){if(!m)return null;const base=m.userData&&m.userData.base||m;let p=PTRACE.mats.get(base);if(p!==undefined)return p;p=null;
  const glass=base===MAT.glass||base.userData&&base.userData.base===MAT.glass;
  if(glass){p=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.02,metalness:0,transmission:1,ior:1.5,thickness:0,side:THREE.DoubleSide});}
  else if(base.isMeshStandardMaterial||base.isMeshPhysicalMaterial){p=base;}
  else if(base.isMeshBasicMaterial||base.isMeshLambertMaterial||base.isMeshPhongMaterial){const c=base.color||new THREE.Color(1,1,1),hot=Math.max(c.r,c.g,c.b)>1.05;
    p=new THREE.MeshStandardMaterial({color:hot?0x000000:c,map:hot?null:base.map,roughness:1,metalness:0,side:base.side,transparent:base.transparent,opacity:base.opacity,alphaTest:base.alphaTest||0});
    if(hot){p.emissive.copy(c);p.emissiveIntensity=1;p.emissiveMap=base.map||null;}else if(base.emissive){p.emissive.copy(base.emissive);p.emissiveIntensity=base.emissiveIntensity||1;}}
  // vertex colours (the lawn's blades) are not traced: the copy takes their average, under the blade base's darker green
  if(p&&base.vertexColors&&g&&g.attributes.color){const a=g.attributes.color,c=new THREE.Color(0,0,0),n=Math.min(a.count,20000);
    for(let i=0;i<n;i++)c.r+=a.getX(i),c.g+=a.getY(i),c.b+=a.getZ(i);c.multiplyScalar(.82/n);p=p.clone();p.vertexColors=false;p.color.multiply(c);}
  PTRACE.mats.set(base,p);return p;}
// the tracer's copy of a geometry: the same attribute arrays, so tangents it generates land on the copy only, and its own index (the
// BVH build reorders the index in place). Quantised attributes (the imported models' Int16/Int8, normalised or interleaved) are
// unpacked to plain floats: the tracer reads attribute arrays as float32.
const ptrF32=a=>{if(a.array instanceof Float32Array&&!a.isInterleavedBufferAttribute&&!a.normalized)return a;const n=a.count,k=a.itemSize,o=new Float32Array(n*k);
  for(let i=0;i<n;i++)for(let j=0;j<k;j++)o[i*k+j]=a.getComponent(i,j);return new THREE.BufferAttribute(o,k);};
function ptrGeo(g){let c=PTRACE.geos.get(g);if(c)return c;c=new THREE.BufferGeometry();
  for(const k of ['position','normal','uv'])if(g.attributes[k])c.setAttribute(k,ptrF32(g.attributes[k]));if(g.index)c.setIndex(new THREE.BufferAttribute(g.index.array.slice(),1));
  for(const gr of g.groups)c.addGroup(gr.start,gr.count,gr.materialIndex);c.setDrawRange(g.drawRange.start,g.drawRange.count);PTRACE.geos.set(g,c);return c;}
// ---------- lights and sky ----------
// the sky: the sky shader evaluated for every direction of an equirect map (the sky as seen from the house, without the plan's paper or
// the diorama's backdrop), read back into a data texture, which the tracer importance-samples. Made asynchronously, once per sky.
function ptrSky(){const U=SKY_MAT.uniforms,key=[U.zen.value,U.hor.value,U.gnd.value,U.sunDir.value,U.sunCol.value].map(v=>v.toArray().map(x=>x.toFixed(3)).join()).join('|')+U.sunI.value.toFixed(3);
  const e=PTRACE.env.get(key);if(e)return e.tex;if(PTRACE.env.has(key))return null;
  const job={tex:null};PTRACE.env.set(key,job);const W=1024,H=512,rt=new THREE.RenderTarget(W,H,{type:THREE.FloatType,depthBuffer:false});
  if(!PTRACE.skyM){const {uv,vec3,vec4,cos,sin}=TSL;PTRACE.skyM=SMG({},()=>{const q=uv(),th=q.x.sub(.5).mul(2*Math.PI),ph=q.y.sub(.5).mul(Math.PI),r=cos(ph);
      return vec4(SKY_NODE(vec3(r.mul(cos(th)),sin(ph),r.mul(sin(th)))),1);});}
  const pm=U.pm.value,st=U.st.value;U.pm.value=0;U.st.value=0;try{fs(PTRACE.skyM,rt);}finally{U.pm.value=pm;U.st.value=st;}
  const sd=U.sunDir.value.clone();
  renderer.readRenderTargetPixelsAsync(rt,0,0,W,H).then(px=>{rt.dispose();const d=new Float32Array(W*H*4);
    // rows: whichever order puts the brightest texel (the sun) toward the sun
    let bi=0,bv=-1;for(let i=0;i<W*H;i++){const v=px[i*4]+px[i*4+1]+px[i*4+2];if(v>bv){bv=v;bi=i;}}
    const dirAt=(x,y)=>{const th=((x+.5)/W-.5)*2*Math.PI,ph=((y+.5)/H-.5)*Math.PI;return new THREE.Vector3(Math.cos(ph)*Math.cos(th),Math.sin(ph),Math.cos(ph)*Math.sin(th));};
    const bx=bi%W,by=Math.floor(bi/W),flip=dirAt(bx,H-1-by).dot(sd)>dirAt(bx,by).dot(sd);
    for(let y=0;y<H;y++){const sy=flip?H-1-y:y;d.set(px.subarray(sy*W*4,(sy+1)*W*4),y*W*4);}
    for(let i=3;i<d.length;i+=4)d[i]=1;
    const t=new THREE.DataTexture(d,W,H,THREE.RGBAFormat,THREE.FloatType);t.mapping=THREE.EquirectangularReflectionMapping;t.minFilter=t.magFilter=THREE.LinearFilter;
    t.needsUpdate=true;job.tex=t;dirty=true;}).catch(e=>{PTRACE.err=e;console.warn('path tracer sky',e);});
  return null;}
function ptrLights(S){const P=PRESETS[LOOK.preset],PI=Math.PI,add=(...o)=>{S.add(...o);S.userData.lights.push(...o);};
  for(const o of S.userData.lights||[])S.remove(o);S.userData.lights=[];
  // sun: a spot light far along the sun's direction, as strong at the house as the raster sun (legacy units: x PI), its radius the
  // angle Ultra jitters the sun over
  if(sun&&sun.intensity>0){const c=sun.target.position,s0=LOOK.sunBase||sun.position,dir=s0.clone().sub(c),d0=dir.length(),D=600;dir.normalize();
    const E=(sun.intensity/(isHQ()&&!LOOK.studio?LIGHT_HQ.sun:1))*PI,ang=Math.atan2(LIGHT_HQ.sunR,Math.max(1,d0)),L=new THREE.SpotLight(sun.color,E*D*D,0,Math.atan2(160,D),0,2);
    L.position.copy(c).addScaledVector(dir,D);L.target.position.copy(c);L.radius=Math.tan(ang)*D;add(L,L.target);}
  // lamps: physical point lights, matched to the legacy falloff I*PI*(1-r/d)^1.6 at PTRACE_R0
  const dim=lampsDim();if(P.lamps||dim){const k=P.lamps?LAMP_EVE:LAMP_DAY*PTRACE_CFG.dayLamps,og=ULTRA.overhead||1;
    for(const v of LAMPV){if(v.k==='fill')continue;const I=v.i*k*(/^(ceiling|pendant|chandelier)$/.test(v.k)?og:1),r0=Math.min(PTRACE_R0,v.d*.5);
      const L=new THREE.PointLight(v.color,I*PI*Math.pow(1-r0/v.d,1.6)*r0*r0,0,2);L.position.copy(v.position);add(L);}}}
// ---------- the scene copy ----------
// built in three steps so the page never freezes: the copy (fast), then a BVH per geometry a few per frame (kept on the cached copy, so
// later builds skip them; large meshes split at centres, which builds far faster than SAH), then the tracer's own packing (setScene)
function ptrBuild(sig){const t0=performance.now(),S=new THREE.Scene(),src=[];scene.updateMatrixWorld();
  if(!PTRACE.proxyMat)PTRACE.proxyMat=new THREE.MeshStandardMaterial({color:new THREE.Color(.78,.77,.74),roughness:.9,metalness:0});
  const add=(o,mat)=>{const g=ptrGeo(o.geometry);let q;if(o.isInstancedMesh){q=new THREE.InstancedMesh(g,mat,o.count);q.instanceMatrix=o.instanceMatrix;}else q=new THREE.Mesh(g,mat);
    // glass lets shadow rays through (thin panes; otherwise sun and sky reach a room only by chance bounces through it: dark and noisy)
    if([].concat(mat).some(x=>x&&x.transmission>0))q.visibleToShadowRays=false;
    q.matrixAutoUpdate=false;q.matrix.copy(o.matrixWorld);S.add(q);src.push([q,o]);};
  const walk=o=>{if(!o.visible||o.userData.faded)return;   // (faded levels and trees are left to the raster image, see ptrPresent)
    if(o.isMesh&&o!==SKY&&!o.userData.horizon&&!o.userData.isTwin&&!o.userData.furnShadow&&o.geometry&&o.geometry.attributes.position){
      // the shadow proxy (the cutaway's ceilings and roofs) only where it is wholly above the cut, so the camera never sees it
      if(o.userData.shadowOnly){const g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();if(_ptrBox.copy(g.boundingBox).applyMatrix4(o.matrixWorld).min.y>=CLIP_TOP.constant-.05)add(o,PTRACE.proxyMat);}
      else{const m=o.material;if(Array.isArray(m)){const a=m.map(x=>ptrMat(x,o.geometry));if(a.every(Boolean))add(o,a);}
        else if(!m.isShaderMaterial&&!(m.transparent&&m.opacity<.5&&!(m.userData.base===MAT.glass||m===MAT.glass))){const p=ptrMat(m,o.geometry);if(p)add(o,p);}}}
    for(const c of o.children)walk(c);};
  walk(scene);ptrLights(S);const sky=ptrSky();S.environment=sky;S.background=sky;S.environmentIntensity=PTRACE_ENVK;S.backgroundIntensity=1;
  const todo=[...new Set(S.children.filter(o=>o.isMesh&&!o.geometry.boundsTree).map(o=>o.geometry))];
  PTRACE.prep={sig,S,src,todo,t0,tb:0,xf:ptrSigXf(),light:ptrSigLight()};}
// light only: new lights and sky in the same scene, no rebuild
function ptrRelight(sky){const S=PTRACE.scene;ptrLights(S);S.environment=sky;S.background=sky;const T=PTRACE.tracer;T.updateLights();T.updateEnvironment();T.updateMaterials();}
// furniture moved: the copies follow their pieces
function ptrMoved(){scene.updateMatrixWorld();for(const [q,o] of PTRACE.src){q.matrix.copy(o.matrixWorld);q.matrixWorld.copy(o.matrixWorld);}PTRACE.tracer.updateTransforms();}
// one frame's share of the BVH builds (about 30 ms, at least one geometry); true once the scene is handed to the tracer
function ptrStep(cam){const J=PTRACE.prep,{MeshBVH,SAH,CENTER}=PTRACE.mbvh,t=performance.now();
  while(J.todo.length&&(performance.now()-t<30)){const g=J.todo.pop(),n=(g.index?g.index.count:g.attributes.position.count)/3;
    const big=n>PTRACE_CFG.centerAbove;g.boundsTree=new MeshBVH(g,{strategy:big?CENTER:SAH,targetLeafSize:big?8:5});}
  J.tb+=performance.now()-t;if(J.todo.length)return false;
  const t1=performance.now();PTRACE.tracer.setScene(J.S,cam);PTRACE.scene=J.S;PTRACE.src=J.src;PTRACE.sig=J.sig;PTRACE.sigXf=J.xf;PTRACE.sigLight=J.light;PTRACE.camSig='';PTRACE.prep=null;
  console.info('path tracer: scene ready,',J.S.children.length,'objects; BVHs',Math.round(J.tb),'ms, packing',Math.round(performance.now()-t1),'ms, total',Math.round(performance.now()-J.t0),'ms');
  return true;}
// ---------- camera rays clipped to the kept space ----------
// the default ray, then moved to where it enters the space every clip plane keeps (n.p + c >= 0) and cut where it leaves it; a ray that
// never enters is sent far past the scene so it sees the sky
function ptrCam(cam){if(cam.__ptr)return cam;const {uniform}=TSL,{wgslTagFn,rayStruct,ndcToCameraRay}=PTRACE.bvh,inv=uniform(new THREE.Matrix4()),
    pl=CLIPS.map(()=>uniform(new THREE.Vector4()));
  const clip=pl.map(p=>`{ let s = dot( ${'$'}{P}.xyz, o ) + ${'$'}{P}.w; let k = dot( ${'$'}{P}.xyz, d );
      if ( abs( k ) < 1e-7 ) { if ( s < 0.0 ) { t0 = 1e30; } } else { let t = - s / k; if ( k > 0.0 ) { if ( s < 0.0 ) { t0 = max( t0, t ); } } else if ( s >= 0.0 ) { t1 = min( t1, t ); } else { t0 = 1e30; } } }`);
  const parts=['fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ',''],vals=[rayStruct];
  let body=`> ) -> bool {
      let ndc = uv * 2.0 - vec2f( 1.0 );
      *ray = `;parts[1]=body;vals.push(ndcToCameraRay);parts.push('( ndc, ');vals.push(inv);
  body=` );
      let o = ray.origin; let d = ray.direction; var t0 = 0.0; var t1 = ray.maxDist;
`;
  // assemble the tagged template by hand: plain strings between the uniform nodes
  let cur=body;for(let i=0;i<pl.length;i++){const seg=clip[i].split('${P}');for(let j=0;j<seg.length;j++){cur+=seg[j];if(j<seg.length-1){parts.push(cur);vals.push(pl[i]);cur='';}}cur+='\n';}
  cur+=`      if ( t0 >= t1 ) { ray.origin = o + d * 1e6; ray.maxDist = 1.0; return true; }
      ray.origin = o + d * t0; ray.maxDist = t1 - t0;
      return true;
    }`;parts.push(cur);
  const fn=wgslTagFn(parts,...vals);
  cam.getCameraRayFn=()=>({fn,update:()=>{cam.coordinateSystem=THREE.WebGPUCoordinateSystem;cam.updateMatrixWorld();cam.updateProjectionMatrix();
    inv.value.multiplyMatrices(cam.matrixWorld,cam.projectionMatrixInverse);CLIPS.forEach((P,i)=>pl[i].value.set(P.normal.x,P.normal.y,P.normal.z,P.constant));return false;}});
  cam.__ptr=true;return cam;}
// ---------- per frame: true when the trace drew (or holds) the image ----------
function ptrFrame(cam,now){if(!ptrWant(now)){PTRACE.active=false;return false;}if(!PTRACE.tracer){ptrLoad();return false;}
  PTRACE.active=true;
  const sig=ptrSigGeo();if(sig!==PTRACE.sig){if(!ptrSky()||PIPE.n<Math.min(PIPE.max,16))return false;   // (a refined raster frame first, so the build's pauses show it)
    if(!PTRACE.prep||PTRACE.prep.sig!==sig)ptrBuild(sig);PTRACE.cam=ptrCam(cam);if(!ptrStep(cam))return false;PTRACE.tracer.setCamera(cam);}
  else{const xf=ptrSigXf();if(xf!==PTRACE.sigXf){PTRACE.sigXf=xf;ptrMoved();PTRACE.camSig='';}
    const li=ptrSigLight();if(li!==PTRACE.sigLight){const sky=ptrSky();if(!sky)return false;PTRACE.sigLight=li;ptrRelight(sky);PTRACE.camSig='';}}
  if(PTRACE.cam!==cam){PTRACE.cam=ptrCam(cam);PTRACE.tracer.setCamera(cam);PTRACE.camSig='';}   // (walk, orbit and plan cameras)
  const [w,h]=PIPE.size,pr=renderer.getPixelRatio(),sc=Math.min(1,Math.min(window.devicePixelRatio||1,1.25)/pr)*PTRACE_CFG.scale,tw=Math.max(2,Math.round(w*sc)),th=Math.max(2,Math.round(h*sc));
  const cs=camSig(cam)+tw+'x'+th;if(cs!==PTRACE.camSig){PTRACE.camSig=cs;PTRACE.tracer.setSize(tw,th);PTRACE.tracer.updateCamera();PTRACE.tracer.maxSamples=PTRACE_SPP();
    PTRACE.calls=0;PTRACE.spp=0;PTRACE.sppAvg=0;PTRACE.t0=now;PTRACE.doneAt=0;PTRACE.finalAt=0;PTRACE.expDone=false;PTRACE.guides=false;PTRACE.dn=0;PTRACE.fin=0;PTRACE.fade0=0;if(PTRACE.oidn)PTRACE.oidn.reset();}
  if(PTRACE.doneAt){if(PTRACE.finalAt)return true;
    // the denoiser's guides (and the raster image the trace fades from) once the samples are in: Ultra's refinement, which shares
    // those passes, has stopped by then
    if(!PTRACE.guides){PTRACE.guides=true;ptrGuides(cam,tw,th);OUT_MAT.uniforms.t.value=PIPE.accA.texture;fs(OUT_MAT,null);return true;}
    if(!PTRACE.expDone&&PTRACE.fin){OUT_MAT.uniforms.t.value=PIPE.accA.texture;fs(OUT_MAT,null);return true;}
    // the samples are in: the trained denoiser (spread over a few frames), then the final image and its fade
    const D=PTRACE.oidn;if(ptrOidnOK()&&!PTRACE.dn){PTRACE.dn=1;ptrAux(PTRACE.rts[0].width,PTRACE.rts[0].height);
      D.denoise(PTRACE.tracer.target,PTRACE.aux[0].texture,PTRACE.aux[1].texture).catch(e=>{PTRACE.oidnErr=e;console.warn('path tracer: denoiser failed',e);
        // carry on tracing to the sample count used without it
        PTRACE.tracer.maxSamples=PTRACE_SPP();PTRACE.doneAt=0;PTRACE.dn=0;});}
    if(ptrOidnOK()&&!D.complete)return true;
    if(!PTRACE.fin){PTRACE.fin=ptrFinal();PTRACE.expDone=false;Promise.all([ptrLogLum(PTRACE.ras.texture,0),ptrLogLum(PTRACE.fin,1)]).then(([r,q])=>{
        if(isFinite(r)&&isFinite(q))PTRACE.expK=Math.min(16,Math.max(.35,Math.exp(r-q)));PTRACE.expDone=true;});}
    if(!PTRACE.expDone)return true;
    if(!PTRACE.fade0)PTRACE.fade0=now;const t=Math.min(1,(now-PTRACE.fade0)/PTRACE_FADE);ptrShow(t*t*(3-2*t));
    if(t>=1){PTRACE.finalAt=now;console.info('path tracer: final (faded in) after',((now-PTRACE.t0)/1000).toFixed(1),'s');}
    return true;}
  for(let i=0;i<PTRACE_CFG.perFrame;i++)PTRACE.tracer.renderSample();PTRACE.calls++;
  // the sample count, read back every half second (the least sampled pixel decides when the trace is done)
  if(!PTRACE.sppBusy&&now-PTRACE.sppAt>500){PTRACE.sppBusy=true;PTRACE.sppAt=now;const cs0=PTRACE.camSig;PTRACE.tracer.getSampleCountsAsync().then(c=>{if(PTRACE.camSig!==cs0)return;PTRACE.spp=c.min;PTRACE.sppAvg=c.avg;
      if(c.min>=PTRACE_SPP()&&!PTRACE.doneAt){PTRACE.doneAt=performance.now();console.info('path tracer:',c.min,'samples per pixel in',((PTRACE.doneAt-PTRACE.t0)/1000).toFixed(1),'s');}})
    .catch(()=>{}).finally(()=>{PTRACE.sppBusy=false;});}
  // on screen meanwhile: Ultra, still refining or finished (the tracer draws its own output to the canvas, so this is drawn over it)
  // (Ultra refines only its first PTRACE_CFG.preview frames meanwhile: enough for a clean preview, and the rest of the GPU goes to the trace)
  if(PIPE.n<Math.min(PIPE.max,PTRACE_CFG.preview)&&!giBuilding(now))renderHigh(cam);else{OUT_MAT.uniforms.t.value=PIPE.accA.texture;fs(OUT_MAT,null);}
  return true;}
function ptrProgress(){return PTRACE.finalAt||PTRACE.fade0?1:Math.min(.99,(PTRACE.sppAvg||0)/PTRACE_SPP()*(ptrOidnOK()?.9:1)+(PTRACE.dn?.09:0));}
// ---------- denoise and present ----------
// guides: Ultra's normal/gloss (with its depth) and albedo passes, drawn once for the resting camera (no jitter), with the cut-out
// foliage (or leaves would be divided by the ground's colour behind them) and without the glass
// (what is seen through a window guides the filter there, not the pane)
function ptrGuides(cam,w,h){if(!PIPE.enc)return;
  const [W,H]=PIPE.size;if(!PTRACE.ras||PTRACE.ras.width!==W||PTRACE.ras.height!==H){if(PTRACE.ras)PTRACE.ras.dispose();PTRACE.ras=rt(W,H);}
  if(!PTRACE.copyM)PTRACE.copyM=SMG({t:'tex'},u=>u.t.sample(TSL.uv()));PTRACE.copyM.uniforms.t.value=PIPE.accA.texture;fs(PTRACE.copyM,PTRACE.ras);overridePass(cam,PIPE.enc,encOf,false,true);overridePass(cam,PIPE.alb,albOf,false,true);
  // ambient occlusion on the guides' depth (unjittered), for PTRACE_AO
  {const A=AO_MAT.uniforms;A.tDepth.value=PIPE.enc.depthTexture;A.proj.value.copy(cam.projectionMatrix);A.projInv.value.copy(cam.projectionMatrixInverse);A.frame.value=7;
    A.radius.value=ST.view==='plan'?3.0:(ST.view==='walk'?1.8:2.6);fs(AO_MAT,PIPE.ao);}
  if(!PTRACE.rts||PTRACE.rts[0].width!==w||PTRACE.rts[0].height!==h){if(PTRACE.rts)PTRACE.rts.forEach(r=>r.dispose());PTRACE.rts=[0,1].map(()=>rt(w,h,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}));
    PTRACE.rts.forEach(r=>{renderer.setRenderTarget(r);renderer.clear();});}}
// mode 0: divide out the albedo; 1: one a-trous pass (5x5 B3 kernel at the given step); 2: multiply the albedo back
function ptrDenMat(){const {uv,vec2,vec3,vec4,float,exp,abs,max,pow,dot,select}=TSL;
  return SMG({t:'tex',tA:'tex',tE:'tex',tD:'depth',tR:'tex',invK:1,projInv:new THREE.Matrix4(),px:new THREE.Vector2(),step:1,sig:1,mode:0},u=>{
    const q=uv(),c0=u.t.sample(q),a0=max(u.tA.sample(q).rgb,vec3(.04)),bg=u.tD.sample(q).x.greaterThan(.99999);
    const vpos=gpuVpos(u,u.tD,u.projInv),z0=vpos(q).z,n0=gpuDecN(u.tE.sample(q)),l0=dot(c0.rgb,vec3(.2126,.7152,.0722));
    const H=[1/16,1/4,3/8,1/4,1/16];let sum=vec3(0),ws=float(0);
    for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const k=H[i+2]*H[j+2],qq=q.add(vec2(i,j).mul(u.px).mul(u.step)),c=u.t.sample(qq).rgb;
      if(i===0&&j===0){sum=sum.add(c.mul(k));ws=ws.add(k);continue;}
      const z=vpos(qq).z,n=gpuDecN(u.tE.sample(qq)),l=dot(c,vec3(.2126,.7152,.0722));
      const w=float(k).mul(pow(max(dot(n,n0),0),48)).mul(exp(abs(z.sub(z0)).div(abs(z0).mul(.012).mul(u.step).add(.002)).negate()))
        .mul(exp(abs(l.sub(l0)).div(u.sig.mul(l.add(l0)).add(.004)).negate())).mul(select(u.tD.sample(qq).x.greaterThan(.99999),0,1));
      sum=sum.add(c.mul(w));ws=ws.add(w);}
    const f=select(bg,c0.rgb,sum.div(max(ws,1e-5)));
    return select(u.mode.lessThan(.5),vec4(select(bg,c0.rgb,c0.rgb.div(a0)),1),select(u.mode.lessThan(1.5),vec4(f,1),vec4(select(bg,u.tR.sample(q).rgb.mul(u.invK),c0.rgb.mul(a0)),1)));});}
// the denoiser's guides at the trace's size, in its format: albedo in [0,1], view-space normals mapped to [0,1] (a flat one is .5,.5,1)
function ptrAux(w,h){const {uv,vec4,clamp,select}=TSL;
  if(!PTRACE.aux||PTRACE.aux[0].width!==w||PTRACE.aux[0].height!==h){if(PTRACE.aux)PTRACE.aux.forEach(r=>r.dispose());
    PTRACE.aux=[0,1].map(()=>rt(w,h,{type:THREE.UnsignedByteType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}));}
  if(!PTRACE.auxM)PTRACE.auxM=[SMG({tA:'tex'},u=>vec4(clamp(u.tA.sample(uv()).rgb,0,1),1)),
    SMG({tE:'tex',tD:'depth'},u=>{const q=uv(),n=gpuDecN(u.tE.sample(q));return select(u.tD.sample(q).x.greaterThan(.99999),vec4(.5,.5,1,1),vec4(n.mul(.5).add(.5),1));})];
  PTRACE.auxM[0].uniforms.tA.value=PIPE.alb.texture;fs(PTRACE.auxM[0],PTRACE.aux[0]);
  PTRACE.auxM[1].uniforms.tE.value=PIPE.enc.texture;PTRACE.auxM[1].uniforms.tD.value=PIPE.enc.depthTexture;fs(PTRACE.auxM[1],PTRACE.aux[1]);}
function ptrPresent(now,only){const T=PTRACE.tracer;let src=T.target;
  // the trained denoiser's result, once its first tiles are in (with the raster image where no surface was hit, as below)
  const D=PTRACE.oidn;if(PTRACE.dn&&D&&D.texture&&PTRACE.rts){if(!PTRACE.dnM){const {uv,vec4,select}=TSL;
      PTRACE.dnM=SMG({t:'tex',tD:'depth',tR:'tex',invK:1},u=>{const q=uv();return vec4(select(u.tD.sample(q).x.greaterThan(.99999),u.tR.sample(q).rgb.mul(u.invK),u.t.sample(q).rgb),1);});}
    const u=PTRACE.dnM.uniforms;u.t.value=D.texture;u.tD.value=PIPE.enc.depthTexture;u.tR.value=PTRACE.ras.texture;u.invK.value=1/PTRACE.expK;fs(PTRACE.dnM,PTRACE.rts[1]);src=PTRACE.rts[1].texture;
    const o=PTRACE.out.uniforms,s0=OUT_MAT.uniforms;for(const k in s0)if(k!=='t'&&o[k])o[k].value=s0[k].value;o.exposure.value=s0.exposure.value*PTRACE.expK;o.t.value=src;fs(PTRACE.out,null);return;}
  if(PTRACE.guides&&PTRACE.rts&&PIPE.enc&&PTRACE.show!=='raw'){   // (PTRACE.show='raw': the trace without denoising)
    if(!PTRACE.den)PTRACE.den=[0,1,2].map(ptrDenMat);   // (one material per mode: a pass's inputs are bound when it first compiles)
    const [r0,r1]=PTRACE.rts,cam=PTRACE.cam,spp=Math.max(1,PTRACE.sppAvg||1),sig=Math.min(6,4/Math.sqrt(spp));
    const set=(M,t,mode,step)=>{const u=M.uniforms;u.t.value=t;u.tA.value=PIPE.alb.texture;u.tE.value=PIPE.enc.texture;u.tD.value=PIPE.enc.depthTexture;u.projInv.value.copy(cam.projectionMatrixInverse);
      u.px.value.set(1/r0.width,1/r0.height);u.step.value=step;u.sig.value=sig;u.mode.value=mode;u.tR.value=PTRACE.ras.texture;u.invK.value=1/PTRACE.expK;};
    set(PTRACE.den[0],src,0,1);fs(PTRACE.den[0],r0);let a=r0,b=r1;
    for(const st of [1,2,4,8]){set(PTRACE.den[1],a.texture,1,st);fs(PTRACE.den[1],b);[a,b]=[b,a];}
    set(PTRACE.den[2],a.texture,2,1);fs(PTRACE.den[2],b);src=b.texture;
    // exposure: once there are enough samples, match the raster image's log-average luminance
    if(only)return;
    if(!PTRACE.expDone&&spp>=12){PTRACE.expDone=true;Promise.all([ptrLogLum(PTRACE.ras.texture,0),ptrLogLum(src,1)]).then(([r,p])=>{if(isFinite(r)&&isFinite(p))PTRACE.expK=Math.min(16,Math.max(.35,Math.exp(r-p)));});}}
  // present through the output pass (ACES, grade), as the raster pipeline does
  const o=PTRACE.out.uniforms,s0=OUT_MAT.uniforms;for(const k in s0)if(k!=='t'&&o[k])o[k].value=s0[k].value;o.exposure.value=s0.exposure.value*PTRACE.expK;o.t.value=src;fs(PTRACE.out,null);}
// the finished trace, linear, at the trace's size: the denoised image (the trained denoiser's, or the a-trous filter's) with the ambient
// occlusion (where no surface was hit the fade shows the raster image instead)
function ptrFinMat(){const {uv,vec2,vec4,float,mix}=TSL;
  return SMG({t:'tex',tAO:'tex',aoK:.3,px:new THREE.Vector2()},u=>{const q=uv();let a=float(0);
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)a=a.add(u.tAO.sample(q.add(vec2(x,y).mul(u.px).mul(1.5))).r);
    return vec4(u.t.sample(q).rgb.mul(mix(1,a.div(9),u.aoK)),1);});}
function ptrFinal(){const [r0,r1]=PTRACE.rts,D=PTRACE.oidn;let src,slot;
  if(ptrOidnOK()&&D&&D.texture){src=D.texture;slot=0;}else{PTRACE.show=null;ptrPresent(0,true);src=PTRACE.rts[1].texture;slot=1;}
  const M=(PTRACE.finM||(PTRACE.finM=[]))[slot]||(PTRACE.finM[slot]=ptrFinMat()),u=M.uniforms;   // (one per kind of input: inputs are bound when a pass first compiles)
  u.t.value=src;u.tAO.value=PIPE.ao.texture;u.aoK.value=PTRACE_AO;u.px.value.set(1/PIPE.size[0],1/PIPE.size[1]);
  const out=slot?r0:r1;fs(M,out);return out.texture;}
// the fade: the raster image (as shown before) mixed into the finished trace, at full size, through the output pass with the trace's exposure
function ptrShow(t){const [W,H]=PIPE.size;if(!PTRACE.fadeRT||PTRACE.fadeRT.width!==W||PTRACE.fadeRT.height!==H){if(PTRACE.fadeRT)PTRACE.fadeRT.dispose();PTRACE.fadeRT=rt(W,H);}
  if(!PTRACE.fadeM){const {uv,vec4,mix,select}=TSL;PTRACE.fadeM=SMG({tA:'tex',tB:'tex',tD:'depth',t:0,invK:1},u=>{const q=uv(),r=u.tA.sample(q).rgb.mul(u.invK);
      return vec4(mix(r,select(u.tD.sample(q).x.greaterThan(.99999),r,u.tB.sample(q).rgb),u.t),1);});}
  const u=PTRACE.fadeM.uniforms;u.tA.value=PTRACE.ras.texture;u.tB.value=PTRACE.fin;u.tD.value=PIPE.enc.depthTexture;u.t.value=t;u.invK.value=1/PTRACE.expK;fs(PTRACE.fadeM,PTRACE.fadeRT);
  const o=PTRACE.out.uniforms,s0=OUT_MAT.uniforms;for(const k in s0)if(k!=='t'&&o[k])o[k].value=s0[k].value;o.exposure.value=s0.exposure.value*PTRACE.expK;o.t.value=PTRACE.fadeRT.texture;fs(PTRACE.out,null);}
// log-average luminance of a texture (64 x 40 taps, read back); slot: its own pass and target (the readback lands later, and a pass's
// texture input is bound when it first compiles)
function ptrLogLum(tex,slot){const L=PTRACE.lum||(PTRACE.lum=[]);if(!L[slot]){const {uv,vec4,log,max,dot,vec3,select}=TSL;
    // (+16: a pass output here cannot go negative; g: 1 where a surface was hit, so the backdrop does not count)
    L[slot]={m:SMG({t:'tex',tD:'depth'},u=>{const q=uv(),c=u.t.sample(q).rgb;return vec4(log(max(dot(c,vec3(.2126,.7152,.0722)),1e-4)).add(16),select(u.tD.sample(q).x.greaterThan(.99999),0,1),0,1);}),
      rt:rt(64,40,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter})};}
  const J=L[slot];J.m.uniforms.t.value=tex;J.m.uniforms.tD.value=PIPE.enc.depthTexture;fs(J.m,J.rt);
  return renderer.readRenderTargetPixelsAsync(J.rt,0,0,64,40).then(b=>{let s=0,w=0;for(let i=0;i<64*40;i++){s+=b[i*4]*b[i*4+1];w+=b[i*4+1];}return w?s/w-16:NaN;});}
