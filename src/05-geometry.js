// 05-geometry.js: geometry engine: merged buckets, walls with openings, stairs, railings, collisions
"use strict";
// ================= GEOMETRY ENGINE =================
const BUCKETS=new Map(); const COLS=[]; const WALKS=[]; const PIECES=[];
const ROOF_MATS=new Set(['roof','slateRoof','roofBrown','metalRoof']);
function bucket(tag,mat,flags){const k=tag+'|'+mat+'|'+(flags||'');let b=BUCKETS.get(k);
  if(!b){b={tag,mat,flags:flags||'',p:[],n:[],u:[]};BUCKETS.set(k,b);}return b;}
function addCol(x0,x1,z0,z1,y0,y1){const c={x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1),y0,y1};COLS.push(c);return c;}
let INST_TARGET=null;
function instBucket(inst,tag,mat){let b=inst.buckets.get(mat);if(!b){b={tag,mat,p:[],n:[],u:[]};inst.buckets.set(mat,b);}return b;}
function addWalk(x0,x1,z0,z1,top){WALKS.push({x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1),top});}
// axis-aligned box with world-scale UVs (1 unit = 1 ft)
function box(tag,mat,x0,x1,y0,y1,z0,z1,flags){
  if(x0>x1)[x0,x1]=[x1,x0]; if(y0>y1)[y0,y1]=[y1,y0]; if(z0>z1)[z0,z1]=[z1,z0];
  if(x1-x0<1e-4||y1-y0<1e-4||z1-z0<1e-4)return;
  regPiece(tag,mat,x0,y0,z0,x1,y1,z1);
  const b=bucket(tag,mat,flags),P=b.p,N=b.n,U=b.u;
  const q=(a,bb,c,d,n,uv)=>{for(const v of [a,bb,c,a,c,d]){P.push(v[0],v[1],v[2]);N.push(n[0],n[1],n[2]);U.push(uv(v)[0],uv(v)[1]);}};
  const ux=v=>[v[2],v[1]],uy=v=>[v[0],v[2]],uz=v=>[v[0],v[1]];
  q([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],v=>[-v[2],v[1]]);
  q([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],ux);
  q([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],uy);
  q([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],uy);
  q([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],uz);
  q([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],v=>[-v[0],v[1]]);
}
const _m=new THREE.Matrix4(),_v=new THREE.Vector3();
const ADDGEO=(...a)=>addGeo(...a);
function addGeo(tag,mat,geo,matrix,flags){
  let g=geo.index?geo.toNonIndexed():geo.clone(); if(matrix)g.applyMatrix4(matrix);
  const b=INST_TARGET?instBucket(INST_TARGET,tag,mat):bucket(tag,mat,flags),p=g.attributes.position.array,n=g.attributes.normal?g.attributes.normal.array:null,u=g.attributes.uv?g.attributes.uv.array:null;
  let a0=1e9,a1=1e9,a2=1e9,b0=-1e9,b1=-1e9,b2=-1e9;
  for(let i=0;i<p.length/3;i++){const X=p[i*3],Y=p[i*3+1],Z=p[i*3+2];b.p.push(X,Y,Z);if(X<a0)a0=X;if(Y<a1)a1=Y;if(Z<a2)a2=Z;if(X>b0)b0=X;if(Y>b1)b1=Y;if(Z>b2)b2=Z;
    if(n)b.n.push(n[i*3],n[i*3+1],n[i*3+2]);else b.n.push(0,1,0);
    if(u)b.u.push(u[i*2],u[i*2+1]);else b.u.push(0,0);}
  regPiece(tag,mat,a0,a1,a2,b0,b1,b2);
  g.dispose();
}
function M(x,y,z,ry,sx,sy,sz){_m.makeRotationY(ry||0);_m.scale(_v.set(sx||1,sy||1,sz||1));_m.setPosition(x,y,z);return _m.clone();}
// prism from 4 top points (x,y,z) extruded down by th
function quadSlab(tag,mat,pts,th,flags){
  {const a=pts[0],b=pts[1],c=pts[2];const ux=b[0]-a[0],uz=b[2]-a[2],vx=c[0]-a[0],vz=c[2]-a[2];if(uz*vx-ux*vz<0)pts=pts.slice().reverse();}
  regPiece(tag,mat,Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1]))-th,Math.min(...pts.map(p=>p[2])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[2])));
  const top=pts.map(p=>new THREE.Vector3(...p)),bot=top.map(v=>v.clone().add(new THREE.Vector3(0,-th,0)));
  const b=bucket(tag,mat,flags),UP=new THREE.Vector3(0,1,0),E=new THREE.Vector3(),S=new THREE.Vector3();
  const fn=(a,c,d)=>new THREE.Vector3().subVectors(c,a).cross(new THREE.Vector3().subVectors(d,a)).normalize();
  // roofs: a slab's edges are shaded like its top, so where pitches meet or a hip overlaps, the exposed edge blends into the roof
  const roofy=ROOF_MATS.has(mat),tn=(t=>t.lengthSq()>.5?t:fn(top[0],top[2],top[3]))(fn(top[0],top[1],top[2]));
  // texture coordinates in feet: plan x,z on (near) level faces; otherwise along the face's own level line (u) and up its slope (v),
  // so slate and shingle rows run parallel to each roof face's eave and are not stretched on steep pitches
  const tri=(a,c,d,useN)=>{const n=fn(a,c,d);if(n.lengthSq()<.5)return;const sn=useN||n,flat=Math.abs(n.y)>.985;
    if(!flat){E.crossVectors(UP,n).normalize();S.crossVectors(n,E);if(S.y<0)S.negate();}
    for(const v of [a,c,d]){b.p.push(v.x,v.y,v.z);b.n.push(sn.x,sn.y,sn.z);if(flat)b.u.push(v.x,v.z);else b.u.push(v.dot(E),v.dot(S));}};
  const quad=(a,c,d,e,useN)=>{tri(a,c,d,useN);tri(a,d,e,useN);};
  quad(top[0],top[1],top[2],top[3]);quad(bot[3],bot[2],bot[1],bot[0]);
  for(let i=0;i<4;i++){const j=(i+1)%4;quad(bot[i],bot[j],top[j],top[i],roofy?tn:null);}
}
// beam between two points
function beam(tag,mat,a,b,w,h,flags){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const d=B.clone().sub(A);const L=d.length();d.normalize();
  let side=new THREE.Vector3().crossVectors(d,new THREE.Vector3(0,1,0));if(side.lengthSq()<1e-6)side.set(1,0,0);side.normalize();
  const up=new THREE.Vector3().crossVectors(side,d).normalize();
  const m=new THREE.Matrix4().makeBasis(side,up,d);m.setPosition(A.clone().add(B).multiplyScalar(.5));
  addGeo(tag,mat,new THREE.BoxGeometry(w,h,L),m,flags);}
