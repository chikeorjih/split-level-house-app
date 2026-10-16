// 12-app.js: app shell: scene setup, views, transitions, walking, input, UI, render loop
"use strict";
// ================= APP =================
const CUT={1:E[1]+4.3,2:E[2]+3.5,3:E[3]+3.5,4:E[4]+4.3};
// level cut height: waist height in plan; in the 3/4 view, three quarters of the way from floor to ceiling, so walls read as rooms but you can see in
const CUT3=L=>E[L]+.75*(CEIL[L]-E[L]);
const cutH=L=>(ST.pending||ST.view)==='plan'?CUT[L]:CUT3(L);
const PLAN_TAGS={1:['1','S'],2:['2','S','X'],3:['3','S'],4:['4','S','X']};
const ST={view:'three',level:'all',levels:[],trees:true,labels:true,site:false};
// levels shown solid: every toggled level in the 3/4 view, just the cut level in plan
const shownLv=()=>((ST.pending||ST.view)==='three'&&ST.levels.length)?ST.levels:(ST.cutL?[ST.cutL]:[]);
const TWINS=[];let renderer,scene,camO,camW,camP,sun,TAGS={},TREES,SETBACK,TERRAIN,CAPGRP={},dirty=true,shadowDirty=true;
const $=id=>document.getElementById(id);
const COARSE=window.matchMedia&&matchMedia('(pointer: coarse)').matches;
function initRenderer(){
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(innerWidth,innerHeight);
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  renderer.localClippingEnabled=true;$('stage').appendChild(renderer.domElement);
  MAXANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
}
function envMap(){const s=new THREE.Scene();const g=new THREE.SphereGeometry(50,32,16);const c=[];const p=g.attributes.position;
  const top=new THREE.Color(0xbcd3ea),hor=new THREE.Color(0xf2efe6),bot=new THREE.Color(0x4a4438),t=new THREE.Color();
  for(let i=0;i<p.count;i++){const y=p.getY(i)/50;if(y>0)t.copy(hor).lerp(top,Math.pow(y,.6));else t.copy(hor).lerp(bot,Math.min(1,-y*3));c.push(t.r,t.g,t.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));s.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const sunB=new THREE.Mesh(new THREE.SphereGeometry(10,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));sunB.material.color.setScalar(6);sunB.position.set(-26,30,22);s.add(sunB);
  const pm=new THREE.PMREMGenerator(renderer);const rt=pm.fromScene(s,.04);pm.dispose();return rt.texture;}
// ---------- animated transitions: per-level opacity, sliding cut plane, sky-to-paper, camera moves ----------
const FADE=new Map(),FADE_OPACITY=.2,TAG_LV={'1':1,'2':2,'3':3,'4':4,'X':0,'frontOpen':3,'frontClosed':3};
const FCUR={},FTW={},CLIPT={from:0,to:0,t:1,dur:1,target:null},SKYT={from:0,to:0,t:1,dur:1};
let CT=null,PT=null,ORB_SAVED=null;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function meshesOf(tag){const out=[];for(const o of TAGS[tag]||[]){if(o.isMesh)out.push(o);else if(o.traverse)o.traverse(c=>{if(c.isMesh&&!c.userData.isTwin)out.push(c);});}return out;}
// ---------- level presentation in the 3/4 view: when levels are picked, the site, lawn and trees wash out to a pale, low-saturation tone
// (WASH, animated 0..1, shared by every site material through a shader patch on per-material clones), trees and shrubs fade to TREE_FADE,
// and the other levels show as pale massing (GHOST) instead of see-through copies of their real materials
const WASH={value:0},WASH_TAGS=['site','grass','trees'],WASHED=new Map(),TREE_FADE=.3,GHOST_OPACITY=.32,GHOST=new Map();
const presenting=()=>(ST.pending||ST.view)==='three'&&!!ST.cutL;
// wash: toward a pale tone (the material's own washCol: near-white for paving and buildings, soft sage for the soil under the lawn)
function washPatch(sh,col){sh.uniforms.washAmt=WASH;sh.uniforms.washCol=col;sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float washAmt;uniform vec3 washCol;')
  .replace('#include <color_fragment>','#include <color_fragment>\n  if(washAmt>0.){float wl=dot(diffuseColor.rgb,vec3(.3,.59,.11));diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(wl),washCol,.62),washAmt*.85);}');}
// calm: the lawn's blades keep their green, a little softer (less saturation and contrast), after the grass shader's own colouring
function calmPatch(sh){sh.uniforms.washAmt=WASH;sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float washAmt;')
  .replace('#include <emissivemap_fragment>','  if(washAmt>0.){float cl=dot(diffuseColor.rgb,vec3(.3,.59,.11));diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(cl),diffuseColor.rgb,.72)*.88+cl*.14,washAmt);}\n#include <emissivemap_fragment>');}
const WASH_PALE=new THREE.Color(.74,.73,.7),WASH_SAGE=new THREE.Color(0xa9b39a).convertSRGBToLinear();
// a washable clone of a site material (or, for the lawn blades, a calmed one); its maps follow the original's (photo textures load later)
function washOf(b,mode){let w=WASHED.get(b);if(w)return w;w=b.clone();const o=b.onBeforeCompile,key=o?String(o):'',col={value:mode==='sage'?WASH_SAGE:WASH_PALE};
  w.onBeforeCompile=sh=>{if(o)o(sh);if(mode==='calm')calmPatch(sh);else washPatch(sh,col);};w.customProgramCacheKey=()=>(mode==='calm'?'calm|':'wash|')+key;WASHED.set(b,w);return w;}
function syncWashed(){WASHED.forEach((w,b)=>{for(const k of ['map','normalMap','roughnessMap','color','roughness']){if(k==='color'){if(b.color&&w.color)w.color.copy(b.color);}else if(w[k]!==b[k])w[k]=b[k];}w.needsUpdate=true;});}
function ghostOf(tag){let g=GHOST.get(tag);if(!g){g=new THREE.MeshStandardMaterial({color:0xf3f1ec,roughness:1,transparent:true,depthWrite:false,side:THREE.DoubleSide,clippingPlanes:CLIPS,clipShadows:true});GHOST.set(tag,g);}return g;}
function fadeTarget(tag){const vv=ST.pending||ST.view,L=ST.cutL;
  if(vv==='plan')return PLAN_TAGS[L].includes(tag)&&tag!=='X'?1:0;
  if(tag==='trees')return ST.trees?(presenting()?TREE_FADE:1):0;
  if(vv==='walk')return tag==='frontClosed'?0:1;
  if(tag==='frontOpen')return 0;
  if(L){if(tag==='roof'||tag[0]==='C')return 0;const lv=TAG_LV[tag];if(lv>L)return 0;if(lv!==undefined&&!shownLv().includes(lv))return FADE_OPACITY;}
  return 1;}
