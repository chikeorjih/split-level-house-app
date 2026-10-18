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
  afternoon:{label:'Afternoon',h:H2(DIRS.S,[DIRS.W[0]*.9,DIRS.W[1]*.9]),elev:33,sun:0xffdbae,si:2.05,zen:0x5c8ccf,hor:0xe6dac8,gnd:0x4a4636,exp:1.0,envE:.95,envI:.9,lamps:false,bloom:.12,hemi:.13,sky:.95,
    grade:{wb:[1.045,1,.92],lift:[.012,.01,.004],sat:1.04,con:1.09,css:'sepia(.1) saturate(1.04) contrast(1.09)'}},
  golden:{label:'Golden hour',h:H2(DIRS.W,[DIRS.N[0]*.25,DIRS.N[1]*.25]),elev:8,sun:0xff9445,si:2.0,zen:0x4a67a8,hor:0xf2a66c,gnd:0x3a3026,exp:1.28,envE:.85,envI:.75,lamps:false,bloom:.26,hemi:.08,sky:.9,
    grade:{wb:[1.08,.98,.84],lift:[.02,.008,0],sat:1.15,con:1.15,css:'sepia(.18) saturate(1.18) contrast(1.15)'}},
  dusk:{label:'Dusk, lights on',h:H2(DIRS.W,[DIRS.N[0]*.3,DIRS.N[1]*.3]),elev:5,sun:0x9a7f9e,si:.18,zen:0x14203a,hor:0x8a6556,gnd:0x161412,exp:1.2,envE:.4,envI:.2,lamps:true,bloom:.2,hemi:.05,sky:.3,
    // cozy dusk: warm amber lamps, soft glow, deep blue-violet sky outside; warm grade with warm-lifted shadows
    grade:{wb:[1.07,1,.86],lift:[.022,.012,.004],sat:1.04,con:1.06,css:'sepia(.2) saturate(1.05) contrast(1.06) brightness(.94)'}}
};
// bloomScale: overall strength of the glow round bright lights (1 = each preset's own bloom)
const LOOK={bloomScale:.5,dof:10,skyI:1.4,ao2:.5,preset:'afternoon',quality:'high',sunDir:new THREE.Vector3(),lights:[],hemi:null,amb:null};
const EXT_MATS=new Set(['brick','siding','sidingNew','roof','slateRoof','metalRoof','grass','deckOld','deckNew','deckRailOld','paver','drive','asphalt','concrete','stone','frameDark','dormerClad',
  'garageDoor','garageDoorPanel','doorWood','bark','chain','flagstone','mulch','roofBrown','soldier','underside','glass','leafCards','shrubCards','grassBlades','treeline','edgeStone']);
// aerial perspective: exponential fog, a touch bluer than the horizon; thinned as the 3/4 camera pulls back so the house doesn't wash out
const FOG_D=.0014;
const fogColor=P=>new THREE.Color(P.hor).lerp(new THREE.Color(P.zen),.12);
function makeFog(){return new THREE.FogExp2(fogColor(PRESETS[LOOK.preset]).getHex(),FOG_D);}
function updateFog(){if(scene.fog&&scene.fog.isFogExp2)scene.fog.density=(ST.pending||ST.view)==='plan'?0:FOG_D*(ST.view==='three'?Math.min(1,170/ORB.d):1);}
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
  for(const l of out.slice(0,COARSE?10:22)){const warm=l.k==='outdoor'?0xffa75c:0xffb36b;const p=new THREE.PointLight(warm,l.k==='fill'?.55:(l.k==='outdoor'?.9:1.1),l.k==='fill'?22:16,1.6);
    p.position.copy(l.v);p.visible=false;scene.add(p);LOOK.lights.push(p);if(l.inst)l.inst.lights.push({light:p,v0:l.v.clone()});}}
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
function applyLightBalance(){const P=PRESETS[LOOK.preset],hq=isHQ();
  for(const L of SKYL)L.visible=hq;LOOK.hemi.intensity=P.hemi*(hq?LIGHT_HQ.hemi:1);sun.intensity=P.si*(hq?LIGHT_HQ.sun:1);
  for(const k in MAT){const m=MAT[k];if(m&&m.isMeshStandardMaterial&&EXT_MATS.has(k))m.envMapIntensity=P.envE*(hq?LIGHT_HQ.env:1);}
  shadowDirty=true;dirty=true;if(LOOK.studio&&typeof planStudio==='function')planStudio();}
