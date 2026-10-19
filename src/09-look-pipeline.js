// 09-look-pipeline.js: sky, light presets, high-quality render pipeline (AO, bloom, accumulation)
"use strict";
// ================= LOOK: sky, light presets, high-quality pipeline =================
const H2=(a,b)=>{const v=new THREE.Vector3(a[0]+b[0],0,a[1]+b[1]);return v.normalize();};
const DIRS={E:[.707,.707],S:[-.707,.707],W:[-.707,-.707],N:[.707,-.707]};
// Each preset: sun direction (h, elev), sun colour and strength (si), sky colours (zen, hor, gnd), exposure, environment strengths, bloom,
// the unshadowed hemisphere fill (hemi), the shadowed sky light of high quality (sky; less of it means deeper shadows), and a colour grade
// (white balance, shadow lift, saturation, contrast; css is the fast renderer's equivalent). Each time of day has its own character:
// cool crisp morning, hard bright midday, warm afternoon, low orange golden hour, blue dusk with lamps on.
const PRESETS={
  morning:{label:'Morning',h:H2([DIRS.E[0],DIRS.E[1]],[DIRS.S[0]*.35,DIRS.S[1]*.35]),elev:19,sun:0xffcf9a,si:2.0,zen:0x4f80c8,hor:0xe2cdb6,gnd:0x3a3a30,exp:1.0,envE:.85,envI:.85,lamps:false,bloom:.13,hemi:.09,sky:.9,
    grade:{wb:[1.03,1,.95],lift:[.008,.012,.024],sat:1.07,con:1.1,css:'sepia(.05) saturate(1.07) contrast(1.1)'}},
  midday:{label:'Midday',h:H2(DIRS.S,[0,0]),elev:64,sun:0xfff7ec,si:2.3,zen:0x2c69c6,hor:0xc6daee,gnd:0x3d3c33,exp:.92,envE:.9,envI:.95,lamps:false,bloom:.08,hemi:.09,sky:.8,
    grade:{wb:[.99,1,1.02],lift:[0,0,.006],sat:1.09,con:1.13,css:'saturate(1.09) contrast(1.13)'}},
  afternoon:{stc:[1,.98,.95],label:'Afternoon',h:H2(DIRS.S,[DIRS.W[0]*.9,DIRS.W[1]*.9]),elev:33,sun:0xffdbae,si:2.05,zen:0x5c8ccf,hor:0xe6dac8,gnd:0x4a4636,exp:1.0,envE:.95,envI:.9,lamps:false,bloom:.12,hemi:.13,sky:.95,
    grade:{wb:[1.045,1,.92],lift:[.012,.01,.004],sat:1.04,con:1.09,css:'sepia(.1) saturate(1.04) contrast(1.09)'}},
  golden:{stc:[1,.92,.84],label:'Golden hour',h:H2(DIRS.W,[DIRS.N[0]*.25,DIRS.N[1]*.25]),elev:8,sun:0xff9445,si:2.0,zen:0x4a67a8,hor:0xf2a66c,gnd:0x3a3026,exp:1.28,envE:.85,envI:.75,lamps:false,bloom:.26,hemi:.08,sky:.9,
    grade:{wb:[1.08,.98,.84],lift:[.02,.008,0],sat:1.15,con:1.15,css:'sepia(.18) saturate(1.18) contrast(1.15)'}},
  dusk:{stc:[.22,.23,.40],label:'Evening, cozy',h:H2(DIRS.W,[DIRS.N[0]*.3,DIRS.N[1]*.3]),elev:5,sun:0x7b8fd0,si:.6,zen:0x1c3062,hor:0x7a6478,gnd:0x161412,exp:1.2,envE:.4,envI:.2,lamps:true,bloom:.2,hemi:.06,sky:.4,
    // cozy dusk: warm amber lamps against a soft blue night glow that comes in through the windows (cool sun and sky light, bluish window
    // light in the room reflections) and settles in the shadows; the grade keeps the lamps warm but lifts the shadows toward blue
    grade:{wb:[1.04,1,.93],lift:[.004,.01,.03],sat:1.06,con:1.06,css:'sepia(.12) saturate(1.06) contrast(1.06) brightness(.95)'}}
};
// bloomScale: overall strength of the glow round bright lights (1 = each preset's own bloom)
const LOOK={bloomScale:.5,dof:10,skyI:1.4,ao2:.5,preset:'afternoon',quality:'high',sunDir:new THREE.Vector3(),lights:[],hemi:null,amb:null};
const EXT_MATS=new Set(['brick','siding','sidingNew','roof','slateRoof','metalRoof','grass','deckOld','deckNew','deckRailOld','paver','drive','driveway','asphalt','concrete','stone','frameDark','dormerClad',
  'garageDoor','garageDoorPanel','doorWood','bark','chain','flagstone','mulch','roofBrown','soldier','underside','glass','leafCards','shrubCards','grassBlades','treeline','edgeStone','soil']);
