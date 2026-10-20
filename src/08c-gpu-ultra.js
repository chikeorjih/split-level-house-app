// 08c-gpu-ultra.js: Ultra's passes, the probe light and the corduroy, in node form, for the WebGPU renderer (see 08b-gpu-passes.js)
"use strict";
// ================= ULTRA PASSES (WebGPU) =================
const GPU_ULTRA_UN=()=>({tC:'tex',tDepth:'depth',tDepthE:'depth',tEnc:'tex',proj:new THREE.Matrix4(),projInv:new THREE.Matrix4(),frame:0,radius:7});
const gpuInside=q=>q.x.greaterThanEqual(0).and(q.y.greaterThanEqual(0)).and(q.x.lessThanEqual(1)).and(q.y.lessThanEqual(1));
const gpuProj2=(proj,S)=>{const q=proj.mul(GPU_PASS.vec4(S,1));return q.xy.div(q.w).mul(.5).add(.5);};
// encoded normal: view xy in .xy (z rebuilt), gloss in .z, reflectivity in .a
const gpuDecN=e=>{const {vec3,sqrt,max,dot,float}=GPU_PASS,n2=e.xy.mul(2).sub(1);return vec3(n2,sqrt(max(0,float(1).sub(dot(n2,n2)))));};
// ---------- one-bounce GI ----------
function gpuGI(){const {vec2,vec3,vec4,float,uv,Loop,If,select,normalize,cross,dFdx,dFdy,dot,cos,sin,sqrt,max,min,mix,length,screenCoordinate}=GPU_PASS;
  return SMG(GPU_ULTRA_UN(),u=>{const q=uv(),d=u.tDepth.sample(q).x,vpos=gpuVpos(u,u.tDepth,u.projInv),P=vpos(q).toVar(),e=u.tEnc.sample(q);
    const Nf=normalize(cross(dFdx(P),dFdy(P))).toVar();If(dot(Nf,P).greaterThan(0),()=>{Nf.assign(Nf.negate());});
    const N=select(e.x.add(e.y).lessThan(.001),Nf,gpuDecN(e)).toVar();
    const r0=gpuH1(screenCoordinate.xy.mul(.913).add(u.frame.mul(7.31))),an=r0.mul(6.2831853),rv=vec3(cos(an),sin(an),.41),T=normalize(rv.sub(N.mul(dot(rv,N)))),B=cross(N,T),acc=vec3(0).toVar();
    Loop(10,({i})=>{const fi=float(i),a=gpuH1(vec2(fi.mul(4.1).add(u.frame.mul(1.7)),r0.mul(77.3))),b=gpuH1(vec2(r0.mul(13.7).add(u.frame.mul(.9)),fi.mul(2.3))),c=gpuH1(vec2(fi.add(r0.mul(3.1)),u.frame.mul(.53)));
      const sr=sqrt(a),th=b.mul(6.2831853),s=vec3(sr.mul(cos(th)),sr.mul(sin(th)),sqrt(max(0,float(1).sub(a))));
      const q2=gpuProj2(u.proj,P.add(T.mul(s.x).add(B.mul(s.y)).add(N.mul(s.z)).mul(u.radius.mul(mix(.06,1,c.mul(c))))));
      const v=vpos(q2).sub(P),L=max(length(v),1e-4),cp=dot(N,v.div(L));
      const ok=gpuInside(q2).and(u.tDepth.sample(q2).x.lessThanEqual(.99999)).and(L.greaterThanEqual(.05)).and(cp.greaterThan(0));
      acc.addAssign(select(ok,min(u.tC.sample(q2).rgb,vec3(4)).mul(cp).div(float(1).add(L.mul(L).mul(2).div(u.radius.mul(u.radius)))),vec3(0)));});
    return select(d.greaterThan(.99999),vec4(0),vec4(acc.mul(1.5/10),1));});}