function setTagOpacity(tag,o){FCUR[tag]=o;const ghost=presenting()&&fadeTarget(tag)===FADE_OPACITY;
  for(const m of meshesOf(tag)){if(!m.userData.baseMat)m.userData.baseMat=m.material;const b=m.userData.baseMat,wasVis=m.visible;
    if(o<=.003){m.visible=false;m.userData.faded=true;}
    else if(o>=.997){m.visible=true;m.material=b;m.userData.faded=false;}
    else if(ghost){const g=ghostOf(tag);g.opacity=Math.min(1,o/FADE_OPACITY*GHOST_OPACITY);m.material=g;m.visible=true;m.userData.faded=true;}
    else{const k=tag+'|'+b.uuid;let c=FADE.get(k);if(!c){c=b.clone();c.transparent=true;c.depthWrite=false;c.clippingPlanes=CLIPS;c.clipShadows=true;c.onBeforeCompile=b.onBeforeCompile;if(b.alphaTest)c.alphaTest=b.alphaTest*.25;
        if(b.customProgramCacheKey!==THREE.Material.prototype.customProgramCacheKey)c.customProgramCacheKey=b.customProgramCacheKey;FADE.set(k,c);}
      c.opacity=o*(b.transparent?b.opacity:1);m.material=c;m.visible=true;m.userData.faded=true;}
    if(wasVis!==m.visible)shadowDirty=true;}}
function refreshFades(){syncWashed();FADE.forEach(c=>c.dispose());FADE.clear();for(const t in FCUR)setTagOpacity(t,FCUR[t]);updateSectionDisplay();}
function retarget(instant){for(const tag in TAGS){const to=fadeTarget(tag),cur=FCUR[tag]===undefined?to:FCUR[tag];
  if(instant||Math.abs(to-cur)<.003){delete FTW[tag];setTagOpacity(tag,to);}else FTW[tag]={from:cur,to,t:0,dur:.85};}}
function retargetClip(instant){const tgt=ST.cutL?cutH(ST.cutL):null,TOP=24,cur=CLIP_TOP.constant>1e4?TOP:CLIP_TOP.constant,to=tgt===null?TOP:tgt;CLIPT.target=tgt;
  if(instant||Math.abs(cur-to)<.01){CLIPT.t=CLIPT.dur;CLIP_TOP.constant=tgt===null?1e5:tgt;}else{CLIPT.from=cur;CLIPT.to=to;CLIPT.t=0;CLIPT.dur=.6+Math.min(.6,Math.abs(to-cur)/30);CLIP_TOP.constant=cur;}}
function updateSectionDisplay(){const vv=ST.pending||ST.view,settled=CLIPT.t>=CLIPT.dur,clipping=CLIP_TOP.constant<1e4;
  for(const k in CAPGRP)CAPGRP[k].visible=false;
  if(settled&&ST.cutL)CAPGRP[(vv==='plan'?'plan':'cut')+ST.cutL].visible=true;
  for(const tw of TWINS){const p=tw.userData.twinOf;tw.visible=clipping&&p.visible&&!p.userData.faded;}}
function snapOrb(){return {th:ORB.th,ph:ORB.ph,d:ORB.d,t:ORB.t.clone(),fov:ORB.fov};}
function startCam(to,done,dur){if(CT){const d0=CT.done;CT=null;if(d0)d0();}const from=snapOrb();
  to.th=from.th+(((to.th-from.th+Math.PI)%(2*Math.PI))+2*Math.PI)%(2*Math.PI)-Math.PI;CT={from,to,t:0,dur:dur||1.35,done};}
function stepCam(dt){CT.t+=dt;const k=Math.min(1,CT.t/CT.dur),e=ease(k),f=CT.from,o=CT.to,R=Math.PI/360;
  ORB.th=f.th+(o.th-f.th)*e;ORB.ph=f.ph+(o.ph-f.ph)*e;ORB.t.lerpVectors(f.t,o.t,e);ORB.fov=f.fov+(o.fov-f.fov)*e;
  const h0=f.d*Math.tan(f.fov*R),h1=o.d*Math.tan(o.fov*R);ORB.d=Math.exp(Math.log(h0)+(Math.log(h1)-Math.log(h0))*e)/Math.tan(ORB.fov*R);
  if(k>=1){const d=CT.done;CT=null;if(d)d();}}
function planPose(){const L=ST.level==='all'?2:ST.level;return {th:0,ph:.0015,d:(PLN.span/2)/Math.tan(6*Math.PI/180),t:new THREE.Vector3(PLN.x,CUT[L],PLN.z),fov:12};}
function animate(dt){let busy=false;
  {const wt=presenting()?1:0;if(WASH.value!==wt){WASH.value=wt>WASH.value?Math.min(1,WASH.value+dt/.85):Math.max(0,WASH.value-dt/.6);busy=true;}}
  for(const tag in FTW){const w=FTW[tag];w.t+=dt;const k=Math.min(1,w.t/w.dur);setTagOpacity(tag,w.from+(w.to-w.from)*ease(k));if(k>=1)delete FTW[tag];busy=true;}
  if(CLIPT.t<CLIPT.dur){CLIPT.t+=dt;const k=Math.min(1,CLIPT.t/CLIPT.dur);CLIP_TOP.constant=CLIPT.from+(CLIPT.to-CLIPT.from)*ease(k);if(k>=1&&CLIPT.target===null)CLIP_TOP.constant=1e5;shadowDirty=true;busy=true;}
  if(SKYT.t<SKYT.dur){SKYT.t+=dt;const k=Math.min(1,SKYT.t/SKYT.dur);SKY_MAT.uniforms.pm.value=SKYT.from+(SKYT.to-SKYT.from)*ease(k);busy=true;}
  if(PT){PT.t+=dt;const k=Math.min(1,PT.t/PT.dur),e=ease(k);PLN.x=PT.from.x+(PT.to.x-PT.from.x)*e;PLN.z=PT.from.z+(PT.to.z-PT.from.z)*e;
    PLN.span=Math.exp(Math.log(PT.from.span)+(Math.log(PT.to.span)-Math.log(PT.from.span))*e);if(k>=1)PT=null;busy=true;}
  if(CT){stepCam(dt);busy=true;}
  if(busy){updateSectionDisplay();dirty=true;}
  return busy;}
