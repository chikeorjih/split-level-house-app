// 08b-gpu-passes.js: the high-quality pipeline's full-screen passes in node form, for the WebGPU renderer
"use strict";
// ================= GPU PASSES =================
// 09-look-pipeline.js builds each pass as `SM(glsl, uniforms)` and drives it through material.uniforms.<name>.value. Under WebGPU, SMG()
// returns a node material with the same uniform names (TSL uniform and texture nodes, which also have .value), so the pipeline code that
// sets them and draws them (fs()) is the same for both renderers. Differences handled here:
//  - depth: WebGPU's normalised device depth runs 0..1 (WebGL's runs -1..1), so view positions are rebuilt with z = depth
//  - textures: a texture uniform starts on a placeholder of the right kind (a depth texture for depth inputs)
// Each builder gets the uniform nodes (u.name) and returns the fragment colour (vec4).
const GPU_PASS=window.GPU?TSL:null;
// the quad is drawn with y flipped: WebGPU's texture rows run top-down, and without it every pass turned its input upside down
const GPU_FLIP=window.GPU?TSL.float(-1):null;
function SMG(spec,build){const {uniform,texture,Fn}=GPU_PASS,u={};
  for(const k in spec){const v=spec[k];u[k]=v==='tex'?texture(new THREE.Texture()):v==='depth'?texture(new THREE.DepthTexture(1,1)):uniform(v);}
  const m=new THREE.MeshBasicNodeMaterial({depthTest:false,depthWrite:false,toneMapped:false,fog:false,side:THREE.DoubleSide,blending:THREE.NoBlending});   // (not opaque: opaque node materials force alpha to 1, and the reflection pass carries its strength in alpha)
  m.vertexNode=GPU_PASS.vec4(GPU_PASS.positionLocal.x,GPU_PASS.positionLocal.y.mul(GPU_FLIP),0,1);m.colorNode=Fn(()=>build(u))();m.uniforms=u;return m;}
// shared helpers (TSL): view-space position from depth, a hash, the screen pixel
function gpuVpos(u,tDepth,projInv){const {vec4,texture}=GPU_PASS;return q=>{const d=tDepth.sample(q).x,p=projInv.mul(vec4(q.mul(2).sub(1),d,1));return p.xyz.div(p.w);};}
const gpuH1=p=>GPU_PASS.fract(GPU_PASS.sin(GPU_PASS.dot(p,GPU_PASS.vec2(12.9898,78.233))).mul(43758.5453));
// ---------- ambient occlusion ----------
function gpuAO(){const {vec2,vec3,vec4,float,uv,Loop,If,select,normalize,cross,dFdx,dFdy,dot,cos,sin,sqrt,max,mix,step,smoothstep,abs,clamp,screenCoordinate}=GPU_PASS;
  return SMG({tDepth:'depth',proj:new THREE.Matrix4(),projInv:new THREE.Matrix4(),radius:2.2,frame:0},u=>{
    const q=uv(),d=u.tDepth.sample(q).x,vpos=gpuVpos(u,u.tDepth,u.projInv),P=vpos(q).toVar();
    const N=normalize(cross(dFdx(P),dFdy(P))).toVar();If(dot(N,P).greaterThan(0),()=>{N.assign(N.negate());});
    const r0=gpuH1(screenCoordinate.xy.mul(.731).add(u.frame.mul(13.17))),an=r0.mul(6.2831853),rv=vec3(cos(an),sin(an),.37);
    const T=normalize(rv.sub(N.mul(dot(rv,N)))),B=cross(N,T),occ=float(0).toVar();
    Loop(14,({i})=>{const fi=float(i),a=gpuH1(vec2(fi.mul(3.7).add(u.frame.mul(1.3)),r0.mul(91.3))),b=gpuH1(vec2(r0.mul(17.1).add(u.frame),fi.mul(1.31)));
      const sr=sqrt(a),th=b.mul(6.2831853),s=vec3(sr.mul(cos(th)),sr.mul(sin(th)),sqrt(max(0,float(1).sub(a)))),sc=mix(.12,1,gpuH1(vec2(fi.add(r0),u.frame.mul(.37))));
      const S=P.add(T.mul(s.x).add(B.mul(s.y)).add(N.mul(s.z)).mul(u.radius.mul(sc))),qq=u.proj.mul(vec4(S,1)),q2=qq.xy.div(qq.w).mul(.5).add(.5);
      const inside=q2.x.greaterThanEqual(0).and(q2.y.greaterThanEqual(0)).and(q2.x.lessThanEqual(1)).and(q2.y.lessThanEqual(1));
      const sz=vpos(q2).z;occ.addAssign(select(inside,step(S.z.add(u.radius.mul(.03)),sz).mul(smoothstep(0,1,u.radius.div(max(abs(P.z.sub(sz)),1e-4)))),0));});
    const ao=clamp(float(1).sub(occ.div(14)),0,1);return select(d.greaterThan(.99999),vec4(1),vec4(ao,ao,ao,1));});}