// polygon wall: pts in (a,y), extruded across thickness t around fixed coordinate c
function polyWall(tag,mat,axis,c,t,pts,flags){const sh=new THREE.Shape();pts.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));
  const g=new THREE.ExtrudeGeometry(sh,{depth:t,bevelEnabled:false});const m=new THREE.Matrix4();
  if(axis==='x'){m.makeBasis(new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1));m.setPosition(0,0,c-t/2);}
  else{m.makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0),new THREE.Vector3(-1,0,0));m.setPosition(c+t/2,0,0);}
  addGeo(tag,mat,g,m,flags);}

// ---------- walls with openings ----------
function wallBuild(w){
  const ax=(w.z0===w.z1)?'x':'z';const a0=Math.min(ax==='x'?w.x0:w.z0,ax==='x'?w.x1:w.z1),a1=Math.max(ax==='x'?w.x0:w.z0,ax==='x'?w.x1:w.z1);
  const c=ax==='x'?w.z0:w.x0,t=w.t,tag=String(w.lv);
  const wloc=w.loc||here(),wkey='W@'+locKey(wloc),WOWN={key:wkey,kind:'wall',fn:'W',loc:wloc,label:(w.isNew?'new ':'')+(w.ext?'exterior wall':'interior wall')};
  const wel=ensureEl(WOWN);OWNER=WOWN;
  const B=(mat,pa0,pa1,c0,c1,y0,y1,fl)=>{if(ax==='x')box(tag,mat,pa0,pa1,y0,y1,c0,c1,fl);else box(tag,mat,c0,c1,y0,y1,pa0,pa1,fl);};
  const ops=w.ops.slice().sort((p,q)=>p.c-q.c);
  // solid pieces
  let cur=a0;const pieces=[];
  for(const o of ops){const oa0=o.c-o.w/2,oa1=o.c+o.w/2;if(oa0>cur)pieces.push([cur,oa0,w.y0,w.y1]);
    if(o.y0>w.y0+.01)pieces.push([oa0,oa1,w.y0,o.y0]);if(o.y1<w.y1-.01)pieces.push([oa0,oa1,o.y1,w.y1]);cur=Math.max(cur,oa1);}
  if(cur<a1)pieces.push([cur,a1,w.y0,w.y1]);
  for(const p of pieces){B('wall',p[0],p[1],c-t/2,c+t/2,p[2],p[3]);
    PIECES.push({tag,ax,a0:p[0],a1:p[1],c,t,y0:p[2],y1:p[3],isNew:!!w.isNew});
    if(ax==='x')addCol(p[0],p[1],c-t/2,c+t/2,p[2],p[3]);else addCol(c-t/2,c+t/2,p[0],p[1],p[2],p[3]);}
  // skins (exterior cladding / paint) clipped to their own range, honoring openings
  const skin=(s,mat,th,off)=>{const sy0=s.y0!==undefined?s.y0:w.y0,sy1=s.y1!==undefined?s.y1:w.y1,sa0=s.a0!==undefined?s.a0:a0,sa1=s.a1!==undefined?s.a1:a1;
    const f=c+s.side*(t/2+off),cA=Math.min(f,f+s.side*th),cB=Math.max(f,f+s.side*th);
    for(const p of pieces){const pa0=Math.max(p[0],sa0),pa1=Math.min(p[1],sa1),py0=Math.max(p[2],sy0),py1=Math.min(p[3],sy1);
      if(pa1-pa0>.01&&py1-py0>.01)B(mat,pa0,pa1,cA,cB,py0,py1);}
    // reveal returns into openings for cladding
    if(mat!=='charcoal')for(const o of ops){if(o.k==='bay')continue;const oa0=o.c-o.w/2,oa1=o.c+o.w/2;if(oa1<sa0||oa0>sa1)continue;
      const y0=Math.max(o.y0,sy0),y1=Math.min(o.y1,sy1);if(y1<=y0)continue;
      B(mat,oa0-0.01,oa0+0.05,cA,cB,y0,y1);B(mat,oa1-0.05,oa1+0.01,cA,cB,y0,y1);}
  };
  if(w.ext)skin(w.ext,w.ext.mat,0.14,0);
  // wrap the cladding over the wall's ends where it reaches them, so an outside corner shows brick (or stone), not the bare wall core
  if(w.ext){const e=w.ext,sy0=e.y0!==undefined?e.y0:w.y0,sy1=e.y1!==undefined?e.y1:w.y1,f=c+e.side*(t/2+.14),cA=Math.min(c-t/2,f),cB=Math.max(c+t/2,f);
    for(const [end,dir,reach] of [[a0,-1,e.a0===undefined||e.a0<=a0+.01],[a1,1,e.a1===undefined||e.a1>=a1-.01]]){
      if(!reach)continue;for(const p of pieces)if(p[0]<=end+.01&&p[1]>=end-.01){const y0=Math.max(p[2],sy0),y1=Math.min(p[3],sy1);
        if(y1-y0>.01)B(e.mat,dir<0?end-.02:end,dir<0?end:end+.02,cA,cB,y0,y1);}}}
  if(w.paint)for(const pt of w.paint){skin(Object.assign({mat:'charcoal'},pt),'charcoal',0.02,0.003);
    // chair rail + baseboard in the dining room
    const f=c+pt.side*(t/2+.02);
    for(const p of pieces){const pa0=Math.max(p[0],pt.a0),pa1=Math.min(p[1],pt.a1);if(pa1-pa0<.05)continue;
      if(p[2]<=2.6&&p[3]>=2.8)B('trim',pa0,pa1,f,f+pt.side*.06,2.6,2.8);}}
  // baseboards
  if(w.bb)for(const [y,side] of w.bb){for(const sd of (side?[side]:[-1,1])){const f=c+sd*t/2;
      for(const p of pieces){if(p[2]<=y+.05&&p[3]>=y+.4)B('trim',p[0],p[1],f,f+sd*.05,y,y+.36);}}}
  ops.forEach((o,i)=>{OWNER={key:wkey+'.o'+i,kind:'opening',fn:'op',loc:wloc,label:OPEN_LABEL[o.k]||o.k,parent:wel.id,id:wel.id+'.'+(i+1)};openingBuild(w,o,ax,c,t,tag,B);});
  OWNER=null;
}
function openingBuild(w,o,ax,c,t,tag,B){const B0=B;
  const oa0=o.c-o.w/2,oa1=o.c+o.w/2,y0=o.y0,y1=o.y1,ext=w.ext?w.ext.side:1,J=0.16;
  const col=(pa0,pa1,cy0,cy1)=>{if(ax==='x')addCol(pa0,pa1,c-t/2,c+t/2,cy0,cy1);else addCol(c-t/2,c+t/2,pa0,pa1,cy0,cy1);};
  const glassP=(pa0,pa1,py0,py1,mat)=>{B(mat||'glass',pa0,pa1,c-.02,c+.02,py0,py1);PIECES.push({tag,ax,a0:pa0,a1:pa1,c,t:.12,y0:py0,y1:py1,glass:true});};
  const casing=(sides)=>{for(const sd of sides){const f=c+sd*t/2;B('trim',oa0-.3,oa0,f,f+sd*.05,y0,y1+.3);B('trim',oa1,oa1+.3,f,f+sd*.05,y0,y1+.3);B('trim',oa0-.3,oa1+.3,f,f+sd*.05,y1,y1+.3);}};
  const Bt=(tg,mat,pa0,pa1,c0,c1,yy0,yy1)=>{if(ax==='x')box(tg,mat,pa0,pa1,yy0,yy1,Math.min(c0,c1),Math.max(c0,c1));else box(tg,mat,Math.min(c0,c1),Math.max(c0,c1),yy0,yy1,pa0,pa1);};
  const leaf=(hEnd,side,wl,mat,glass,tg)=>{const B=tg?((...q)=>Bt(tg,...q)):B0;const a=hEnd<0?oa0+.04:oa1-.16,f=c+side*t/2,cA=Math.min(f,f+side*wl),cB=Math.max(f,f+side*wl),h=y1-y0-.04;
    if(glass){B(mat,a,a+.12,cA,cA+.25,y0,y0+h);B(mat,a,a+.12,cB-.25,cB,y0,y0+h);B(mat,a,a+.12,cA,cB,y0,y0+.9);B(mat,a,a+.12,cA,cB,y0+h-.3,y0+h);
      B('glass',a+.04,a+.08,cA+.25,cB-.25,y0+.9,y0+h-.3);}
    else{B(mat,a,a+.12,cA,cB,y0,y0+h);for(const yy of [[.6,3.1],[3.5,6.2]]){B(mat,a-.015,a+.135,cA+.35,cB-.35,y0+yy[0],y0+Math.min(yy[1],h-.4));}}
    B('brass',a+(hEnd<0?.12:-.06),a+(hEnd<0?.18:0),cB-.4,cB-.28,y0+3.0,y0+3.12);
    if(ax==='x')addCol(a-.04,a+.16,cA,cB,y0,y0+h);else addCol(cA,cB,y0,y0+h,a-.04,a+.16);};
  const frameRing=(depth)=>{const f0=c-depth/2,f1=c+depth/2;B('trim',oa0,oa0+J,f0,f1,y0,y1);B('trim',oa1-J,oa1,f0,f1,y0,y1);B('trim',oa0,oa1,f0,f1,y1-J,y1);B('trim',oa0,oa1,f0,f1,y0,y0+J);};
  switch(o.k){
    case 'win': case 'frost':{const hasExt=!!w.ext,xs=hasExt?ext:1,dep=t+.06,XM='trim';
      const ring=(fa,fb,mat)=>{const f0=Math.min(fa,fb),f1=Math.max(fa,fb);B(mat,oa0,oa0+J,f0,f1,y0,y1);B(mat,oa1-J,oa1,f0,f1,y0,y1);B(mat,oa0,oa1,f0,f1,y1-J,y1);B(mat,oa0,oa1,f0,f1,y0,y0+J);};
      const half=(mat,inside,pa0,pa1,yy0,yy1,d)=>{const e=c+(inside?-xs:xs)*d;B(mat,pa0,pa1,Math.min(c,e),Math.max(c,e),yy0,yy1);};
      ring(c-xs*dep/2,c,'trim');ring(c,c+xs*dep/2,XM);
      const n=o.n||1,pw=(o.w-2*J)/n;
      for(let i=1;i<n;i++){const a=oa0+J+i*pw;half('trim',true,a-.06,a+.06,y0,y1,.12);half(XM,false,a-.06,a+.06,y0,y1,.12);}
      if(o.dh){const ym=(y0+y1)/2;half('trim',true,oa0,oa1,ym-.07,ym+.07,.1);half(XM,false,oa0,oa1,ym-.07,ym+.07,.1);}
      else if(o.k==='win'&&o.y1-o.y0>5){half('trim',true,oa0,oa1,y1-1.25,y1-1.15,.1);half(XM,false,oa0,oa1,y1-1.25,y1-1.15,.1);}
      glassP(oa0+J,oa1-J,y0+J,y1-J,o.k==='frost'?'frost':'glass');
      B('trim',oa0-.1,oa1+.1,Math.min(c,c-xs*(t/2+.12)),Math.max(c,c-xs*(t/2+.12)),y0-.06,y0+.02);
      if(hasExt&&w.ext.mat==='brick'){const f=c+ext*(t/2);const skTop=w.ext.y1!==undefined?w.ext.y1:w.y1;
        B('brick',oa0-.25,oa1+.25,Math.min(f,f+ext*.34),Math.max(f,f+ext*.34),y0-.32,y0-.02);
        if(y1+.7<=skTop+.01)B('soldier',oa0-.35,oa1+.35,Math.min(f+ext*.12,f+ext*.19),Math.max(f+ext*.12,f+ext*.19),y1+.02,y1+.7);}
      else if(hasExt){const f=c+ext*(t/2);B(XM,oa0-.1,oa1+.1,Math.min(f,f+ext*.2),Math.max(f,f+ext*.2),y0-.08,y0);}
      col(oa0,oa1,y0,y1);break;}
    case 'door':{DOORS.push({tag,ax,c,t,oa0,oa1,y0,hinge:o.sw[0],side:o.sw[1],isNew:!!o.isNew});casing([-1,1]);leaf(o.sw[0],o.sw[1],o.w-.1,o.dark?'doorGrey':'doorWhite',false);break;}
    case 'door2':{casing([-1,1]);const h=o.w/2-.05;leaf(-1,1,h,'doorWhite',true);leaf(1,1,h,'doorWhite',true);break;}
    case 'gdoor':{DOORS.push({tag,ax,c,t,oa0,oa1,y0,hinge:o.sw[0],side:o.sw[1],isNew:!!o.isNew});casing([-1,1]);leaf(o.sw[0],o.sw[1],o.w-.1,'doorWhite',true);break;}
    case 'dbl':{casing([-ext]);const h=o.w/2-.05;
      // open French doors while walking; closed two-tone doors (wood outside, white inside) for the outside views
      leaf(-1,-ext,h,'doorWhite',true,'frontOpen');leaf(1,-ext,h,'doorWhite',true,'frontOpen');
      const mid=(oa0+oa1)/2;
      for(const [p0,p1] of [[oa0+.04,mid-.01],[mid+.01,oa1-.04]]){
        for(const [mat,d0,d1] of [['doorWhite',-.09,0],['doorWood',0,.09]]){const cA=c+ext*d0,cB=c+ext*d1;
          Bt('frontClosed',mat,p0,p0+.42,cA,cB,y0,y1-.04);Bt('frontClosed',mat,p1-.42,p1,cA,cB,y0,y1-.04);
          Bt('frontClosed',mat,p0,p1,cA,cB,y0,y0+1.1);Bt('frontClosed',mat,p0,p1,cA,cB,y1-.55,y1-.04);}
        Bt('frontClosed','glass',p0+.42,p1-.42,c-.02,c+.02,y0+1.1,y1-.55);
        Bt('frontClosed','brass',mid+(p0<mid?-.22:.16),mid+(p0<mid?-.16:.22),c+ext*.09,c+ext*.16,y0+3.0,y0+3.9);}
      B('trim',oa0-.1,oa1+.1,c-.3,c+.3,y0-.02,y0+.03);break;}
    case 'open':{casing([-1,1]);for(const s of [oa0,oa1-.05])B('trim',s,s+.05,c-t/2,c+t/2,y0,y1);B('trim',oa0,oa1,c-t/2,c+t/2,y1-.05,y1);break;}
    case 'open0':break;
    case 'slide':{frameRing(t*.6);const half=(o.w-2*J)/2,m=oa0+J+half;
      // fixed panel on the +a side, sliding panel parked in front of it -> left half open
      const pan=(pa0,pa1,cc)=>{B('trim',pa0,pa0+.18,cc-.06,cc+.06,y0+J,y1-J);B('trim',pa1-.18,pa1,cc-.06,cc+.06,y0+J,y1-J);
        B('trim',pa0,pa1,cc-.06,cc+.06,y0+J,y0+J+.3);B('trim',pa0,pa1,cc-.06,cc+.06,y1-J-.18,y1-J);
        B('glass',pa0+.18,pa1-.18,cc-.02,cc+.02,y0+J+.3,y1-J-.18);PIECES.push({tag,ax,a0:pa0,a1:pa1,c:cc,t:.1,y0:y0+1,y1:y1-1,glass:true});};
      pan(m,oa1-J,c+.07);pan(m-.15,oa1-J-.15,c-.09);
      B('blackMetal',m+.3,m+.38,c-.18,c-.15,y0+3,y0+3.8);col(m,oa1,y0,y1);break;}
    case 'closet':{PIECES.push({tag,ax,a0:oa0,a1:oa1,c,t:.14,y0,y1,closet:true});const n=o.w>4.5?4:2,pw=o.w/n;for(let i=0;i<n;i++){const a=oa0+i*pw;B('doorWhite',a+.02,a+pw-.02,c-.08,c+.08,y0,y1-.02);
        B('doorWhite',a+.2,a+pw-.2,c-.1,c+.1,y0+.6,y1-.6);B('brass',a+pw-.3,a+pw-.24,c-.14,c+.14,y0+3,y0+3.6);}
      casing([-1,1]);col(oa0,oa1,y0,y1);break;}
    case 'garage':{casing([ext]);const secs=4,sh=(y1-y0)/secs;for(let i=0;i<secs;i++){const yy=y0+i*sh;B('garageDoor',oa0,oa1,c-.06,c+.06,yy+.02,yy+sh-.02);
        if(i===secs-1){const n=4;for(let k=0;k<n;k++){const a=oa0+.4+k*(o.w-.8)/n,b=a+(o.w-.8)/n;B('glass',a+.15,b-.15,Math.min(c+ext*.07,c+ext*.09),Math.max(c+ext*.07,c+ext*.09),yy+.3,yy+sh-.3);
            B('garageDoorPanel',(a+b)/2-.04,(a+b)/2+.04,Math.min(c+ext*.06,c+ext*.11),Math.max(c+ext*.06,c+ext*.11),yy+.3,yy+sh-.3);}}
        else for(let k=0;k<4;k++){const a=oa0+.3+k*(o.w-.6)/4;B('garageDoorPanel',a+.1,a+(o.w-.6)/4-.1,Math.min(c+ext*.06,c+ext*.1),Math.max(c+ext*.06,c+ext*.1),yy+.25,yy+sh-.25);}}
      for(const s0 of [-1,1])B('blackMetal',(oa0+oa1)/2+s0*o.w*.22-.25,(oa0+oa1)/2+s0*o.w*.22+.25,Math.min(c+ext*.1,c+ext*.16),Math.max(c+ext*.1,c+ext*.16),y0+3.2,y0+3.3);
      casing([ext]);col(oa0,oa1,y0,y1);break;}
    case 'bay':{const d=1.4,f=c+ext*t/2,g=f+ext*d;const cA=Math.min(f,g),cB=Math.max(f,g);
      B(w.ext.mat,oa0-.1,oa1+.1,cA,cB,y0-1.2,y0);B('trim',oa0,oa1,cA,cB+(ext>0?.1:0),y0-.05,y0+.12);
      if(ax==='x')quadSlab(tag,'roof',ext>0?[[oa0-.3,y1+1.0,f],[oa1+.3,y1+1.0,f],[oa1+.3,y1+.15,g+.3],[oa0-.3,y1+.15,g+.3]]:[[oa0-.3,y1+.15,g-.3],[oa1+.3,y1+.15,g-.3],[oa1+.3,y1+1.0,f],[oa0-.3,y1+1.0,f]],.18);
      B('trim',oa0-.05,oa1+.05,cA,cB,y1,y1+.2);
      // three glazed faces
      for(const [pa0,pa1] of [[oa0+.9,oa1-.9]]){B('trim',pa0,pa0+.15,g-.1,g+.1,y0,y1);B('trim',pa1-.15,pa1,g-.1,g+.1,y0,y1);B('glass',pa0+.15,pa1-.15,g-.02,g+.02,y0,y1);}
      B('trim',oa0+.6,oa1-.6,g-.2,g+.2,y0,y0+.15);
      for(const s of [oa0,oa1]){const sa=s===oa0?oa0:oa1-.15;B('trim',sa,sa+.15,cA,cB,y0,y1);}
      B('glass',oa0+.02,oa0+.06,cA+.1,cB-.1,y0,y1);B('glass',oa1-.06,oa1-.02,cA+.1,cB-.1,y0,y1);
      for(const s of [[oa0,oa0+.9],[oa1-.9,oa1]])B('glass',s[0],s[1],g-.02,g+.02,y0,y1);
      B('trim',oa0,oa1,f-ext*.02,f+ext*.0,y0-.1,y0);
      col(oa0,oa1,y0,y1);PIECES.push({tag,ax,a0:oa0,a1:oa1,c,t:.12,y0,y1,glass:true});break;}
  }
}
// ---------- stairs ----------
function stairFlight(s,o){o=o||{};const tag=o.tag||'S',tread=o.tread||'tread',riser=o.riser||'trim',soffit=o.soffit||'wall';
  const H=s.yHigh-s.yLow,N=Math.max(2,Math.round(H/(o.rise||0.643))),r=H/N,L=s.x1-s.x0,d=L/(N-1);
  for(let i=1;i<N;i++){const y=s.yLow+i*r;let xa,xb;if(s.dir>0){xa=s.x0+(i-1)*d;xb=s.x0+i*d;}else{xb=s.x1-(i-1)*d;xa=s.x1-i*d;}
    const nose=s.dir>0?[xa-.08,xb]:[xa,xb+.08];box(tag,tread,nose[0],nose[1],y-.11,y,s.z0,s.z1);
    const rx=s.dir>0?xa:xb;box(tag,riser,rx-.03,rx+.03,y-r,y-.11,s.z0+.02,s.z1-.02);addWalk(xa,xb,s.z0,s.z1,y);}
  const rx=s.dir>0?s.x1:s.x0;box(tag,riser,rx-.03,rx+.03,s.yHigh-r,s.yHigh-.02,s.z0+.02,s.z1-.02);
  if(o.open){for(const z of [s.z0,s.z1-.15]){const yA=s.dir>0?s.yLow:s.yHigh,yB=s.dir>0?s.yHigh:s.yLow;
      quadSlab(tag,o.stringer||soffit,[[s.x0,yA+.05,z],[s.x1,yB+.05,z],[s.x1,yB+.05,z+.15],[s.x0,yA+.05,z+.15]],.95);}}
  else{const yA=(s.dir>0?s.yLow:s.yHigh)-.15,yB=(s.dir>0?s.yHigh:s.yLow)-.15;
    quadSlab(tag,soffit,[[s.x0,yA,s.z0],[s.x1,yB,s.z0],[s.x1,yB,s.z1],[s.x0,yA,s.z1]],.6);}
  return {N,r,d};}
