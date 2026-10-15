// 09-look-pipeline.js: sky, light presets, high-quality render pipeline (AO, bloom, accumulation)
"use strict";
// ================= LOOK: sky, light presets, high-quality pipeline =================
const H2=(a,b)=>{const v=new THREE.Vector3(a[0]+b[0],0,a[1]+b[1]);return v.normalize();};
const DIRS={E:[.707,.707],S:[-.707,.707],W:[-.707,-.707],N:[.707,-.707]};
const PRESETS={
  morning:{grade:{wb:[1.02,1,.97],lift:[.025,.025,.025],sat:.95,con:.96,css:'sepia(.06) saturate(.96) contrast(.97)'},label:'Morning',h:H2([DIRS.E[0],DIRS.E[1]],[DIRS.S[0]*.35,DIRS.S[1]*.35]),elev:21,sun:0xffd8ae,si:1.65,zen:0x3f6fb8,hor:0xd9cbbb,gnd:0x3a3a30,exp:1.0,envE:.95,envI:.85,lamps:false,bloom:.10,hemi:.12},
  midday:{grade:{wb:[1.02,1,.96],lift:[.03,.03,.025],sat:.93,con:.95,css:'sepia(.08) saturate(.94) contrast(.96)'},label:'Midday',h:H2(DIRS.S,[0,0]),elev:63,sun:0xfff4e6,si:1.95,zen:0x3468bf,hor:0xc5d6e8,gnd:0x3d3c33,exp:.93,envE:1.0,envI:.95,lamps:false,bloom:.08,hemi:.12},
  afternoon:{label:'Afternoon',h:H2(DIRS.S,[DIRS.W[0]*.9,DIRS.W[1]*.9]),elev:34,sun:0xffe2bf,si:1.7,zen:0x6d93c4,hor:0xe6dfd0,gnd:0x4a4636,exp:1.0,envE:1.05,envI:.9,lamps:false,bloom:.12,hemi:.2,
    grade:{wb:[1.045,1.0,.925],lift:[.045,.04,.03],sat:.9,con:.93,css:'sepia(.14) saturate(.92) contrast(.94) brightness(1.03)'}},
  golden:{label:'Golden hour',h:H2(DIRS.W,[DIRS.N[0]*.25,DIRS.N[1]*.25]),elev:7,sun:0xffa45c,si:1.55,zen:0x4d6aa6,hor:0xf0b080,gnd:0x3a3026,exp:1.08,envE:.85,envI:.7,lamps:false,bloom:.22,hemi:.08},
  dusk:{label:'Dusk, lights on',h:H2(DIRS.W,[DIRS.N[0]*.3,DIRS.N[1]*.3]),elev:5,sun:0x8c84b8,si:.22,zen:0x0d1934,hor:0x7a5f73,gnd:0x141416,exp:1.55,envE:.45,envI:.22,lamps:true,bloom:.55,hemi:.05}
};
const LOOK={dof:10,skyI:1.4,ao2:.5,preset:'afternoon',quality:'high',sunDir:new THREE.Vector3(),lights:[],hemi:null,amb:null};
const EXT_MATS=new Set(['brick','siding','sidingNew','roof','slateRoof','metalRoof','grass','deckOld','deckNew','deckRailOld','paver','drive','asphalt','concrete','stone','frameDark','dormerClad',
  'garageDark','garageDark2','doorWood','bark','chain','flagstone','mulch','roofBrown','soldier','underside','glass','leafCards','shrubCards','grassBlades','treeline']);