function addTag(tag,obj){(TAGS[tag]=TAGS[tag]||[]).push(obj);scene.add(obj);}
function buildScene(){
  scene=new THREE.Scene();scene.background=null;scene.fog=makeFog();
  makeMaterials();
  for(const k in MAT){const m=MAT[k];if(m.clippingPlanes)m.clipShadows=true;}
  buildHouse();buildFurniture();buildSiteHard();
  const NOSHADOW=new Set(['glass','light','flame','shade','frost','curtain']);
  for(const b of BUCKETS.values()){if(!b.p.length)continue;const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2));
    let mat=MAT[b.mat];if(!mat){console.warn('missing material',b.mat);mat=MAT.wall;}
    const m=new THREE.Mesh(g,mat);m.userData.baseMat=mat;m.castShadow=!NOSHADOW.has(b.mat);m.receiveShadow=b.mat!=='glass';if(b.mat==='glass')m.renderOrder=2;m.userData.tag=b.tag;addTag(b.tag,m);}
  BUCKETS.clear();
  // each placed furniture piece becomes its own group, pivoting on its footprint centre, so it can be moved and turned
  for(const inst of INSTS){const bb=inst.grp;if(!inst.buckets.size||bb.isEmpty())continue;
    const P0=new THREE.Vector3((bb.min.x+bb.max.x)/2,bb.min.y,(bb.min.z+bb.max.z)/2),grp=new THREE.Group();grp.position.copy(P0);grp.userData.inst=inst;inst.pivot0=P0;inst.group=grp;
    for(const b of inst.buckets.values()){const pos=new Float32Array(b.p.length);for(let i=0;i<b.p.length;i+=3){pos[i]=b.p[i]-P0.x;pos[i+1]=b.p[i+1]-P0.y;pos[i+2]=b.p[i+2]-P0.z;}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2));
      const mat=MAT[b.mat]||MAT.wall,m=new THREE.Mesh(g,mat);m.userData.baseMat=mat;m.userData.tag=b.tag;m.userData.inst=inst;m.castShadow=!NOSHADOW.has(b.mat);m.receiveShadow=b.mat!=='glass';if(b.mat==='glass')m.renderOrder=2;grp.add(m);}
    addTag(inst.tag,grp);inst.buckets=null;}
  TERRAIN=new THREE.Mesh(buildTerrain(),MAT.grass);TERRAIN.receiveShadow=true;addTag('site',TERRAIN);
  {const sk=new THREE.Mesh(buildSkirt(),MAT.grass);sk.receiveShadow=true;sk.userData.skirt=true;addTag('site',sk);}
  TREES=buildTrees();addTag('trees',TREES);
  SETBACK=setbackLines();SETBACK.visible=false;scene.add(SETBACK);
  const GR=buildGrass();MAT.grassBlades=GR.userData.mat;addTag('grass',GR);
  for(const t of WASH_TAGS)for(const m of meshesOf(t)){if(Array.isArray(m.material))continue;m.material=washOf(m.material,t==='grass'?'calm':m.material===MAT.grass?'sage':'pale');m.userData.baseMat=m.material;}
  LOOK.hemi=new THREE.HemisphereLight(0xe3edf7,0x5e5444,.12);LOOK.amb=new THREE.AmbientLight(0xfff6ea,.05);scene.add(LOOK.hemi,LOOK.amb);
  // cut-section fill: back faces show as solid dark wherever the cutaway slices through something
  const TWM=new THREE.MeshBasicMaterial({color:0x353a40,side:THREE.BackSide,clippingPlanes:CLIPS});const NOTWIN=new Set(['glass','frost','light','flame','shade','curtain','plantGreen','chain','mirror']);
  for(const tag in TAGS){if(tag==='roof'||tag[0]==='C'||tag==='site'||tag==='trees'||tag==='grass')continue;for(const m of meshesOf(tag)){if(NOTWIN.has(Object.keys(MAT).find(k=>MAT[k]===m.material)))continue;
      const tw=new THREE.Mesh(m.geometry,TWM);tw.userData.twinOf=m;tw.userData.isTwin=true;tw.visible=false;TWINS.push(tw);(m.parent&&m.parent!==scene?m.parent:scene).add(tw);}}
  sun=new THREE.DirectionalLight(0xfff0d8,1.75);sun.position.set(-48,95,62).add(new THREE.Vector3(16,-5,15));sun.target.position.set(16,-5,15);
  sun.castShadow=true;const sz=renderer.capabilities.maxTextureSize>=4096?4096:2048;sun.shadow.mapSize.set(sz,sz);
  Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:10,far:330});sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;
  scene.add(sun,sun.target);buildSky();buildLamps();buildKitchenLights();buildSkyLights();
  for(const L of [1,2,3,4]){CAPGRP['plan'+L]=caps(L,PLAN_TAGS[L]);CAPGRP['cut'+L]=caps(L,[String(L),'S'],CUT3(L),true);}
}
const CUTLINE_MAT=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.95});
function caps(L,tags,cutY,noSwings){const cut=cutY||CUT[L],grp=new THREE.Group();const acc={};const put=(k,x0,x1,z0,z1,y)=>{const a=acc[k]=acc[k]||[];
    const Y=y||cut-.02;a.push(x0,Y,z0, x0,Y,z1, x1,Y,z1, x0,Y,z0, x1,Y,z1, x1,Y,z0);};
  const ok=tag=>!tags||tags.includes(tag);
  for(const p of PIECES){if(!ok(p.tag)||!(p.y0<cut&&p.y1>cut))continue;const k=p.glass?'glass':p.closet?'closet':p.isNew?'new':'wall';
    const t=p.glass?Math.max(.12,p.t):p.t;if(p.ax==='x')put(k,p.a0,p.a1,p.c-t/2,p.c+t/2);else put(k,p.c-t/2,p.c+t/2,p.a0,p.a1);}
  for(const c of CAPS){if(!ok(c.tag)||!(c.y0<cut&&c.y1>cut))continue;put(c.tag==='X'?'wall':'item',c.x0,c.x1,c.z0,c.z1);}
  const col={wall:0x2a2f35,new:0x2c66c9,glass:0x8fbcd9,closet:0x9aa3aa,item:0x8d959c};
  for(const k in acc){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(acc[k],3));
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:col[k],side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));m.renderOrder=5;grp.add(m);
    // 3/4 view: a crisp white outline round every cut wall, so the plan draws itself in 3D
    if(noSwings&&k!=='item'){const e=new THREE.EdgesGeometry(g,30);e.translate(0,.03,0);const ln=new THREE.LineSegments(e,CUTLINE_MAT);ln.renderOrder=6;grp.add(ln);}}
  // door swings
  const lp=[],ln=[];
  for(const d of noSwings?[]:DOORS){if(!ok(d.tag)||!(d.y0<cut&&d.y0>cut-7))continue;const w=d.oa1-d.oa0,h=d.hinge<0?d.oa0:d.oa1,f=d.c+d.side*d.t/2,o=d.hinge<0?d.oa1:d.oa0,arr=d.isNew?ln:lp,Y=cut-.03;
    const P2=(a,n)=>d.ax==='x'?[a,Y,n]:[n,Y,a];
    arr.push(...P2(h,f),...P2(h,f+d.side*w));
    const N=14;for(let i=0;i<N;i++){const a0=i/N*Math.PI/2,a1=(i+1)/N*Math.PI/2;const s=Math.sign(o-h);
      arr.push(...P2(h+s*w*Math.sin(a0),f+d.side*w*Math.cos(a0)),...P2(h+s*w*Math.sin(a1),f+d.side*w*Math.cos(a1)));}}
  for(const [arr,c] of [[lp,0x56606a],[ln,0x2c66c9]]){if(!arr.length)continue;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
    const L2=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:c}));L2.renderOrder=6;grp.add(L2);}
  grp.visible=false;scene.add(grp);return grp;}