// ---------- applying a preset ----------
function applyPreset(name){const P=PRESETS[name]||PRESETS.afternoon;LOOK.preset=name;
  const e=P.elev*Math.PI/180;LOOK.sunDir.set(P.h.x*Math.cos(e),Math.sin(e),P.h.z*Math.cos(e)).normalize();
  const u=SKY_MAT.uniforms;u.sunDir.value.copy(LOOK.sunDir);u.zen.value.setHex(P.zen);u.hor.value.setHex(P.hor);u.gnd.value.setHex(P.gnd);u.sunCol.value.setHex(P.sun);u.sunI.value=P.lamps?.15:1;
  sun.color.setHex(P.sun);sun.intensity=P.si;LOOK.hemi.intensity=P.hemi;LOOK.hemi.color.setHex(P.zen).lerp(new THREE.Color(1,1,1),.6);LOOK.amb.intensity=P.lamps?.03:.05;
  makeEnvs(P);
  for(const k in MAT){const m=MAT[k];if(!m||!m.isMeshStandardMaterial)continue;const ext=EXT_MATS.has(k);const had=!!m.envMap;m.envMap=ext?null:ROOM_ENV;m.envMapIntensity=ext?P.envE:P.envI;if(had!==!!m.envMap)m.needsUpdate=true;}
  applyGrade();applyLightBalance();MAT.shade.emissiveIntensity=P.lamps?1.4:.35;MAT.light.emissiveIntensity=P.lamps?1.8:1.2;MAT.flame.emissiveIntensity=P.lamps?3.5:1.5;
  for(const l of LOOK.lights)l.visible=P.lamps;
  for(const {l,k} of LOOK.kitchen||[]){l.intensity=(k==='can'?.85:.7)*(P.lamps?1.05:1);l.color.setHex(P.lamps?0xffcf96:(k==='can'?0xfff0d8:0xfff3e2));}
  if(scene.fog)scene.fog.color.copy(fogColor(P));
  refreshFades();
  fitShadow(true);dirty=true;shadowDirty=true;if(typeof PIPE!=='undefined')PIPE.n=0;if(LOOK.studio)planStudio();}
let SHC={x:1e9,z:1e9,half:0};
function fitShadow(force){const walk=ST.view==='walk',half=walk?50:108,cx=walk?WLK.x:16,cz=walk?WLK.z:12;
  if(!force&&SHC.half===half&&Math.hypot(SHC.x-cx,SHC.z-cz)<12)return;SHC={x:cx,z:cz,half};
  sun.target.position.set(cx,-6,cz);sun.position.copy(sun.target.position).addScaledVector(LOOK.sunDir,230);
  const c=sun.shadow.camera;c.left=-half;c.right=half;c.top=half;c.bottom=-half;c.near=30;c.far=470;c.updateProjectionMatrix();sun.target.updateMatrixWorld();
  LOOK.sunBase=sun.position.clone();shadowDirty=true;dirty=true;}
// ---------- high-quality pipeline ----------
const PIPE={ok:true,n:0,max:64,size:[2,2],checked:0};
// Ultra: everything high quality does, plus a normal/gloss pass, one-bounce screen-space global illumination, screen-space reflections,
// soft shadows from the interior lights nearest the view, a larger sun shadow map, supersampling and a longer accumulation.
// Interior shadow casters are capped (2 spots + 2 point lights): every shadow is a texture in every lit shader, and browsers on Windows
// allow 16 textures per shader.
const ULTRA={frames:192,pixels:5.5e6,giS:.7,giR:7,ssrS:1,reflBoost:1.4,aoBoost:1.18,shadowers:[],spots:1,points:1};
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
    gl_FragColor=vec4(acc*(2./10.),1.);}`,ULTRA_UN());
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
void main(){
#include <beginnormal_vertex>
#include <defaultnormal_vertex>
#include <begin_vertex>
#include <project_vertex>
#include <clipping_planes_vertex>
  vN=normalize(transformedNormal);}`;