// ---------- screen-space reflections ----------
function gpuSSR(){const {vec2,vec3,vec4,float,uv,Loop,If,select,normalize,dot,max,min,pow,clamp,smoothstep,reflect,screenCoordinate}=GPU_PASS,BOOST=ULTRA.reflBoost;
  return SMG(GPU_ULTRA_UN(),u=>{const q=uv(),e=u.tEnc.sample(q),refl=e.a,d=u.tDepthE.sample(q).x,vpos=gpuVpos(u,u.tDepth,u.projInv),P=gpuVpos(u,u.tDepthE,u.projInv)(q);
    const r0=gpuH1(screenCoordinate.xy.mul(.71).add(u.frame.mul(5.13))),r1=gpuH1(screenCoordinate.yx.mul(.37).add(u.frame.mul(2.9))),r2=gpuH1(vec2(r0,r1).mul(31.7).add(u.frame));
    const N=normalize(gpuDecN(e).add(normalize(vec3(r0,r1,r2).mul(2).sub(1)).mul(e.z.mul(e.z).mul(.55)))),V=normalize(P),R=reflect(V,N),ndv=max(dot(V.negate(),N),0);
    const t=r0.mul(.2).add(.1).toVar(),stp=float(.18).toVar(),huv=vec2(-1).toVar(),done=float(0).toVar();
    Loop(56,()=>{If(done.equal(0),()=>{const S=P.add(R.mul(t)),qq=u.proj.mul(vec4(S,1)),q2=qq.xy.div(qq.w).mul(.5).add(.5);
      If(qq.w.lessThanEqual(0).or(gpuInside(q2).not()),()=>{done.assign(1);}).Else(()=>{const sz=vpos(q2).z;
        If(S.z.lessThan(sz).and(sz.sub(S.z).lessThan(t.mul(.05).add(.3))),()=>{huv.assign(q2);done.assign(1);}).Else(()=>{t.addAssign(stp);stp.mulAssign(1.09);});});});});
    const ed=min(huv,vec2(1).sub(huv)),edge=clamp(min(ed.x,ed.y).mul(12),0,1).mul(clamp(float(1).sub(t.div(60)),0,1));
    const fres=min(1,refl.mul(BOOST)).add(float(1).sub(refl).mul(pow(float(1).sub(ndv),4)).mul(smoothstep(.01,.06,refl)));
    const miss=refl.lessThan(.015).or(d.greaterThan(.99999)).or(huv.x.lessThan(0));
    return select(miss,vec4(0),vec4(min(u.tC.sample(huv).rgb,vec3(6)),clamp(fres,0,1).mul(edge)));});}
// ---------- normal/gloss material (one per scene material; its values are fixed per material) ----------
function gpuEncMat(m,rough,refl,rm,uvT){const {vec3,vec4,float,uniform,texture,uv,normalize,normalView,faceDirection,clamp,min}=GPU_PASS;
  const e=new THREE.MeshBasicMaterial({side:m.side,toneMapped:false,fog:false,blending:THREE.NoBlending});e.clippingPlanes=CLIPS;
  npAdd(e,{color:()=>{const n=normalize(normalView).mul(faceDirection);let r=float(rough),f=float(refl);
    if(rm){r=float(rough).mul(texture(rm,uniform(uvT).mul(vec3(uv(),1)).xy).g);f=float(refl).mul(clamp(float(1).sub(r).div(Math.max(1-rough,.05)),0,2));}
    return vec4(n.xy.mul(.5).add(.5),r,min(f,1));}});return e;}
// ---------- the rooms volume (see roomMask) and the probe light, as nodes ----------
function npTex(o){if(!o.__t){const t=GPU_PASS.texture(new THREE.Texture());if(o.value)t.value=o.value;let v=o.value;
    Object.defineProperty(o,'value',{get:()=>v,set:x=>{v=x;if(x)t.value=x;}});o.__t=t;}return o.__t;}
function gpuRoomIn(q){const {step,select}=GPU_PASS,box=npU(GI_U.roomBox),u2=q.xz.sub(box.xy).div(box.zw.sub(box.xy)),m=npTex(GI_U.tRoom).sample(u2);
  return select(gpuInside(u2),step(.5,m.a).mul(step(m.r.mul(30).sub(15),q.y)).mul(step(q.y,m.g.mul(30).sub(15))),0);}
