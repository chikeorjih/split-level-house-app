// 09-look-pipeline.js: sky, light presets, high-quality render pipeline (AO, bloom, accumulation, drawing style)
"use strict";
// ================= LOOK: sky, light presets, high-quality pipeline =================
const H2=(a,b)=>{const v=new THREE.Vector3(a[0]+b[0],0,a[1]+b[1]);return v.normalize();};
const DIRS={E:[.707,.707],S:[-.707,.707],W:[-.707,-.707],N:[.707,-.707]};
const PRESETS={
  morning:{label:'Morning',h:H2([DIRS.E[0],DIRS.E[1]],[DIRS.S[0]*.35,DIRS.S[1]*.35]),elev:21,sun:0xffd8ae,si:1.65,zen:0x3f6fb8,hor:0xd9cbbb,gnd:0x3a3a30,exp:1.0,envE:.95,envI:.85,lamps:false,bloom:.10,hemi:.12},
  midday:{label:'Midday',h:H2(DIRS.S,[0,0]),elev:63,sun:0xfff4e6,si:1.95,zen:0x3468bf,hor:0xc5d6e8,gnd:0x3d3c33,exp:.93,envE:1.0,envI:.95,lamps:false,bloom:.08,hemi:.12},
  afternoon:{label:'Afternoon',h:H2(DIRS.S,[DIRS.W[0]*.9,DIRS.W[1]*.9]),elev:38,sun:0xffeedb,si:1.85,zen:0x3a6dbc,hor:0xcfd8e2,gnd:0x3d3b32,exp:.97,envE:1.0,envI:.9,lamps:false,bloom:.10,hemi:.12},
  golden:{label:'Golden hour',h:H2(DIRS.W,[DIRS.N[0]*.25,DIRS.N[1]*.25]),elev:7,sun:0xffa45c,si:1.55,zen:0x4d6aa6,hor:0xf0b080,gnd:0x3a3026,exp:1.08,envE:.85,envI:.7,lamps:false,bloom:.22,hemi:.08},
  dusk:{label:'Dusk, lights on',h:H2(DIRS.W,[DIRS.N[0]*.3,DIRS.N[1]*.3]),elev:5,sun:0x8c84b8,si:.22,zen:0x0d1934,hor:0x7a5f73,gnd:0x141416,exp:1.55,envE:.45,envI:.22,lamps:true,bloom:.55,hemi:.05}
};
const LOOK={preset:'afternoon',quality:'high',sunDir:new THREE.Vector3(),lights:[],hemi:null,amb:null};
const EXT_MATS=new Set(['brick','siding','sidingNew','roof','slateRoof','metalRoof','grass','deckOld','deckNew','deckRailOld','paver','drive','asphalt','concrete','stone','frameDark','dormerClad',
  'garageDark','garageDark2','doorWood','bark','chain','flagstone','mulch','roofBrown','soldier','underside','glass','leafCards','shrubCards','grassBlades']);
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
// ---------- applying a preset ----------
function applyPreset(name){const P=PRESETS[name]||PRESETS.afternoon;LOOK.preset=name;
  const e=P.elev*Math.PI/180;LOOK.sunDir.set(P.h.x*Math.cos(e),Math.sin(e),P.h.z*Math.cos(e)).normalize();
  const u=SKY_MAT.uniforms;u.sunDir.value.copy(LOOK.sunDir);u.zen.value.setHex(P.zen);u.hor.value.setHex(P.hor);u.gnd.value.setHex(P.gnd);u.sunCol.value.setHex(P.sun);u.sunI.value=P.lamps?.15:1;
  sun.color.setHex(P.sun);sun.intensity=P.si;LOOK.hemi.intensity=P.hemi;LOOK.hemi.color.setHex(P.zen).lerp(new THREE.Color(1,1,1),.6);LOOK.amb.intensity=P.lamps?.03:.05;
  makeEnvs(P);
  for(const k in MAT){const m=MAT[k];if(!m||!m.isMeshStandardMaterial)continue;const ext=EXT_MATS.has(k);const had=!!m.envMap;m.envMap=ext?null:ROOM_ENV;m.envMapIntensity=ext?P.envE:P.envI;if(had!==!!m.envMap)m.needsUpdate=true;}
  MAT.shade.emissiveIntensity=P.lamps?2.4:.35;MAT.light.emissiveIntensity=P.lamps?3.2:1.2;MAT.flame.emissiveIntensity=P.lamps?5:1.5;
  for(const l of LOOK.lights)l.visible=P.lamps;
  if(scene.fog)scene.fog.color.setHex(P.hor);
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
const COMP_MAT=SM(`uniform sampler2D tB,tAO,tL1,tL2,tAcc,tDepth;uniform mat4 projInv;uniform vec2 px;uniform float w,aoS,bl,toon,ortho;varying vec2 vUv;
  float vv(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=projInv*vec4(uv*2.-1.,d*2.-1.,1.);float z=-p.z/p.w;if(ortho>.5)return z;return d>=.99999?0.:1./max(z,.01);}
  void main(){vec3 c=texture2D(tB,vUv).rgb;float a=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)a+=texture2D(tAO,vUv+vec2(float(x),float(y))*px*1.5).r;a/=9.;
    c*=mix(1.,a,aoS);c+=(texture2D(tL1,vUv).rgb+texture2D(tL2,vUv).rgb*.8)*bl;
    if(toon>.001){vec2 o=px*1.15;float C=vv(vUv),L=vv(vUv-vec2(o.x,0.)),R=vv(vUv+vec2(o.x,0.)),D=vv(vUv-vec2(0.,o.y)),U=vv(vUv+vec2(0.,o.y));
      float s=ortho>.5?40.:max(abs(C),1e-4);
      float sil=max(max(abs(L-C),abs(R-C)),max(abs(U-C),abs(D-C)))/s,cre=(abs(L+R-2.*C)+abs(U+D-2.*C))/s;
      float edge=clamp(smoothstep(.035,.09,sil)+smoothstep(.012,.04,cre),0.,1.);
      float l=clamp(dot(c,vec3(.2126,.7152,.0722)),0.,1.4);vec3 wash=mix(vec3(l),c,.5);float lq=(floor(l*3.)+.65)/3.;
      vec3 drawn=mix(wash*(lq/max(l,1e-3)),vec3(.86,.85,.82),.42);drawn=mix(drawn,vec3(.05,.05,.06),edge*.9);c=mix(c,drawn,toon);}
    vec3 acc=texture2D(tAcc,vUv).rgb;gl_FragColor=vec4(mix(acc,c,w),1.);}`,
  {tB:{value:null},tAO:{value:null},tL1:{value:null},tL2:{value:null},tAcc:{value:null},tDepth:{value:null},projInv:{value:new THREE.Matrix4()},px:{value:new THREE.Vector2()},w:{value:1},aoS:{value:.75},bl:{value:.1},toon:{value:0},ortho:{value:0}});
const OUT_MAT=SM(`uniform sampler2D t;uniform float exposure,sat,vig;varying vec2 vUv;
  vec3 fit(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
  vec3 aces(vec3 c){const mat3 I=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));const mat3 O=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));return clamp(O*fit(I*c),0.,1.);}
  vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
  void main(){vec3 c=aces(texture2D(t,vUv).rgb*exposure/.6);float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);vec2 q=vUv-.5;c*=1.-vig*dot(q,q)*1.6;
    c=srgb(clamp(c,0.,1.))+(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(c,1.);}`,
  {t:{value:null},exposure:{value:1},sat:{value:1.06},vig:{value:.22}});
function fs(mat,target){FSQ.m.material=mat;renderer.setRenderTarget(target);renderer.render(FSQ.s,FSQ.c);}
function rt(w,h,o){return new THREE.WebGLRenderTarget(w,h,Object.assign({type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false},o||{}));}
function setupPipe(){for(const k of ['rt','ao','b1','b2','b3','b4','accA','accB'])if(PIPE[k])PIPE[k].dispose();
  const pr=renderer.getPixelRatio(),w=Math.max(2,Math.floor(innerWidth*pr)),h=Math.max(2,Math.floor(innerHeight*pr));PIPE.size=[w,h];
  PIPE.rt=rt(w,h,{depthBuffer:true});PIPE.rt.depthTexture=new THREE.DepthTexture(w,h);PIPE.rt.depthTexture.type=THREE.UnsignedIntType;
  PIPE.ao=rt(w,h,{type:THREE.UnsignedByteType});const hw=Math.max(2,w>>1),hh=Math.max(2,h>>1),qw=Math.max(2,w>>2),qh=Math.max(2,h>>2);
  PIPE.b1=rt(hw,hh);PIPE.b2=rt(hw,hh);PIPE.b3=rt(qw,qh);PIPE.b4=rt(qw,qh);PIPE.accA=rt(w,h);PIPE.accB=rt(w,h);PIPE.half=[hw,hh];PIPE.quarter=[qw,qh];PIPE.n=0;}
const halton=(i,b)=>{let f=1,r=0;while(i>0){f/=b;r+=f*(i%b);i=Math.floor(i/b);}return r;};
function renderHigh(cam){const n=PIPE.n,[w,h]=PIPE.size,P=PRESETS[LOOK.preset];renderer.toneMapping=THREE.NoToneMapping;
  if(n>0){cam.setViewOffset(w,h,halton(n,2)-.5,halton(n,3)-.5,w,h);
    if(sun.intensity>.3&&LOOK.sunBase){const a=halton(n,5)*6.283,r=Math.sqrt(halton(n,7))*5.5,t1=new THREE.Vector3().crossVectors(LOOK.sunDir,new THREE.Vector3(0,1,0)).normalize(),t2=new THREE.Vector3().crossVectors(t1,LOOK.sunDir);
      sun.position.copy(LOOK.sunBase).addScaledVector(t1,Math.cos(a)*r).addScaledVector(t2,Math.sin(a)*r);renderer.shadowMap.needsUpdate=true;}}
  else{if(LOOK.sunBase)sun.position.copy(LOOK.sunBase);if(shadowDirty){renderer.shadowMap.needsUpdate=true;shadowDirty=false;}}
  if(SKY)SKY.position.copy(cam.position);
  renderer.setRenderTarget(PIPE.rt);renderer.clear();renderer.render(scene,cam);
  AO_MAT.uniforms.tDepth.value=PIPE.rt.depthTexture;AO_MAT.uniforms.proj.value.copy(cam.projectionMatrix);AO_MAT.uniforms.projInv.value.copy(cam.projectionMatrixInverse);
  AO_MAT.uniforms.frame.value=n%97;AO_MAT.uniforms.radius.value=ST.view==='plan'?3.0:(ST.view==='walk'?1.8:2.6);fs(AO_MAT,PIPE.ao);
  const [hw,hh]=PIPE.half,[qw,qh]=PIPE.quarter;BRIGHT_MAT.uniforms.t.value=PIPE.rt.texture;BRIGHT_MAT.uniforms.thr.value=P.lamps?1.1:2.2;fs(BRIGHT_MAT,PIPE.b1);
  BLUR_MAT.uniforms.t.value=PIPE.b1.texture;BLUR_MAT.uniforms.dir.value.set(1/hw,0);fs(BLUR_MAT,PIPE.b2);BLUR_MAT.uniforms.t.value=PIPE.b2.texture;BLUR_MAT.uniforms.dir.value.set(0,1/hh);fs(BLUR_MAT,PIPE.b1);
  BLUR_MAT.uniforms.t.value=PIPE.b1.texture;BLUR_MAT.uniforms.dir.value.set(2/qw,0);fs(BLUR_MAT,PIPE.b3);BLUR_MAT.uniforms.t.value=PIPE.b3.texture;BLUR_MAT.uniforms.dir.value.set(0,2/qh);fs(BLUR_MAT,PIPE.b4);
  const cu=COMP_MAT.uniforms;cu.tB.value=PIPE.rt.texture;cu.tAO.value=PIPE.ao.texture;cu.tL1.value=PIPE.b1.texture;cu.tL2.value=PIPE.b4.texture;cu.tAcc.value=PIPE.accA.texture;
  cu.px.value.set(1/w,1/h);cu.w.value=1/(n+1);cu.bl.value=P.bloom;cu.aoS.value=ST.view==='three'&&!ST.cutL?.6:.78;
  {const zh=ST.view==='three'?ORB.d*Math.tan(ORB.fov*Math.PI/360):(ST.view==='plan'?PLN.span/2:0),tt=Math.min(1,Math.max(0,(zh-62)/56));
   cu.toon.value=tt*tt*(3-2*tt);cu.tDepth.value=PIPE.rt.depthTexture;cu.projInv.value.copy(cam.projectionMatrixInverse);cu.ortho.value=cam.isOrthographicCamera?1:0;}
  fs(COMP_MAT,PIPE.accB);
  const t=PIPE.accA;PIPE.accA=PIPE.accB;PIPE.accB=t;
  OUT_MAT.uniforms.t.value=PIPE.accA.texture;OUT_MAT.uniforms.exposure.value=P.exp;OUT_MAT.uniforms.vig.value=ST.view==='plan'?0:.22;fs(OUT_MAT,null);
  if(n>0)cam.clearViewOffset();PIPE.n++;
  if(PIPE.checked<2){PIPE.checked++;const gl=renderer.getContext(),px=new Uint8Array(4);let lit=0;
    for(const [fx,fy] of [[.5,.5],[.25,.3],[.75,.7],[.3,.8],[.7,.2]]){gl.readPixels(Math.floor(fx*gl.drawingBufferWidth),Math.floor(fy*gl.drawingBufferHeight),1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);lit+=px[0]+px[1]+px[2];}
    if(lit<6&&PIPE.checked>=2)throw new Error('high-quality output was blank');}}
function renderFast(cam){const P=PRESETS[LOOK.preset];renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=P.exp;
  if(LOOK.sunBase)sun.position.copy(LOOK.sunBase);if(shadowDirty){renderer.shadowMap.needsUpdate=true;shadowDirty=false;}
  if(SKY)SKY.position.copy(cam.position);renderer.setRenderTarget(null);renderer.render(scene,cam);PIPE.n=PIPE.max;}
function setQuality(q,why){if(q==='high'&&!renderer.capabilities.isWebGL2){q='fast';why='High quality needs WebGL 2, which this browser does not offer, so the fast renderer is on.';}
  LOOK.quality=q;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,q==='high'?1.5:2));renderer.setSize(innerWidth,innerHeight);if(q==='high')setupPipe();
  PIPE.n=0;dirty=true;const note=document.getElementById('qnote');if(note){note.textContent=why||'';note.style.display=why?'block':'none';}
  document.querySelectorAll('[data-q]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.q===q)));}