const ENC_FS=`uniform float refl,rough;varying vec3 vN;
#include <clipping_planes_pars_fragment>
void main(){
#include <clipping_planes_fragment>
  vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;gl_FragColor=vec4(n.xy*.5+.5,rough,refl);}`;
const ENC=new Map();
function encOf(m){let e=ENC.get(m);if(e)return e;const r=m.roughness===undefined?1:m.roughness,mt=m.metalness||0;
  e=new THREE.ShaderMaterial({vertexShader:ENC_VS,fragmentShader:ENC_FS,clipping:true,clippingPlanes:CLIPS,side:m.side,
    uniforms:{rough:{value:r},refl:{value:Math.pow(1-r,2)*(.12+.88*mt)}}});ENC.set(m,e);return e;}
function encPass(cam){const swap=[];
  scene.traverse(o=>{if(!o.visible)return;if(o.isMesh){const m=o.material;
      if(Array.isArray(m)||m.transparent||m.alphaTest>0||m.isShaderMaterial||o.userData.horizon){o.visible=false;swap.push([o,null]);}else{swap.push([o,m]);o.material=encOf(m);}}
    else if(o.isLine||o.isPoints){o.visible=false;swap.push([o,null]);}});
  const cc=renderer.getClearColor(new THREE.Color()),ca=renderer.getClearAlpha(),fog=scene.fog;scene.fog=null;renderer.setClearColor(0,0);
  renderer.setRenderTarget(PIPE.enc);renderer.clear();renderer.render(scene,cam);renderer.setClearColor(cc,ca);scene.fog=fog;
  for(const [o,m] of swap){if(m)o.material=m;else o.visible=true;}}
// interior lights with soft shadows: the visible spots and point lights nearest the view, each moved a little every frame
function updateInteriorShadows(){const all=[...(LOOK.kitchen||[]).map(k=>k.l),...LOOK.lights];
  for(const l of all){l.castShadow=false;}ULTRA.shadowers=[];if(!isUltra())return;
  const f=ST.view==='walk'?new THREE.Vector3(WLK.x,WLK.f+5,WLK.z):ORB.t,vis=all.filter(l=>l.visible&&l.intensity>0),by=(a,b)=>a.position.distanceTo(f)-b.position.distanceTo(f);
  const pick=[...vis.filter(l=>l.isSpotLight).sort(by).slice(0,ULTRA.spots),...vis.filter(l=>l.isPointLight).sort(by).slice(0,ULTRA.points)];
  for(const l of pick){l.castShadow=true;const sh=l.shadow;if(l.isSpotLight){sh.mapSize.set(1024,1024);sh.bias=-.0006;sh.normalBias=.03;}
    else{sh.mapSize.set(512,512);sh.bias=-.003;sh.normalBias=.04;sh.camera.near=.2;}l.userData.p0=l.position.clone();ULTRA.shadowers.push(l);}
  shadowDirty=true;}