// ---------- bloom: bright pass and separable blur ----------
function gpuBright(){const {uv,vec4,max,smoothstep}=GPU_PASS;return SMG({t:'tex',thr:1.6},u=>{const c=u.t.sample(uv()).rgb,l=max(max(c.r,c.g),c.b);return vec4(c.mul(smoothstep(u.thr,u.thr.mul(1.8),l)),1);});}
function gpuBlur(){const {uv,vec4}=GPU_PASS;return SMG({t:'tex',dir:new THREE.Vector2()},u=>{const q=uv(),s=o=>u.t.sample(q.add(u.dir.mul(o))).rgb;
  return vec4(s(0).mul(.227).add(s(1.385).add(s(-1.385)).mul(.316)).add(s(3.231).add(s(-3.231)).mul(.07)),1);});}
// ---------- composite: AO, bloom, (Ultra: bounce light, reflections, sunbeams) into the accumulation ----------
function gpuComp(){const {uv,vec2,vec4,float,mix,select}=GPU_PASS;
  return SMG({tB:'tex',tAO:'tex',tAO2:'tex',aoS2:0,tGI:'tex',tAlb:'tex',tVol:'tex',volS:0,tSSR:'tex',giS:0,ssrS:0,tL1:'tex',tL2:'tex',tAcc:'tex',px:new THREE.Vector2(),w:1,aoS:.75,bl:.1},u=>{
    const q=uv();let c=u.tB.sample(q).rgb;
    // (each Ultra term only when it is on, as in the GLSL: a disabled pass's texture can hold anything, and NaN x 0 is still NaN)
    c=select(u.giS.greaterThan(0),c.add(u.tGI.sample(q).rgb.mul(u.tAlb.sample(q).rgb).mul(u.giS)),c);
    const r=u.tSSR.sample(q);c=select(u.ssrS.greaterThan(0),mix(c,r.rgb,r.a.mul(u.ssrS)),c);
    let a=float(0),a2=float(0);for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){const o=vec2(x,y);a=a.add(u.tAO.sample(q.add(o.mul(u.px).mul(1.5))).r);a2=a2.add(u.tAO2.sample(q.add(o.mul(u.px).mul(4))).r);}
    c=c.mul(mix(1,a.div(9),u.aoS)).mul(mix(1,a2.div(9),u.aoS2));c=select(u.volS.greaterThan(0),c.add(u.tVol.sample(q).rgb.mul(u.volS)),c);
    c=c.add(u.tL1.sample(q).rgb.add(u.tL2.sample(q).rgb.mul(.8)).mul(u.bl));
    return vec4(mix(u.tAcc.sample(q).rgb,c,u.w),1);});}
// ---------- output: ACES, saturation, vignette, sRGB, colour grade, dither (rendered with the renderer's output transform off) ----------
function gpuOut(){const {uv,vec2,vec3,vec4,float,mat3,mix,dot,clamp,pow,step,select,fract,sin,screenCoordinate}=GPU_PASS;
  return SMG({t:'tex',exposure:1,ca:0,sat:1.06,vig:.22,con:1,gsat:1,gamt:1,wb:new THREE.Vector3(1,1,1),lift:new THREE.Vector3()},u=>{
    const q=uv(),q0=q.sub(.5),s0=vec3(u.t.sample(q.sub(q0.mul(u.ca))).r,u.t.sample(q).g,u.t.sample(q.add(q0.mul(u.ca))).b);
    const I=mat3(.59719,.35458,.04823,.07600,.90834,.01566,.02840,.13383,.83777),O=mat3(1.60475,-.53108,-.07367,-.10208,1.10813,-.00605,-.00327,-.07276,1.07602);
    const fit=v=>v.mul(v.add(.0245786)).sub(.000090537).div(v.mul(v.mul(.983729).add(.4329510)).add(.238081));
    let c=clamp(O.mul(fit(I.mul(s0.mul(u.exposure).div(.6)))),0,1);const L=vec3(.2126,.7152,.0722);
    c=mix(vec3(dot(c,L)),c,u.sat);c=c.mul(float(1).sub(u.vig.mul(dot(q0,q0)).mul(1.6)));c=clamp(c,0,1);
    c=mix(c.mul(12.92),pow(c,vec3(1/2.4)).mul(1.055).sub(.055),step(.0031308,c));
    const c0=c;let g=clamp(c.mul(u.wb),0,1);g=g.sub(.5).mul(u.con).add(.5);g=u.lift.add(g.mul(vec3(1).sub(u.lift)));
    c=mix(c0,mix(vec3(dot(g,L)),g,u.gsat),u.gamt);c=c.add(fract(sin(dot(screenCoordinate.xy,vec2(12.9898,78.233))).mul(43758.5453)).sub(.5).div(255));
    return vec4(c,1);});}
// under WebGPU, render targets and cube render targets are the renderer-neutral classes
if(window.GPU){THREE.WebGLRenderTarget=THREE.RenderTarget;if(THREE.CubeRenderTarget)THREE.WebGLCubeRenderTarget=THREE.CubeRenderTarget;}
