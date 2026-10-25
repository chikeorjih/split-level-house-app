// 06-house.js: house assembly: floors, ceilings, stairs, chimney, roofs, mansard, dormers, decks, porch
"use strict";

// ================= ROOF HELPERS =================
const ROOF={PR:1/3,RID:19.7,RY:12.63};
function roofA(z){return ROOF.RY-(z-ROOF.RID)*ROOF.PR;}
function roofB(z){return 8.4+(z+0.8)*(ROOF.RY-8.4)/(ROOF.RID+0.8);}
function addRoofY(z){return 3.9+(z+1.65)*(0.7/34.15);}
function hipRoof(tag,mat,x0,x1,z0,z1,y0,rise,th,fl){th=th||.35;const wx=x1-x0,wz=z1-z0,yr=y0+rise;
  if(wx>=wz){const h=wz/2,a0=x0+h,a1=x1-h,zc=(z0+z1)/2;
    quadSlab(tag,mat,[[x0,y0,z1],[x1,y0,z1],[a1,yr,zc],[a0,yr,zc]],th,fl);quadSlab(tag,mat,[[x1,y0,z0],[x0,y0,z0],[a0,yr,zc],[a1,yr,zc]],th,fl);
    quadSlab(tag,mat,[[x0,y0,z0],[x0,y0,z1],[a0,yr,zc],[a0,yr,zc]],th,fl);quadSlab(tag,mat,[[x1,y0,z1],[x1,y0,z0],[a1,yr,zc],[a1,yr,zc]],th,fl);}
  else{const h=wx/2,a0=z0+h,a1=z1-h,xc=(x0+x1)/2;
    quadSlab(tag,mat,[[x1,y0,z0],[x1,y0,z1],[xc,yr,a1],[xc,yr,a0]],th,fl);quadSlab(tag,mat,[[x0,y0,z1],[x0,y0,z0],[xc,yr,a0],[xc,yr,a1]],th,fl);
    quadSlab(tag,mat,[[x0,y0,z0],[x1,y0,z0],[xc,yr,a0],[xc,yr,a0]],th,fl);quadSlab(tag,mat,[[x1,y0,z1],[x0,y0,z1],[xc,yr,a1],[xc,yr,a1]],th,fl);}}