// ---------------- view state ----------------
const ORB={t:new THREE.Vector3(14,-4,17),th:Math.atan2(.18,1),ph:1.08,d:135,fov:38};
const PLN={x:16,z:15,span:78};
const WLK={x:22.3,z:34.6,f:-.5,yaw:0,pitch:-.05,vy:0,ground:true,inited:false};
function setVis(instant){const vv0=ST.pending||ST.view;
  if(vv0==='three'){if(ST.level==='all')ST.levels=[];else if(!ST.levels.includes(ST.level))ST.levels=[ST.level];if(ST.levels.length)ST.level=Math.max(...ST.levels);}
  const vv=vv0,L=ST.level,cutL=(vv==='plan')?(L==='all'?2:L):(vv==='three'&&L!=='all'?L:null),plan=vv==='plan';
  ST.cutL=cutL;retarget(instant);retargetClip(instant);
  SKYT.from=SKY_MAT.uniforms.pm.value;SKYT.to=plan?1:0;SKYT.t=instant?SKYT.dur:0;if(instant)SKY_MAT.uniforms.pm.value=SKYT.to;
  SETBACK.visible=ST.site;if(SKY)SKY.visible=true;scene.background=null;scene.fog=plan?null:makeFog();updateFog();
  for(const L2 of SETBACK.children)L2.material.depthTest=!plan&&vv!=='three'?true:false;
  fitShadow(true);updateSectionDisplay();shadowDirty=true;dirty=true;updateUI();}
function setView(v){
  if(ST.pending){if(v==='three'){ST.pending=null;const to=ORB_SAVED?{...ORB_SAVED,t:ORB_SAVED.t.clone()}:null;CT=null;setVis();if(to)startCam(to);return;}
    const d=CT&&CT.done;CT=null;if(d)d();}
  const prev=ST.view;if(v===prev)return;
  if(prev==='three'&&v==='plan'){if(ST.level==='all')ST.level=2;fitPlan();ORB_SAVED=snapOrb();ST.pending='plan';setVis();
    startCam(planPose(),()=>{ST.pending=null;ST.view='plan';ORB.fov=38;resize();setVis();},1.5);return;}
  if(prev==='plan'&&v==='three'){const pp=planPose();Object.assign(ORB,{th:pp.th,ph:pp.ph,d:pp.d,fov:pp.fov});ORB.t.copy(pp.t);ST.view='three';
    const to=ORB_SAVED?{...ORB_SAVED,t:ORB_SAVED.t.clone()}:{th:Math.atan2(.18,1),ph:1.08,d:135,t:new THREE.Vector3(14,-4,17),fov:38};to.t.y=ST.level==='all'?-5:E[ST.level];to.fov=38;
    resize();setVis();startCam(to,null,1.5);return;}
  ST.view=v;if(v==='walk'&&!WLK.inited){WLK.inited=true;teleport({x:22.3,z:34.6,lv:3,yaw:0,out:true});}
  if(v==='plan'&&ST.level==='all')ST.level=2;
  if(v==='plan')fitPlan();if(v==='three'){ORB.fov=38;}setVis();resize();}
function setLevel(L){if(ST.view==='walk'){if(L==='all'){setView('three');return;}const n={1:'Sitting room',2:'Family room',3:'Living room',4:'Hall'}[L];
    const r=SPEC.rooms.find(q=>q.lv===L&&q.name===n);teleportRoom(r);return;}
  if((ST.view==='plan'||ST.pending==='plan')&&L==='all'){ST.level='all';setView('three');return;}
  if(ST.pending==='plan'){const d=CT&&CT.done;CT=null;if(d)d();}
  // in the 3/4 view the level buttons are toggles, so several levels can be highlighted at once
  if(ST.view==='three'){if(L==='all')ST.levels=[];else{const i=ST.levels.indexOf(L);if(i>=0)ST.levels.splice(i,1);else ST.levels.push(L);ST.levels.sort();}
    ST.level=ST.levels.length?Math.max(...ST.levels):'all';
    // frame the picked levels' rooms (keeping the viewing angle), or go back to the whole-house framing
    const to=snapOrb();
    if(ST.levels.length){const r=SPEC.rooms.filter(q=>ST.levels.includes(q.lv));let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
      for(const q of r){x0=Math.min(x0,q.x0,q.x1);x1=Math.max(x1,q.x0,q.x1);z0=Math.min(z0,q.z0,q.z1);z1=Math.max(z1,q.z0,q.z1);}
      const rad=Math.hypot(x1-x0,z1-z0)/2,tv=Math.tan(ORB.fov*Math.PI/360),asp=innerWidth/innerHeight;
      to.t.set((x0+x1)/2,ST.levels.reduce((a,l)=>a+E[l],0)/ST.levels.length,(z0+z1)/2);to.d=Math.max(40,Math.min(300,rad/Math.min(tv,tv*asp)*1.12));}
    else{to.t.set(14,-5,17);to.d=Math.max(ORB.d,135);}
    startCam(to,null,1.0);}
  else ST.level=L;
  if(ST.view==='plan'){const from={x:PLN.x,z:PLN.z,span:PLN.span};fitPlan();const to={x:PLN.x,z:PLN.z,span:PLN.span};Object.assign(PLN,from);PT={from,to,t:0,dur:1.0};}
  setVis();}