function gpuGiIrr(q,n){const {vec2,vec3,clamp,floor,min,mix,max}=GPU_PASS,N=npU(GI_U.giN),g=clamp(q.sub(npU(GI_U.giMin)).div(npU(GI_U.giStep)),vec3(0),N.sub(1)),y0=floor(g.y),fy=g.y.sub(y0),y1=min(y0.add(1),N.y.sub(1));
  const tap=(k,y)=>npTex(GI_U.tGIa).sample(vec2(N.x.mul(k).add(g.x).add(.5),y.mul(N.z).add(g.z).add(.5)).div(vec2(N.x.mul(4),N.z.mul(N.y)))).rgb;
  const L=k=>mix(tap(k,y0),tap(k,y1),fy);return max(vec3(0),L(0).mul(.886227).add(L(1).mul(n.x).add(L(2).mul(n.y)).add(L(3).mul(n.z)).mul(1.023327)));}
// the probe light enters the lighting model: inside a room, a material marked userData.gi takes its indirect diffuse from the probes
if(window.GPU){const PLM=THREE.PhysicalLightingModel.prototype,ind=PLM.indirect;
  PLM.indirect=function(builder){const m=builder.material;
    if(m&&m.userData&&m.userData.gi){const {positionWorld,normalWorld,mix,float}=GPU_PASS,ctx=builder.context,q=positionWorld.add(normalWorld.mul(.5)),inR=gpuRoomIn(q).mul(npU(GI_U.uGI));
      ctx.irradiance.assign(mix(ctx.irradiance,gpuGiIrr(q,normalWorld).mul(npU(GI_U.giGain)),inR));ctx.iblIrradiance.mulAssign(float(1).sub(inR));}
    return ind.call(this,builder);};}
// ---------- sunbeams ----------
function gpuVol(){const {vec4,float,uv,Loop,select,normalize,length,min,mix,step,dot,pow,screenCoordinate}=GPU_PASS;
  return SMG({tDepth:'depth',tShadow:'depth',projInv:new THREE.Matrix4(),camWorld:new THREE.Matrix4(),shadowM:new THREE.Matrix4(),camPos:new THREE.Vector3(),sunDir:new THREE.Vector3(),sunCol:new THREE.Color(),frame:0,dens:0,maxD:30,g:.55,outK:.08},u=>{
    const q=uv(),d=u.tDepth.sample(q).x,p=u.projInv.mul(vec4(q.mul(2).sub(1),min(d,.9999),1)),Pv=p.xyz.div(p.w),L=select(d.greaterThan(.99999),u.maxD,min(length(Pv),u.maxD));
    const Pw=u.camWorld.mul(vec4(Pv,1)).xyz,rd=normalize(Pw.sub(u.camPos)),st=L.div(32),j=gpuH1(screenCoordinate.xy.mul(.37).add(u.frame.mul(1.618))),acc=float(0).toVar();
    Loop(32,({i})=>{const X=u.camPos.add(rd.mul(st.mul(float(i).add(j)))),sc=u.shadowM.mul(vec4(X,1)),s=sc.xyz.div(sc.w),w=mix(u.outK,1,gpuRoomIn(X));
      const out=gpuInside(s.xy).not().or(s.z.greaterThan(1));acc.addAssign(select(out,w,w.mul(step(s.z,u.tShadow.sample(s.xy).x.add(.002)))));});
    const ct=dot(rd,u.sunDir),ph=float(1).sub(u.g.mul(u.g)).div(pow(float(1).add(u.g.mul(u.g)).sub(u.g.mul(2).mul(ct)),1.5).mul(12.566));
    return vec4(u.sunCol.mul(acc.mul(st).mul(u.dens).mul(ph)),1);});}
// ---------- autofocus: nearest view depth near the centre, written raw (the focus target is a float texture under WebGPU) ----------
function gpuFocus(){const {vec2,vec4,float,min,select}=GPU_PASS;return SMG({tDepth:'depth',projInv:new THREE.Matrix4()},u=>{let z=float(1e9);
  for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const q=vec2(.5).add(vec2(i,j).mul(.012)),d=u.tDepth.sample(q).x,p=u.projInv.mul(vec4(q.mul(2).sub(1),d,1));z=min(z,select(d.greaterThan(.99999),float(200),p.z.div(p.w).negate()));}
  return vec4(z,0,0,1);});}