// aerial perspective: exponential fog, a touch bluer than the horizon; thinned as the 3/4 camera pulls back so the house doesn't wash out
const FOG_D=.0014;
const fogColor=P=>new THREE.Color(P.hor).lerp(new THREE.Color(P.zen),.12);
function makeFog(){return new THREE.FogExp2(fogColor(PRESETS[LOOK.preset]).getHex(),FOG_D);}
function updateFog(){if(scene.fog&&scene.fog.isFogExp2)scene.fog.density=(ST.pending||ST.view)==='plan'||DIO.on?0:FOG_D*(ST.view==='three'?Math.min(1,170/ORB.d):1);}
// ---------- sky ----------
const SKY_MAT=new THREE.ShaderMaterial({uniforms:{st:{value:0},stc:{value:new THREE.Color(1,1,1)},pm:{value:0},paper:{value:new THREE.Color(.9,.91,.875)},sunDir:{value:new THREE.Vector3(0,1,0)},zen:{value:new THREE.Color()},hor:{value:new THREE.Color()},gnd:{value:new THREE.Color()},sunCol:{value:new THREE.Color()},sunI:{value:1}},
  vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform vec3 sunDir,zen,hor,gnd,sunCol,paper,stc;uniform float sunI,pm,st;varying vec3 vDir;
  void main(){vec3 d=normalize(vDir);float y=d.y;vec3 c=mix(hor,zen,pow(clamp(y,0.,1.),.42));c+=hor*.22*exp(-abs(y)*16.);
    if(y<0.)c=mix(hor*.8,gnd,clamp(pow(-y*2.5,.55),0.,1.));
    float mu=max(dot(d,sunDir),0.);c+=sunCol*(.10*pow(mu,5.)+.32*pow(mu,48.))*sunI;
    c+=sunCol*smoothstep(.99986,.99993,mu)*45.*sunI*step(-.02,sunDir.y);
    // studio backdrop (the 3/4 view's diorama): lavender above, near-white at the horizon, soft lilac below, tinted per time of day
    vec3 sd=y>0.?mix(vec3(.93,.92,.98),vec3(.70,.68,.90),pow(clamp(y,0.,1.),.7)):mix(vec3(.93,.92,.98),vec3(.80,.78,.93),clamp(pow(-y*1.6,.6),0.,1.));c=mix(c,sd*stc,st);
    gl_FragColor=vec4(mix(c,paper,pm),1.);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }`,side:THREE.BackSide,depthWrite:false,depthTest:false});
let SKY,ROOM_ENV=null,SKY_ENV=null;
function buildSky(){SKY=new THREE.Mesh(new THREE.SphereGeometry(450,40,20),SKY_MAT);SKY.renderOrder=-1000;SKY.frustumCulled=false;scene.add(SKY);}
// each preset's environments are built once and kept: rebuilding them (PMREM) on every change of light was a noticeable stall
const ENV_CACHE={};
function makeEnvs(P,name){const ce=ENV_CACHE[name];if(ce){SKY_ENV=ce.sky;ROOM_ENV=ce.room;scene.environment=SKY_ENV;return;}const pm=new THREE.PMREMGenerator(renderer);
  const es=new THREE.Scene();es.add(new THREE.Mesh(new THREE.SphereGeometry(40,48,24),SKY_MAT));const pmSave=SKY_MAT.uniforms.pm.value;SKY_MAT.uniforms.pm.value=0;
  const stSave=SKY_MAT.uniforms.st.value;SKY_MAT.uniforms.st.value=0;const nSky=pm.fromScene(es,0,.1,100).texture;SKY_MAT.uniforms.pm.value=pmSave;SKY_MAT.uniforms.st.value=stSave;
  // interior "room" environment: soft walls, bright windows, warm lamps at dusk
  const rs=new THREE.Scene(),day=P.lamps?.12:1,B=(c)=>new THREE.MeshBasicMaterial({color:c,side:THREE.BackSide}),F=(c)=>new THREE.MeshBasicMaterial({color:c});
  const room=new THREE.Mesh(new THREE.BoxGeometry(26,10,26),[B(new THREE.Color(.32,.31,.29).multiplyScalar(day+.15)),B(new THREE.Color(.32,.31,.29).multiplyScalar(day+.15)),
    B(new THREE.Color(.5,.5,.48).multiplyScalar(day+.2)),B(new THREE.Color(.22,.15,.09).multiplyScalar(day+.2)),B(new THREE.Color(.32,.31,.29).multiplyScalar(day+.15)),B(new THREE.Color(.32,.31,.29).multiplyScalar(day+.15))]);rs.add(room);
  const win=P.lamps?new THREE.Color(.32,.42,.85).multiplyScalar(.7):new THREE.Color(P.hor).lerp(new THREE.Color(P.zen),.4).multiplyScalar(3.2);
  for(const [x,z,ry] of [[12.9,0,-Math.PI/2],[0,-12.9,0],[-12.9,4,Math.PI/2]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(9,5),F(win));m.position.set(x,.6,z);m.rotation.y=ry;rs.add(m);}
  if(P.lamps)for(const [x,z] of [[-5,-4],[6,5],[-3,7]]){const m=new THREE.Mesh(new THREE.SphereGeometry(.8,12,8),F(new THREE.Color(9,6.5,4)));m.position.set(x,3.5,z);rs.add(m);}
  const nRoom=pm.fromScene(rs,0,.1,100).texture;pm.dispose();
  ENV_CACHE[name]={sky:nSky,room:nRoom};SKY_ENV=nSky;ROOM_ENV=nRoom;scene.environment=SKY_ENV;}
// ---------- evening lights ----------
// Every lamp is a virtual light (LAMPV: position, colour, strength, reach). A fixed pool of point lights (LOOK.lights, 10, or 5 on touch
// devices) stands in for the lamps nearest the view, and stays in the scene in daylight at zero strength. three.js builds the number of
// lights into every shader, so a constant count means changing the light preset never recompiles anything, and each shader stays small.
const LAMPV=[],_lf=new THREE.Vector3();let LAMP_SIG='';
// by day the lamps are off, except in the 3/4 cutaway, where the rooms are shown as if their ceilings were on (see SHADOW_PROXY in
// 12-app.js) and the lamps glow at LAMP_DAY of their evening strength alongside the window light
const LAMP_DAY=.3,lampsDim=()=>!PRESETS[LOOK.preset].lamps&&ST.view==='three'&&!ST.pending&&!!ST.cutL;
function buildLamps(){const fills=[[7,CEIL[2]-1.2,10],[-11,2.6,6],[-6,2.3,25],[6,2.3,25],[22,7,6],[6,11.4,7],[6,11.4,24],[8,-6.6,20],[25,-6.6,6],[37.6,7,5.4]];
  const pr={chandelier:0,pendant:1,ceiling:2,lamp:3,outdoor:4};const L=LAMPS.slice().sort((a,b)=>pr[a.k]-pr[b.k]);let pend=null;const out=[];
  for(const l of L){if(l.k==='pendant'){if(!pend){pend=l.v.clone();out.push({v:pend,k:'pendant'});}else pend.lerp(l.v,.5);continue;}out.push(l);}
  for(const f of fills)out.push({v:new THREE.Vector3(...f),k:'fill'});
  for(const l of out.slice(0,22)){const v={position:l.v.clone(),color:l.k==='outdoor'?0xffa75c:0xffb36b,i:l.k==='fill'?.55:(l.k==='outdoor'?.9:1.1),d:l.k==='fill'?22:16};
    LAMPV.push(v);if(l.inst)l.inst.lights.push({light:v,v0:l.v.clone()});}
  for(let i=0;i<(COARSE?5:10);i++){const p=new THREE.PointLight(0xffb36b,0,16,1.6);scene.add(p);LOOK.lights.push(p);}}
// point the pool at the lamps nearest the view (the walker, or the 3/4 view's target); only touches the lights when that set changes
function updateLampPool(fo){const P=PRESETS[LOOK.preset],dim=lampsDim(),on=P.lamps||dim,k=P.lamps?1:LAMP_DAY,f=fo||(ST.view==='walk'?_lf.set(WLK.x,WLK.f+5,WLK.z):ORB.t);
  const pick=on?LAMPV.slice().sort((a,b)=>a.position.distanceToSquared(f)-b.position.distanceToSquared(f)).slice(0,LOOK.lights.length):[];
  let sig=on?(dim?'dim':'on'):'off';for(const v of pick)sig+=';'+v.position.x.toFixed(2)+','+v.position.y.toFixed(2)+','+v.position.z.toFixed(2);
  if(sig===LAMP_SIG)return;LAMP_SIG=sig;
  LOOK.lights.forEach((p,i)=>{const v=pick[i];if(v){p.position.copy(v.position);p.color.setHex(v.color);p.intensity=v.i*k;p.distance=v.d;}else p.intensity=0;});
  MAT.shade.emissiveIntensity=P.lamps?1.4:(dim?.8:.35);if(typeof syncDerived==='function')syncDerived();
  if(isUltra())updateInteriorShadows();shadowDirty=true;dirty=true;}
// ---------- kitchen lights: the recessed cans as downlights and the black drum's diffuser, on in every preset (as in the listing photo) ----------
function buildKitchenLights(){LOOK.kitchen=[];const C=CEIL[3],warm=0xfff0d8;
  for(const [x,z] of KITCHEN_LIGHTS.cans){const l=new THREE.SpotLight(warm,1,16,Math.PI*.3,.75,1.6);l.position.set(x,C-.1,z);l.target.position.set(x,E[3],z);scene.add(l,l.target);l.target.updateMatrixWorld();LOOK.kitchen.push({l,k:'can'});}
  if(KITCHEN_LIGHTS.drum){const l=new THREE.PointLight(0xfff3e2,1,18,1.6);l.position.copy(KITCHEN_LIGHTS.drum);scene.add(l);LOOK.kitchen.push({l,k:'drum'});}}
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
function applyLightBalance(){const P=PRESETS[LOOK.preset],hq=isHQ(),uf=ultraFill(),ul=isUltra();
  for(const L of SKYL)L.visible=hq;LOOK.hemi.intensity=P.hemi*(hq?LIGHT_HQ.hemi*uf.hemi:1);sun.intensity=P.si*(hq?LIGHT_HQ.sun:1);
  for(const k in MAT){const m=MAT[k];if(!m||!m.isMeshStandardMaterial)continue;if(EXT_MATS.has(k))m.envMapIntensity=P.envE*(hq?LIGHT_HQ.env*uf.env:1);else if(m.envMap)m.envMapIntensity=P.envI*uf.envI*cutFill();
    if(m.userData.cc)m.clearcoat=ul?m.userData.cc[0]:0;}
  if(typeof syncDerived==='function')syncDerived();LOOK.preview=undefined;shadowDirty=true;dirty=true;if(LOOK.studio&&typeof planStudio==='function')planStudio();}
// while the camera moves, high quality shows a clean preview lit like the fast renderer (sun and plain sky light, no sky-shadow sampling);
// refining starts once it stops. Only light strengths change, so nothing recompiles.
function hqLight(pv){const P=PRESETS[LOOK.preset],uf=ultraFill();if(!LOOK.studio){LOOK.hemi.intensity=P.hemi*(pv?1:LIGHT_HQ.hemi*uf.hemi);sun.intensity=P.si*(pv?1:LIGHT_HQ.sun);}
  for(const k in MAT){const m=MAT[k];if(m&&m.isMeshStandardMaterial&&EXT_MATS.has(k))m.envMapIntensity=P.envE*(pv?1:LIGHT_HQ.env*uf.env);}if(typeof syncDerived==='function')syncDerived();if(pv)for(const L of SKYL)L.intensity=0;shadowDirty=true;}
// ---------- applying a preset ----------
// the preset's sun, turned around the house by LOOK.sunTurn degrees (the Sun slider; positive turns it counterclockwise in plan)
function sunDirFor(P,out){const e=P.elev*Math.PI/180,t=(LOOK.sunTurn||0)*Math.PI/180,c=Math.cos(t),sn=Math.sin(t),hx=P.h.x*c+P.h.z*sn,hz=-P.h.x*sn+P.h.z*c;
  return out.set(hx*Math.cos(e),Math.sin(e),hz*Math.cos(e)).normalize();}
function applyPreset(name){if(typeof giAbort==='function')giAbort();const P=PRESETS[name]||PRESETS.afternoon;LOOK.preset=name;
  sunDirFor(P,LOOK.sunDir);
  const u=SKY_MAT.uniforms;u.stc.value.fromArray(P.stc||[1,1,1]);u.sunDir.value.copy(LOOK.sunDir);u.zen.value.setHex(P.zen);u.hor.value.setHex(P.hor);u.gnd.value.setHex(P.gnd);u.sunCol.value.setHex(P.sun);u.sunI.value=P.lamps?.15:1;
  sun.color.setHex(P.sun);sun.intensity=P.si;LOOK.hemi.intensity=P.hemi;LOOK.hemi.color.setHex(P.zen).lerp(new THREE.Color(1,1,1),.6);LOOK.amb.intensity=P.lamps?.03:.05;
  makeEnvs(P,name);
  for(const k in MAT){const m=MAT[k];if(!m||!m.isMeshStandardMaterial)continue;const ext=EXT_MATS.has(k);const had=!!m.envMap;m.envMap=ext?null:ROOM_ENV;m.envMapIntensity=ext?P.envE:P.envI;if(had!==!!m.envMap)m.needsUpdate=true;}
  applyGrade();applyLightBalance();MAT.shade.emissiveIntensity=P.lamps?1.4:.35;if(MAT.ledStrip)MAT.ledStrip.emissiveIntensity=P.lamps?2.2:.1;MAT.light.emissiveIntensity=P.lamps?1.8:1.2;MAT.flame.emissiveIntensity=P.lamps?3.5:1.5;
  LAMP_SIG='';updateLampPool();
  for(const {l,k} of LOOK.kitchen||[]){l.intensity=(k==='can'?.85:.7)*(P.lamps?1.05:1);l.color.setHex(P.lamps?0xffcf96:(k==='can'?0xfff0d8:0xfff3e2));}
  if(scene.fog)scene.fog.color.copy(fogColor(P));
  syncDerived();
  fitShadow(true);dirty=true;shadowDirty=true;if(typeof PIPE!=='undefined')PIPE.n=0;if(LOOK.studio)planStudio();}
let SHC={x:1e9,z:1e9,half:0};
function fitShadow(force){const walk=ST.view==='walk',half=walk?50:108,cx=walk?WLK.x:16,cz=walk?WLK.z:12;
  if(!force&&SHC.half===half&&Math.hypot(SHC.x-cx,SHC.z-cz)<12)return;SHC={x:cx,z:cz,half};
  sun.target.position.set(cx,-6,cz);sun.position.copy(sun.target.position).addScaledVector(LOOK.sunDir,230);
  const c=sun.shadow.camera;c.left=-half;c.right=half;c.top=half;c.bottom=-half;c.near=30;c.far=470;c.updateProjectionMatrix();sun.target.updateMatrixWorld();
  LOOK.sunBase=sun.position.clone();shadowDirty=true;dirty=true;}
// ---------- high-quality pipeline ----------
const PIPE={ok:true,n:0,max:64,size:[2,2],checked:0};
// Ultra: everything high quality does, plus
//  - a normal/gloss pass and an albedo pass, for screen-space reflections (per-material reflectivity, gloss from roughness maps) and
//    global illumination (one bounce: light gathered from nearby surfaces in this frame, times the surface's real colour), with the flat unshadowed fill turned down (fill) so the bounce light does that work
//  - soft shadows from the room lights nearest the view (ultraLights)
//  - sunbeams in the air when walking (VOL_MAT; strength per preset in vol)
//  - a camera: depth of field when walking (autofocus at the centre of the view), a stronger miniature-style one in the 3/4 view,
//    lens chromatic aberration (ca) and a deeper vignette
//  - clear coats on floors, cabinets, counters, tile and lacquered furniture (userData.cc, see physify in 03-textures.js)
//  - a larger sun shadow map, supersampling and a longer accumulation.
// Interior shadows use three probe lights (one spot, two point): every shadow is a texture in every lit shader, and browsers on Windows
// allow 16 textures per shader.
const ULTRA={frames:192,pixels:5.5e6,giS:1,giR:7,ssrS:1,reflBoost:1.4,aoBoost:1.18,probes:null,dofPx:.88,aperture:.01,focusMax:25,focus:0,ca:.0025,vig:.3,
  fill:{hemi:.5,env:.7,envI:.6},vol:{morning:.18,midday:.08,afternoon:.15,golden:.2,dusk:0},volOut:.08,volG:.45,volMax:30,volOn:false,giPasses:2,giSprobe:.5,
  // exposure for the room light: 1 = as captured (lifting it made interiors blow out when the room light came on)
  giGain:1,
  refl:{oak:.02,slate:.06,tileBath:.14,subway:.18,showerTile:.16,barTile:.14,cab:.05,cabDark:.05,quartz:.14,walnutDark:.12,oakFurn:.09,oakLight:.08,porcelain:.2,
    ceramicWhite:.12,washer:.12,blackGlass:.25,tvScreen:.3,mirror:1,doorWhite:.06,doorGrey:.06,trim:.05,leather:.06,tread:.1}};
// the rooms' flat fill (their environment light) in the 3/4 cutaway, where they are lit as if their ceilings were on
const CUT_FILL=.35,cutFill=()=>typeof SHADOW_PROXY!=='undefined'&&SHADOW_PROXY&&SHADOW_PROXY.visible?CUT_FILL:1;
const ultraFill=()=>isUltra()?ULTRA.fill:{hemi:1,env:1,envI:1};
const isHQ=()=>LOOK.quality!=='fast',isUltra=()=>LOOK.quality==='ultra';
function qualityPR(q){const dpr=window.devicePixelRatio||1;if(q==='fast')return Math.min(dpr,2);if(q==='high')return Math.min(dpr,1.5);
  return Math.max(Math.min(dpr,1.5),Math.min(dpr*2,Math.sqrt(ULTRA.pixels/(innerWidth*innerHeight))));}
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
// shared GLSL for the ultra passes: view-space position from depth, a hash, the encoded normal (xy, z rebuilt; gloss in .z, reflectivity in .a)
const GL_UTIL=`uniform sampler2D tC,tDepth,tEnc;uniform mat4 proj,projInv;uniform float frame,radius;varying vec2 vUv;
  vec3 vpos(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=projInv*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
  float h1(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  vec2 proj2(vec3 S){vec4 q=proj*vec4(S,1.);return q.xy/q.w*.5+.5;}`;
const ULTRA_UN=()=>({tC:{value:null},tDepth:{value:null},tEnc:{value:null},proj:{value:new THREE.Matrix4()},projInv:{value:new THREE.Matrix4()},frame:{value:0},radius:{value:7}});
// one-bounce GI: light arriving from nearby lit surfaces, by cosine-weighted samples of the frame's own lit image within a radius
const GI_MAT=SM(GL_UTIL+`
  void main(){float d=texture2D(tDepth,vUv).x;if(d>.99999){gl_FragColor=vec4(0.);return;}
    vec3 P=vpos(vUv);vec4 e=texture2D(tEnc,vUv);vec3 N;
    if(e.x+e.y<.001){N=normalize(cross(dFdx(P),dFdy(P)));if(dot(N,P)>0.)N=-N;}else{vec2 n2=e.xy*2.-1.;N=vec3(n2,sqrt(max(0.,1.-dot(n2,n2))));}
    float r0=h1(gl_FragCoord.xy*.913+frame*7.31),an=r0*6.2831853;vec3 rv=vec3(cos(an),sin(an),.41),T=normalize(rv-N*dot(rv,N)),B=cross(N,T),acc=vec3(0.);
    for(int i=0;i<10;i++){float fi=float(i),a=h1(vec2(fi*4.1+frame*1.7,r0*77.3)),b=h1(vec2(r0*13.7+frame*.9,fi*2.3)),c=h1(vec2(fi+r0*3.1,frame*.53));
      float sr=sqrt(a),th=6.2831853*b;vec3 s=vec3(sr*cos(th),sr*sin(th),sqrt(max(0.,1.-a)));
      vec2 uv=proj2(P+(T*s.x+B*s.y+N*s.z)*radius*mix(.06,1.,c*c));if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)continue;
      if(texture2D(tDepth,uv).x>.99999)continue;vec3 v=vpos(uv)-P;float L=length(v);if(L<.05)continue;float cp=dot(N,v/L);if(cp<=0.)continue;
      acc+=min(texture2D(tC,uv).rgb,vec3(4.))*cp/(1.+2.*L*L/(radius*radius));}
    // the samples are already cosine-distributed, so the extra cosine above averages about 2/3: 1.5/10 makes this the mean incoming light
    gl_FragColor=vec4(acc*(1.5/10.),1.);}`,ULTRA_UN());
// screen-space reflections: march the reflected ray against the depth buffer; the surface's roughness jitters the ray each frame, so the
// accumulation turns it into a glossy reflection. Alpha carries how much of it to use (reflectivity, Fresnel, edge fade).
const SSR_MAT=SM(`#define REFL_BOOST ${ULTRA.reflBoost.toFixed(2)}
`+GL_UTIL+`
  void main(){vec4 e=texture2D(tEnc,vUv);float refl=e.a,d=texture2D(tDepth,vUv).x;if(refl<.015||d>.99999){gl_FragColor=vec4(0.);return;}
    vec3 P=vpos(vUv);vec2 n2=e.xy*2.-1.;vec3 N=vec3(n2,sqrt(max(0.,1.-dot(n2,n2))));
    float r0=h1(gl_FragCoord.xy*.71+frame*5.13),r1=h1(gl_FragCoord.yx*.37+frame*2.9),r2=h1(vec2(r0,r1)*31.7+frame);
    N=normalize(N+normalize(vec3(r0,r1,r2)*2.-1.)*e.z*e.z*.55);vec3 V=normalize(P),R=reflect(V,N);float ndv=max(dot(-V,N),0.);
    float t=.1+r0*.2,stp=.18;vec2 huv=vec2(-1.);
    for(int i=0;i<56;i++){vec3 S=P+R*t;vec4 q=proj*vec4(S,1.);if(q.w<=0.)break;vec2 uv=q.xy/q.w*.5+.5;if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)break;
      float sz=vpos(uv).z;if(S.z<sz&&sz-S.z<.3+t*.05){huv=uv;break;}t+=stp;stp*=1.09;}
    if(huv.x<0.){gl_FragColor=vec4(0.);return;}
    vec2 ed=min(huv,1.-huv);float edge=clamp(min(ed.x,ed.y)*12.,0.,1.)*clamp(1.-t/60.,0.,1.);
    float fres=min(1.,refl*REFL_BOOST)+(1.-refl)*pow(1.-ndv,4.)*smoothstep(.01,.06,refl);
    gl_FragColor=vec4(min(texture2D(tC,huv).rgb,vec3(6.)),clamp(fres,0.,1.)*edge);}`,ULTRA_UN());
// normal/gloss pass: every opaque mesh drawn with a material that writes its view-space normal (xy), roughness and reflectivity
const ENC_VS=`#include <common>
#include <clipping_planes_pars_vertex>
varying vec3 vN;
#ifdef RMAP
uniform mat3 uvT;varying vec2 vR;
#endif
void main(){
#ifdef RMAP
  vR=(uvT*vec3(uv,1.)).xy;
#endif
#include <beginnormal_vertex>
#include <defaultnormal_vertex>
#include <begin_vertex>
#include <project_vertex>
#include <clipping_planes_vertex>
  vN=normalize(transformedNormal);}`;
const ENC_FS=`uniform float refl,rough;varying vec3 vN;
#ifdef RMAP
uniform sampler2D rmap;varying vec2 vR;
#endif
#include <clipping_planes_pars_fragment>
void main(){
#include <clipping_planes_fragment>
  vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float r=rough,f=refl;
#ifdef RMAP
  r=rough*texture2D(rmap,vR).g;f=refl*clamp((1.-r)/max(1.-rough,.05),0.,2.);
#endif
  gl_FragColor=vec4(n.xy*.5+.5,r,min(f,1.));}`;
// reflectivity: the material's entry in ULTRA.refl, or one from its roughness and metalness; a clear coat's own gloss sets the blur; a
// roughness map (photo textures) varies both across the surface, in the same UV transform three.js uses for the material's maps
const ENC=new Map();let MATKEY=null;
function encOf(m){let e=ENC.get(m);const rm=m.roughnessMap||null,src=m.map||rm;if(src)src.updateMatrix();if(e&&e.userData.rm===rm&&e.userData.src===src)return e;if(e)e.dispose();
  if(!MATKEY){MATKEY=new Map();for(const k in MAT)MATKEY.set(MAT[k],k);}
  const key=MATKEY.get(m),cc=m.userData.cc,r=m.roughness===undefined?1:m.roughness,mt=m.metalness||0,rough=cc?Math.min(r,cc[1]+.05):r;
  const refl=key&&ULTRA.refl[key]!==undefined?ULTRA.refl[key]:Math.pow(1-r,1.5)*(.1+.9*mt);
  e=new THREE.ShaderMaterial({vertexShader:ENC_VS,fragmentShader:ENC_FS,clipping:true,clippingPlanes:CLIPS,side:m.side,defines:rm?{RMAP:''}:{},
    uniforms:{rough:{value:rough},refl:{value:refl},rmap:{value:rm},uvT:{value:src?src.matrix:new THREE.Matrix3()}}});e.userData.rm=rm;e.userData.src=src;ENC.set(m,e);return e;}
// albedo pass: each surface's own colour, unlit (metals count as dark: their light is all reflection), for the bounce light
const ALB=new Map(),_white=new THREE.Color(1,1,1);
function albOf(m){let a=ALB.get(m);if(!a){a=new THREE.MeshBasicMaterial({clippingPlanes:CLIPS});ALB.set(m,a);}
  const mp=m.map||null;if(a.map!==mp){if(!a.map!==!mp)a.needsUpdate=true;a.map=mp;}a.color.copy(m.color||_white).multiplyScalar(1-(m.metalness||0));
  if(a.vertexColors!==!!m.vertexColors){a.vertexColors=!!m.vertexColors;a.needsUpdate=true;}a.side=m.side;return a;}
// render the opaque scene with every material swapped for pick(material) (transparent, cut-out, shader and line objects hidden)
function overridePass(cam,target,pick){const swap=[];
  scene.traverse(o=>{if(!o.visible)return;if(o.isMesh){const m=o.material;
      if(Array.isArray(m)||m.transparent||m.alphaTest>0||m.isShaderMaterial||o.userData.horizon||o.userData.shadowOnly){o.visible=false;swap.push([o,null]);}else{swap.push([o,m]);o.material=pick(m);}}
    else if(o.isLine||o.isPoints){o.visible=false;swap.push([o,null]);}});
  const cc=renderer.getClearColor(new THREE.Color()),ca=renderer.getClearAlpha(),fog=scene.fog;scene.fog=null;renderer.setClearColor(0,0);
  renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,cam);renderer.setClearColor(cc,ca);scene.fog=fog;
  for(const [o,m] of swap){if(m)o.material=m;else o.visible=true;}}
function encPass(cam){overridePass(cam,PIPE.enc,encOf);}
// ---------- the rooms as a volume: a texture over the house's plan, each texel holding the lowest floor and highest ceiling of the
// rooms over it (decks, patios and walks left out), so a shader can tell whether a point is indoors
const GI_U={uGI:{value:0},giGain:{value:1},tGIa:{value:null},giMin:{value:new THREE.Vector3()},giStep:{value:new THREE.Vector3(4,4.5,4)},giN:{value:new THREE.Vector3(1,1,1)},
  tRoom:{value:null},roomBox:{value:new THREE.Vector4(0,0,1,1)}};
const ROOM_GLSL=`uniform sampler2D tRoom;uniform vec4 roomBox;
float roomIn(vec3 q){vec2 u=(q.xz-roomBox.xy)/(roomBox.zw-roomBox.xy);if(u.x<0.||u.y<0.||u.x>1.||u.y>1.)return 0.;vec4 m=texture2D(tRoom,u);
  return step(.5,m.a)*step(m.r*30.-15.,q.y)*step(q.y,m.g*30.-15.);}`;
const indoorRooms=()=>SPEC.rooms.filter(r=>!/deck|patio|walk/i.test(r.name));
function roomMask(){if(GI_U.tRoom.value)return;const R=indoorRooms(),S=.5;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(const r of R){x0=Math.min(x0,r.x0);x1=Math.max(x1,r.x1);z0=Math.min(z0,r.z0);z1=Math.max(z1,r.z1);}x0-=1;z0-=1;x1+=1;z1+=1;
  const W=Math.ceil((x1-x0)/S),H=Math.ceil((z1-z0)/S),d=new Uint8Array(W*H*4),enc=y=>Math.max(0,Math.min(255,Math.round((y+15)/30*255)));
  // each room padded by 0.6 ft, so its wall surfaces count as indoors (no blocky edges where a view ray ends on a wall)
  for(const r of R){const f=enc(E[r.lv]-.3),c=enc(CEIL[r.lv]+.3),pd=.6;
    for(let j=Math.max(0,Math.floor((r.z0-pd-z0)/S));j<Math.min(H,Math.ceil((r.z1+pd-z0)/S));j++)for(let i=Math.max(0,Math.floor((r.x0-pd-x0)/S));i<Math.min(W,Math.ceil((r.x1+pd-x0)/S));i++){const k=(j*W+i)*4;
      if(!d[k+3]){d[k]=f;d[k+1]=c;d[k+3]=255;}else{d[k]=Math.min(d[k],f);d[k+1]=Math.max(d[k+1],c);}}}
  const t=new THREE.DataTexture(d,W,H,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;GI_U.tRoom.value=t;GI_U.roomBox.value.set(x0,z0,x0+W*S,z0+H*S);}
// sunbeams: march each pixel's view ray (up to volMax feet) through the sun's shadow map; lit stretches of air scatter sunlight toward
// the eye (Henyey-Greenstein, forward-leaning), so light shafts show through windows and under trees. Jittered per frame, accumulated.
const VOL_MAT=SM(`#include <packing>
`+ROOM_GLSL+`
uniform sampler2D tDepth,tShadow;uniform mat4 projInv,camWorld,shadowM;uniform vec3 camPos,sunDir,sunCol;uniform float frame,dens,maxD,g,outK;varying vec2 vUv;
float h1(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){float d=texture2D(tDepth,vUv).x;vec4 p=projInv*vec4(vUv*2.-1.,min(d,.9999)*2.-1.,1.);vec3 Pv=p.xyz/p.w;float L=d>.99999?maxD:min(length(Pv),maxD);
  vec3 Pw=(camWorld*vec4(Pv,1.)).xyz,rd=normalize(Pw-camPos);float st=L/32.,j=h1(gl_FragCoord.xy*.37+frame*1.618),acc=0.;
  for(int i=0;i<32;i++){vec3 X=camPos+rd*(st*(float(i)+j));vec4 sc=shadowM*vec4(X,1.);vec3 s=sc.xyz/sc.w;float w=mix(outK,1.,roomIn(X));
    if(s.x<0.||s.y<0.||s.x>1.||s.y>1.||s.z>1.){acc+=w;continue;}acc+=w*step(s.z,unpackRGBAToDepth(texture2D(tShadow,s.xy))+.002);}
  float ct=dot(rd,sunDir),ph=(1.-g*g)/(12.566*pow(1.+g*g-2.*g*ct,1.5));gl_FragColor=vec4(sunCol*(acc*st*dens*ph),1.);}`,
  {tDepth:{value:null},tShadow:{value:null},projInv:{value:new THREE.Matrix4()},camWorld:{value:new THREE.Matrix4()},shadowM:{value:new THREE.Matrix4()},camPos:{value:new THREE.Vector3()},
   sunDir:{value:new THREE.Vector3()},sunCol:{value:new THREE.Color()},frame:{value:0},dens:{value:0},maxD:{value:30},g:{value:.55},outK:{value:.08},tRoom:GI_U.tRoom,roomBox:GI_U.roomBox});
// autofocus for walking: the nearest depth in a small patch at the centre of the view, packed into one pixel and read back once per rest
const FOCUS_MAT=SM(`#include <packing>
uniform sampler2D tDepth;uniform mat4 projInv;varying vec2 vUv;
float vz(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=projInv*vec4(uv*2.-1.,d*2.-1.,1.);return d>.99999?200.:-p.z/p.w;}
void main(){float z=1e9;for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++)z=min(z,vz(vec2(.5)+vec2(float(i),float(j))*.012));gl_FragColor=packDepthToRGBA(clamp(z/200.,0.,.999));}`,
  {tDepth:{value:null},projInv:{value:new THREE.Matrix4()}});
function readFocus(cam){const u=FOCUS_MAT.uniforms;u.tDepth.value=PIPE.rt.depthTexture;u.projInv.value.copy(cam.projectionMatrixInverse);fs(FOCUS_MAT,PIPE.focus);
  const b=new Uint8Array(4);renderer.readRenderTargetPixels(PIPE.focus,0,0,1,1,b);const k=255/256/255;ULTRA.focus=Math.min(ULTRA.focusMax,200*(b[0]*k/16777216+b[1]*k/65536+b[2]*k/256+b[3]*k));}
// interior shadows: two probe lights (a spot and a point) cast them, in Ultra only; the room lights themselves never do
function updateInteriorShadows(){const U=ULTRA;
  if(!U.probes){const sp=new THREE.SpotLight(0xffffff,0,16,Math.PI*.3,.75,1.6);
    // near planes past the fixture itself (shade, drum, can), so a light is never shadowed by its own housing
    sp.shadow.mapSize.set(1024,1024);sp.shadow.bias=-.0006;sp.shadow.normalBias=.03;sp.shadow.camera.near=.6;scene.add(sp,sp.target);U.probes=[sp];
    for(let i=0;i<2;i++){const pt=new THREE.PointLight(0xffffff,0,16,1.6);pt.shadow.mapSize.set(512,512);pt.shadow.bias=-.003;pt.shadow.normalBias=.04;pt.shadow.camera.near=1.3;scene.add(pt);U.probes.push(pt);}}
  for(const l of [...(LOOK.kitchen||[]).map(k=>k.l),...LOOK.lights])l.castShadow=false;
  for(const pr of U.probes)pr.castShadow=isUltra();shadowDirty=true;}
// soft shadows from the room lights nearest the view (one spot, two point lights): a shadow-casting probe takes over each one, at the same
// strength and colour, moved a little every refinement frame for a soft edge. (An earlier version shadowed every light by picking one at
// random each frame and cancelling it with negative light: correct on average, but it flashed black while refining.)
function ultraLights(n,on,jit){const U=ULTRA,res=[];if(!U.probes)return res;for(const pr of U.probes)pr.intensity=0;if(!on)return res;
  const f=ST.view==='walk'?_lf.set(WLK.x,WLK.f+5,WLK.z):ORB.t,by=(a,b)=>a.position.distanceToSquared(f)-b.position.distanceToSquared(f);
  const kl=(LOOK.kitchen||[]).map(k=>k.l),spots=kl.filter(l=>l.isSpotLight&&l.intensity>0).sort(by),pts=[...kl.filter(l=>l.isPointLight),...LOOK.lights].filter(l=>l.intensity>0).sort(by);
  U.probes.forEach((pr,j)=>{const l=j===0?spots[0]:pts[j-1];if(!l)return;const i=n*3+j+1,a=halton(i,23)*6.283,r=jit?Math.sqrt(halton(i,29))*.22:0;
    pr.color.copy(l.color);pr.intensity=l.intensity;pr.distance=l.distance;pr.decay=l.decay;pr.position.copy(l.position).add(new THREE.Vector3(Math.cos(a)*r,jit?(halton(i,31)-.5)*.1:0,Math.sin(a)*r));
    if(l.isSpotLight){pr.angle=l.angle;pr.penumbra=l.penumbra;pr.target.position.copy(l.target.position);pr.target.updateMatrixWorld();}
    res.push([l,l.intensity]);l.intensity=0;});
  renderer.shadowMap.needsUpdate=true;return res;}
const BRIGHT_MAT=SM('uniform sampler2D t;uniform float thr;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(max(c.r,c.g),c.b);gl_FragColor=vec4(c*smoothstep(thr,thr*1.8,l),1.);}',{t:{value:null},thr:{value:1.6}});
const BLUR_MAT=SM('uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227;c+=(texture2D(t,vUv+dir*1.385).rgb+texture2D(t,vUv-dir*1.385).rgb)*.316;c+=(texture2D(t,vUv+dir*3.231).rgb+texture2D(t,vUv-dir*3.231).rgb)*.07;gl_FragColor=vec4(c,1.);}',{t:{value:null},dir:{value:new THREE.Vector2()}});
const COMP_MAT=SM(`uniform sampler2D tB,tAO,tAO2,tL1,tL2,tAcc,tGI,tSSR,tAlb,tVol;uniform vec2 px;uniform float w,aoS,aoS2,bl,giS,ssrS,volS;varying vec2 vUv;
  void main(){vec3 c=texture2D(tB,vUv).rgb;
    if(giS>0.)c+=texture2D(tGI,vUv).rgb*texture2D(tAlb,vUv).rgb*giS;
    if(ssrS>0.){vec4 r=texture2D(tSSR,vUv);c=mix(c,r.rgb,r.a*ssrS);}float a=0.,a2=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 o=vec2(float(x),float(y));a+=texture2D(tAO,vUv+o*px*1.5).r;a2+=texture2D(tAO2,vUv+o*px*4.).r;}a/=9.;a2/=9.;
    c*=mix(1.,a,aoS)*mix(1.,a2,aoS2);if(volS>0.)c+=texture2D(tVol,vUv).rgb*volS;c+=(texture2D(tL1,vUv).rgb+texture2D(tL2,vUv).rgb*.8)*bl;
    vec3 acc=texture2D(tAcc,vUv).rgb;gl_FragColor=vec4(mix(acc,c,w),1.);}`,
  {tB:{value:null},tAO:{value:null},tAO2:{value:null},aoS2:{value:0},tGI:{value:null},tAlb:{value:null},tVol:{value:null},volS:{value:0},tSSR:{value:null},giS:{value:0},ssrS:{value:0},tL1:{value:null},tL2:{value:null},tAcc:{value:null},px:{value:new THREE.Vector2()},w:{value:1},aoS:{value:.75},bl:{value:.1}});
const OUT_MAT=SM(`uniform sampler2D t;uniform float exposure,sat,vig,con,gsat,gamt,ca;uniform vec3 wb,lift;varying vec2 vUv;
  vec3 fit(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
  vec3 aces(vec3 c){const mat3 I=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));const mat3 O=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));return clamp(O*fit(I*c),0.,1.);}
  vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
  void main(){vec2 q0=vUv-.5;vec3 s0=ca>0.?vec3(texture2D(t,vUv-q0*ca).r,texture2D(t,vUv).g,texture2D(t,vUv+q0*ca).b):texture2D(t,vUv).rgb;vec3 c=aces(s0*exposure/.6);float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);vec2 q=vUv-.5;c*=1.-vig*dot(q,q)*1.6;
    c=srgb(clamp(c,0.,1.));
    // colour grade (display space): white balance, soft contrast around mid-grey, lifted warm shadows, gentle desaturation
    vec3 c0=c;c=clamp(c*wb,0.,1.);c=.5+(c-.5)*con;c=lift+c*(1.-lift);float g=dot(c,vec3(.2126,.7152,.0722));c=mix(c0,mix(vec3(g),c,gsat),gamt);
    c=c+(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(c,1.);}`,
  {t:{value:null},exposure:{value:1},ca:{value:0},sat:{value:1.06},vig:{value:.22},con:{value:1},gsat:{value:1},gamt:{value:1},wb:{value:new THREE.Vector3(1,1,1)},lift:{value:new THREE.Vector3()}});
// colour grade of the current preset: in the output shader for high quality, as a CSS filter on the canvas for the fast renderer
function applyGrade(){const G=PRESETS[LOOK.preset].grade||{wb:[1,1,1],lift:[0,0,0],sat:1,con:1,css:''},u=OUT_MAT.uniforms;
  u.wb.value.set(...G.wb);u.lift.value.set(...G.lift);u.gsat.value=G.sat;u.con.value=G.con;LOOK.gradeCss=G.css;}
function fs(mat,target){FSQ.m.material=mat;renderer.setRenderTarget(target);renderer.render(FSQ.s,FSQ.c);}
function rt(w,h,o){return new THREE.WebGLRenderTarget(w,h,Object.assign({type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false},o||{}));}
function setupPipe(){for(const k of ['rt','ao','ao2','b1','b2','b3','b4','accA','accB','enc','gi','ssr','alb','vol','focus'])if(PIPE[k]){PIPE[k].dispose();PIPE[k]=null;}
  const pr=renderer.getPixelRatio(),w=Math.max(2,Math.floor(innerWidth*pr)),h=Math.max(2,Math.floor(innerHeight*pr));PIPE.size=[w,h];
  PIPE.rt=rt(w,h,{depthBuffer:true});PIPE.rt.depthTexture=new THREE.DepthTexture(w,h);PIPE.rt.depthTexture.type=THREE.UnsignedIntType;
  PIPE.ao=rt(w,h,{type:THREE.UnsignedByteType});const hw=Math.max(2,w>>1),hh=Math.max(2,h>>1),qw=Math.max(2,w>>2),qh=Math.max(2,h>>2);
  PIPE.ao2=rt(hw,hh,{type:THREE.UnsignedByteType});PIPE.b1=rt(hw,hh);PIPE.b2=rt(hw,hh);PIPE.b3=rt(qw,qh);PIPE.b4=rt(qw,qh);PIPE.accA=rt(w,h);PIPE.accB=rt(w,h);PIPE.half=[hw,hh];PIPE.quarter=[qw,qh];
  if(isUltra()){PIPE.enc=rt(w,h,{depthBuffer:true,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});PIPE.gi=rt(hw,hh);PIPE.ssr=rt(w,h);
    PIPE.alb=rt(w,h,{depthBuffer:true});PIPE.vol=rt(hw,hh);PIPE.focus=rt(1,1,{type:THREE.UnsignedByteType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});}PIPE.n=0;}
const halton=(i,b)=>{let f=1,r=0;while(i>0){f/=b;r+=f*(i%b);i=Math.floor(i/b);}return r;};
// the house's bounding box (levels, stair core, roof), for depth of field; worked out once
let HOUSE_BOX=null;
function houseBox(){if(!HOUSE_BOX){HOUSE_BOX=new THREE.Box3();for(const t of ['1','2','3','4','S','roof'])for(const o of TAGS[t]||[])HOUSE_BOX.expandByObject(o);}return HOUSE_BOX;}
function renderHigh(cam){const n=PIPE.n,[w,h]=PIPE.size,P=PRESETS[LOOK.preset],preview=performance.now()-(LOOK.lastMove||0)<160;
  if(preview!==LOOK.preview){LOOK.preview=preview;hqLight(preview);}
  // depth of field, built into the accumulation: each refinement frame moves the 3/4 camera within a small lens opening while aiming at a
  // point at the focus distance, so the averaged image is sharp at that distance and softens nearer and farther. The focus is always the
  // house: its nearest and farthest depths along the view set the focus (their harmonic mean, which balances the blur at both ends), and
  // the opening is capped so neither end of the house blurs by more than about a pixel. Close up, that cap fades the effect out rather
  // than soften part of the house. LOOK.dof is the largest opening per foot of focus distance.
  let dofSave=null;
  if(n>0&&LOOK.dof&&cam===camO&&ST.view==='three'&&!ST.pending){
    const f=cam.getWorldDirection(new THREE.Vector3()),B=houseBox(),v=new THREE.Vector3();let d0=1e9,d1=-1e9;
    for(let i=0;i<8;i++){v.set(i&1?B.max.x:B.min.x,i&2?B.max.y:B.min.y,i&4?B.max.z:B.min.z).sub(cam.position);const d=v.dot(f);d0=Math.min(d0,d);d1=Math.max(d1,d);}
    if(d0>2){const F=2/(1/d0+1/d1),k=h/(2*Math.tan(cam.fov*Math.PI/360)),A=Math.min(LOOK.dof*F,(isUltra()?ULTRA.dofPx:.24)/(k*(1/d0-1/F)));
      dofSave=[cam.position.clone(),cam.quaternion.clone()];const fp=cam.position.clone().addScaledVector(f,F);
      const a=halton(n,11)*6.283,r=Math.sqrt(halton(n,13))*A,R=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0),U=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,1);
      cam.position.addScaledVector(R,Math.cos(a)*r).addScaledVector(U,Math.sin(a)*r);cam.lookAt(fp);cam.updateMatrixWorld();}}
  // Ultra, walking: a real lens, focused where the centre of the view lands (measured when the camera comes to rest)
  if(!dofSave&&n>0&&isUltra()&&PIPE.enc&&cam===camW&&ST.view==='walk'&&ULTRA.focus>.5){const F=ULTRA.focus,f=cam.getWorldDirection(new THREE.Vector3());
    dofSave=[cam.position.clone(),cam.quaternion.clone()];const fp=cam.position.clone().addScaledVector(f,F);
    const a=halton(n,11)*6.283,r=Math.sqrt(halton(n,13))*ULTRA.aperture,R=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0),U=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,1);
    cam.position.addScaledVector(R,Math.cos(a)*r).addScaledVector(U,Math.sin(a)*r);cam.lookAt(fp);cam.updateMatrixWorld();}
  renderer.toneMapping=THREE.NoToneMapping;
  if(n>0){cam.setViewOffset(w,h,halton(n,2)-.5,halton(n,3)-.5,w,h);
    if(sun.intensity>.3&&LOOK.sunBase){const a=halton(n,5)*6.283,r=Math.sqrt(halton(n,7))*LIGHT_HQ.sunR,t1=new THREE.Vector3().crossVectors(LOOK.sunDir,new THREE.Vector3(0,1,0)).normalize(),t2=new THREE.Vector3().crossVectors(t1,LOOK.sunDir);
      sun.position.copy(LOOK.sunBase).addScaledVector(t1,Math.cos(a)*r).addScaledVector(t2,Math.sin(a)*r);renderer.shadowMap.needsUpdate=true;}}
  else{if(LOOK.sunBase)sun.position.copy(LOOK.sunBase);if(shadowDirty){renderer.shadowMap.needsUpdate=true;shadowDirty=false;}}
  if(SKYL.length&&SKYL[0].visible&&!preview){const c=sun.target.position,sc=sun.shadow.camera,d=new THREE.Vector3();
    for(let j=0;j<SKYL.length;j++){const L=SKYL[j],i=n*SKYL.length+j+1,y=SKY_E0+(1-SKY_E0)*halton(i,17),ph=6.2832*halton(i,19),r=Math.sqrt(1-y*y);
      d.set(r*Math.cos(ph),y,r*Math.sin(ph));L.position.copy(c).addScaledVector(d,230);L.target.position.copy(c);L.target.updateMatrixWorld();
      skyColorAt(d,L.color);L.intensity=LOOK.skyI*(PRESETS[LOOK.preset].sky??1)/SKYL.length;
      const s=L.shadow.camera;s.left=sc.left;s.right=sc.right;s.top=sc.top;s.bottom=sc.bottom;s.near=sc.near;s.far=sc.far;s.updateProjectionMatrix();}
    renderer.shadowMap.needsUpdate=true;}
  const ultra=isUltra()&&PIPE.enc,lres=ultraLights(n,!!ultra,n>0&&!preview);
  if(SKY)SKY.position.copy(cam.position);
  renderer.setRenderTarget(PIPE.rt);renderer.clear();renderer.render(scene,cam);
  for(const [l,i] of lres)l.intensity=i;if(ULTRA.probes)for(const pr of ULTRA.probes)pr.intensity=0;
  ULTRA.volOn=false;
  if(ultra){encPass(cam);overridePass(cam,PIPE.alb,albOf);
    // reflections gather from the accumulated image once there is one, so they converge with it. Bounce light gathers from this frame
    // only: gathering from the accumulation fed its own bounce back in, and in white rooms that grew every frame until the image blew out
    // (the probe light carries the further bounces indoors)
    const src=n>1?PIPE.accA.texture:PIPE.rt.texture;
    for(const M of [GI_MAT,SSR_MAT]){const u=M.uniforms;u.tC.value=M===GI_MAT?PIPE.rt.texture:src;u.tDepth.value=PIPE.rt.depthTexture;u.tEnc.value=PIPE.enc.texture;
      u.proj.value.copy(cam.projectionMatrix);u.projInv.value.copy(cam.projectionMatrixInverse);u.frame.value=n%251;}
    GI_MAT.uniforms.radius.value=ST.view==='walk'?5:ULTRA.giR;fs(GI_MAT,PIPE.gi);fs(SSR_MAT,PIPE.ssr);
    if(n===0&&!preview&&ST.view==='walk')readFocus(cam);
    const vd=ST.view==='walk'?(ULTRA.vol[LOOK.preset]||0):0;
    if(vd>0&&sun.shadow.map){const vu=VOL_MAT.uniforms;vu.tDepth.value=PIPE.rt.depthTexture;vu.tShadow.value=sun.shadow.map.texture;vu.projInv.value.copy(cam.projectionMatrixInverse);
      vu.camWorld.value.copy(cam.matrixWorld);vu.shadowM.value.copy(sun.shadow.matrix);vu.camPos.value.setFromMatrixPosition(cam.matrixWorld);vu.sunDir.value.copy(LOOK.sunDir);
      vu.sunCol.value.copy(sun.color).multiplyScalar(sun.intensity);vu.frame.value=n%253;vu.dens.value=vd;vu.maxD.value=ULTRA.volMax;vu.g.value=ULTRA.volG;vu.outK.value=ULTRA.volOut;roomMask();fs(VOL_MAT,PIPE.vol);ULTRA.volOn=true;}}
  AO_MAT.uniforms.tDepth.value=PIPE.rt.depthTexture;AO_MAT.uniforms.proj.value.copy(cam.projectionMatrix);AO_MAT.uniforms.projInv.value.copy(cam.projectionMatrixInverse);
  AO_MAT.uniforms.frame.value=n%97;AO_MAT.uniforms.radius.value=ST.view==='plan'?3.0:(ST.view==='walk'?1.8:2.6);fs(AO_MAT,PIPE.ao);
  // wide AO: the same pass with a much larger radius, at half resolution, for broad darkening under eaves, porches and trees
  AO_MAT.uniforms.frame.value=(n*7+3)%97;AO_MAT.uniforms.radius.value=ST.view==='walk'?8:14;fs(AO_MAT,PIPE.ao2);
  const [hw,hh]=PIPE.half,[qw,qh]=PIPE.quarter;BRIGHT_MAT.uniforms.t.value=PIPE.rt.texture;BRIGHT_MAT.uniforms.thr.value=P.lamps?1.7:2.2;fs(BRIGHT_MAT,PIPE.b1);
  BLUR_MAT.uniforms.t.value=PIPE.b1.texture;BLUR_MAT.uniforms.dir.value.set(1/hw,0);fs(BLUR_MAT,PIPE.b2);BLUR_MAT.uniforms.t.value=PIPE.b2.texture;BLUR_MAT.uniforms.dir.value.set(0,1/hh);fs(BLUR_MAT,PIPE.b1);
  BLUR_MAT.uniforms.t.value=PIPE.b1.texture;BLUR_MAT.uniforms.dir.value.set(2/qw,0);fs(BLUR_MAT,PIPE.b3);BLUR_MAT.uniforms.t.value=PIPE.b3.texture;BLUR_MAT.uniforms.dir.value.set(0,2/qh);fs(BLUR_MAT,PIPE.b4);
  const cu=COMP_MAT.uniforms;cu.tB.value=PIPE.rt.texture;cu.tAO.value=PIPE.ao.texture;cu.tAO2.value=PIPE.ao2.texture;cu.aoS2.value=ST.view==='plan'?0:Math.min(1,LOOK.ao2*(ultra?ULTRA.aoBoost:1));cu.tL1.value=PIPE.b1.texture;cu.tL2.value=PIPE.b4.texture;cu.tAcc.value=PIPE.accA.texture;
  cu.tAlb.value=ultra?PIPE.alb.texture:PIPE.ao.texture;cu.tVol.value=ultra?PIPE.vol.texture:PIPE.ao.texture;cu.volS.value=ULTRA.volOn?1:0;
  cu.tGI.value=ultra?PIPE.gi.texture:PIPE.ao.texture;cu.tSSR.value=ultra?PIPE.ssr.texture:PIPE.ao.texture;cu.giS.value=ultra&&ST.view!=='plan'?ULTRA.giS*(GI_U.uGI.value?ULTRA.giSprobe:1):0;cu.ssrS.value=ultra&&ST.view!=='plan'?ULTRA.ssrS:0;
  cu.px.value.set(1/w,1/h);cu.w.value=1/(n+1);cu.bl.value=P.bloom*LOOK.bloomScale;cu.aoS.value=Math.min(1,(ST.view==='three'&&!ST.cutL?.6:.78)*(ultra?ULTRA.aoBoost:1));
  fs(COMP_MAT,PIPE.accB);
  const t=PIPE.accA;PIPE.accA=PIPE.accB;PIPE.accB=t;
  OUT_MAT.uniforms.t.value=PIPE.accA.texture;OUT_MAT.uniforms.exposure.value=P.exp;OUT_MAT.uniforms.vig.value=ST.view==='plan'?0:(ultra?ULTRA.vig:.22);OUT_MAT.uniforms.ca.value=ultra&&ST.view!=='plan'?ULTRA.ca:0;OUT_MAT.uniforms.gamt.value=ST.view==='plan'?0:1;gradeCss('');fs(OUT_MAT,null);
  if(n>0)cam.clearViewOffset();if(dofSave){cam.position.copy(dofSave[0]);cam.quaternion.copy(dofSave[1]);cam.updateMatrixWorld();}if(!preview)PIPE.n++;
  if(PIPE.checked<2){PIPE.checked++;const gl=renderer.getContext(),px=new Uint8Array(4);let lit=0;
    for(const [fx,fy] of [[.5,.5],[.25,.3],[.75,.7],[.3,.8],[.7,.2]]){gl.readPixels(Math.floor(fx*gl.drawingBufferWidth),Math.floor(fy*gl.drawingBufferHeight),1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);lit+=px[0]+px[1]+px[2];}
    if(lit<6&&PIPE.checked>=2)throw new Error('high-quality output was blank');}}
// the fast renderer has no output pass, so its grade is a CSS filter on the canvas (off in plan view, like the shader grade)
function gradeCss(f){const el=renderer.domElement;if(el.style.filter!==f)el.style.filter=f;}
function renderFast(cam){const P=PRESETS[LOOK.preset];gradeCss(ST.view==='plan'?'':LOOK.gradeCss||'');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=P.exp;
  if(LOOK.sunBase)sun.position.copy(LOOK.sunBase);if(shadowDirty){renderer.shadowMap.needsUpdate=true;shadowDirty=false;}
  if(SKY)SKY.position.copy(cam.position);renderer.setRenderTarget(null);renderer.render(scene,cam);PIPE.n=PIPE.max;}
function setQuality(q,why){if(typeof giAbort==='function')giAbort();if(q!=='fast'&&!renderer.capabilities.isWebGL2){q='fast';why='High quality and Ultra need WebGL 2, which this browser does not offer, so the fast renderer is on.';}
  LOOK.quality=q;renderer.setPixelRatio(qualityPR(q));renderer.setSize(innerWidth,innerHeight);if(q!=='fast')setupPipe();
  // ultra: a 256-frame accumulation and an 8192 sun shadow map where the GPU allows it
  PIPE.max=q==='ultra'?ULTRA.frames:64;
  if(typeof sun!=='undefined'&&sun){const mx=renderer.capabilities.maxTextureSize,sz=q==='ultra'&&mx>=8192?8192:(mx>=4096?4096:2048);
    if(sun.shadow.mapSize.x!==sz){sun.shadow.mapSize.set(sz,sz);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}shadowDirty=true;}}
  if(LOOK.hemi)updateInteriorShadows();ULTRA.focus=0;
  PIPE.n=0;dirty=true;applyGrade();if(LOOK.hemi)applyLightBalance();const note=document.getElementById('qnote');if(note){note.textContent=why||'';note.style.display=why?'block':'none';}
  document.querySelectorAll('[data-q]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.q===q)));}
// ---------- Ultra: room light from a grid of light probes ----------
// Probes sit on a grid through the house (4 ft apart, 4.5 ft between layers), only where a probe is inside a room. Each one renders the
// scene around it into a small cube map (sun, sky through the windows, lamps, everything on view lit as it is), and that cube is reduced
// to first-order spherical harmonics: average light plus its main direction, i.e. the light arriving at a surface of any orientation
// there. They are stored in an atlas (4 tiles, one per coefficient; each tile the grid's x by z, with the y layers stacked) that every
// interior material reads (giPatch): a surface inside a room takes its diffuse fill from the probes around it, blended in 3D, in place of
// the flat hemisphere and environment fill. Grid points outside the rooms are filled from their neighbours (dilation), so blending near
// walls doesn't pull in darkness. A second pass captures the scene already lit by the first, for a second bounce. The build runs in
// slices between frames (a few ms each while the view refines, more once it has settled, none while the camera moves), so the view stays
// live; each preset and sun turn is kept once built.
const GI={key:'',want:'',wantT:0,job:null,atlas:{},order:[],probes:null,N:null,cube:null,cubeRT:null,tmp:null};
const GI_FRAG_PARS=ROOM_GLSL+`
uniform float uGI,giGain;uniform sampler2D tGIa;uniform vec3 giMin,giStep,giN;
vec4 giTap(float k,vec2 xz,float y){vec2 t=vec2(k*giN.x+xz.x+.5,y*giN.z+xz.y+.5);return texture2D(tGIa,t/vec2(4.*giN.x,giN.z*giN.y));}
vec3 giIrr(vec3 q,vec3 n){vec3 g=clamp((q-giMin)/giStep,vec3(0.),giN-1.);float y0=floor(g.y),fy=g.y-y0,y1=min(y0+1.,giN.y-1.);
  vec3 L0=mix(giTap(0.,g.xz,y0),giTap(0.,g.xz,y1),fy).rgb,Lx=mix(giTap(1.,g.xz,y0),giTap(1.,g.xz,y1),fy).rgb,
    Ly=mix(giTap(2.,g.xz,y0),giTap(2.,g.xz,y1),fy).rgb,Lz=mix(giTap(3.,g.xz,y0),giTap(3.,g.xz,y1),fy).rgb;
  return max(vec3(0.),.886227*L0+1.023327*(Lx*n.x+Ly*n.y+Lz*n.z));}`;
const GI_FRAG_APPLY=`
  if(uGI>0.){mat3 vT=transpose(mat3(viewMatrix));vec3 wp=vT*(-vViewPosition-viewMatrix[3].xyz),wn=normalize(vT*normal),q=wp+wn*.5;float inR=roomIn(q)*uGI;
    if(inR>0.){irradiance=mix(irradiance,giIrr(q,wn)*giGain,inR);iblIrradiance*=1.-inR;}}`;
// interior materials read the probe light (WebGL 2 only; off unless Ultra's grid is built). The patch joins any shader patch already there.
function giPatch(m,k){if(!m||!m.isMeshStandardMaterial||m.userData.gi||(k&&EXT_MATS.has(k))||!renderer.capabilities.isWebGL2)return;
  const o=m.onBeforeCompile,k0=m.customProgramCacheKey.call(m);m.userData.gi=true;
  m.onBeforeCompile=(sh,r)=>{if(o)o(sh,r);Object.assign(sh.uniforms,GI_U);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+GI_FRAG_PARS).replace('#include <lights_fragment_maps>','#include <lights_fragment_maps>\n'+GI_FRAG_APPLY);};
  m.customProgramCacheKey=()=>'gi|'+k0;}
function giPatchAll(){for(const k in MAT)giPatch(MAT[k],k);}
// cube map to spherical harmonics: coefficient k (0: average, 1-3: x, y, z) over 16 x 16 directions per face, weighted by solid angle
const SHP_MAT=SM(`uniform samplerCube cube;uniform float k;varying vec2 vUv;
vec3 fdir(int f,vec2 u){if(f==0)return vec3(1.,u.y,-u.x);if(f==1)return vec3(-1.,u.y,u.x);if(f==2)return vec3(u.x,1.,-u.y);if(f==3)return vec3(u.x,-1.,u.y);if(f==4)return vec3(u.x,u.y,1.);return vec3(-u.x,u.y,-1.);}
void main(){vec3 acc=vec3(0.);float ws=0.;
  for(int f=0;f<6;f++)for(int j=0;j<16;j++)for(int i=0;i<16;i++){vec2 u=(vec2(float(i),float(j))+.5)/8.-1.;float w=1./pow(1.+dot(u,u),1.5);vec3 d=normalize(fdir(f,u));
    vec3 L=min(textureCube(cube,d).rgb,vec3(16.));float y=k<.5?.282095:.488603*(k<1.5?d.x:(k<2.5?d.y:d.z));acc+=L*y*w;ws+=w;}
  gl_FragColor=vec4(acc*(12.566371/ws),1.);}`,{cube:{value:null},k:{value:0}});
// fill grid points outside the rooms from their filled neighbours (alpha marks a filled texel)
const DIL_MAT=SM(`uniform sampler2D t;uniform vec3 N;varying vec2 vUv;
vec4 at(float k,vec3 g){vec2 sz=vec2(4.*N.x,N.z*N.y);return texture2D(t,(vec2(k*N.x+g.x,g.y*N.z+g.z)+.5)/sz);}
void main(){vec2 sz=vec2(4.*N.x,N.z*N.y),p=floor(vUv*sz);float k=floor(p.x/N.x);vec3 g=vec3(p.x-k*N.x,floor(p.y/N.z),0.);g.z=p.y-g.y*N.z;
  vec4 c=at(k,g);if(c.a>.5){gl_FragColor=c;return;}vec4 s=vec4(0.);
  for(int q=0;q<6;q++){vec3 o=q==0?vec3(1.,0.,0.):q==1?vec3(-1.,0.,0.):q==2?vec3(0.,1.,0.):q==3?vec3(0.,-1.,0.):q==4?vec3(0.,0.,1.):vec3(0.,0.,-1.);vec3 h=g+o;
    if(h.x<0.||h.y<0.||h.z<0.||h.x>N.x-1.||h.y>N.y-1.||h.z>N.z-1.)continue;vec4 v=at(k,h);if(v.a>.5)s+=vec4(v.rgb,1.);}
  gl_FragColor=s.a>0.?vec4(s.rgb/s.a,1.):vec4(0.);}`,{t:{value:null},N:{value:new THREE.Vector3()}});
function giGrid(){if(GI.N)return;roomMask();const R=indoorRooms(),st=GI_U.giStep.value;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(const r of R){x0=Math.min(x0,r.x0);x1=Math.max(x1,r.x1);z0=Math.min(z0,r.z0);z1=Math.max(z1,r.z1);}
  const y0=E[1]+2.5,Nx=Math.ceil((x1-x0)/st.x)+1,Nz=Math.ceil((z1-z0)/st.z)+1,Ny=Math.ceil((CEIL[4]-y0)/st.y)+1;GI.probes=[];
  for(let iy=0;iy<Ny;iy++)for(let iz=0;iz<Nz;iz++)for(let ix=0;ix<Nx;ix++){const x=x0+ix*st.x,y=y0+iy*st.y,z=z0+iz*st.z;
    if(R.some(r=>x>r.x0+.3&&x<r.x1-.3&&z>r.z0+.3&&z<r.z1-.3&&y>E[r.lv]+.8&&y<CEIL[r.lv]-.4))GI.probes.push({ix,iy,iz,p:new THREE.Vector3(x,y,z)});}
  GI.N=new THREE.Vector3(Nx,Ny,Nz);GI_U.giN.value.copy(GI.N);GI_U.giMin.value.set(x0,y0,z0);}
const giGainNow=()=>ULTRA.giGain;
const giKey=()=>LOOK.preset+'|'+(LOOK.sunTurn||0)+'|'+(ST.trees?1:0)+(ST.surround?1:0);
function giAtlas(){const N=GI.N,t=rt(4*N.x,N.z*N.y);const cc=renderer.getClearColor(new THREE.Color()),ca=renderer.getClearAlpha();
  renderer.setRenderTarget(t);renderer.setClearColor(0,0);renderer.clear();renderer.setClearColor(cc,ca);return t;}
function giBegin(key){giGrid();if(!GI.cube){GI.cubeRT=new THREE.WebGLCubeRenderTarget(16,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,generateMipmaps:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    GI.cube=new THREE.CubeCamera(.3,1000,GI.cubeRT);GI.tmp=giAtlas();}
  GI.job={key,pass:0,i:0,atlas:giAtlas(),prev:null};}
function giAbort(){const J=GI.job;if(!J)return;GI.job=null;J.atlas.dispose();if(J.prev)J.prev.dispose();}
// one slice of the build: switch to the capture state (the house as walking shows it: no cuts, fades, diorama, section caps or fog; lit by
// sun, lamps, the sky through the windows and what those light, with no flat fill and outdoor surfaces at their full sky light), capture
// probes for up to ms, and put everything back exactly as it was, without restarting the view's refinement. At the end of a pass:
// dilate, then start the second pass (lit by the first) or keep the result.
function giSlice(ms){const J=GI.job,N=GI.N,t0=performance.now(),P=PRESETS[LOOK.preset],walk=ST.view==='walk'&&!ST.pending&&!ST.cutL;
  const sv={view:ST.view,pending:ST.pending,cutL:ST.cutL,clips:CLIPS.map(c=>c.constant),far:FAR_TREES.value,st:SKY_MAT.uniforms.st.value,dg:DIO.grp?DIO.grp.visible:false,
    fog:scene.fog?scene.fog.density:0,hemi:LOOK.hemi.intensity,skyl:SKYL.map(L=>L.intensity),sig:LAMP_SIG,shade:MAT.shade.emissiveIntensity,pool:LOOK.lights.map(q=>[q.position.clone(),q.color.getHex(),q.intensity,q.distance]),
    uGI:GI_U.uGI.value,tGIa:GI_U.tGIa.value,sd:shadowDirty,dirty,env:[],vis:[],tm:renderer.toneMapping};
  if(!walk){ST.view='walk';ST.pending=null;ST.cutL=null;retarget(true);for(const o of [...Object.values(CAPGRP),...TWINS]){sv.vis.push([o,o.visible]);o.visible=false;}}
  for(const c of CLIPS)c.constant=1e5;FAR_TREES.value=0;SKY_MAT.uniforms.st.value=0;if(DIO.grp)DIO.grp.visible=false;if(scene.fog)scene.fog.density=0;
  LOOK.hemi.intensity=0;for(const L of SKYL)L.intensity=0;
  // glowing fixtures (cans, shades, LED strips, flames) captured dark: their light is already in the scene as real lights, and counting
  // their glow too made the rooms blow out once the room light came on, most of all in the evening
  sv.glow=['light','shade','ledStrip','flame'].filter(k=>MAT[k]).map(k=>[MAT[k],MAT[k].emissiveIntensity]);
  for(const k in MAT){const m=MAT[k];if(!m||!m.isMeshStandardMaterial)continue;sv.env.push([m,m.envMapIntensity]);if(EXT_MATS.has(k))m.envMapIntensity=P.envE;else if(m.envMap)m.envMapIntensity=0;}
  for(const [m] of sv.glow)m.emissiveIntensity=0;GI_U.uGI.value=J.pass>0?1:0;GI_U.tGIa.value=J.prev?J.prev.texture:null;GI_U.giGain.value=1;renderer.toneMapping=THREE.NoToneMapping;
  try{while(J.i<GI.probes.length&&performance.now()-t0<ms){const pr=GI.probes[J.i++];updateLampPool(pr.p);SKY.position.copy(pr.p);GI.cube.position.copy(pr.p);GI.cube.update(renderer,scene);
      const u=SHP_MAT.uniforms;u.cube.value=GI.cubeRT.texture;
      for(let k=0;k<4;k++){u.k.value=k;const x=k*N.x+pr.ix,y=pr.iy*N.z+pr.iz;J.atlas.viewport.set(x,y,1,1);J.atlas.scissor.set(x,y,1,1);J.atlas.scissorTest=true;fs(SHP_MAT,J.atlas);}
      J.atlas.viewport.set(0,0,J.atlas.width,J.atlas.height);J.atlas.scissor.set(0,0,J.atlas.width,J.atlas.height);J.atlas.scissorTest=false;}}
  finally{renderer.toneMapping=sv.tm;GI_U.uGI.value=sv.uGI;GI_U.giGain.value=giGainNow();GI_U.tGIa.value=sv.tGIa;for(const [m,v] of sv.env)m.envMapIntensity=v;SKYL.forEach((L,i)=>L.intensity=sv.skyl[i]);LOOK.hemi.intensity=sv.hemi;
    LOOK.lights.forEach((q,i)=>{const o=sv.pool[i];q.position.copy(o[0]);q.color.setHex(o[1]);q.intensity=o[2];q.distance=o[3];});LAMP_SIG=sv.sig;for(const [m,v] of sv.glow)m.emissiveIntensity=v;MAT.shade.emissiveIntensity=sv.shade;
    if(scene.fog)scene.fog.density=sv.fog;if(DIO.grp)DIO.grp.visible=sv.dg;SKY_MAT.uniforms.st.value=sv.st;FAR_TREES.value=sv.far;CLIPS.forEach((c,i)=>c.constant=sv.clips[i]);
    if(!walk){ST.view=sv.view;ST.pending=sv.pending;ST.cutL=sv.cutL;retarget(true);for(const [o,v] of sv.vis)o.visible=v;}
    shadowDirty=sv.sd;dirty=sv.dirty;}
  if(J.i<GI.probes.length)return;
  DIL_MAT.uniforms.N.value.copy(N);for(let d=0;d<4;d++){DIL_MAT.uniforms.t.value=J.atlas.texture;fs(DIL_MAT,GI.tmp);const sw=J.atlas;J.atlas=GI.tmp;GI.tmp=sw;}
  J.pass++;
  if(J.pass<ULTRA.giPasses){if(J.prev)J.prev.dispose();J.prev=J.atlas;J.atlas=giAtlas();J.i=0;return;}
  GI.job=null;if(J.prev)J.prev.dispose();GI.atlas[J.key]=J.atlas;GI.order.push(J.key);
  while(GI.order.length>6){const o=GI.order.shift();if(GI.atlas[o]&&o!==J.key){GI.atlas[o].dispose();delete GI.atlas[o];}}}
// every frame, before drawing: switch the probe light on (this preset and sun turn built), off, or start a build
// not in the evening: the room light there would carry lamp bounce from every lamp in the house, while only the lamps nearest the view
// light it directly, so the rooms jumped brighter a few seconds after the camera stopped
function giFrame(now){const want=isUltra()&&!PRESETS[LOOK.preset].lamps&&ST.view!=='plan'&&!LOOK.studio&&renderer.capabilities.isWebGL2&&!!PIPE.enc;
  if(!want){giAbort();if(GI_U.uGI.value){GI_U.uGI.value=0;dirty=true;}return;}
  const key=giKey();if(GI.job&&GI.job.key!==key)giAbort();
  if(GI.atlas[key]){GI_U.giGain.value=giGainNow();if(GI.key!==key||!GI_U.uGI.value){GI.key=key;GI_U.tGIa.value=GI.atlas[key].texture;GI_U.uGI.value=1;dirty=true;}return;}
  if(GI_U.uGI.value){GI_U.uGI.value=0;dirty=true;}
  if(key!==GI.want){GI.want=key;GI.wantT=now;}
  if(!GI.job&&now-GI.wantT>500)giBegin(key);}
// a build goes ahead once nothing is animating and the camera has been still for 0.4 s; meanwhile the view's refinement waits (it would
// start over when the probe light comes on anyway), and each frame gives the build about 14 ms
const giBuilding=now=>!!GI.job&&!PREWARM_JOB&&!ST.pending&&!CT&&!Object.keys(FTW).length&&CLIPT.t>=CLIPT.dur&&SKYT.t>=SKYT.dur&&now-(LOOK.lastMove||0)>=400;
function giAfterFrame(now){if(!giBuilding(now))return;
  giSlice(14);
  const r=document.getElementById('refine');if(r&&GI.job){r.textContent='Lighting the rooms, '+Math.round((GI.job.pass+GI.job.i/GI.probes.length)/ULTRA.giPasses*100)+'%';r.style.display='block';}}