// ---------- railings ----------
function railRun(tag,a,b,h,style,o){o=o||{};const ax=a[0],ay=a[1],az=a[2],bx=b[0],by=b[1],bz=b[2];const L=Math.hypot(bx-ax,bz-az);
  if(style==='metal'){for(const p of [a,b])box(tag,'blackMetal',p[0]-.07,p[0]+.07,p[1],p[1]+h+.05,p[2]-.07,p[2]+.07);
    beam(tag,'blackMetal',[ax,ay+h,az],[bx,by+h,bz],.13,.08);
    for(let k=1;k<=4;k++){const hh=h*k/5;beam(tag,'blackMetal',[ax,ay+hh,az],[bx,by+hh,bz],.05,.05);}}
  else if(style==='hand'){beam(tag,o.mat||'blackMetal',[ax,ay+h,az],[bx,by+h,bz],.12,.12);
    const n=Math.max(2,Math.round(L/4));for(let i=0;i<=n;i++){const t=i/n;const x=ax+(bx-ax)*t,y=ay+(by-ay)*t,z=az+(bz-az)*t;box(tag,o.mat||'blackMetal',x-.03,x+.03,y+h-.35,y+h,z-.03,z+.03);}}
  else{const pm=o.post||'deckRailOld',rm=o.rail||pm;const n=Math.max(1,Math.ceil(L/6));
    for(let i=0;i<=n;i++){const t=i/n;const x=ax+(bx-ax)*t,y=ay+(by-ay)*t,z=az+(bz-az)*t;box(tag,pm,x-.18,x+.18,y-(o.postDown||0),y+h+.15,z-.18,z+.18);}
    beam(tag,rm,[ax,ay+h,az],[bx,by+h,bz],.45,.12);beam(tag,rm,[ax,ay+.35,az],[bx,by+.35,bz],.25,.12);
    const nb=Math.floor(L/.38);for(let i=1;i<nb;i++){const t=i/nb;const x=ax+(bx-ax)*t,y=ay+(by-ay)*t,z=az+(bz-az)*t;
      box(tag,o.bal||rm,x-.06,x+.06,y+.35,y+h,z-.06,z+.06);}}
  if(o.collide!==false){const y0=Math.min(ay,by),y1=Math.max(ay,by)+h;addCol(Math.min(ax,bx)-.1,Math.max(ax,bx)+.1,Math.min(az,bz)-.1,Math.max(az,bz)+.1,y0-.5,y1);}
}