function fitPlan(){const L=ST.level==='all'?2:ST.level;const r=SPEC.rooms.filter(q=>q.lv===L);let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(const q of r){x0=Math.min(x0,q.x0);x1=Math.max(x1,q.x1);z0=Math.min(z0,q.z0);z1=Math.max(z1,q.z1);}
  if(L===2){x0=Math.min(x0,-22);}PLN.x=(x0+x1)/2;PLN.z=(z0+z1)/2;const asp=innerWidth/innerHeight;PLN.span=Math.max(z1-z0+14,(x1-x0+14)/asp)*(innerWidth<640?1.25:1.08);}
// ---------------- cameras ----------------
function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(qualityPR(LOOK.quality));renderer.setSize(w,h);if(isHQ())setupPipe();camO.aspect=w/h;camO.updateProjectionMatrix();camW.aspect=w/h;camW.updateProjectionMatrix();updatePlanCam();dirty=true;}
function updateOrbitCam(){if(!CT){ORB.ph=Math.max(.12,Math.min(1.5,ORB.ph));ORB.d=Math.max(18,Math.min(380,ORB.d));}
  if(camO.fov!==ORB.fov){camO.fov=ORB.fov;camO.updateProjectionMatrix();}
  const s=Math.sin(ORB.ph);camO.position.set(ORB.t.x+ORB.d*s*Math.sin(ORB.th),ORB.t.y+ORB.d*Math.cos(ORB.ph),ORB.t.z+ORB.d*s*Math.cos(ORB.th));camO.lookAt(ORB.t);}
function updatePlanCam(){if(!camP)return;const a=innerWidth/innerHeight,h=PLN.span;camP.left=-h*a/2;camP.right=h*a/2;camP.top=h/2;camP.bottom=-h/2;
  camP.position.set(PLN.x,300,PLN.z);camP.up.set(0,0,-1);camP.lookAt(PLN.x,0,PLN.z);camP.updateProjectionMatrix();}
function updateWalkCam(){camW.position.set(WLK.x,WLK.f+5.25,WLK.z);camW.rotation.set(WLK.pitch,WLK.yaw,0,'YXZ');}
function activeCam(){return ST.view==='walk'?camW:ST.view==='plan'?camP:camO;}
// ---------------- walking ----------------
const STEP=1.05,RAD=.75,HEAD=5.8;
function groundAt(x,z,f){let best=-1e9;for(const w of WALKS)if(x>=w.x0&&x<=w.x1&&z>=w.z0&&z<=w.z1&&w.top<=f+STEP&&w.top>best)best=w.top;
  if(!inFoot(x,z)){const t=terrainH(x,z);if(t<=f+STEP&&t>best)best=t;}if(best<-1e8)best=terrainH(x,z);return best;}
function blocked(x,z,f){for(const c of COLS)if(c.y1>f+STEP&&c.y0<f+HEAD&&x+RAD>c.x0&&x-RAD<c.x1&&z+RAD>c.z0&&z-RAD<c.z1)return true;return false;}
function teleport(o){let x=o.x,z=o.z;let f=o.f!==undefined?o.f:(o.out?groundAt(x,z,(o.lv?E[o.lv]:0)+.5):E[o.lv]);
  if(!o.out){f=groundAt(x,z,E[o.lv]+.5);}
  if(blocked(x,z,f)){outer:for(let r=.5;r<6;r+=.5)for(let a=0;a<6.28;a+=.4){const nx=x+Math.cos(a)*r,nz=z+Math.sin(a)*r,nf=groundAt(nx,nz,f+.5);if(Math.abs(nf-f)<1&&!blocked(nx,nz,nf)){x=nx;z=nz;f=nf;break outer;}}}
  Object.assign(WLK,{x,z,f,vy:0,yaw:o.yaw||0,pitch:-.06,ground:true});dirty=true;}
const SPAWN={'Family room':[11.5,15.5,1.05],'Four-seasons room':[-11,11.6,0],'Kitchen':[28.6,16.2,Math.PI],'Living room':[29.5,10,1.1],'Dining area':[33.2,9.4,-1.03],
  'Primary bedroom|2':[-7.7,19.7,Math.PI],'New deck':[49,6,0],'Foyer':[21.2,29.8,0],'Entry walk':[22.3,34,0],'Deck':[22,-5,Math.PI],'Gallery':[-2.4,17,0],'Bedroom|2':[8.5,22,Math.PI],
  'Sitting room':[25,9,0],'Recreation room':[9,24,0],'Hall|4':[11.5,15,Math.PI/2]};
function teleportRoom(r){if(!r)return;const k=SPAWN[r.name+'|'+r.lv]||SPAWN[r.name];const out=/deck|Porch|Patio|walk/i.test(r.name);
  if(ST.view!=='walk'){ST.view='walk';WLK.inited=true;}
  teleport({x:k?k[0]:(r.x0+r.x1)/2,z:k?k[1]:(r.z0+r.z1)/2,lv:r.lv,yaw:k?k[2]:0,out});setVis();}
const KEYS={};let JOY={x:0,y:0};
function stepWalk(dt){let fx=0,fz=0;const run=KEYS.ShiftLeft||KEYS.ShiftRight;
  if(KEYS.KeyW||KEYS.ArrowUp)fz+=1;if(KEYS.KeyS||KEYS.ArrowDown)fz-=1;if(KEYS.KeyA||KEYS.ArrowLeft)fx-=1;if(KEYS.KeyD||KEYS.ArrowRight)fx+=1;
  fx+=JOY.x;fz+=-JOY.y;const mag=Math.hypot(fx,fz);let moved=false;
  if(mag>.05){const sp=(run?13:6.5)*Math.min(1,mag)/mag*dt;const sy=Math.sin(WLK.yaw),cy=Math.cos(WLK.yaw);
    const dx=(-sy*fz+cy*fx)*sp,dz=(-cy*fz-sy*fx)*sp;
    const tryMove=(nx,nz)=>{const g=groundAt(nx,nz,WLK.f);if(g>WLK.f+STEP)return false;if(blocked(nx,nz,Math.max(WLK.f,g)))return false;
      if(nx<-92||nx>132||nz<-92||nz>145)return false;WLK.x=nx;WLK.z=nz;return true;};
    if(!tryMove(WLK.x+dx,WLK.z+dz)){tryMove(WLK.x+dx,WLK.z)||tryMove(WLK.x,WLK.z+dz);}moved=true;}
  const g=groundAt(WLK.x,WLK.z,WLK.f);
  if(g>=WLK.f-.02){WLK.f+=(g-WLK.f)*Math.min(1,dt*14);if(g-WLK.f<.01)WLK.f=g;WLK.vy=0;WLK.ground=true;}
  else if(WLK.ground&&WLK.f-g<1.3){WLK.f+=(g-WLK.f)*Math.min(1,dt*16);if(WLK.f-g<.02)WLK.f=g;}
  else{WLK.ground=false;WLK.vy-=32*dt;WLK.f+=WLK.vy*dt;if(WLK.f<=g){WLK.f=g;WLK.vy=0;WLK.ground=true;}}
  return moved||Math.abs(g-WLK.f)>.001;}
