// 13-models.js: imported furniture models (GLB/glTF, e.g. from Sketchfab) listed in assets/models/manifest.json
"use strict";
// ================= IMPORTED MODELS =================
// Each model is turned upright by its `orient`, scaled to real size (feet per model unit, from its units or its product spec), stood on its
// level's floor at a plan position, and can stand in for a T() piece (`replaces`: that piece's name), which it then hides.
// modelReport() checks every placed model: its size against the product spec, and its fit in the plan (rooms, walls, door swings, furniture).
const MODELS=[],MODEL_TOL={in:.5,pct:.02};let MODELS_READY=false;
const UNIT_FT={m:3.28084,cm:.0328084,mm:.00328084,in:1/12,ft:1};
// feet per model unit: an explicit number or unit name, else the standard unit that matches the spec, else a uniform fit to the spec
function modelScale(m,raw){const sp=m.spec;
  // fit:"axes" scales width, depth and height separately to the spec, for downloads whose proportions are slightly off the real product
  if(m.fit==="axes"&&sp){const v={x:sp.w/12/raw.w,y:sp.h/12/raw.h,z:sp.d/12/raw.d},mid=[v.x,v.y,v.z].sort((a,b)=>a-b)[1];
    return {s:mid,v,how:'fitted to the spec on each axis (×'+[v.x,v.y,v.z].map(k=>(k/mid).toFixed(3)).join(' / ')+' of an even scale)'};}
  if(typeof m.scale==='number')return {s:m.scale,how:'manifest scale'};
  if(typeof m.scale==='string'&&UNIT_FT[m.scale])return {s:UNIT_FT[m.scale],how:'units: '+m.scale};
  if(!sp)return {s:UNIT_FT.m,how:'assumed metres (no spec)'};
  const err=s=>Math.max(...['w','d','h'].map(k=>Math.abs(raw[k]*s*12-sp[k])/sp[k]));
  let best=null;for(const u in UNIT_FT){const e=err(UNIT_FT[u]);if(!best||e<best.e)best={u,e};}
  if(best.e<=MODEL_TOL.pct*1.5)return {s:UNIT_FT[best.u],how:'true to scale in '+best.u};
  const sw={w:raw.d,d:raw.w,h:raw.h},err2=s=>Math.max(...['w','d','h'].map(k=>Math.abs(sw[k]*s*12-sp[k])/sp[k]));
  for(const u in UNIT_FT)if(err2(UNIT_FT[u])<=MODEL_TOL.pct*1.5)return {s:UNIT_FT[u],how:'true to scale in '+u+', but turned 90° (its width and depth are swapped)'};
  const r=['w','d','h'].map(k=>sp[k]/12/raw[k]).sort((a,b)=>a-b);
  return {s:r[1],how:'not to scale in any standard unit; fitted ×'+(r[1]/UNIT_FT[best.u]).toFixed(3)+' from '+best.u};}
async function loadModels(){
  try{let man=window.__MODEL_MANIFEST||null;
    if(!man&&/^https?:/.test(location.protocol)){try{const r=await fetch('assets/models/manifest.json',{cache:'no-store'});if(r.ok)man=await r.json();}catch(e){}}
    if(!man||!man.models||!THREE.GLTFLoader)return;const L=new THREE.GLTFLoader();if(THREE.MeshoptDecoder)L.setMeshoptDecoder(THREE.MeshoptDecoder);   // (models compressed with gltfpack -c)
    const on=man.models.filter(q=>q.enabled!==false);let mi=0;
    for(const m of on){if(typeof LD!=='undefined')LD.stage('models',(++mi)+' of '+on.length,(mi-1)/on.length);
      const url=(window.__MODEL_FILES&&window.__MODEL_FILES[m.file])||('assets/models/'+m.file);
      try{const g=await new Promise((res,rej)=>L.load(url,res,undefined,rej));placeModel(m,g.scene);}catch(e){console.warn('model '+m.id+' failed to load',e);}}
    if(MODELS.length){retarget(true);updateSectionDisplay();arrLoad();shadowDirty=true;dirty=true;schedulePrewarm();}}
  finally{MODELS_READY=true;}}