const BRIGHT_MAT=SM('uniform sampler2D t;uniform float thr;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(max(c.r,c.g),c.b);gl_FragColor=vec4(c*smoothstep(thr,thr*1.8,l),1.);}',{t:{value:null},thr:{value:1.6}});
const BLUR_MAT=SM('uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227;c+=(texture2D(t,vUv+dir*1.385).rgb+texture2D(t,vUv-dir*1.385).rgb)*.316;c+=(texture2D(t,vUv+dir*3.231).rgb+texture2D(t,vUv-dir*3.231).rgb)*.07;gl_FragColor=vec4(c,1.);}',{t:{value:null},dir:{value:new THREE.Vector2()}});
const COMP_MAT=SM(`uniform sampler2D tB,tAO,tAO2,tL1,tL2,tAcc,tGI,tSSR;uniform vec2 px;uniform float w,aoS,aoS2,bl,giS,ssrS;varying vec2 vUv;
  void main(){vec3 c=texture2D(tB,vUv).rgb;
    if(giS>0.){float mx=max(max(c.r,c.g),c.b);vec3 alb=clamp(c/(mx+.03),0.,1.)*.72*clamp(mx*4.,.12,1.);c+=texture2D(tGI,vUv).rgb*alb*giS;}
    if(ssrS>0.){vec4 r=texture2D(tSSR,vUv);c=mix(c,r.rgb,r.a*ssrS);}float a=0.,a2=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 o=vec2(float(x),float(y));a+=texture2D(tAO,vUv+o*px*1.5).r;a2+=texture2D(tAO2,vUv+o*px*4.).r;}a/=9.;a2/=9.;
    c*=mix(1.,a,aoS)*mix(1.,a2,aoS2);c+=(texture2D(tL1,vUv).rgb+texture2D(tL2,vUv).rgb*.8)*bl;
    vec3 acc=texture2D(tAcc,vUv).rgb;gl_FragColor=vec4(mix(acc,c,w),1.);}`,
  {tB:{value:null},tAO:{value:null},tAO2:{value:null},aoS2:{value:0},tGI:{value:null},tSSR:{value:null},giS:{value:0},ssrS:{value:0},tL1:{value:null},tL2:{value:null},tAcc:{value:null},px:{value:new THREE.Vector2()},w:{value:1},aoS:{value:.75},bl:{value:.1}});
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
function setupPipe(){for(const k of ['rt','ao','ao2','b1','b2','b3','b4','accA','accB','enc','gi','ssr'])if(PIPE[k]){PIPE[k].dispose();PIPE[k]=null;}
  const pr=renderer.getPixelRatio(),w=Math.max(2,Math.floor(innerWidth*pr)),h=Math.max(2,Math.floor(innerHeight*pr));PIPE.size=[w,h];
  PIPE.rt=rt(w,h,{depthBuffer:true});PIPE.rt.depthTexture=new THREE.DepthTexture(w,h);PIPE.rt.depthTexture.type=THREE.UnsignedIntType;
  PIPE.ao=rt(w,h,{type:THREE.UnsignedByteType});const hw=Math.max(2,w>>1),hh=Math.max(2,h>>1),qw=Math.max(2,w>>2),qh=Math.max(2,h>>2);
  PIPE.ao2=rt(hw,hh,{type:THREE.UnsignedByteType});PIPE.b1=rt(hw,hh);PIPE.b2=rt(hw,hh);PIPE.b3=rt(qw,qh);PIPE.b4=rt(qw,qh);PIPE.accA=rt(w,h);PIPE.accB=rt(w,h);PIPE.half=[hw,hh];PIPE.quarter=[qw,qh];
  if(isUltra()){PIPE.enc=rt(w,h,{depthBuffer:true,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});PIPE.gi=rt(hw,hh);PIPE.ssr=rt(w,h);}PIPE.n=0;}
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
      skyColorAt(d,L.color);L.intensity=LOOK.skyI*(PRESETS[LOOK.preset].sky??1)/SKYL.length;
      const s=L.shadow.camera;s.left=sc.left;s.right=sc.right;s.top=sc.top;s.bottom=sc.bottom;s.near=sc.near;s.far=sc.far;s.updateProjectionMatrix();}
    renderer.shadowMap.needsUpdate=true;}
  const ultra=isUltra()&&PIPE.enc;
  if(ultra){
    ULTRA.shadowers.forEach((l,j)=>{const i=n*4+j+1,a=halton(i,23)*6.283,r=n>0?Math.sqrt(halton(i,29))*.22:0;l.position.copy(l.userData.p0).add(new THREE.Vector3(Math.cos(a)*r,(halton(i,31)-.5)*.1,Math.sin(a)*r));});
    if(ULTRA.shadowers.length)renderer.shadowMap.needsUpdate=true;}
  if(SKY)SKY.position.copy(cam.position);
  renderer.setRenderTarget(PIPE.rt);renderer.clear();renderer.render(scene,cam);
  if(ultra){encPass(cam);
    for(const M of [GI_MAT,SSR_MAT]){const u=M.uniforms;u.tC.value=PIPE.rt.texture;u.tDepth.value=PIPE.rt.depthTexture;u.tEnc.value=PIPE.enc.texture;
      u.proj.value.copy(cam.projectionMatrix);u.projInv.value.copy(cam.projectionMatrixInverse);u.frame.value=n%251;}
    GI_MAT.uniforms.radius.value=ST.view==='walk'?5:ULTRA.giR;fs(GI_MAT,PIPE.gi);fs(SSR_MAT,PIPE.ssr);
    for(const l of ULTRA.shadowers)l.position.copy(l.userData.p0);}
  AO_MAT.uniforms.tDepth.value=PIPE.rt.depthTexture;AO_MAT.uniforms.proj.value.copy(cam.projectionMatrix);AO_MAT.uniforms.projInv.value.copy(cam.projectionMatrixInverse);
  AO_MAT.uniforms.frame.value=n%97;AO_MAT.uniforms.radius.value=ST.view==='plan'?3.0:(ST.view==='walk'?1.8:2.6);fs(AO_MAT,PIPE.ao);
  // wide AO: the same pass with a much larger radius, at half resolution, for broad darkening under eaves, porches and trees
  AO_MAT.uniforms.frame.value=(n*7+3)%97;AO_MAT.uniforms.radius.value=ST.view==='walk'?8:14;fs(AO_MAT,PIPE.ao2);
  const [hw,hh]=PIPE.half,[qw,qh]=PIPE.quarter;BRIGHT_MAT.uniforms.t.value=PIPE.rt.texture;BRIGHT_MAT.uniforms.thr.value=P.lamps?1.7:2.2;fs(BRIGHT_MAT,PIPE.b1);
  BLUR_MAT.uniforms.t.value=PIPE.b1.texture;BLUR_MAT.uniforms.dir.value.set(1/hw,0);fs(BLUR_MAT,PIPE.b2);BLUR_MAT.uniforms.t.value=PIPE.b2.texture;BLUR_MAT.uniforms.dir.value.set(0,1/hh);fs(BLUR_MAT,PIPE.b1);
  BLUR_MAT.uniforms.t.value=PIPE.b1.texture;BLUR_MAT.uniforms.dir.value.set(2/qw,0);fs(BLUR_MAT,PIPE.b3);BLUR_MAT.uniforms.t.value=PIPE.b3.texture;BLUR_MAT.uniforms.dir.value.set(0,2/qh);fs(BLUR_MAT,PIPE.b4);
  const cu=COMP_MAT.uniforms;cu.tB.value=PIPE.rt.texture;cu.tAO.value=PIPE.ao.texture;cu.tAO2.value=PIPE.ao2.texture;cu.aoS2.value=ST.view==='plan'?0:Math.min(1,LOOK.ao2*(ultra?ULTRA.aoBoost:1));cu.tL1.value=PIPE.b1.texture;cu.tL2.value=PIPE.b4.texture;cu.tAcc.value=PIPE.accA.texture;
  cu.tGI.value=ultra?PIPE.gi.texture:PIPE.ao.texture;cu.tSSR.value=ultra?PIPE.ssr.texture:PIPE.ao.texture;cu.giS.value=ultra&&ST.view!=='plan'?ULTRA.giS:0;cu.ssrS.value=ultra&&ST.view!=='plan'?ULTRA.ssrS:0;
  cu.px.value.set(1/w,1/h);cu.w.value=1/(n+1);cu.bl.value=P.bloom*LOOK.bloomScale;cu.aoS.value=Math.min(1,(ST.view==='three'&&!ST.cutL?.6:.78)*(ultra?ULTRA.aoBoost:1));
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
function setQuality(q,why){if(q!=='fast'&&!renderer.capabilities.isWebGL2){q='fast';why='High quality and Ultra need WebGL 2, which this browser does not offer, so the fast renderer is on.';}
  LOOK.quality=q;renderer.setPixelRatio(qualityPR(q));renderer.setSize(innerWidth,innerHeight);if(q!=='fast')setupPipe();
  // ultra: a 256-frame accumulation and an 8192 sun shadow map where the GPU allows it
  PIPE.max=q==='ultra'?ULTRA.frames:64;
  if(typeof sun!=='undefined'&&sun){const mx=renderer.capabilities.maxTextureSize,sz=q==='ultra'&&mx>=8192?8192:(mx>=4096?4096:2048);
    if(sun.shadow.mapSize.x!==sz){sun.shadow.mapSize.set(sz,sz);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}shadowDirty=true;}}
  if(LOOK.hemi)updateInteriorShadows();
  PIPE.n=0;dirty=true;applyGrade();if(LOOK.hemi)applyLightBalance();const note=document.getElementById('qnote');if(note){note.textContent=why||'';note.style.display=why?'block':'none';}
  document.querySelectorAll('[data-q]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.q===q)));}