// ---------------- labels ----------------
const LBL=[];
function buildLabels(){const host=$('labels');const seen=new Set();
  for(const r of SPEC.rooms){const k=r.lv+'|'+r.name;if(seen.has(k))continue;seen.add(k);const d=document.createElement('div');d.className='rl'+(r.isNew?' new':'');
    d.innerHTML=r.name+(r.dim?'<small>'+r.dim+'</small>':'');host.appendChild(d);LBL.push({el:d,lv:r.lv,x:(r.x0+r.x1)/2,z:(r.z0+r.z1)/2,y:r.lv?E[r.lv]:0,room:r});}
  for(const s of SETBACK.userData.labels){const d=document.createElement('div');d.className='rl';d.style.color='#b7372f';d.innerHTML=s.t;host.appendChild(d);
    LBL.push({el:d,site:true,x:s.x,z:s.z,y:terrainH(s.x,s.z)+.5});}}
const _p=new THREE.Vector3();
function updateLabels(){const cam=activeCam(),w=innerWidth,h=innerHeight,lvl=ST.cutL;
  for(const L of LBL){let show=false;
    if(L.site)show=ST.site&&ST.view!=='walk';else show=ST.labels&&ST.view!=='walk'&&lvl&&shownLv().includes(L.lv);
    if(show){_p.set(L.x,ST.view==='plan'?CUT[lvl]:L.y+.2,L.z).project(cam);if(_p.z>1||_p.x<-1.1||_p.x>1.1||_p.y<-1.1||_p.y>1.1)show=false;
      else{L.el.style.left=((_p.x+1)/2*w)+'px';L.el.style.top=((1-_p.y)/2*h)+'px';}}
    L.el.style.display=show?'block':'none';}}
// ---------------- UI ----------------
const HELP={walk:COARSE?'Use the pad to move and drag anywhere else to look. Pick a level or a room to jump there.':'Drag to look. W A S D or the arrow keys to move, Shift to hurry. Stairs climb as you walk into them.',
  three:COARSE?'Drag to orbit, pinch to zoom, two fingers to pan. Tap levels to toggle them and see into their rooms.':'Drag to orbit, right-drag to pan, scroll to zoom. Click levels to toggle them and see into their rooms.',
  plan:'Drag to pan, scroll or pinch to zoom. Dunwoody Drive is at the bottom, the rear yard at the top. Blue is new.'};
function whereText(){if(ST.view==='walk'){let best=null;for(const r of SPEC.rooms){const e=r.lv?E[r.lv]:0;if(WLK.x>=r.x0&&WLK.x<=r.x1&&WLK.z>=r.z0&&WLK.z<=r.z1&&Math.abs(WLK.f-e)<2.8){if(!best||Math.abs(WLK.f-e)<Math.abs(WLK.f-(best.lv?E[best.lv]:0)))best=r;}}
    if(best)return best.name+(best.isNew?' (new)':'')+', '+LEVEL_NAMES[best.lv].toLowerCase();
    for(const s of SPEC.stairs)if(WLK.x>=s.x0&&WLK.x<=s.x1&&WLK.z>=s.z0-.3&&WLK.z<=s.z1+.3&&WLK.f>s.yLow-.5&&WLK.f<s.yHigh+.5)return 'On the stairs';
    if(inFoot(WLK.x,WLK.z))return 'Inside the house';return WLK.z>SITE.street0-.5?(WLK.z<SITE.street1+.6?'On Dunwoody Drive':'Across the street'):WLK.z>31.6?'Front yard':(WLK.z<0?'Rear yard':'Side yard');}
  if(ST.view==='plan')return LEVEL_NAMES[ST.cutL]+' plan';
  if(ST.levels.length>1)return ST.levels.slice().reverse().map(l=>LEVEL_NAMES[l].replace(/ level$/,'')).join(' + ')+' levels, cut open';
  return ST.cutL?LEVEL_NAMES[ST.cutL]+', cut open':'Whole house';}