// ---------- corduroy (manifest "fabric": "corduroy") ----------
// Procedural wales, drawn in the model's own space so a model without texture coordinates can have them. The wales follow the way the
// fabric is laid on upholstery: up and down on the front, back and outer sides (on side-facing surfaces they run along the depth), and
// front to back across seats and arm tops. Each surface takes the set that suits its facing, blended by a sharp triplanar weight. Each
// wale is a rounded rib with a narrow groove (bump-mapped, in view space), the grooves a little darker and the rib crowns a little
// lighter (the pile catching the light), and the ribs fade out when they get finer than about one and a half pixels, so they never shimmer.
const CORD_GLSL=`varying vec3 vCorP,vCorN;uniform float corPitch,corAmp;
float corH(float s){float f=fract(s);return smoothstep(0.,.32,f)*smoothstep(1.,.68,f);}
vec3 corPerturb(vec3 sp,vec3 sn,vec2 dH){vec3 sx=dFdx(sp),sy=dFdy(sp),r1=cross(sy,sn),r2=cross(sn,sx);float det=dot(sx,r1)*(gl_FrontFacing?1.:-1.);
  return normalize(abs(det)*sn-sign(det)*(dH.x*r1+dH.y*r2));}`;
// corM takes the mesh's own coordinates to the model's measured ones (a file can scale or turn its meshes inside), so the pitch is real
function corduroy(mt,pitchUnits,M){const o=mt.onBeforeCompile,k0=mt.customProgramCacheKey.call(mt),U={corPitch:{value:pitchUnits},corAmp:{value:.006},corM:{value:M}};
  mt.extensions=Object.assign({},mt.extensions,{derivatives:true});
  mt.onBeforeCompile=(sh,r)=>{if(o)o(sh,r);Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCorP,vCorN;uniform mat4 corM;').replace('#include <begin_vertex>','#include <begin_vertex>\n  vCorP=(corM*vec4(position,1.)).xyz;vCorN=mat3(corM)*normal;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+CORD_GLSL)
      .replace('#include <color_fragment>',`#include <color_fragment>
  vec3 cw=pow(abs(normalize(vCorN)),vec3(6.));cw/=cw.x+cw.y+cw.z;
  float sx=vCorP.x/corPitch,sz=vCorP.z/corPitch;
  float aaX=1.-smoothstep(.4,.75,fwidth(sx)),aaZ=1.-smoothstep(.4,.75,fwidth(sz));
  float corH0=(cw.y+cw.z)*corH(sx)*aaX+cw.x*corH(sz)*aaZ,corA=(cw.y+cw.z)*aaX+cw.x*aaZ;
  diffuseColor.rgb*=mix(1.,mix(.76,1.05,corH0),corA);`)
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n  {float h=corH0*corAmp;normal=corPerturb(-vViewPosition,normal,vec2(dFdx(h),dFdy(h)));}');};
  mt.customProgramCacheKey=()=>'cord|'+k0;mt.needsUpdate=true;}
function placeModel(m,root){const o=m.orient||{},D=Math.PI/180,pl=m.place||{};
  root.rotation.set((o.x||0)*D,(o.y||0)*D,(o.z||0)*D);root.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(root),raw={w:bb.max.x-bb.min.x,d:bb.max.z-bb.min.z,h:bb.max.y-bb.min.y},sc=modelScale(m,raw);
  const inner=new THREE.Group();inner.add(root);const sv=sc.v||{x:sc.s,y:sc.s,z:sc.s};inner.scale.set(sv.x,sv.y,sv.z);inner.position.set(-(bb.min.x+bb.max.x)/2*sv.x,-bb.min.y*sv.y,-(bb.min.z+bb.max.z)/2*sv.z);
  // the T() piece it replaces: the nearest piece with that name; it also supplies any position, level or turn the manifest leaves out
  // (replaces may also be a list, for one model standing in for several pieces: the first supplies its place, every one is hidden)
  const repNames=[].concat(m.replaces||[]),repName=repNames[0];
  let rep=null;if(repName){const near=new THREE.Vector3(pl.x||0,0,pl.z||0),c=INSTS.filter(i=>{const e=REG.get(i.okey)||{};return i.group&&!i.hiddenByModel&&(e.label===repName||e.id===repName);});
    rep=c.sort((a,b)=>(pl.x===undefined?0:a.group.position.distanceToSquared(near)-b.group.position.distanceToSquared(near)))[0]||null;
    if(!rep)console.warn('model '+m.id+': no furniture piece named "'+repName+'"');else if(REG.get(rep.okey).id===repName)console.warn('model '+m.id+': replaces uses Debug ID '+repName+', which can change when code is edited; give that T() piece a name instead');}
  const rb=rep?new THREE.Box3().setFromObject(rep.group):null,lv=pl.lv||(rep&&/^[1-4]$/.test(tagBase(rep.tag))?+tagBase(rep.tag):3);
  const x=pl.x!==undefined?pl.x:(rb?(rb.min.x+rb.max.x)/2:0),z=pl.z!==undefined?pl.z:(rb?(rb.min.z+rb.max.z)/2:0);
  const ry=pl.ry!==undefined?pl.ry*D:(rep?rep.ry0+rep.ry:0)+(pl.turn||0)*D,y=pl.y!==undefined?pl.y:E[lv]+(pl.dy||0),tag=m.tag||(rep&&tagPh(rep.tag)?rep.tag:String(lv));
  const outer=new THREE.Group();outer.position.set(x,y,z);outer.rotation.y=ry;outer.add(inner);outer.userData.model=m.id;
  const P=PRESETS[LOOK.preset];let n=0;
  // (under WebGPU the loader's materials are classic ones, whose clippingPlanes never become a mask, so the house's cuts and its state
  // wipe passed them by: each is copied into the node material of the same type first)
  const fix=mt=>{if(window.GPU&&!mt.isNodeMaterial&&THREE[mt.type]){const nm=new THREE[mt.type]();Object.getPrototypeOf(mt).copy.call(nm,mt);mt.dispose();mt=nm;}
    mt.clippingPlanes=CLIPS;mt.clipShadows=true;if(mt.isMeshStandardMaterial){mt.envMap=ROOM_ENV;mt.envMapIntensity=P.envI;}MAT['model:'+m.id+':'+(n++)]=mt;if(typeof giPatch==='function')giPatch(mt);mt.needsUpdate=true;return mt;};
  // a model without normals (a slimmed scan) gets smooth ones; without texture coordinates its texture can't be placed, so it takes the
  // manifest's colour instead
  const noUV=mt=>{if(mt.map){mt.map=null;mt.needsUpdate=true;}if(m.color)mt.color.set(m.color);};
  outer.traverse(c=>{if(!c.isMesh)return;if(c.geometry&&!c.geometry.attributes.normal)c.geometry.computeVertexNormals();
    if(c.geometry&&!c.geometry.attributes.uv)[].concat(c.material).forEach(noUV);else if(m.color)[].concat(c.material).forEach(mt=>mt.color.set(m.color));
    if(m.fabric==='corduroy'){outer.updateMatrixWorld(true);const M=inner.matrixWorld.clone().invert().multiply(c.matrixWorld);
      [].concat(c.material).forEach(mt=>{if(mt.isMeshStandardMaterial){mt.roughness=.88;mt.metalness=0;if(window.GPU)gpuCorduroy(mt,(m.walePitchIn||.2)/12/(sc.v?sc.v.x:sc.s),M);else corduroy(mt,(m.walePitchIn||.2)/12/(sc.v?sc.v.x:sc.s),M);}});}
    c.castShadow=c.receiveShadow=true;c.userData.tag=tag;c.userData.model=m.id;
    c.material=Array.isArray(c.material)?c.material.map(fix):fix(c.material);c.userData.baseMat=c.material;});
  const hide=r=>{r.group.visible=false;r.hiddenByModel=true;for(const q of r.cols){const i=COLS.indexOf(q.c);if(i>=0)COLS.splice(i,1);}};if(rep)hide(rep);
  for(const nm of repNames.slice(1)){const c=INSTS.filter(i=>{const e=REG.get(i.okey)||{};return i.group&&!i.hiddenByModel&&e.label===nm;});if(!c.length)console.warn('model '+m.id+': no furniture piece named "'+nm+'"');c.forEach(r=>{hide(r);if(rb)rb.union(new THREE.Box3().setFromObject(r.group));});}   // (the report compares the model with all of them together)
  addTag(tag,outer);outer.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(outer);
  const R={m,outer,raw,sc,box,rep,repBox:rb,lv,tag,ry};MODELS.push(R);
  // an Arrange piece: the model's group already pivots on its footprint centre at floor level; its base turn stays in rybase
  const inst={key:'model:'+m.id,okey:'model:'+m.id,n:1,tag,group:outer,pivot0:outer.position.clone(),grp:box.clone(),dx:0,dz:0,ry:0,rybase:ry,cols:[],lights:[],isModel:true,model:R};
  if(m.collide!==false){const c=phase(rep?rep.ph:null,()=>addCol(box.min.x,box.max.x,box.min.z,box.max.z,box.min.y,box.max.y));inst.cols.push({c,r:[box.min.x,box.max.x,box.min.z,box.max.z]});}
  outer.traverse(o=>{if(o.isMesh)o.userData.inst=inst;});outer.userData.inst=inst;INSTS.push(inst);R.inst=inst;}
// ---------- dimension and fit check ----------
function modelReport(){const r2=v=>Math.round(v*100)/100,ro=o=>{const q={};for(const k in o)q[k]=r2(o[k]);return q;};
  const ok=(spec,got)=>Math.abs(got-spec)<=Math.max(MODEL_TOL.in,spec*MODEL_TOL.pct);
  const ov=(a0,a1,b0,b1)=>Math.min(a1,b1)-Math.max(a0,b0);
  const gap=(f,g)=>Math.hypot(Math.max(0,g.x0-f.x1,f.x0-g.x1),Math.max(0,g.z0-f.z1,f.z0-g.z1));
  return MODELS.map(R=>{const {m,raw,sc,box,lv}=R,s=sc.s,sv=sc.v||{x:s,y:s,z:s},dims={w:raw.w*sv.x*12,d:raw.d*sv.z*12,h:raw.h*sv.y*12},sp=m.spec,issues=[],notes=[];
    const r={id:m.id,name:m.name||m.id,file:m.file,scale:sc.how,ftPerUnit:+s.toPrecision(5),rawUnits:ro(raw),dims_in:ro(dims),issues,notes};
    if(sp){r.spec_in={w:sp.w,d:sp.d,h:sp.h};r.diff_in={};
      for(const k of ['w','d','h']){const d=dims[k]-sp[k];r.diff_in[k]=r2(d);
        if(!ok(sp[k],dims[k]))issues.push(`${({w:'width',d:'depth',h:'height'})[k]} is ${dims[k].toFixed(1)}" but the product is ${sp[k]}" (${d>0?'+':''}${d.toFixed(1)}")`);}
      if(issues.length&&ok(sp.w,dims.d)&&ok(sp.d,dims.w))notes.push('width and depth look swapped: try orient y:90');
      if(issues.length&&(ok(sp.h,dims.d)||ok(sp.h,dims.w)))notes.push('height matches a horizontal side: the model may be Z-up, try orient x:-90');}
    else issues.push('no product dimensions (spec) to check against');
    const f={x0:box.min.x,x1:box.max.x,z0:box.min.z,z1:box.max.z,y0:box.min.y,y1:box.max.y};
    r.place={lv,x:r2((f.x0+f.x1)/2),z:r2((f.z0+f.z1)/2),ryDeg:Math.round(R.ry*180/Math.PI),floorY:r2(f.y0)};r.footprint_ft=ro(f);
    // rooms: the footprint should sit inside the rooms of its level (open plans span several room rectangles)
    const rooms=SPEC.rooms.filter(q=>q.lv===lv),inR=(x,z)=>rooms.find(q=>x>=Math.min(q.x0,q.x1)-.05&&x<=Math.max(q.x0,q.x1)+.05&&z>=Math.min(q.z0,q.z1)-.05&&z<=Math.max(q.z0,q.z1)+.05);
    const c=inR(r.place.x,r.place.z);r.room=c?c.name:null;if(!c)issues.push('its centre is not inside any room on '+LEVEL_NAMES[lv].toLowerCase());
    let out=0;for(let i=0;i<=4;i++)for(let j=0;j<=4;j++)if(!inR(f.x0+(f.x1-f.x0)*i/4,f.z0+(f.z1-f.z0)*j/4))out++;
    if(out)issues.push('part of its footprint is outside the rooms of this level');
    // walls: no wall piece may cut into it; report the nearest wall
    let near=1e9;for(const w of PIECES){if(ov(f.y0+.05,f.y1,w.y0,w.y1)<=0)continue;
      const g=w.ax==='x'?{x0:w.a0,x1:w.a1,z0:w.c-w.t/2,z1:w.c+w.t/2}:{x0:w.c-w.t/2,x1:w.c+w.t/2,z0:w.a0,z1:w.a1};
      const px=ov(f.x0,f.x1,g.x0,g.x1),pz=ov(f.z0,f.z1,g.z0,g.z1);
      if(px>.02&&pz>.02){const ax=w.ax==='x'?'z':'x',fc=ax==='x'?(f.x0+f.x1)/2:(f.z0+f.z1)/2,sg=fc>=w.c?1:-1,pen=ax==='x'?px:pz,to=r2((ax==='x'?r.place.x:r.place.z)+sg*(pen+.02));
        issues.push(`runs ${(pen*12).toFixed(1)}" into a ${w.glass?'window':'wall'} at ${ax} = ${r2(w.c)}; moving it to place.${ax} = ${to} would clear it`);near=0;}
      else near=Math.min(near,gap(f,g));}
    r.nearestWall_in=near<1e8?r2(near*12):null;
    // door swings (a square the width of the door, on its swing side)
    for(const d of DOORS){if(ov(f.y0,f.y1,d.y0,d.y0+6.8)<=0)continue;const w=d.oa1-d.oa0,f0=d.c+d.side*d.t/2,f1=f0+d.side*w;
      const g=d.ax==='x'?{x0:d.oa0,x1:d.oa1,z0:Math.min(f0,f1),z1:Math.max(f0,f1)}:{x0:Math.min(f0,f1),x1:Math.max(f0,f1),z0:d.oa0,z1:d.oa1};
      if(ov(f.x0,f.x1,g.x0,g.x1)>.05&&ov(f.z0,f.z1,g.z0,g.z1)>.05)issues.push(`blocks the swing of a door at ${d.ax==='x'?'x':'z'} ${r2(d.oa0)} to ${r2(d.oa1)}`);}
    // other furniture and models (ignores rugs and anything barely overlapping)
    const others=[...INSTS.filter(i=>i.group&&!i.hiddenByModel&&!i.isModel).map(i=>({n:(REG.get(i.okey)||{}).label||'furniture',b:new THREE.Box3().setFromObject(i.group)})),
      ...MODELS.filter(q=>q!==R).map(q=>({n:'model '+q.m.id,b:q.box}))];
    // (a box overlap is confirmed against the model's own surface, so a piece standing in the notch of an L-shaped sectional is not counted)
    const pts=R.pts||(R.pts=(()=>{const a=[],v=new THREE.Vector3();R.outer.updateMatrixWorld(true);R.outer.traverse(o=>{if(!o.isMesh)return;const P=o.geometry.attributes.position;
      for(let i=0;i<P.count;i+=3){v.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);a.push(v.x,v.y,v.z);}});return a;})());
    const hits=b=>{for(let i=0;i<pts.length;i+=3)if(pts[i]>b.min.x+.08&&pts[i]<b.max.x-.08&&pts[i+2]>b.min.z+.08&&pts[i+2]<b.max.z-.08&&pts[i+1]>b.min.y&&pts[i+1]<b.max.y)return true;return false;};
    for(const q of others){const b=q.b;if(b.isEmpty()||ov(f.y0,f.y1,b.min.y,b.max.y)<.2)continue;
      const px=ov(f.x0,f.x1,b.min.x,b.max.x),pz=ov(f.z0,f.z1,b.min.z,b.max.z);if(px>.08&&pz>.08&&hits(b))issues.push(`overlaps ${q.n} by ${(Math.min(px,pz)*12).toFixed(1)}"`);}
    // compared with the piece it replaces (plan footprint and height, both as placed)
    if(R.rep){const b=R.repBox,o={w:(b.max.x-b.min.x)*12,d:(b.max.z-b.min.z)*12,h:(b.max.y-b.min.y)*12},n={w:(f.x1-f.x0)*12,d:(f.z1-f.z0)*12,h:(f.y1-f.y0)*12};
      r.replaces={name:[].concat(m.replaces).join(' + '),old_in:ro(o),new_in:ro(n)};
      for(const [k,lab] of [['w','x (east-west)'],['d','z (toward the street)'],['h','tall']]){const d=n[k]-o[k];if(Math.abs(d)>3)notes.push(`${Math.abs(d).toFixed(1)}" ${d>0?'bigger':'smaller'} ${k==='h'?'in height':'along '+lab} than the ${[].concat(m.replaces).join(' + ')} it replaces`);}}
    else if(m.replaces)issues.push('no furniture piece named "'+[].concat(m.replaces)[0]+'" to replace');
    r.ok=!issues.length;return r;});}