// dormers on the mansard: centre (along the wall), side (+1 front, -1 back or west), width, options ({axis:'x'} for one on the west face,
// lights: panes across the window); the mansard is left open between each dormer's base and its ceiling
// (the back has no dormer: it is a flat siding wall, see the wing's back walls in 02-spec.js)
// the front of the wing (front photo): brick runs up to WING_EAVE and the mansard is a short band above it; the dormer is a white box
// that drops a little below the mansard's lower edge, with a white panel under its 3-light window
// the primary bedroom's west window (photo from inside): a single-light casement in a small dormer on the west face, just past the
// closet wall
const DORMERS=[[8.0,1,5.8],[18.75,-1,3.6,{axis:'x',lights:1}]],DORMER_Y0=5.55,DORMER_YH=11.35,DORMER_WIN=[7.5,10.95],WING_EAVE=8.35;   // WING_EAVE: level with the main roof's front eave (front photo)
function mansard(){
  const X0=0,X1=19.2,Z0=0,Z1=31.6,d0=1.2,d1=.25,YT=12.7;
  const eave=(x,z)=>{if(x<0.3)return WING_EAVE;if(z<0)return x<=14.2?4.4:8.6;if(z>31.6)return WING_EAVE;return z<ROOF.RID?roofB(z):roofA(z);};
  // the back (z = 0) is a flat siding wall up to the cap, so the slate skirt runs on the other three sides only and its sides end flush
  // with that wall
  const Ee=[[X0-d0,Z0],[X1+d0,Z0],[X1+d0,Z1+d0],[X0-d0,Z1+d0]],Tt=[[X0-d1,Z0],[X1+d1,Z0],[X1+d1,Z1+d1],[X0-d1,Z1+d1]];
  const L=(p,q,s)=>[p[0]+(q[0]-p[0])*s,p[1]+(q[1]-p[1])*s];
  for(let i=1;i<4;i++){const j=(i+1)%4,hz=i%2===0,a0=hz?Ee[i][0]:Ee[i][1],a1=hz?Ee[j][0]:Ee[j][1];
    const ts=new Set(),n=Math.ceil(Math.abs(a1-a0)/1.5);for(let k=0;k<=n;k++)ts.add(k/n);
    // dormers on this edge (front edge is i=2, back edge i=0): their sides become breakpoints
    const dms=hz?DORMERS.filter(d=>!(d[3]&&d[3].axis==='x')&&d[1]===(i===2?1:-1)):(i===3?DORMERS.filter(d=>d[3]&&d[3].axis==='x'):[]);
    for(const b of [...(hz?[0.3,14.2,18.5]:[0,ROOF.RID,31.6]),...dms.flatMap(d=>[d[0]-d[2]/2,d[0]+d[2]/2])]){const t=(b-a0)/(a1-a0);if(t>.003&&t<.997){ts.add(t-.002);ts.add(t+.002);}}
    const T=[...ts].sort((p,q)=>p-q);
    for(let k=0;k<T.length-1;k++){const ea=L(Ee[i],Ee[j],T[k]),eb=L(Ee[i],Ee[j],T[k+1]),ta=L(Tt[i],Tt[j],T[k]),tb=L(Tt[i],Tt[j],T[k+1]);
      const A=[ea[0],eave(ea[0],ea[1]),ea[1]],Bv=[eb[0],eave(eb[0],eb[1]),eb[1]],C=[tb[0],YT,tb[1]],D=[ta[0],YT,ta[1]],mx=hz?(ea[0]+eb[0])/2:(ea[1]+eb[1])/2;
      if(dms.some(d=>Math.abs(mx-d[0])<d[2]/2)){
        // across a dormer: keep the slope below its base and above its ceiling, open in between
        const at=(e,t,y)=>{const f=Math.min(1,Math.max(0,(y-e[1])/(t[1]-e[1])));return [e[0]+(t[0]-e[0])*f,e[1]+(t[1]-e[1])*f,e[2]+(t[2]-e[2])*f];};
        // (no slope below the dormer when it starts below the eave: that strip would have no height, and a flat slab renders black)
        if(DORMER_Y0>Math.max(A[1],Bv[1])+.05)quadSlab('roof','slateRoof',[A,Bv,at(Bv,C,DORMER_Y0),at(A,D,DORMER_Y0)],.25);quadSlab('roof','slateRoof',[at(A,D,DORMER_YH),at(Bv,C,DORMER_YH),C,D],.25);}
      else quadSlab('roof','slateRoof',[A,Bv,C,D],.25);}}
  hipRoof('roof','roof',X0-d1-.2,X1+d1+.2,Z0-d1-.2,Z1+d1+.2,YT-.05,3.0,.3);
  {const dx=DORMERS.filter(d=>!(d[3]&&d[3].axis==='x')).map(d=>[d[0]-d[2]/2,d[0]+d[2]/2]).sort((a,b)=>a[0]-b[0]);let xa=X0-d0-.05;
    for(const [a,b] of [...dx,[X1+d0+.05,X1+d0+.05]]){if(a>xa)box('roof','trim',xa,a,WING_EAVE-.25,WING_EAVE,Z1+.3,Z1+d0+.05);xa=Math.max(xa,b);}
    const dz=[[6.85,12.95],...DORMERS.filter(d=>d[3]&&d[3].axis==='x').map(d=>[d[0]-d[2]/2,d[0]+d[2]/2])].sort((a,b)=>a[0]-b[0]);let za=Z0;
    for(const [a,b] of [...dz,[Z1+d0+.05,Z1+d0+.05]]){if(a>za)box('roof','trim',X0-d0-.05,X0-.3,WING_EAVE-.25,WING_EAVE,za,a);za=Math.max(za,b);}}// back: the wall between the wing and the main roof, flush with the siding around it; its east end follows the mansard's side slope
    polyWall('roof','sidingWhite','x',(Z0-.44+Z0+.15)/2,.59,[[14.2,8.3],[X1+d0,8.3],[X1+d0,eave(X1+d0,Z0)],[X1+d1,YT-.05],[14.2,YT-.05]]);box('3','brick',18.5,19.2,8.6,9.0,31.3,31.9);
}
function dormer(cx,side,w,opt){opt=opt||{};const ax=opt.axis==='x',lights=opt.lights||3;
  // built in (along, depth) terms: along runs with the wall (x, or z for a west dormer), depth out from it (z, or x)
  const wz=ax?0:(side>0?31.6:0),f=wz+side*1.05,y0=DORMER_Y0,yh=DORMER_YH,hw=w/2,ww=w-.9,wy0=DORMER_WIN[0],wy1=DORMER_WIN[1],fr=.14;
  const bx=(tag,mat,a0,a1,b0,b1,d0,d1)=>ax?box(tag,mat,d0,d1,b0,b1,a0,a1):box(tag,mat,a0,a1,b0,b1,d0,d1);
  const Z=(a,b)=>[Math.min(a,b),Math.max(a,b)];const [za,zb]=Z(wz,f),[fa,fb]=Z(f-side*.14,f);
  for(const s of [-1,1]){const x=cx+s*(hw-.12);bx('4','dormerClad',x-.12,x+.12,y0,yh,za,zb);PIECES.push({tag:'4',ax:ax?'x':'z',a0:za,a1:zb,c:x,t:.24,y0,y1:yh});
    const xi=cx+s*(hw-.26);bx('4','wall',xi-.02,xi+.02,wy0,yh-.1,za,zb);}
  bx('4','dormerClad',cx-hw,cx+hw,y0,wy0,fa,fb);bx('4','dormerClad',cx-hw,cx+hw,wy1,yh,fa,fb);
  bx('4','dormerClad',cx-hw,cx-ww/2,wy0,wy1,fa,fb);bx('4','dormerClad',cx+ww/2,cx+hw,wy0,wy1,fa,fb);
  bx('4','trim',cx-ww/2,cx+ww/2,wy0,wy0+fr,fa,fb);bx('4','trim',cx-ww/2,cx+ww/2,wy1-fr,wy1,fa,fb);
  bx('4','trim',cx-ww/2,cx-ww/2+fr,wy0,wy1,fa,fb);bx('4','trim',cx+ww/2-fr,cx+ww/2,wy0,wy1,fa,fb);
  for(let k=1;k<lights;k++){const x=cx-ww/2+ww*k/lights;bx('4','trim',x-.06,x+.06,wy0,wy1,fa,fb);}
  const [ga,gb]=Z(f-side*.09,f-side*.05);bx('4','glass',cx-ww/2+fr,cx+ww/2-fr,wy0+fr,wy1-fr,ga,gb);
  PIECES.push({tag:'4',ax:ax?'z':'x',a0:cx-ww/2,a1:cx+ww/2,c:f-side*.07,t:.12,y0:wy0,y1:wy1,glass:true});
  bx('4','ceiling',cx-hw+.24,cx+hw-.24,yh-.1,yh,za,zb);bx('4','trim',cx-hw+.24,cx+hw-.24,wy0-.1,wy0,za,zb);
  // segmental arched roof, white
  const hw2=hw+.2,rise=.8,R=(hw2*hw2+rise*rise)/(2*rise),a=Math.asin(hw2/R),cY=yh+rise-R,len=1.45,zc=wz+side*(1.05-len/2+.14);
  const rot=ax?new THREE.Matrix4().makeRotationY(Math.PI/2).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2)):new THREE.Matrix4().makeRotationX(Math.PI/2);
  addGeo('4','dormerClad',new THREE.CylinderGeometry(R,R,len,28,1,true,Math.PI-a,2*a),rot.setPosition(ax?zc:cx,cY,ax?cx:zc));
  const sh=new THREE.Shape();sh.absarc(0,0,R-.02,Math.PI/2+a,Math.PI/2-a,true);sh.closePath();
  const fz=side>0?f-.14:f,face=ax?new THREE.Matrix4().makeRotationY(Math.PI/2).setPosition(fz,cY,cx):new THREE.Matrix4().makeTranslation(cx,cY,fz);
  addGeo('4','dormerClad',new THREE.ExtrudeGeometry(sh,{depth:.14,bevelEnabled:false,curveSegments:24}),face);
}
// ================= HOUSE ASSEMBLY =================
let SPEC;
function buildHouse(){
  SPEC=buildSpec();{const all=SPEC.rooms;SPEC.allRooms=all;Object.defineProperty(SPEC,'rooms',{get:()=>all.filter(r=>phOn(r.ph))});}
  for(const w of SPEC.walls)wallBuild(w);
  for(const f of SPEC.floors){PH=f.ph||null;OWNER={key:'F@'+(f.loc?locKey(f.loc):f.x0+','+f.z0),kind:'floor',fn:'F',loc:f.loc,label:f.mat+' floor'};box(String(f.lv),f.mat,f.x0,f.x1,f.y-.9,f.y,f.z0,f.z1);addWalk(f.x0,f.x1,f.z0,f.z1,f.y);}
  for(const c of SPEC.ceils){PH=c.ph||null;OWNER={key:'C@'+(c.loc?locKey(c.loc):c.x0+','+c.z0),kind:'ceiling',fn:'C',loc:c.loc,label:'ceiling'};box('C'+c.lv,'ceiling',c.x0,c.x1,c.y,c.y+.12,c.z0,c.z1);}
  OWNER=null;PH=null;
  // recessed can lights (hidden with ceilings); the two upper-floor bedrooms have a ceiling fan with a light instead (07-furniture.js)
  const cans=[[2,2,12.5,2,17],[3,16,30,2,10],[3,25,34,15,30],[3,19.5,22.5,13,30],[1,3,34,3,28],[2,-20,-2,20,31],[2,2,10,21,30]];
  for(const [lv,x0,x1,z0,z1] of cans){const y=CEIL[lv];PH=x1<=0?'a':null;   // (the suite's: the addition only)
   for(let x=x0;x<=x1;x+=Math.max(3.5,(x1-x0)/3))for(let z=z0;z<=z1;z+=Math.max(3.5,(z1-z0)/3)){
    addGeo('C'+lv,'light',new THREE.CylinderGeometry(.22,.22,.04,14),M(x,y-.01,z));addGeo('C'+lv,'trim',new THREE.TorusGeometry(.25,.03,5,16),new THREE.Matrix4().makeRotationX(Math.PI/2).setPosition(x,y-.02,z));}}
  PH=null;

  // ---------- stairs ----------
  const st={};for(const s of SPEC.stairs)st[s.id]=s;
  stairFlight(st.A);stairFlight(st.Bup);stairFlight(st.Bdn);
  polyWall('S','wall','x',15.7,.3,[[14.2,0],[19.2,0],[19.2,.35],[14.2,4.85]]);
  railRun('S',[19.15,0.2,15.72],[14.25,4.7,15.72],2.95,'metal',{collide:false});
  railRun('S',[14.3,-4.5+.1,15.5],[19.1,0,15.5],2.8,'hand',{collide:false});
  railRun('S',[14.3,-4.5,19.38],[24.9,-13.5,19.38],2.8,'hand',{collide:false});
  railRun('S',[14.3,-4.5,12.42],[19.1,0,12.42],2.8,'hand',{collide:false});
  railRun('S',[19.15,0,19.38],[14.25,4.5,19.38],2.8,'hand',{collide:false});
  addCol(14.2,19.2,15.55,15.85,0,12.5);addCol(14.2,25,15.55,15.85,-13.5,0);
  // L3 hall edge above flight A top / B-up start: half wall with black rail toward the living room is the z=12.2 wall

  // ---------- chimney & fireplace ----------
  box('X','brick',-1.85,-0.3,-17,18.2,6.9,12.9);box('X','concrete',-2.0,-0.15,18.2,18.5,6.75,13.05);
  for(const z of [8.3,11.0])addGeo('X','blackMetal',new THREE.CylinderGeometry(.35,.35,1.2,12),M(-1.05,18.9,z));
  addCol(-1.85,-0.3,6.9,12.9,-17,18.2);
  const e2=E[2];
  box('2','brickWhite',0.3,1.6,e2,e2+4.55,7.0,12.6);box('2','trim',0.3,1.55,e2+4.55,CEIL[2],7.0,12.6);
  for(let z=7.6;z<12.6;z+=1.2)box('2','trim',1.55,1.6,e2+4.55,CEIL[2],z-.05,z+.05);
  box('2','beam',1.4,2.1,e2+4.5,e2+4.85,6.95,12.65);
  box('2','brickWhite',1.6,3.1,e2,e2+1.1,6.8,12.8);addWalk(1.6,3.1,6.8,12.8,e2+1.1);addCol(0.3,1.6,7,12.6,e2,CEIL[2]);
  box('2','firebox',1.58,1.64,e2+1.1,e2+3.35,8.5,11.1);
  for(const [a,b,c,d] of [[8.45,8.55,1.1,3.4],[11.05,11.15,1.1,3.4],[8.45,11.15,3.3,3.4]])box('2','brass',1.62,1.7,e2+c,e2+d,a,b);
  box('2','blackMetal',1.66,1.69,e2+1.12,e2+3.28,8.6,11.0,'');
  box('2','tvScreen',1.6,1.72,e2+5.5,e2+7.35,8.1,11.5);box('2','black',1.6,1.62,e2+5.45,e2+7.4,8.05,11.55);

  // ---------- roofs (matched to the street photo) ----------
  // main block + garage: one continuous roof, ridge east-west, ending in a gable over the garage's east wall (aerial photo)
  const RF=(pts)=>quadSlab('roof','roof',pts,.38),A=roofA,B=roofB,RY=ROOF.RY,RID=ROOF.RID,GE=roofA(29.6);
  RF([[19.2,RY,RID],[35.6,RY,RID],[35.6,A(32.4),32.4],[19.2,A(32.4),32.4]]);
  // garage front: the main roof's front slope carried on to the gable, eave level with the main roof's (z 32.4)
  RF([[35.6,RY,RID],[54.9,RY,RID],[54.9,A(32.4),32.4],[35.6,A(32.4),32.4]]);
  RF([[19.2,RY,RID],[44.6,RY,RID],[44.6,8.4,-0.8],[19.2,8.4,-0.8]]);
  RF([[44.6,RY,RID],[54.9,RY,RID],[54.9,GE,9.8],[44.6,GE,9.8]]);
  // the gable: white siding over the garage's east brick wall, white rake boards along the roof's edge
  {const Bg=z=>RY-(RID-z)*ROOF.PR;polyWall('3','sidingWhite','z',54.1,.5,[[10.3,8.6],[10.3,Bg(10.3)-.12],[RID,RY-.12],[31.9,A(31.9)-.12],[31.9,8.6]]);
    beam('roof','trim',[54.98,A(32.4)-.2,32.45],[54.98,RY-.2,RID],.2,.48);beam('roof','trim',[54.98,RY-.2,RID],[54.98,GE-.2,9.75],.2,.48);}
  // the dining wing's gable, standing above the garage's steeper rear slope (aerial photo): white siding with a white rake board
  polyWall('3','sidingWhite','z',44.6,.4,[[9.8,GE-.2],[9.8,B(9.8)-.1],[RID,RY-.1]]);beam('roof','trim',[44.68,B(-0.8)-.2,-0.85],[44.68,RY-.2,RID],.2,.48);
  polyWall('3','sidingWhite','z',43.8,.6,[[0,8.3],[10.6,8.3],[10.6,B(10.6)-.1],[0,B(0)-.1]]);   // the dining room's small gable: siding, as on the wall below
box('3','brick',44.6,54.4,8.6,GE+.1,10.3,10.9);
  // fascia along the front eaves
  // white fascia band (front photo): 3 in tall, flush with the band under the mansard (same height, same front face), then on across the garage
  box('roof','trim',19.2,54.95,A(32.4)-.3,A(32.4)-.05,32.35,32.85);
  // white fascia on the rear eaves and the roof's open ends too, over the cut edges of the roof slabs
  box('roof','trim',19.15,44.65,8.0,8.4,-1.25,-0.75);box('roof','trim',44.6,54.95,GE-.4,GE,9.35,9.85);
  beam('roof','trim',[19.12,8.4-.2,-0.85],[19.12,B(0.1)-.2,0.1],.2,.48);
  // upper floor: mansard with slate-look skirt, low hipped cap, arched dormers front and back
  mansard();for(const d of DORMERS)dormer(...d);
  // front photo: black shutters either side of the wing's window under the dormer, and a wide white surround on the kitchen window
  {const zf=31.6+.3+.14,e2=E[2];for(const s of [-1,1]){const xc=8.0+s*(2.3+.57);box('2','shutter',xc-.57,xc+.57,e2+2.45,e2+7.35,zf,zf+.1);
      for(const y of [e2+3.6,e2+6.2])box('2','shutter',xc-.5,xc+.5,y,y+.08,zf+.1,zf+.13);}
    const kx=29.9,kw=4.8/2,k0=E[3]+3.45,k1=E[3]+7.1,b=.55,z0=zf,z1=zf+.22;
    box('3','trim',kx-kw-b,kx+kw+b,k0-b,k0,z0,z1);box('3','trim',kx-kw-b,kx+kw+b,k1,k1+b,z0,z1);box('3','trim',kx-kw-b,kx-kw,k0,k1,z0,z1);box('3','trim',kx+kw,kx+kw+b,k0,k1,z0,z1);}
  // entry (front photo): a flat canopy at the main roof's eave, white fascia and soffit, on two slim white posts; the left post stands
  // against the wing's corner, and both run down to the landing
  {const ey=A(32.4),x0=18.5,x1=23.7,z1=35.5;box('roof','metalRoof',x0,x1,ey-.2,ey-.05,32.4,z1);
    box('roof','trim',x0,x1,ey-.3,ey-.05,z1-.15,z1);box('roof','trim',x1-.15,x1,ey-.3,ey-.05,32.85,z1);box('3','trim',x0,x1,ey-.35,ey-.25,31.6,z1);
    for(const x of [18.75,23.4]){box('3','trim',x-.17,x+.17,-0.5,ey-.35,z1-.42,z1-.08);addCol(x-.17,x+.17,z1-.42,z1-.08,-0.5,ey-.35);}}
  for(const [x,z] of [[18.75,31.98],[45.0,31.95],[35.95,31.95]]){box('3','blackMetal',x-.22,x+.22,5.6,6.5,z,z+.32);box('3','shade',x-.17,x+.17,5.68,6.38,z+.06,z+.3);LAMPS.push({v:new THREE.Vector3(x,6.0,z+.6),k:'outdoor'});}
  // addition: brick box under a near-flat dark standing-seam roof (draining to the rear), dark fascia (all of it: the addition state only)
  PH='a';
  quadSlab('roof','metalRoof',[[-21.85,addRoofY(-2.0)+.12,-2.0],[0.2,addRoofY(-2.0)+.12,-2.0],[0.2,addRoofY(32.85)+.12,32.85],[-21.85,addRoofY(32.85)+.12,32.85]],.3,'new');
  polyWall('2','brick','z',-21.5,.6,[[-1.65,3.85],[32.5,3.85],[32.5,4.6],[-1.65,3.92]]);
  box('roof','frameDark',-21.95,0.2,addRoofY(32.85)-.45,addRoofY(32.85)+.2,32.75,32.95);
  box('roof','frameDark',-21.95,0.2,addRoofY(-2)-.45,addRoofY(-2)+.2,-2.1,-1.9);
  beam('roof','frameDark',[-21.85,addRoofY(-2)-.12,-2.0],[-21.85,addRoofY(32.85)-.12,32.85],.2,.65);
  // four-seasons ceiling follows the low roof, beams kept
  const cy=z=>addRoofY(z)-.45;
  quadSlab('C2','ceiling',[[-21.2,cy(-1.35),-1.35],[-0.3,cy(-1.35),-1.35],[-0.3,cy(12.7),12.7],[-21.2,cy(12.7),12.7]],.1);
  for(let z=-0.6;z<=12.4;z+=2.6)beam('C2','beam',[-21.1,cy(z)-.17,z],[-0.4,cy(z)-.17,z],.35,.3);
  box('2','wall',-4.9,0,3.45,3.85,12.7,13.1);
  // underside of the suite floor, seen through the lower openings
  box('X','underside',-21.2,-0.3,-5.62,-5.45,12.9,32.2);
  // soffit under the four-seasons room + wood posts (1 ft square) over the patio
  box('2','trim',-21.8,0,-6.0,-5.4,-1.95,12.9);
  for(const [x,z] of [[-21.2,-1.35],[-14.3,-1.35],[-7.3,-1.35],[-0.9,-1.35],[-21.2,5.8]]){box('X','pierWood',x-.5,x+.5,-16.05,-5.9,z-.5,z+.5);addCol(x-.5,x+.5,z-.5,z+.5,-16.05,-5.9);}
  box('X','beam',-21.8,0,-6.6,-5.95,-1.7,-1.0);
  PH=null;

  // ---------- decks, porch, patio ----------
  const deck=(tag,mat,x0,x1,z0,z1,top,postMat)=>{box(tag,mat,x0,x1,top-.15,top,z0,z1);addWalk(x0,x1,z0,z1,top);
    for(let x=x0+.6;x<x1;x+=Math.max(3,(x1-x0)/3))for(const z of [z0+.6,z1-.6,(z0+z1)/2]){const g=terrainH(x,z);if(g<top-.6)box(tag,postMat,x-.25,x+.25,g-.5,top-.15,z-.25,z+.25);}
    box(tag,postMat,x0,x1,top-.9,top-.15,z0,z0+.15);box(tag,postMat,x0,x1,top-.9,top-.15,z1-.15,z1);};
  deck('1','deckOld',14.7,29.7,-8.9,0,E[1]-.1,'deckRailOld');
  railRun('1',[14.8,E[1]-.1,-8.8],[29.6,E[1]-.1,-8.8],3,'wood');
  railRun('1',[14.8,E[1]-.1,-8.8],[14.8,E[1]-.1,-3.6],3,'wood');railRun('1',[29.6,E[1]-.1,-8.8],[29.6,E[1]-.1,-3.1],3,'wood');
  PH='c';railRun('1',[29.6,E[1]-.1,-3.1],[29.6,E[1]-.1,-0.1],3,'wood');PH=null;   // (as it stands there is no stair from the dining-room deck: the railing runs on to the house)
  stairFlight({x0:10.3,x1:14.7,z0:-3.6,z1:-0.3,yLow:-16.05,yHigh:E[1]-.1,dir:1},{tag:'1',tread:'deckOld',riser:'deckRailOld',open:true,stringer:'deckRailOld'});
  railRun('1',[10.3,-16.05,-3.55],[14.7,E[1]-.1,-3.55],3,'wood');
  stairFlight({x0:-2.4,x1:-0.3,z0:2.4,z1:6.0,yLow:-16.05,yHigh:E[1],dir:1},{tag:'1',tread:'paver',riser:'concrete',soffit:'concrete'});
  // new deck off the dining room (level 3) and Route A stair down to the existing deck (the addition state only)
  PH='a';
  deck('3','deckNew',43.8,54.1,-2.15,10.35,-0.15,'deckNew');deck('3','deckNew',43.8,46.8,-2.95,-2.15,-0.15,'deckNew');
  for(const [a,b] of [[[43.9,-.15,-2.85],[46.8,-.15,-2.85]],[[46.8,-.15,-2.85],[46.8,-.15,-2.05]],[[46.8,-.15,-2.05],[54.0,-.15,-2.05]],[[54.0,-.15,-2.05],[54.0,-.15,10.3]]])railRun('3',a,b,3,'wood',{post:'deckNew',rail:'deckNew',bal:'blackMetal',postDown:.9});
  stairFlight({x0:29.8,x1:43.8,z0:-3.0,z1:-0.05,yLow:E[1]-.1,yHigh:-0.15,dir:1},{tag:'3',tread:'deckNew',riser:'deckNew',open:true,stringer:'deckNew'});
  railRun('3',[29.8,E[1]-.1,-2.95],[43.8,-.15,-2.95],3,'wood',{post:'deckNew',rail:'deckNew',bal:'blackMetal'});
  for(const x of [31.5,35,38.5,42]){const z=-2.8,top=-0.15-(43.8-x)/14*(13.45),g=terrainH(x,z);box('3','deckNew',x-.22,x+.22,g-.4,top-.9,z-.22,z+.22);}
  PH=null;
  // front entry, as in the listing photo: a concrete walk runs along the house front from the driveway to the front door, level at the door
  // and easing down to the driveway; a low brick wall with a concrete cap encloses it on the yard side and the west end, with a wood rail by
  // the door. No stair down to the lawn.
  {const WX0=18.1,WX1=36,WZ0=31.6,WZ1=36.0,T=.35,ent=24,yE=-.5,yD=-.8,top=x=>x<=ent?yE:yE+(yD-yE)*(x-ent)/(WX1-ent);
    box('3','drive',WX0,ent,yE-.6,yE,WZ0,WZ1);quadSlab('3','drive',[[ent,yE,WZ0],[WX1,yD,WZ0],[WX1,yD,WZ1],[ent,yE,WZ1]],.6);
    addWalk(WX0,ent,WZ0,WZ1,yE);for(let x=ent;x<WX1;x+=3)addWalk(x,Math.min(WX1,x+3),WZ0,WZ1,top(x+1.5));
    const low=(xa,za,xb,zb)=>Math.min(terrainH(xa,za),terrainH(xb,zb),terrainH((xa+xb)/2,(za+zb)/2))-.4;
    for(let x=WX0;x<WX1-.01;x+=3){const xb=Math.min(WX1,x+3),cap=Math.max(top(x),top(xb))+1.1,y0=low(x,WZ1+T/2,xb,WZ1+T/2);
      box('3','brick',x,xb,y0,cap-.1,WZ1,WZ1+T);box('3','concrete',x-.03,xb+.03,cap-.1,cap,WZ1-.04,WZ1+T+.04);addCol(x,xb,WZ1,WZ1+T,y0,cap);}
    {const cap=yE+1.1,y0=low(WX0-T/2,WZ0,WX0-T/2,WZ1+T);box('3','brick',WX0-T,WX0,y0,cap-.1,WZ0,WZ1+T);box('3','concrete',WX0-T-.04,WX0+.03,cap-.1,cap,WZ0,WZ1+T+.04);addCol(WX0-T,WX0,WZ0,WZ1+T,y0,cap);}
    railRun('3',[WX0+.15,yE+1.1,WZ1+T/2],[26.6,yE+1.1,WZ1+T/2],1.9,'wood',{collide:false});railRun('3',[WX0-T/2,yE+1.1,WZ0+.3],[WX0-T/2,yE+1.1,WZ1+T/2],1.9,'wood',{collide:false});}
  // patio
  box('1','paver',-27,10.3,-16.25,-16.05,-3.75,0);box('1','paver',-27,0,-16.25,-16.05,0,6.5);
  addWalk(-27,10.3,-3.75,0,-16.05);addWalk(-27,0,0,6.5,-16.05);
  // ---------- as it stands (the current state) ----------
  PH='c';{
    // the balcony off the family room (8'11" x 16'5"), at the family room's floor, over the brick patio, round the chimney; posts down to
    // the patio and the lower deck's wood railing on its three open sides; no stair
    const top=E[2]-.1;deck('2','deckOld',-8.9,0,0,16.4,top,'deckRailOld');
    railRun('2',[-8.8,top,0.1],[-0.1,top,0.1],3,'wood');railRun('2',[-8.8,top,0.1],[-8.8,top,16.3],3,'wood');railRun('2',[-8.8,top,16.3],[-0.1,top,16.3],3,'wood');
    for(const [x,z] of [[-8.6,0.3],[-8.6,8.2],[-8.6,16.1],[-0.6,0.3],[-0.6,16.1]]){const g=terrainH(x,z,true);box('2','deckRailOld',x-.28,x+.28,g-.3,top-.15,z-.28,z+.28);}
    // the patio as in the photo: a brick seat wall (rowlock cap) round two sides of a sitting area
    const py=-16.05,sw=(x0,x1,z0,z1)=>{box('1','brick',x0,x1,py,py+1.6,z0,z1);box('1','brick',x0-.06,x1+.06,py+1.6,py+1.85,z0-.06,z1+.06);addCol(x0,x1,z0,z1,py,py+1.85);};
    sw(-20.6,-9.6,-3.5,-2.75);sw(-20.6,-19.85,-2.75,5.6);
    // the lawn where the suite will stand, at its natural grade (the terrain there is dug down for the addition's lower openings)
    {const x0=-21.5,x1=0,z0=12.9,z1=32.5,N=22,M2=20,g=new THREE.BufferGeometry(),P=[],I=[];
      for(let j=0;j<=M2;j++)for(let i=0;i<=N;i++){const x=x0+(x1-x0)*i/N,z=z0+(z1-z0)*j/M2;P.push(x,terrainH(x,z,true)+.02,z);}
      for(let j=0;j<M2;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;I.push(a,c,b,b,c,d);}
      g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();
      const uv=[];for(let k=0;k<P.length;k+=3)uv.push(P[k]/8,P[k+2]/8);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      addGeo('site','grass',g);g.dispose();
      for(let i=0;i<N;i++)for(let j=0;j<M2;j++){const x=x0+(x1-x0)*(i+.5)/N,z=z0+(z1-z0)*(j+.5)/M2;addWalk(x0+(x1-x0)*i/N,x0+(x1-x0)*(i+1)/N,z0+(z1-z0)*j/M2,z0+(z1-z0)*(j+1)/M2,terrainH(x,z,true));WALKS[WALKS.length-1].lawn=true;}}
  }PH=null;
  // with the addition: lawn over the dig-out under the suite (open to the patio), on the terrain's own grid lines so it follows the pit's
  // floor and steep sides; texture laid flat on the floor and upright on the sides
  PH='a';{const xs=[-21.5,0],zs=[12.9,32.5],P=[],U=[];for(let x=-21;x<0;x+=2)xs.push(x);for(let z=13;z<32.5;z+=2)zs.push(z);xs.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);
    const v=(x,z)=>[x,terrainH(x,z)+.02,z],tri=(a,b,c)=>{const n=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).cross(new THREE.Vector3(...c).sub(new THREE.Vector3(...a))).normalize(),flat=Math.abs(n.y)>.5;
      for(const p of [a,b,c]){P.push(...p);U.push(...(flat?[p[0],p[2]]:[p[0]+p[2],p[1]]));}};
    for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){const a=v(xs[i],zs[j]),b=v(xs[i+1],zs[j]),c=v(xs[i],zs[j+1]),d=v(xs[i+1],zs[j+1]);tri(a,c,b);tri(b,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.computeVertexNormals();
    addGeo('site','grass',g);g.dispose();}PH=null;
  // garage apron & thresholds
  addWalk(35.6,54.1,28.6,29.2,-0.45);box('3','concrete',35.9,53.8,-0.9,-0.45,28.5,29.2);
}
