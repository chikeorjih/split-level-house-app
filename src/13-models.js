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
    if(!man||!man.models||!THREE.GLTFLoader)return;const L=new THREE.GLTFLoader();
    for(const m of man.models){if(m.enabled===false)continue;
      const url=(window.__MODEL_FILES&&window.__MODEL_FILES[m.file])||('assets/models/'+m.file);
      try{const g=await new Promise((res,rej)=>L.load(url,res,undefined,rej));placeModel(m,g.scene);}catch(e){console.warn('model '+m.id+' failed to load',e);}}
    if(MODELS.length){retarget(true);updateSectionDisplay();shadowDirty=true;dirty=true;}}
  finally{MODELS_READY=true;}}
function placeModel(m,root){const o=m.orient||{},D=Math.PI/180,pl=m.place||{};
  root.rotation.set((o.x||0)*D,(o.y||0)*D,(o.z||0)*D);root.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(root),raw={w:bb.max.x-bb.min.x,d:bb.max.z-bb.min.z,h:bb.max.y-bb.min.y},sc=modelScale(m,raw);
  const inner=new THREE.Group();inner.add(root);inner.scale.setScalar(sc.s);inner.position.set(-(bb.min.x+bb.max.x)/2*sc.s,-bb.min.y*sc.s,-(bb.min.z+bb.max.z)/2*sc.s);
  // the T() piece it replaces: the nearest piece with that name; it also supplies any position, level or turn the manifest leaves out
  let rep=null;if(m.replaces){const near=new THREE.Vector3(pl.x||0,0,pl.z||0),c=INSTS.filter(i=>{const e=REG.get(i.okey)||{};return i.group&&!i.hiddenByModel&&(e.label===m.replaces||e.id===m.replaces);});
    rep=c.sort((a,b)=>(pl.x===undefined?0:a.group.position.distanceToSquared(near)-b.group.position.distanceToSquared(near)))[0]||null;
    if(!rep)console.warn('model '+m.id+': no furniture piece named "'+m.replaces+'"');else if(REG.get(rep.okey).id===m.replaces)console.warn('model '+m.id+': replaces uses Debug ID '+m.replaces+', which can change when code is edited; give that T() piece a name instead');}
  const rb=rep?new THREE.Box3().setFromObject(rep.group):null,lv=pl.lv||(rep&&/^[1-4]$/.test(rep.tag)?+rep.tag:3);
  const x=pl.x!==undefined?pl.x:(rb?(rb.min.x+rb.max.x)/2:0),z=pl.z!==undefined?pl.z:(rb?(rb.min.z+rb.max.z)/2:0);
  const ry=pl.ry!==undefined?pl.ry*D:(rep?rep.ry0+rep.ry:0)+(pl.turn||0)*D,y=pl.y!==undefined?pl.y:E[lv]+(pl.dy||0),tag=m.tag||String(lv);
  const outer=new THREE.Group();outer.position.set(x,y,z);outer.rotation.y=ry;outer.add(inner);outer.userData.model=m.id;
  const P=PRESETS[LOOK.preset];let n=0;
  const fix=mt=>{mt.clippingPlanes=CLIPS;mt.clipShadows=true;if(mt.isMeshStandardMaterial){mt.envMap=ROOM_ENV;mt.envMapIntensity=P.envI;}MAT['model:'+m.id+':'+(n++)]=mt;mt.needsUpdate=true;return mt;};
  outer.traverse(c=>{if(!c.isMesh)return;c.castShadow=c.receiveShadow=true;c.userData.tag=tag;c.userData.model=m.id;
    c.material=Array.isArray(c.material)?c.material.map(fix):fix(c.material);c.userData.baseMat=c.material;});
  if(rep){rep.group.visible=false;rep.hiddenByModel=true;for(const q of rep.cols){const i=COLS.indexOf(q.c);if(i>=0)COLS.splice(i,1);}}
  addTag(tag,outer);outer.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(outer);
  if(m.collide!==false)addCol(box.min.x,box.max.x,box.min.z,box.max.z,box.min.y,box.max.y);
  MODELS.push({m,outer,raw,sc,box,rep,repBox:rb,lv,tag,ry});}
// ---------- dimension and fit check ----------
function modelReport(){const r2=v=>Math.round(v*100)/100,ro=o=>{const q={};for(const k in o)q[k]=r2(o[k]);return q;};
  const ok=(spec,got)=>Math.abs(got-spec)<=Math.max(MODEL_TOL.in,spec*MODEL_TOL.pct);
  const ov=(a0,a1,b0,b1)=>Math.min(a1,b1)-Math.max(a0,b0);
  const gap=(f,g)=>Math.hypot(Math.max(0,g.x0-f.x1,f.x0-g.x1),Math.max(0,g.z0-f.z1,f.z0-g.z1));
  return MODELS.map(R=>{const {m,raw,sc,box,lv}=R,s=sc.s,dims={w:raw.w*s*12,d:raw.d*s*12,h:raw.h*s*12},sp=m.spec,issues=[],notes=[];
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
    const others=[...INSTS.filter(i=>i.group&&!i.hiddenByModel).map(i=>({n:(REG.get(i.okey)||{}).label||'furniture',b:new THREE.Box3().setFromObject(i.group)})),
      ...MODELS.filter(q=>q!==R).map(q=>({n:'model '+q.m.id,b:q.box}))];
    for(const q of others){const b=q.b;if(b.isEmpty()||ov(f.y0,f.y1,b.min.y,b.max.y)<.2)continue;
      const px=ov(f.x0,f.x1,b.min.x,b.max.x),pz=ov(f.z0,f.z1,b.min.z,b.max.z);if(px>.08&&pz>.08)issues.push(`overlaps ${q.n} by ${(Math.min(px,pz)*12).toFixed(1)}"`);}
    // compared with the piece it replaces (plan footprint and height, both as placed)
    if(R.rep){const b=R.repBox,o={w:(b.max.x-b.min.x)*12,d:(b.max.z-b.min.z)*12,h:(b.max.y-b.min.y)*12},n={w:(f.x1-f.x0)*12,d:(f.z1-f.z0)*12,h:(f.y1-f.y0)*12};
      r.replaces={name:m.replaces,old_in:ro(o),new_in:ro(n)};
      for(const [k,lab] of [['w','x (east-west)'],['d','z (toward the street)'],['h','tall']]){const d=n[k]-o[k];if(Math.abs(d)>3)notes.push(`${Math.abs(d).toFixed(1)}" ${d>0?'bigger':'smaller'} ${k==='h'?'in height':'along '+lab} than the ${m.replaces} it replaces`);}}
    else if(m.replaces)issues.push('no furniture piece named "'+m.replaces+'" to replace');
    r.ok=!issues.length;return r;});}