// ---------- probes: a cube map to first-order spherical harmonics, and dilation of the atlas ----------
function gpuSHP(){const {vec2,vec3,vec4,float,Loop,normalize,dot,pow,min,select,cubeTexture,uniform}=GPU_PASS;
  const cube=cubeTexture(new THREE.CubeTexture()),k=uniform(0);
  const m=SMG({},()=>{const acc=vec3(0).toVar(),ws=float(0).toVar();
    for(let f=0;f<6;f++)Loop(16,({i:j})=>{Loop(16,({i})=>{const uu=vec2(float(i),float(j)).add(.5).div(8).sub(1),w=float(1).div(pow(dot(uu,uu).add(1),1.5));
      const d=normalize(f===0?vec3(1,uu.y,uu.x.negate()):f===1?vec3(-1,uu.y,uu.x):f===2?vec3(uu.x,1,uu.y.negate()):f===3?vec3(uu.x,-1,uu.y):f===4?vec3(uu.x,uu.y,1):vec3(uu.x.negate(),uu.y,-1));
      const L=min(cube.sample(d).rgb,vec3(16)),y=select(k.lessThan(.5),float(.282095),float(.488603).mul(select(k.lessThan(1.5),d.x,select(k.lessThan(2.5),d.y,d.z))));
      acc.addAssign(L.mul(y).mul(w));ws.addAssign(w);});});
    return vec4(acc.mul(12.566371).div(ws),1);});
  m.uniforms={cube,k};return m;}
function gpuDIL(){const {vec2,vec3,vec4,uv,floor,select}=GPU_PASS;return SMG({t:'tex',N:new THREE.Vector3()},u=>{
  const N=u.N,sz=vec2(N.x.mul(4),N.z.mul(N.y)),p=floor(uv().mul(sz)),k=floor(p.x.div(N.x)),gy=floor(p.y.div(N.z)),g=vec3(p.x.sub(k.mul(N.x)),gy,p.y.sub(gy.mul(N.z)));
  const at=h=>u.t.sample(vec2(k.mul(N.x).add(h.x),h.y.mul(N.z).add(h.z)).add(.5).div(sz));const c=at(g);let s=vec4(0);
  for(const o of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const h=g.add(vec3(...o)),ok=h.x.greaterThanEqual(0).and(h.y.greaterThanEqual(0)).and(h.z.greaterThanEqual(0)).and(h.x.lessThanEqual(N.x.sub(1))).and(h.y.lessThanEqual(N.y.sub(1))).and(h.z.lessThanEqual(N.z.sub(1))),v=at(h);
    s=s.add(select(ok.and(v.a.greaterThan(.5)),vec4(v.rgb,1),vec4(0)));}
  return select(c.a.greaterThan(.5),c,select(s.a.greaterThan(0),vec4(s.rgb.div(s.a),1),vec4(0)));});}
// ---------- corduroy (13-models.js), as nodes: the same wales, colour and bump ----------
function gpuCorduroy(mt,pitch,M){const {vec3,vec4,float,uniform,positionLocal,normalLocal,normalize,abs,pow,fract,smoothstep,fwidth,mix,dFdx,dFdy,cross,dot,sign,normalView,positionView,faceDirection,mat3}=GPU_PASS;
  const cm=uniform(M),P=cm.mul(vec4(positionLocal,1)).xyz,Nl=normalize(mat3(cm).mul(normalLocal)),cw0=pow(abs(Nl),vec3(6)),cw=cw0.div(cw0.x.add(cw0.y).add(cw0.z));
  const H=s=>{const f=fract(s);return smoothstep(0,.32,f).mul(smoothstep(1,.68,f));},sx=P.x.div(pitch),sz=P.z.div(pitch);
  const aX=float(1).sub(smoothstep(.4,.75,fwidth(sx))),aZ=float(1).sub(smoothstep(.4,.75,fwidth(sz))),h0=cw.y.add(cw.z).mul(H(sx)).mul(aX).add(cw.x.mul(H(sz)).mul(aZ)),a=cw.y.add(cw.z).mul(aX).add(cw.x.mul(aZ));
  npAdd(mt,{color:c=>vec4(c.rgb.mul(mix(1,mix(.76,1.05,h0),a)),c.a)});
  const h=h0.mul(.006),sp=positionView,sn=normalView,dx=dFdx(sp),dy=dFdy(sp),r1=cross(dy,sn),r2=cross(sn,dx),det=dot(dx,r1).mul(faceDirection);
  mt.normalNode=normalize(abs(det).mul(sn).sub(sign(det).mul(r1.mul(dFdx(h)).add(r2.mul(dFdy(h))))));}