// aerial perspective: exponential fog, a touch bluer than the horizon; thinned as the 3/4 camera pulls back so the house doesn't wash out
const FOG_D=.0014;
const fogColor=P=>new THREE.Color(P.hor).lerp(new THREE.Color(P.zen),.12);
function makeFog(){return new THREE.FogExp2(fogColor(PRESETS[LOOK.preset]).getHex(),FOG_D);}
function updateFog(){if(scene.fog&&scene.fog.isFogExp2)scene.fog.density=FOG_D*(ST.view==='three'?Math.min(1,170/ORB.d):1);}
// ---------- sky ----------
const SKY_MAT=new THREE.ShaderMaterial({uniforms:{pm:{value:0},paper:{value:new THREE.Color(.9,.91,.875)},sunDir:{value:new THREE.Vector3(0,1,0)},zen:{value:new THREE.Color()},hor:{value:new THREE.Color()},gnd:{value:new THREE.Color()},sunCol:{value:new THREE.Color()},sunI:{value:1}},
  vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform vec3 sunDir,zen,hor,gnd,sunCol,paper;uniform float sunI,pm;varying vec3 vDir;
  void main(){vec3 d=normalize(vDir);float y=d.y;vec3 c=mix(hor,zen,pow(clamp(y,0.,1.),.42));c+=hor*.22*exp(-abs(y)*16.);
    if(y<0.)c=mix(hor*.8,gnd,clamp(pow(-y*2.5,.55),0.,1.));
    float mu=max(dot(d,sunDir),0.);c+=sunCol*(.10*pow(mu,5.)+.32*pow(mu,48.))*sunI;
    c+=sunCol*smoothstep(.99986,.99993,mu)*45.*sunI*step(-.02,sunDir.y);
    gl_FragColor=vec4(mix(c,paper,pm),1.);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }`,side:THREE.BackSide,depthWrite:false,depthTest:false});
let SKY,ROOM_ENV=null,SKY_ENV=null;
function buildSky(){SKY=new THREE.Mesh(new THREE.SphereGeometry(450,40,20),SKY_MAT);SKY.renderOrder=-1000;SKY.frustumCulled=false;scene.add(SKY);}
function makeEnvs(P){const pm=new THREE.PMREMGenerator(renderer);
  const es=new THREE.Scene();es.add(new THREE.Mesh(new THREE.SphereGeometry(40,48,24),SKY_MAT));const pmSave=SKY_MAT.uniforms.pm.value;SKY_MAT.uniforms.pm.value=0;
  const nSky=pm.fromScene(es,0,.1,100).texture;SKY_MAT.uniforms.pm.value=pmSave;
  // interior "room" environment: soft walls, bright windows, warm lamps at dusk
  const rs=new THREE.Scene(),day=P.lamps?.12:1,B=(c)=>new THREE.MeshBasicMaterial({color:c,side:THREE.BackSide}),F=(c)=>new THREE.MeshBasicMaterial({color:c});
  const room=new THREE.Mesh(new THREE.BoxGeometry(26,10,26),[B(new THREE.Color(.32,.31,.29).multiplyScalar(day+.15)),B(new THREE.Color(.32,.31,.29).multiplyScalar(day+.15)),
    B(new THREE.Color(.5,.5,.48).multiplyScalar(day+.2)),B(new THREE.Color(.22,.15,.09).multiplyScalar(day+.2)),B(new THREE.Color(.32,.31,.29).multiplyScalar(day+.15)),B(new THREE.Color(.32,.31,.29).multiplyScalar(day+.15))]);rs.add(room);
  const win=new THREE.Color(P.hor).lerp(new THREE.Color(P.zen),.4).multiplyScalar(P.lamps?.25:3.2);
  for(const [x,z,ry] of [[12.9,0,-Math.PI/2],[0,-12.9,0],[-12.9,4,Math.PI/2]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(9,5),F(win));m.position.set(x,.6,z);m.rotation.y=ry;rs.add(m);}
  if(P.lamps)for(const [x,z] of [[-5,-4],[6,5],[-3,7]]){const m=new THREE.Mesh(new THREE.SphereGeometry(.8,12,8),F(new THREE.Color(9,6.5,4)));m.position.set(x,3.5,z);rs.add(m);}
  const nRoom=pm.fromScene(rs,0,.1,100).texture;pm.dispose();
  if(SKY_ENV)SKY_ENV.dispose();if(ROOM_ENV)ROOM_ENV.dispose();SKY_ENV=nSky;ROOM_ENV=nRoom;scene.environment=SKY_ENV;}
// ---------- evening lights ----------
function buildLamps(){const fills=[[7,CEIL[2]-1.2,10],[-11,2.6,6],[-6,2.3,25],[6,2.3,25],[22,7,6],[6,11.4,7],[6,11.4,24],[8,-6.6,20],[25,-6.6,6],[37.6,7,5.4]];
  const pr={chandelier:0,pendant:1,ceiling:2,lamp:3,outdoor:4};const L=LAMPS.slice().sort((a,b)=>pr[a.k]-pr[b.k]);let pend=null;const out=[];
  for(const l of L){if(l.k==='pendant'){if(!pend){pend=l.v.clone();out.push({v:pend,k:'pendant'});}else pend.lerp(l.v,.5);continue;}out.push(l);}
  for(const f of fills)out.push({v:new THREE.Vector3(...f),k:'fill'});
  for(const l of out.slice(0,COARSE?10:22)){const warm=l.k==='outdoor'?0xffb870:0xffc489;const p=new THREE.PointLight(warm,l.k==='fill'?.55:(l.k==='outdoor'?.9:1.1),l.k==='fill'?22:16,1.6);
    p.position.copy(l.v);p.visible=false;scene.add(p);LOOK.lights.push(p);if(l.inst)l.inst.lights.push({light:p,v0:l.v.clone()});}}
// ---------- sky light with shadows (high quality) ----------
// The sky lights the scene through the environment map and a hemisphere light, and neither casts shadows, so soffits, porches and the
// ground under trees stay as bright as open lawn. In high quality, SKYL lights stand in for most of that: each refinement frame puts
// them at new points on the sky dome (uniform over solid angle above SKY_E0), coloured like the sky there, each with its own shadow map.
// Averaged over the accumulation (about 3 x 64 directions) that is light from the whole sky with real occlusion. LOOK.skyI is their total
// strength; LIGHT_HQ says how much of the unshadowed sky light and the sun stay on in high quality.
const SKYL=[],SKY_E0=Math.sin(6*Math.PI/180),LIGHT_HQ={hemi:.25,env:.3,sun:.88,sunR:12};
function buildSkyLights(){for(let j=0;j<3;j++){const L=new THREE.DirectionalLight(0xffffff,0);L.castShadow=true;L.shadow.mapSize.set(2048,2048);
    L.shadow.bias=-.0004;L.shadow.normalBias=.05;L.visible=false;scene.add(L,L.target);SKYL.push(L);}}
// sky colour in a direction, matching the sky shader without its sun glow
function skyColorAt(d,out){const P=PRESETS[LOOK.preset],y=Math.max(d.y,0);out.setHex(P.hor).lerp(new THREE.Color(P.zen),Math.pow(y,.42));
  return out.add(new THREE.Color(P.hor).multiplyScalar(.22*Math.exp(-y*16)));}
// high quality swaps most of the unshadowed sky light for the shadowed sky lights; fast mode keeps the original balance
function applyLightBalance(){const P=PRESETS[LOOK.preset],hq=LOOK.quality==='high';
  for(const L of SKYL)L.visible=hq;LOOK.hemi.intensity=P.hemi*(hq?LIGHT_HQ.hemi:1);sun.intensity=P.si*(hq?LIGHT_HQ.sun:1);
  for(const k in MAT){const m=MAT[k];if(m&&m.isMeshStandardMaterial&&EXT_MATS.has(k))m.envMapIntensity=P.envE*(hq?LIGHT_HQ.env:1);}
  shadowDirty=true;dirty=true;}
// ---------- applying a preset ----------
function applyPreset(name){const P=PRESETS[name]||PRESETS.afternoon;LOOK.preset=name;
  const e=P.elev*Math.PI/180;LOOK.sunDir.set(P.h.x*Math.cos(e),Math.sin(e),P.h.z*Math.cos(e)).normalize();
  const u=SKY_MAT.uniforms;u.sunDir.value.copy(LOOK.sunDir);u.zen.value.setHex(P.zen);u.hor.value.setHex(P.hor);u.gnd.value.setHex(P.gnd);u.sunCol.value.setHex(P.sun);u.sunI.value=P.lamps?.15:1;
  sun.color.setHex(P.sun);sun.intensity=P.si;LOOK.hemi.intensity=P.hemi;LOOK.hemi.color.setHex(P.zen).lerp(new THREE.Color(1,1,1),.6);LOOK.amb.intensity=P.lamps?.03:.05;
  makeEnvs(P);
  for(const k in MAT){const m=MAT[k];if(!m||!m.isMeshStandardMaterial)continue;const ext=EXT_MATS.has(k);const had=!!m.envMap;m.envMap=ext?null:ROOM_ENV;m.envMapIntensity=ext?P.envE:P.envI;if(had!==!!m.envMap)m.needsUpdate=true;}
  applyGrade();applyLightBalance();MAT.shade.emissiveIntensity=P.lamps?2.4:.35;MAT.light.emissiveIntensity=P.lamps?3.2:1.2;MAT.flame.emissiveIntensity=P.lamps?5:1.5;
  for(const l of LOOK.lights)l.visible=P.lamps;
  if(scene.fog)scene.fog.color.copy(fogColor(P));
  refreshFades();
  fitShadow(true);dirty=true;shadowDirty=true;if(typeof PIPE!=='undefined')PIPE.n=0;}
let SHC={x:1e9,z:1e9,half:0};
function fitShadow(force){const walk=ST.view==='walk',half=walk?50:108,cx=walk?WLK.x:16,cz=walk?WLK.z:12;
  if(!force&&SHC.half===half&&Math.hypot(SHC.x-cx,SHC.z-cz)<12)return;SHC={x:cx,z:cz,half};
  sun.target.position.set(cx,-6,cz);sun.position.copy(sun.target.position).addScaledVector(LOOK.sunDir,230);
  const c=sun.shadow.camera;c.left=-half;c.right=half;c.top=half;c.bottom=-half;c.near=30;c.far=470;c.updateProjectionMatrix();sun.target.updateMatrixWorld();
  LOOK.sunBase=sun.position.clone();shadowDirty=true;dirty=true;}
// ---------- high-quality pipeline ----------
const PIPE={ok:true,n:0,max:64,size:[2,2],checked:0};
const VSQ='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const SM=(fs,un)=>new THREE.ShaderMaterial({vertexShader:VSQ,fragmentShader:fs,uniforms:un,depthTest:false,depthWrite:false,toneMapped:false,extensions:{derivatives:true}});
const FSQ={s:new THREE.Scene(),c:new THREE.OrthographicCamera(-1,1,1,-1,0,1),m:new THREE.Mesh(new THREE.PlaneGeometry(2,2))};FSQ.m.frustumCulled=false;FSQ.s.add(FSQ.m);
const AO_MAT=SM(`uniform sampler2D tDepth;uniform mat4 proj,projInv;uniform float radius,frame;varying vec2 vUv;
  vec3 vpos(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=projInv*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
  float h1(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){float d=texture2D(tDepth,vUv).x;if(d>.99999){gl_FragColor=vec4(1.);return;}
    vec3 P=vpos(vUv);vec3 N=normalize(cross(dFdx(P),dFdy(P)));if(dot(N,P)>0.)N=-N;
    float r0=h1(gl_FragCoord.xy*.731+frame*13.17);float an=r0*6.2831853;vec3 rv=vec3(cos(an),sin(an),.37);
    vec3 T=normalize(rv-N*dot(rv,N));vec3 B=cross(N,T);float occ=0.;
    for(int i=0;i<14;i++){float fi=float(i);float a=h1(vec2(fi*3.7+frame*1.3,r0*91.3)),b=h1(vec2(r0*17.1+frame,fi*1.31));
      float sr=sqrt(a),th=6.2831853*b;vec3 s=vec3(sr*cos(th),sr*sin(th),sqrt(max(0.,1.-a)));float sc=mix(.12,1.,h1(vec2(fi+r0,frame*.37)));
      vec3 S=P+(T*s.x+B*s.y+N*s.z)*radius*sc;vec4 q=proj*vec4(S,1.);vec2 uv=q.xy/q.w*.5+.5;
      if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)continue;float sz=vpos(uv).z;
      occ+=step(S.z+.03*radius,sz)*smoothstep(0.,1.,radius/max(abs(P.z-sz),1e-4));}
    float ao=clamp(1.-occ/14.,0.,1.);gl_FragColor=vec4(ao,ao,ao,1.);}`,
  {tDepth:{value:null},proj:{value:new THREE.Matrix4()},projInv:{value:new THREE.Matrix4()},radius:{value:2.2},frame:{value:0}});
const BRIGHT_MAT=SM('uniform sampler2D t;uniform float thr;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(max(c.r,c.g),c.b);gl_FragColor=vec4(c*smoothstep(thr,thr*1.8,l),1.);}',{t:{value:null},thr:{value:1.6}});
const BLUR_MAT=SM('uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227;c+=(texture2D(t,vUv+dir*1.385).rgb+texture2D(t,vUv-dir*1.385).rgb)*.316;c+=(texture2D(t,vUv+dir*3.231).rgb+texture2D(t,vUv-dir*3.231).rgb)*.07;gl_FragColor=vec4(c,1.);}',{t:{value:null},dir:{value:new THREE.Vector2()}});
const COMP_MAT=SM(`uniform sampler2D tB,tAO,tAO2,tL1,tL2,tAcc;uniform vec2 px;uniform float w,aoS,aoS2,bl;varying vec2 vUv;
  void main(){vec3 c=texture2D(tB,vUv).rgb;float a=0.,a2=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 o=vec2(float(x),float(y));a+=texture2D(tAO,vUv+o*px*1.5).r;a2+=texture2D(tAO2,vUv+o*px*4.).r;}a/=9.;a2/=9.;
    c*=mix(1.,a,aoS)*mix(1.,a2,aoS2);c+=(texture2D(tL1,vUv).rgb+texture2D(tL2,vUv).rgb*.8)*bl;
    vec3 acc=texture2D(tAcc,vUv).rgb;gl_FragColor=vec4(mix(acc,c,w),1.);}`,
  {tB:{value:null},tAO:{value:null},tAO2:{value:null},aoS2:{value:0},tL1:{value:null},tL2:{value:null},tAcc:{value:null},px:{value:new THREE.Vector2()},w:{value:1},aoS:{value:.75},bl:{value:.1}});
const OUT_MAT=SM(`uniform sampler2D t;uniform float exposure,sat,vig,con,gsat,gamt;uniform vec3 wb,lift;varying vec2 vUv;
  vec3 fit(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
  vec3 aces(vec3 c){const mat3 I=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));const mat3 O=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));return clamp(O*fit(I*c),0.,1.);}
  vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
  void main(){vec3 c=aces(texture2D(t,vUv).rgb*exposure/.6);float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);vec2 q=vUv-.5;c*=1.-vig*dot(q,q)*1.6;
    c=srgb(clamp(c,0.,1.));
    // colour grade (display space): white balance, soft contrast around mid-grey, lifted warm shadows, gentle desaturation
    vec3 c0=c;c=clamp(c*wb,0.,1.);c=.5+(c-.5)*con;c=lift+c*(1.-lift);float g=dot(c,vec3(.2126,.7152,.0722));c=mix(c0,mix(vec3(g),c,gsat),gamt);
    c=c+(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(c,1.);}`,
  {t:{value:null},exposure:{value:1},sat:{value:1.06},vig:{value:.22},con:{value:1},gsat:{value:1},gamt:{value:1},wb:{value:new THREE.Vector3(1,1,1)},lift:{value:new THREE.Vector3()}});
// colour grade of the current preset: in the output shader for high quality, as a CSS filter on the canvas for the fast renderer
function applyGrade(){const G=PRESETS[LOOK.preset].grade||{wb:[1,1,1],lift:[0,0,0],sat:1,con:1,css:''},u=OUT_MAT.uniforms;
  u.wb.value.set(...G.wb);u.lift.value.set(...G.lift);u.gsat.value=G.sat;u.con.value=G.con;LOOK.gradeCss=G.css;}
function fs(mat,target){FSQ.m.material=mat;renderer.setRenderTarget(target);renderer.render(FSQ.s,FSQ.c);}
function rt(w,h,o){return new THREE.WebGLRenderTarget(w,h,Object.assign({type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false},o||{}));}
function setupPipe(){for(const k of ['rt','ao','ao2','b1','b2','b3','b4','accA','accB'])if(PIPE[k])PIPE[k].dispose();
  const pr=renderer.getPixelRatio(),w=Math.max(2,Math.floor(innerWidth*pr)),h=Math.max(2,Math.floor(innerHeight*pr));PIPE.size=[w,h];
  PIPE.rt=rt(w,h,{depthBuffer:true});PIPE.rt.depthTexture=new THREE.DepthTexture(w,h);PIPE.rt.depthTexture.type=THREE.UnsignedIntType;
  PIPE.ao=rt(w,h,{type:THREE.UnsignedByteType});const hw=Math.max(2,w>>1),hh=Math.max(2,h>>1),qw=Math.max(2,w>>2),qh=Math.max(2,h>>2);
  PIPE.ao2=rt(hw,hh,{type:THREE.UnsignedByteType});PIPE.b1=rt(hw,hh);PIPE.b2=rt(hw,hh);PIPE.b3=rt(qw,qh);PIPE.b4=rt(qw,qh);PIPE.accA=rt(w,h);PIPE.accB=rt(w,h);PIPE.half=[hw,hh];PIPE.quarter=[qw,qh];PIPE.n=0;}
const halton=(i,b)=>{let f=1,r=0;while(i>0){f/=b;r+=f*(i%b);i=Math.floor(i/b);}return r;};
// the house's bounding box (levels, stair core, roof), for depth of field; worked out once
let HOUSE_BOX=null;
function houseBox(){if(!HOUSE_BOX){HOUSE_BOX=new THREE.Box3();for(const t of ['1','2','3','4','S','roof'])for(const o of TAGS[t]||[])HOUSE_BOX.expandByObject(o);}return HOUSE_BOX;}
function renderHigh(cam){const n=PIPE.n,[w,h]=PIPE.size,P=PRESETS[LOOK.preset];
  // depth of field, built into the accumulation: each refinement frame moves the 3/4 camera within a small lens opening while aiming at a
  // point at the focus distance, so the averaged image is sharp at that distance and softens nearer and farther. The focus is always the
  // house: its nearest and farthest depths along the view set the focus (their harmonic mean, which balances the blur at both ends), and
  // the opening is capped so neither end of the house blurs by more than about a pixel. Close up, that cap fades the effect out rather
  // than soften part of the house. LOOK.dof is the largest opening per foot of focus distance.
  let dofSave=null;
  if(n>0&&LOOK.dof&&cam===camO&&ST.view==='three'&&!ST.pending){
    const f=cam.getWorldDirection(new THREE.Vector3()),B=houseBox(),v=new THREE.Vector3();let d0=1e9,d1=-1e9;
    for(let i=0;i<8;i++){v.set(i&1?B.max.x:B.min.x,i&2?B.max.y:B.min.y,i&4?B.max.z:B.min.z).sub(cam.position);const d=v.dot(f);d0=Math.min(d0,d);d1=Math.max(d1,d);}
    if(d0>2){const F=2/(1/d0+1/d1),k=h/(2*Math.tan(cam.fov*Math.PI/360)),A=Math.min(LOOK.dof*F,.6/(k*(1/d0-1/F)));
      dofSave=[cam.position.clone(),cam.quaternion.clone()];const fp=cam.position.clone().addScaledVector(f,F);
      const a=halton(n,11)*6.283,r=Math.sqrt(halton(n,13))*A,R=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0),U=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,1);
      cam.position.addScaledVector(R,Math.cos(a)*r).addScaledVector(U,Math.sin(a)*r);cam.lookAt(fp);cam.updateMatrixWorld();}}
  renderer.toneMapping=THREE.NoToneMapping;
  if(n>0){cam.setViewOffset(w,h,halton(n,2)-.5,halton(n,3)-.5,w,h);
    if(sun.intensity>.3&&LOOK.sunBase){const a=halton(n,5)*6.283,r=Math.sqrt(halton(n,7))*LIGHT_HQ.sunR,t1=new THREE.Vector3().crossVectors(LOOK.sunDir,new THREE.Vector3(0,1,0)).normalize(),t2=new THREE.Vector3().crossVectors(t1,LOOK.sunDir);
      sun.position.copy(LOOK.sunBase).addScaledVector(t1,Math.cos(a)*r).addScaledVector(t2,Math.sin(a)*r);renderer.shadowMap.needsUpdate=true;}}
  else{if(LOOK.sunBase)sun.position.copy(LOOK.sunBase);if(shadowDirty){renderer.shadowMap.needsUpdate=true;shadowDirty=false;}}
  if(SKYL.length&&SKYL[0].visible){const c=sun.target.position,sc=sun.shadow.camera,d=new THREE.Vector3();
    for(let j=0;j<SKYL.length;j++){const L=SKYL[j],i=n*SKYL.length+j+1,y=SKY_E0+(1-SKY_E0)*halton(i,17),ph=6.2832*halton(i,19),r=Math.sqrt(1-y*y);
      d.set(r*Math.cos(ph),y,r*Math.sin(ph));L.position.copy(c).addScaledVector(d,230);L.target.position.copy(c);L.target.updateMatrixWorld();
      skyColorAt(d,L.color);L.intensity=LOOK.skyI/SKYL.length;
      const s=L.shadow.camera;s.left=sc.left;s.right=sc.right;s.top=sc.top;s.bottom=sc.bottom;s.near=sc.near;s.far=sc.far;s.updateProjectionMatrix();}
    renderer.shadowMap.needsUpdate=true;}
  if(SKY)SKY.position.copy(cam.position);
  renderer.setRenderTarget(PIPE.rt);renderer.clear();renderer.render(scene,cam);
  AO_MAT.uniforms.tDepth.value=PIPE.rt.depthTexture;AO_MAT.uniforms.proj.value.copy(cam.projectionMatrix);AO_MAT.uniforms.projInv.value.copy(cam.projectionMatrixInverse);
  AO_MAT.uniforms.frame.value=n%97;AO_MAT.uniforms.radius.value=ST.view==='plan'?3.0:(ST.view==='walk'?1.8:2.6);fs(AO_MAT,PIPE.ao);
  // wide AO: the same pass with a much larger radius, at half resolution, for broad darkening under eaves, porches and trees
  AO_MAT.uniforms.frame.value=(n*7+3)%97;AO_MAT.uniforms.radius.value=ST.view==='walk'?8:14;fs(AO_MAT,PIPE.ao2);
  const [hw,hh]=PIPE.half,[qw,qh]=PIPE.quarter;BRIGHT_MAT.uniforms.t.value=PIPE.rt.texture;BRIGHT_MAT.uniforms.thr.value=P.lamps?1.1:2.2;fs(BRIGHT_MAT,PIPE.b1);
  BLUR_MAT.uniforms.t.value=PIPE.b1.texture;BLUR_MAT.uniforms.dir.value.set(1/hw,0);fs(BLUR_MAT,PIPE.b2);BLUR_MAT.uniforms.t.value=PIPE.b2.texture;BLUR_MAT.uniforms.dir.value.set(0,1/hh);fs(BLUR_MAT,PIPE.b1);
  BLUR_MAT.uniforms.t.value=PIPE.b1.texture;BLUR_MAT.uniforms.dir.value.set(2/qw,0);fs(BLUR_MAT,PIPE.b3);BLUR_MAT.uniforms.t.value=PIPE.b3.texture;BLUR_MAT.uniforms.dir.value.set(0,2/qh);fs(BLUR_MAT,PIPE.b4);
  const cu=COMP_MAT.uniforms;cu.tB.value=PIPE.rt.texture;cu.tAO.value=PIPE.ao.texture;cu.tAO2.value=PIPE.ao2.texture;cu.aoS2.value=ST.view==='plan'?0:LOOK.ao2;cu.tL1.value=PIPE.b1.texture;cu.tL2.value=PIPE.b4.texture;cu.tAcc.value=PIPE.accA.texture;
  cu.px.value.set(1/w,1/h);cu.w.value=1/(n+1);cu.bl.value=P.bloom;cu.aoS.value=ST.view==='three'&&!ST.cutL?.6:.78;
  fs(COMP_MAT,PIPE.accB);
  const t=PIPE.accA;PIPE.accA=PIPE.accB;PIPE.accB=t;
  OUT_MAT.uniforms.t.value=PIPE.accA.texture;OUT_MAT.uniforms.exposure.value=P.exp;OUT_MAT.uniforms.vig.value=ST.view==='plan'?0:.22;OUT_MAT.uniforms.gamt.value=ST.view==='plan'?0:1;gradeCss('');fs(OUT_MAT,null);
  if(n>0)cam.clearViewOffset();if(dofSave){cam.position.copy(dofSave[0]);cam.quaternion.copy(dofSave[1]);cam.updateMatrixWorld();}PIPE.n++;
  if(PIPE.checked<2){PIPE.checked++;const gl=renderer.getContext(),px=new Uint8Array(4);let lit=0;
    for(const [fx,fy] of [[.5,.5],[.25,.3],[.75,.7],[.3,.8],[.7,.2]]){gl.readPixels(Math.floor(fx*gl.drawingBufferWidth),Math.floor(fy*gl.drawingBufferHeight),1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);lit+=px[0]+px[1]+px[2];}
    if(lit<6&&PIPE.checked>=2)throw new Error('high-quality output was blank');}}
// the fast renderer has no output pass, so its grade is a CSS filter on the canvas (off in plan view, like the shader grade)
function gradeCss(f){const el=renderer.domElement;if(el.style.filter!==f)el.style.filter=f;}
function renderFast(cam){const P=PRESETS[LOOK.preset];gradeCss(ST.view==='plan'?'':LOOK.gradeCss||'');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=P.exp;
  if(LOOK.sunBase)sun.position.copy(LOOK.sunBase);if(shadowDirty){renderer.shadowMap.needsUpdate=true;shadowDirty=false;}
  if(SKY)SKY.position.copy(cam.position);renderer.setRenderTarget(null);renderer.render(scene,cam);PIPE.n=PIPE.max;}
function setQuality(q,why){if(q==='high'&&!renderer.capabilities.isWebGL2){q='fast';why='High quality needs WebGL 2, which this browser does not offer, so the fast renderer is on.';}
  LOOK.quality=q;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,q==='high'?1.5:2));renderer.setSize(innerWidth,innerHeight);if(q==='high')setupPipe();
  PIPE.n=0;dirty=true;applyGrade();if(LOOK.hemi)applyLightBalance();const note=document.getElementById('qnote');if(note){note.textContent=why||'';note.style.display=why?'block':'none';}
  document.querySelectorAll('[data-q]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.q===q)));}