let lastWhere='';
function updateUI(){document.querySelectorAll('.seg button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===(ST.pending||ST.view))));
  const active=ST.view==='walk'?null:(ST.view==='plan'?ST.cutL:ST.level);
  document.querySelectorAll('#section .lvl').forEach(b=>b.setAttribute('aria-pressed',String(ST.view==='three'?ST.levels.includes(+b.dataset.lv):String(active)===b.dataset.lv)));
  $('allbtn').setAttribute('aria-pressed',String(ST.view==='three'&&ST.level==='all'));
  {const vh=ST.pending||ST.view;$('lvlHint').textContent=vh==='walk'?'Pick a level to go there.':vh==='plan'?'Pick the level to draw.':'Pick levels to cut open. Pick more than one to combine them.';}
  $('help').textContent=ARR.on?'Arrange: tap a piece of furniture, drag it to move it, drag the pink ring to turn it. Hold Shift to snap; Q and E turn 15°. Moves are saved in this browser.':DBG.on?'Debug mode: tap any surface or ID label to inspect it, then copy it into your message. Pick a level or walk into a room to label everything there. IDs match this published version.':HELP[ST.view];$('joy').style.display=(ST.view==='walk'&&COARSE)?'block':'none';
  $('tSite').setAttribute('aria-pressed',String(ST.site));$('tTrees').setAttribute('aria-pressed',String(ST.trees));$('tLabels').setAttribute('aria-pressed',String(ST.labels));
  lastWhere='';}
function buildUI(){
  const sec=$('section');const H=sec.clientHeight||164;const yOf=e=>(1-(e+13.5)/18)*(H-36)+2;
  const mk=(lv,txt,sub,l,w,y,cls,room)=>{const b=document.createElement('button');b.className='lvl'+(cls?' '+cls:'');b.dataset.lv=lv;b.style.left=l+'%';b.style.width=w+'%';b.style.top=y+'px';
    b.innerHTML='<span>'+txt+'<small>'+sub+'</small></span>';b.addEventListener('click',()=>{if(room&&ST.view==='walk')teleportRoom(SPEC.rooms.find(q=>q.name===room));else setLevel(+lv);});sec.appendChild(b);};
  mk(4,'Bedrooms','level 4',31,40,yOf(E[4]));mk(3,'Main','level 3',62,38,yOf(E[3]));mk(2,'Family rm','level 2',31,40,yOf(E[2]));
  mk(2,'Addition','new',0,29,yOf(E[2]),'new','Four-seasons room');mk(1,'Lower','level 1',31,69,yOf(E[1]));
  $('allbtn').addEventListener('click',()=>{if(ST.view==='three'&&!ST.pending){setLevel('all');}else{ST.level='all';setView('three');}});
  // minimise buttons: each panel collapses to a small labelled pill; remembered in this browser
  let mins={};try{mins=JSON.parse(localStorage.getItem('panelMin')||'{}')||{};}catch(e){}
  for(const [id,name] of [['top','Controls'],['levels','Levels'],['hud','Help']]){const pnl=$(id),b=document.createElement('button');b.className='pmin';pnl.prepend(b);
    const set=on=>{pnl.classList.toggle('min',on);b.textContent=on?name:'−';b.title=b.ariaLabel=(on?'Show ':'Minimise ')+name.toLowerCase();b.setAttribute('aria-expanded',String(!on));mins[id]=on;try{localStorage.setItem('panelMin',JSON.stringify(mins));}catch(e){}};
    b.addEventListener('click',()=>set(!pnl.classList.contains('min')));set(!!mins[id]);}
  document.querySelectorAll('.seg button[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  const tod=$('tod');for(const k in PRESETS){const o=document.createElement('option');o.value=k;o.textContent=PRESETS[k].label;tod.appendChild(o);}tod.value=LOOK.preset;
  tod.addEventListener('change',()=>{applyPreset(tod.value);tod.blur();});
  document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>setQuality(b.dataset.q)));
  $('tTrees').addEventListener('click',()=>{ST.trees=!ST.trees;setVis();});
  $('tLabels').addEventListener('click',()=>{ST.labels=!ST.labels;updateUI();dirty=true;});
  $('tDims').addEventListener('click',()=>{const on=!document.body.classList.toggle('nodims');$('tDims').setAttribute('aria-pressed',String(on));});
  $('tSite').addEventListener('click',()=>{ST.site=!ST.site;setVis();});
  $('tDebug').addEventListener('click',dbgToggle);$('tArrange').addEventListener('click',arrToggle);
  $('arrL').addEventListener('click',()=>arrTurn(15));$('arrR').addEventListener('click',()=>arrTurn(-15));$('arr90').addEventListener('click',()=>arrTurn(90));
  $('arrReset').addEventListener('click',()=>arrReset(ARR.sel));$('arrDone').addEventListener('click',()=>arrSelect(null));$('arrCopy').addEventListener('click',()=>arrCopy(false));
  $('arrCopyAll').addEventListener('click',()=>arrCopy(true));$('arrBake').addEventListener('click',arrBake);$('arrResetAll').addEventListener('click',()=>{for(const i of INSTS)if(i.dx||i.dz||i.ry)arrReset(i);});$('dbgCopy').addEventListener('click',dbgCopy);$('dbgDel').addEventListener('click',dbgDelete);$('dbgClose').addEventListener('click',()=>dbgSelect(null));
  const sel=$('goto');sel.innerHTML='<option value="">a room…</option>';const seen=new Set();
  for(const L of [4,3,2,1]){const og=document.createElement('optgroup');og.label=LEVEL_NAMES[L];
    for(const [i,r] of SPEC.rooms.entries()){if(r.lv!==L||seen.has(L+r.name)||r.name==='Patio'||r.name==='Stair hall')continue;seen.add(L+r.name);
      const o=document.createElement('option');o.value=i;o.textContent=r.name+(r.isNew?' (new)':'');og.appendChild(o);}sel.appendChild(og);}
  sel.addEventListener('change',()=>{if(sel.value==='')return;teleportRoom(SPEC.rooms[+sel.value]);sel.value='';sel.blur();});
}
// ---------------- input ----------------
const PTR=new Map();let pinch=null;
function onDown(e){const c=renderer.domElement;c.setPointerCapture&&c.setPointerCapture(e.pointerId);const arr=ARR.on&&PTR.size===0&&e.button===0&&!CT&&arrDown(e);PTR.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t0:performance.now(),b:e.button,shift:e.shiftKey,arr});if(arr)return;
  if(PTR.size===2){const [a,b]=[...PTR.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};}}
function onUp(e){const p=PTR.get(e.pointerId);if(p&&p.arr){arrUp();PTR.delete(e.pointerId);return;}
  if(p&&ARR.on&&PTR.size===1&&Math.hypot(e.clientX-p.sx,e.clientY-p.sy)<6&&performance.now()-p.t0<600)arrSelect(null);if(p&&DBG.on&&PTR.size===1&&Math.hypot(e.clientX-p.sx,e.clientY-p.sy)<6&&performance.now()-p.t0<600)dbgPick(e.clientX,e.clientY);PTR.delete(e.pointerId);if(PTR.size<2)pinch=null;}
function panOrbit(dx,dy){const k=ORB.d*.0016;const r=new THREE.Vector3(Math.cos(ORB.th),0,-Math.sin(ORB.th)),f=new THREE.Vector3(-Math.sin(ORB.th),0,-Math.cos(ORB.th));
  ORB.t.addScaledVector(r,-dx*k).addScaledVector(f,dy*k);}
function panPlan(dx,dy){const k=PLN.span/innerHeight;PLN.x-=dx*k;PLN.z-=dy*k;}
function onMove(e){const p=PTR.get(e.pointerId);if(!p)return;if(p.arr){arrMove(e);return;}if(CT){p.x=e.clientX;p.y=e.clientY;return;}if(PT)PT=null;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(PTR.size===2&&pinch){const [a,b]=[...PTR.values()];const d=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;const r=pinch.d/Math.max(1,d);
    if(ST.view==='three'){ORB.d*=r;panOrbit(cx-pinch.cx,cy-pinch.cy);}else if(ST.view==='plan'){PLN.span=Math.max(12,Math.min(400,PLN.span*r));panPlan(cx-pinch.cx,cy-pinch.cy);}
    pinch={d,cx,cy};dirty=true;return;}
  if(ST.view==='walk'){WLK.yaw-=dx*.0045;WLK.pitch=Math.max(-1.3,Math.min(1.3,WLK.pitch-dy*.0045));}
  else if(ST.view==='three'){if(p.b===2||p.b===1||p.shift)panOrbit(dx,dy);else{ORB.th-=dx*.006;ORB.ph-=dy*.005;}}
  else panPlan(dx,dy);dirty=true;}
function onWheel(e){e.preventDefault();if(CT)return;if(PT)PT=null;const s=Math.exp(Math.sign(e.deltaY)*Math.min(.25,Math.abs(e.deltaY)*.0015));
  if(ST.view==='three')ORB.d*=s;else if(ST.view==='plan')PLN.span=Math.max(12,Math.min(400,PLN.span*s));dirty=true;}
function bindInput(){const c=renderer.domElement;c.tabIndex=0;c.setAttribute('aria-label','3D view of the house');
  c.addEventListener('pointerdown',onDown);c.addEventListener('pointermove',onMove);c.addEventListener('pointerup',onUp);c.addEventListener('pointercancel',onUp);
  c.addEventListener('wheel',onWheel,{passive:false});c.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;if(ARR.sel){if(e.code==='KeyQ'){arrTurn(15);return;}if(e.code==='KeyE'){arrTurn(-15);return;}if(e.code==='Escape'){arrSelect(null);return;}}KEYS[e.code]=true;if(ST.view==='walk'&&/^(Arrow|Space)/.test(e.code))e.preventDefault();});
  addEventListener('keyup',e=>{KEYS[e.code]=false;});addEventListener('blur',()=>{for(const k in KEYS)KEYS[k]=false;});
  const joy=$('joy'),knob=joy.firstElementChild;let jid=null;
  const jmove=e=>{const r=joy.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}
    JOY={x,y};knob.style.transform=`translate(${x*35}px,${y*35}px)`;};
  joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(e.pointerId);jmove(e);});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)jmove(e);});
  const jend=e=>{if(e.pointerId!==jid)return;jid=null;JOY={x:0,y:0};knob.style.transform='';};joy.addEventListener('pointerup',jend);joy.addEventListener('pointercancel',jend);
  addEventListener('resize',()=>{resize();});}
// ---------------- loop ----------------
let last=performance.now(),lastSig='';
function camSig(c){c.updateMatrixWorld();return c.matrixWorld.elements.map(v=>v.toFixed(4)).join()+c.projectionMatrix.elements.map(v=>v.toFixed(5)).join();}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
  animate(dt);
  if(ST.view==='walk'){stepWalk(dt);updateWalkCam();fitShadow(false);}else if(ST.view==='three')updateOrbitCam();else updatePlanCam();
  updateFog();
  const cam=activeCam(),sig=camSig(cam);if(sig!==lastSig){lastSig=sig;PIPE.n=0;}if(dirty){PIPE.n=0;dirty=false;}
  if(PIPE.n<PIPE.max){
    if(isHQ()){try{renderHigh(cam);}catch(e){console.warn(e);if(isUltra())setQuality('high','Ultra could not run on this device, so high quality is on.');else{setQuality('fast','High quality could not run on this device, so the fast renderer is on.');renderFast(cam);}}}
    else renderFast(cam);
    updateLabels();dbgTick();const w=whereText();if(w!==lastWhere){$('where').textContent=w;lastWhere=w;}
    const r=$('refine');const show=isHQ()&&PIPE.n>1&&PIPE.n<PIPE.max;r.textContent=show?'Refining the view, '+Math.round(PIPE.n/PIPE.max*100)+'%':'';r.style.display=show?'block':'none';}
  requestAnimationFrame(frame);}
// real photo textures: list them in assets/textures/manifest.json (only works when served over http, e.g. `npm run dev`)
async function loadTextureOverrides(){if(!/^https?:/.test(location.protocol))return;let list;try{const r=await fetch('assets/textures/manifest.json',{cache:'no-store'});if(!r.ok)return;list=(await r.json()).textures||[];}catch(e){return;}
  // "paint": a colour; the photo's colour map is turned grey, flattened and multiplied by it, for painted brick and the like
  // "cropTop": a fraction of the image's height cut off its top edge, for photos with a stray strip there (keep it a whole number of rows so the tile still wraps)
  const crop=(tx,f)=>{const im=tx.image,h=Math.round(im.height*(1-f)),[c,g]=cv(im.width,h);g.drawImage(im,0,im.height-h,im.width,h,0,0,im.width,h);tx.dispose();return new THREE.CanvasTexture(c);};
  const paint=(tx,col)=>{const im=tx.image,[c,g]=cv(im.width,im.height);g.filter='grayscale(1) contrast(.4) brightness(2.1)';g.drawImage(im,0,0);g.filter='none';
    g.globalCompositeOperation='multiply';g.fillStyle=col;g.fillRect(0,0,c.width,c.height);tx.dispose();return new THREE.CanvasTexture(c);};
  const L=new THREE.TextureLoader(),load=(f,t,srgb)=>new Promise(res=>{if(!f)return res(null);L.load('assets/textures/'+f,tx=>{if(t.cropTop)tx=crop(tx,t.cropTop);if(srgb&&t.paint)tx=paint(tx,t.paint);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;const ft=t.repeatFt||4;tx.repeat.set(1/ft,1/(t.repeatFtY||ft));
    if(t.rotateDeg){tx.center.set(.5,.5);tx.rotation=t.rotateDeg*Math.PI/180;}if(srgb)tx.encoding=THREE.sRGBEncoding;tx.anisotropy=MAXANISO;res(tx);},undefined,()=>{console.warn('texture override not found: '+f);res(null);});});
  for(const t of list){const m=MAT[t.material];if(!m){console.warn('unknown material in manifest: '+t.material);continue;}
    const [mp,nm,rm]=await Promise.all([load(t.map,t,true),load(t.normal,t,false),load(t.roughness,t,false)]);if(mp)m.map=mp;if(nm)m.normalMap=nm;if(rm)m.roughnessMap=rm;if(t.roughnessValue!==undefined)m.roughness=t.roughnessValue;m.needsUpdate=true;}
  refreshFades();dirty=true;}
function start(){
  if(!window.THREE){$('loading').textContent='The 3D library could not load. Check your connection and reload the page.';return;}
  initRenderer();buildScene();
  camO=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.5,1600);camW=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.25,650);
  camP=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);
  buildUI();buildLabels();bindInput();
  setQuality(COARSE?'fast':'high',COARSE?'':undefined);applyPreset('afternoon');resize();setVis(true);updateOrbitCam();arrLoad();loadTextureOverrides();loadModels();dbgAfterReload();
  requestAnimationFrame(t=>{last=t;frame(t);$('loading').style.display='none';});}
requestAnimationFrame(()=>setTimeout(start,30));
