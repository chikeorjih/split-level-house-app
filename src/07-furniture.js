// 07-furniture.js: furniture, fixtures, appliances and decor (each T() call is a movable piece)
"use strict";
// ================= FURNITURE, FIXTURES, APPLIANCES =================
const KITCHEN_LIGHTS={cans:[[25,20],[25,25],[32,25],[25,30],[28.5,30],[32,30]],drum:null},SPOT_LAMPS=[];const DOORS=phStamp([]);const CAPS=phStamp([]);const cap=(tag,x0,x1,z0,z1,y0,y1)=>CAPS.push({tag,x0,x1,z0,z1,y0,y1});
function roundedGeo(w,h,d,r){r=Math.max(.01,Math.min(r,w/2-.02,h/2-.02,d/2-.02));
  const iw=w-2*r,ih=h-2*r,cr=Math.min(r*.6,iw/2-.001,ih/2-.001),s=new THREE.Shape();
  const x=-iw/2,y=-ih/2;s.moveTo(x+cr,y);s.lineTo(x+iw-cr,y);s.quadraticCurveTo(x+iw,y,x+iw,y+cr);s.lineTo(x+iw,y+ih-cr);
  s.quadraticCurveTo(x+iw,y+ih,x+iw-cr,y+ih);s.lineTo(x+cr,y+ih);s.quadraticCurveTo(x,y+ih,x,y+ih-cr);s.lineTo(x,y+cr);s.quadraticCurveTo(x,y,x+cr,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.01,d-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,curveSegments:4});
  g.translate(0,0,-(d-2*r)/2);return g;}
const FURN=[],LAMPS=phStamp([]),INSTS=[],INST_N={};
function P(tag,ox,oy,oz,ry){const base=new THREE.Matrix4().makeRotationY(ry||0).setPosition(ox,oy,oz);let self;
  const addGeo=(tg,mat,geo,m)=>{const g2=(geo.index?geo.toNonIndexed():geo.clone()).applyMatrix4(m);if(self&&self._grp){g2.computeBoundingBox();self._grp.union(g2.boundingBox);}
    const prev=OWNER,pi=INST_TARGET;if(self&&self._owner)OWNER=self._owner;if(self&&self._inst)INST_TARGET=self._inst;ADDGEO(tg,mat,g2,null);OWNER=prev;INST_TARGET=pi;};
  const at=(x,y,z,rx,rY,rz,s)=>{const m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx||0,rY||0,rz||0));if(s)m.scale(new THREE.Vector3(s[0],s[1],s[2]));m.setPosition(x,y,z);return base.clone().multiply(m);};
  return self={
    wp(x,y,z){return new THREE.Vector3(x,y,z).applyMatrix4(base);},
    b(mat,x,y,z,w,h,d,rY){addGeo(tag,mat,new THREE.BoxGeometry(w,h,d),at(x,y+h/2,z,0,rY||0));},
    r(mat,x,y,z,w,h,d,rad,rY){addGeo(tag,mat,roundedGeo(w,h,d,rad),at(x,y+h/2,z,0,rY||0));},
    c(mat,x,y,z,rt,rb,h,seg,rx,rz){addGeo(tag,mat,new THREE.CylinderGeometry(rt,rb,h,seg||16),at(x,y+h/2,z,rx||0,0,rz||0));},
    s(mat,x,y,z,rad,sx,sy,sz){addGeo(tag,mat,new THREE.SphereGeometry(rad,14,10),at(x,y,z,0,0,0,[sx||1,sy||1,sz||1]));},
    g(mat,geo,x,y,z,rx,rY,rz,s){addGeo(tag,mat,geo,at(x,y,z,rx,rY,rz,s));},
    col(x,z,w,d,y0,y1){const pts=[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]].map(p=>new THREE.Vector3(p[0],0,p[1]).applyMatrix4(base));
      const r=[Math.min(...pts.map(p=>p.x)),Math.max(...pts.map(p=>p.x)),Math.min(...pts.map(p=>p.z)),Math.max(...pts.map(p=>p.z))];const c=addCol(r[0],r[1],r[2],r[3],oy+(y0||0),oy+(y1||3));if(self&&self._inst)self._inst.cols.push({c,r});}
  };}
const lathe=(pts,seg)=>new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg||24);

// ----- seating -----
function sofa(p,len,dep,o){o=o||{};const m=o.mat||'fabricCream',armW=o.arms===false?0:.55,seatH=1.45;
  p.r(m,0,.25,0,len,.95,dep,.12);
  const n=o.n||Math.max(1,Math.round((len-2*armW)/2.7)),cw=(len-2*armW)/n;
  for(let i=0;i<n;i++)p.r(m,-len/2+armW+cw*(i+.5),1.12,.3,cw-.04,.42,dep-.9,.16);
  if(o.back!==false){p.r(m,0,.9,-dep/2+.38,len,1.85,.75,.16);
    for(let i=0;i<n;i++)p.r(m,-len/2+armW+cw*(i+.5),1.5,-dep/2+.95,cw-.08,1.2,.6,.22);}
  if(armW){for(const s of [-1,1])p.r(m,s*(len/2-armW/2),.25,0,armW,1.95,dep,.14);}
  for(const [x,z] of [[-len/2+.3,-dep/2+.3],[len/2-.3,-dep/2+.3],[-len/2+.3,dep/2-.3],[len/2-.3,dep/2-.3]])p.c('walnutDark',x,0,z,.07,.05,.25,8);
  (o.pillows||[]).forEach((pm,i,a)=>{const x=-len/2+armW+.9+i*((len-2*armW-1.8)/Math.max(1,a.length-1));p.r(pm,x,1.55,-dep/2+1.25,1.45,1.35,.42,.2,(i%2?.12:-.12));});
  p.col(0,0,len,dep,0,seatH);}
function ottoman(p,w,d,m){p.r(m||'fabricCream',0,.25,0,w,1.2,d,.15);p.col(0,0,w,d,0,1.4);}
function clubChair(p){const m='leather';p.r(m,0,.3,.1,2.5,.9,2.6,.2);p.r(m,0,1.1,.35,1.7,.45,1.9,.18);
  p.r(m,0,.3,-1.0,2.5,2.65,.5,.2);for(const s of [-1,1])p.r(m,s*1.05,.3,.1,.45,1.95,2.6,.18);
  for(const [x,z] of [[-1,-1],[1,-1],[-1,1.1],[1,1.1]])p.c('walnutDark',x,0,z,.06,.05,.3,8);p.col(0,0,2.6,2.7,0,3);}
function loungeChair(p,m){p.r(m,0,.35,.05,2.4,.85,2.5,.18);p.r(m,0,1.15,.25,1.8,.4,1.9,.16);p.r(m,0,.35,-1.0,2.4,2.4,.45,.18);
  for(const s of [-1,1])p.r(m,s*1.0,.35,.05,.4,1.6,2.5,.15);for(const [x,z] of [[-1,-1],[1,-1],[-1,1.1],[1,1.1]])p.c('oakFurn',x,0,z,.07,.05,.35,8);p.col(0,0,2.4,2.5,0,2.8);}
function hostChair(p){p.r('linen',0,1.4,0,1.85,.45,1.9,.12);p.r('linen',0,1.4,-.85,1.85,2.6,.32,.14);p.r('linen',0,3.75,-.78,1.95,.35,.55,.16);
  for(const [x,z] of [[-.75,-.8],[.75,-.8],[-.75,.75],[.75,.75]])p.c('walnutDark',x,0,z,.06,.05,1.42,8);}
function bistroChair(p){const k='black';p.c(k,0,1.45,0,.72,.72,.08,20);
  for(const [x,z] of [[-.55,-.5],[.55,-.5],[-.55,.5],[.55,.5]])p.c(k,x,0,z,.04,.04,1.45,6);
  p.g(k,new THREE.TorusGeometry(.6,.035,6,24,Math.PI),0,2.15,-.55,0,0,0);
  for(const s of [-1,1])p.g(k,new THREE.CylinderGeometry(.025,.025,1.3,5),0,2.05,-.6,0,0,s*.75);
  for(const s of [-1,1])p.c(k,s*.55,1.45,-.55,.035,.035,.95,6);
  p.g(k,new THREE.TorusGeometry(.5,.02,5,20),0,.55,0,Math.PI/2,0,0);}
function barStool(p){const k='black';p.r('linen',0,2.42,0,1.25,.22,1.25,.08);
  for(const [x,z] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]])p.b(k,x,0,z,.1,2.45,.1);
  p.b(k,0,.9,-.5,1.0,.08,.08);p.b(k,0,.9,.5,1.0,.08,.08);p.b(k,-.5,.9,0,.08,.08,1.0);p.b(k,.5,.9,0,.08,.08,1.0);
  for(const s of [-1,1])p.b(k,s*.5,2.6,-.55,.1,1.05,.1);p.r('linen',0,3.15,-.57,1.05,.42,.1,.04);p.b(k,0,3.6,-.57,1.1,.08,.12);}
// ----- tables & storage -----
function coffeeTable(p,w,d){p.r('oakFurn',0,1.25,0,w,.18,d,.08);p.b('oakLight',0,1.05,0,w-.3,.2,d-.3);
  for(const [x,z] of [[-w/2+.2,-d/2+.2],[w/2-.2,-d/2+.2],[-w/2+.2,d/2-.2],[w/2-.2,d/2-.2]])p.b('oakFurn',x,0,z,.16,1.25,.16);
  p.b('oakLight',0,.3,0,w-.4,.06,d-.4);p.col(0,0,w,d,0,1.45);}
// a box with UVs in feet (u along x on the top and long faces, along z on the ends, v up the sides), for wood whose grain keeps its real
// scale on every part; o shifts the UVs so neighbouring parts don't show the same boards
function boxFt(w,h,d,o){const g=new THREE.BoxGeometry(w,h,d),P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;o=o||0;
  for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),ax=Math.abs(N.getX(i))>.5,ay=Math.abs(N.getY(i))>.5;U.setXY(i,(ax?z:x)+o,(ay?z:y)+o*.37);}return g;}
// the curved cove where a leg sweeps into an apron's underside: radius r, depth along z, running from the leg toward +x (s 1) or -x (s -1)
function coveGeo(r,dep,s){const pts=[[0,0],[s*r,0]];for(let i=1;i<=10;i++){const a=Math.PI/2+i/10*Math.PI/2;pts.push([s*(r+r*Math.cos(a)),-r+r*Math.sin(a)]);}
  return new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(q=>new THREE.Vector2(q[0],q[1]))),{depth:dep,bevelEnabled:false}).translate(0,0,-dep/2);}
// extendable walnut dining table, after the owner's photo: a top in two halves (the leaf seam across the middle) over a dark backer, with
// an eased underside edge; aprons flush with the legs' outer faces, the long ones split at the seam; legs 2.5" square with rounded edges
// that sweep into the aprons through curved coves; black levelling glides. w along x, d along z (feet); 30" high.
function walnutTable(p,w,d){const G='walnutGrain',H=2.5,tt=1/12,lg=2.5/12,ins=1/12,ah=3.5/12,at=.9/12,cr=2.5/12,gl=.02,yA=H-tt,
    lx=w/2-ins-lg/2,lz=d/2-ins-lg/2,ox=w/2-ins,oz=d/2-ins;
  // the top: two halves with a hairline seam over a dark backer, on a slightly smaller board that eases its underside edge
  for(const s of [-1,1])p.g(G,boxFt(w/2-.004,tt*.75,d),s*(w/4+.002),H-tt*.375,0);   // (no UV offset: the boards run on across the seam)
  p.b('cabGap',0,H-tt*.75-.002,0,.03,tt*.75,d-.02);p.g(G,boxFt(w-.04,tt*.25,d-.04,.6),0,yA+tt*.125,0);
  // aprons: the long ones in two halves at the seam (a dark reveal between), the short ones whole
  for(const s of [-1,1]){for(const h of [-1,1])p.g(G,boxFt(lx-.003,ah,at,h*.9+s),h*(lx/2+.0015),yA-ah/2,s*(oz-at/2));p.b('cabGap',0,yA-ah+.005,s*(oz-at/2),.02,ah-.01,at*.6);
    p.g(G,boxFt(at,ah,2*lz,s*.7),s*(ox-at/2),yA-ah/2,0);}
  // legs (rounded edges, grain running up them) on glides, and the coves into both aprons at each
  for(const sx of [-1,1])for(const sz of [-1,1]){const x=sx*lx,z=sz*lz;
    p.g('walnutGrainV',roundedGeo(lg,lg,yA-gl,.025).rotateX(-Math.PI/2),x,gl+(yA-gl)/2,z);p.c('black',x,0,z,.035,.035,gl+.005,12);
    p.g(G,coveGeo(cr,at,-sx),sx*(lx-lg/2),yA-ah,sz*(oz-at/2));p.g(G,coveGeo(cr,at,-sz),sx*(ox-at/2),yA-ah,sz*(lz-lg/2),0,-Math.PI/2,0);}
  p.col(0,0,w,d,0,H);}
function diningTable(p,w,d){p.r('oakFurn',0,2.35,0,w,.15,d,.06);p.b('oakFurn',0,2.05,0,w-.6,.3,d-.5);
  for(let x=-w/2+.6;x<=w/2-.55;x+=.12)for(const s of [-1,1])p.b('oakLight',x,2.08,s*(d/2-.24),.05,.22,.04);
  for(const [x,z] of [[-w/2+.35,-d/2+.35],[w/2-.35,-d/2+.35],[-w/2+.35,d/2-.35],[w/2-.35,d/2-.35]]){p.g('oakFurn',lathe([[0,0],[.1,0],[.13,.3],[.09,.6],[.11,1.6],[.13,1.9],[.15,2.05],[0,2.05]],12),x,0,z);}
  p.col(0,0,w,d,0,2.5);}
function dresser(p,w,d,h,m,o){o=o||{};p.b(m,0,.35,0,w,h-.35,d);p.b(m,0,h-.05,0,w+.08,.08,d+.06);
  const rows=o.rows||3;for(let r=0;r<rows;r++){const y=.45+r*(h-.55)/rows,hh=(h-.55)/rows-.06;const cols=o.cols||2;
    for(let c=0;c<cols;c++){const cw=(w-.2)/cols;p.b(m,-w/2+.1+cw*(c+.5),y,d/2+.01,cw-.06,hh,.04);p.b(o.pull||'brass',-w/2+.1+cw*(c+.5),y+hh/2-.03,d/2+.06,.35,.06,.05);}}
  for(const [x,z] of [[-w/2+.12,-d/2+.12],[w/2-.12,-d/2+.12],[-w/2+.12,d/2-.12],[w/2-.12,d/2-.12]])p.b(m,x,0,z,.16,.38,.16);p.col(0,0,w,d,0,h);}
function sideboardDemi(p){const m='walnutDark';const g=new THREE.CylinderGeometry(2.1,2.1,2.25,40,1,false,-Math.PI/2.4,Math.PI/1.2);
  p.g(m,g,0,1.68,-1.35,0,0,0);p.b(m,0,.55,-.5,3.6,2.25,.55);
  p.g(m,new THREE.CylinderGeometry(2.17,2.17,.08,40,1,false,-Math.PI/2.4,Math.PI/1.2),0,2.84,-1.35,0,0,0);
  for(const x of [-.7,.7])p.b('brass',x,2.4,.79,.18,.18,.04);
  for(const [x,z] of [[-1.55,-.6],[1.55,-.6],[-.9,.5],[.9,.5]])p.g(m,new THREE.CylinderGeometry(.05,.03,.56,6),x,.28,z);}
function nightstand(p,m){dresser(p,1.8,1.4,2.1,m||'oakFurn',{rows:2,cols:1});}
function bed(p,w,L,o){o=o||{};const fr=o.frame||'oakFurn';p.r(fr,0,.3,0,w+.25,.7,L+.2,.08);
  p.r(o.head||'linen',0,.4,-L/2-.05,w+.4,3.8,.4,.12);p.r('mattress',0,1.0,.05,w,.85,L-.1,.15);
  p.r(o.duvet||'duvet',0,1.55,.6,w+.2,.35,L-1.1,.15);p.r(o.throw||'duvetBlue',0,1.85,L/2-1.2,w+.24,.12,1.4,.05);
  for(const s of [-1,1]){p.r('pillowCream',s*w/4,1.85,-L/2+.75,w/2-.2,.55,1.1,.22);p.r('linen',s*w/4,1.95,-L/2+.45,w/2-.3,.9,.35,.18);}
  p.col(0,0,w+.4,L+.4,0,2.3);}
// ----- lighting -----
function tableLamp(p,x,y,z,kind){if(p.wp)LAMPS.push({v:p.wp(x,y+(kind==='black'?1.5:2.1),z),k:'lamp',inst:p._inst});if(kind==='ribbed'){p.g('ceramicWhite',lathe([[0,0],[.42,0],[.5,.25],[.55,.6],[.5,1.0],[.3,1.25],[.08,1.35],[0,1.35]],28),x,y,z);
    for(let k=1;k<6;k++)p.g('ceramicWhite',new THREE.TorusGeometry(.53-Math.abs(k-3)*.02,.02,4,28),x,y+.15*k+.1,z,Math.PI/2,0,0);
    p.c('brass',x,y+1.35,z,.02,.02,.5,6);p.g('shade',new THREE.CylinderGeometry(.6,.95,1.05,28,1,true),x,y+2.25,z);}
  else if(kind==='stacked'){for(const [yy,r] of [[.2,.35],[.6,.28],[.95,.3],[1.3,.2]])p.s('ceramicWhite',x,y+yy,z,r,1,.7,1);
    p.c('gold',x,y+1.4,z,.02,.02,.5,6);p.g('shade',new THREE.CylinderGeometry(.45,.75,.85,24,1,true),x,y+2.15,z);}
  else{p.c('blackMetal',x,y,z,.35,.4,.1,16);p.c('blackMetal',x,y,z,.04,.04,1.2,6);p.g('shade',new THREE.CylinderGeometry(.5,.7,.8,24,1,true),x,y+1.55,z);}}
// a straight tube between two local points (arrays or vectors): tripod legs, braces, studs, wires
function rodGeo(a,b,r,seg){const v=q=>q.isVector3?q.clone():new THREE.Vector3(...q),A=v(a),d=v(b).sub(A),g=new THREE.CylinderGeometry(r,r,d.length(),seg||12);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));return g.translate(A.x+d.x/2,A.y+d.y/2,A.z+d.z/2);}
const rodTo=(p,mat,a,b,r,seg)=>p.g(mat,rodGeo(a,b,r,seg),0,0,0);
// a knurled knob (axis y): a cylinder whose radius ripples twelve times round
function knurlGeo(r,h){const g=new THREE.CylinderGeometry(r,r,h,48,1),P=g.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i),z=P.getZ(i);if(Math.hypot(x,z)<1e-4)continue;
  const k=1+.07*Math.cos(12*Math.atan2(z,x));P.setX(i,x*k);P.setZ(i,z*k);}g.computeVertexNormals();return g;}
// tripod "satellite" studio floor lamp, after the owner's photo (63" tall, an 18.5" dish): a black tubular tripod (two legs in front, one
// behind) with a hub collar, telescoping sleeves, a centre column and three spreader braces; a flat strap yoke on the hub holding the dish
// on tilt studs with knurled knobs; the dish black outside and silver leaf inside, with a rolled rim, a rear housing, and a black dome cap on
// three wires in front of the bulb; the cord drops behind. The dish faces local +z, tilted up by `tilt`.
function satelliteLamp(p,tilt){const B='lampBlack',hubY=3.3,R=1.15,sy=1.12,yo=.935,cy=hubY+.24+yo,legTop=hubY-.06,V=(x,y,z)=>new THREE.Vector3(x,y,z);
  // hub collar (the legs hinge on it) with its lock knob at the back; the centre column down to the spreader hub
  p.g(B,lathe([[0,-.14],[.085,-.14],[.095,-.12],[.095,.1],[.085,.12],[.05,.13],[0,.13]],24),0,hubY,0);
  rodTo(p,B,[0,hubY-.02,-.09],[0,hubY-.02,-.2],.014,8);p.g('black',knurlGeo(.04,.05),0,hubY-.02,-.22,Math.PI/2,0,0);
  rodTo(p,B,[0,sy,0],[0,hubY-.14,0],.045,16);p.c(B,0,sy-.06,0,.06,.06,.12,20);p.c(B,0,sy-.13,0,.03,.045,.07,12);
  for(const az of [Math.PI/3,-Math.PI/3,Math.PI]){const sx=Math.sin(az),sz=Math.cos(az),top=V(sx*.1,legTop,sz*.1),ft=V(sx*R,.07,sz*R),at=t=>top.clone().lerp(ft,t);
    // the leg, its hinge lug, the telescoping sleeve with a lock knob, the rubber foot
    rodTo(p,B,top,ft,.042,14);p.b(B,sx*.11,legTop-.07,sz*.11,.05,.14,.08,az);rodTo(p,'black',at(.975),at(1.02),.05,14);
    rodTo(p,B,at(.36),at(.42),.05,14);{const m=at(.39);rodTo(p,B,m,[m.x+sx*.08,m.y,m.z+sz*.08],.01,6);p.g('black',knurlGeo(.026,.03),m.x+sx*.095,m.y,m.z+sz*.095,0,az+Math.PI/2,Math.PI/2);}
    // the spreader brace from the centre hub to a clamp on the leg
    const t=(legTop-sy)/(legTop-.07),L=at(t);rodTo(p,B,[sx*.06,sy,sz*.06],[L.x-sx*.04,sy,L.z-sz*.04],.022,10);rodTo(p,B,at(t-.017),at(t+.017),.056,14);}
  // the yoke: a flat strap bent into a half circle, on a stem and mount block over the hub; pivot bosses, studs, washers and knobs at its ends
  const ys=hubY+.13,yb=cy-yo;p.c(B,0,ys,0,.04,.05,yb-ys-.03,16);p.r(B,0,yb-.06,0,.18,.09,.12,.02);
  {const s=new THREE.Shape();s.absarc(0,0,yo,Math.PI,2*Math.PI,false);s.absarc(0,0,yo-.035,2*Math.PI,Math.PI,true);
    const g=new THREE.ExtrudeGeometry(s,{depth:.07,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,curveSegments:40});g.translate(0,0,-.035);p.g(B,g,0,cy,0);}
  for(const s of [-1,1]){p.g(B,new THREE.CylinderGeometry(.055,.055,.045,20),s*(yo-.0175),cy,0,0,0,Math.PI/2);rodTo(p,B,[s*.65,cy,0],[s*(yo+.05),cy,0],.018,10);
    p.g(B,new THREE.CylinderGeometry(.045,.045,.012,20),s*(yo-.05),cy,0,0,0,Math.PI/2);p.r(B,s*.675,cy-.07,0,.03,.14,.16,.012);
    p.g(B,new THREE.CylinderGeometry(.03,.03,.03,16),s*(yo+.015),cy,0,0,0,Math.PI/2);p.g('black',knurlGeo(.06,.07),s*(yo+.065),cy,0,0,0,Math.PI/2);p.s('black',s*(yo+.1),cy,0,.05,.35,1,1);}
  // the dish, built along +y from its back pole, then turned to face +z tilted up and hung on the studs (.3 ft in from the pole)
  const M=new THREE.Matrix4().makeTranslation(0,cy,0).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2-tilt)).multiply(new THREE.Matrix4().makeTranslation(0,-.3,0)),S=(mat,g)=>p.g(mat,g.applyMatrix4(M),0,0,0);
  const D=[[0,0],[.12,.008],[.24,.03],[.36,.07],[.47,.125],[.56,.19],[.64,.27],[.7,.35],[.74,.43],[.765,.5],[.775,.55]],ring=(r,tb,y,mat)=>S(mat||B,new THREE.TorusGeometry(r,tb,8,64).rotateX(Math.PI/2).translate(0,y,0));
  S(B,lathe(D,64));S('silverLeaf',lathe(D.map(([r,y])=>[r*.985,y+.012]).reverse(),64));ring(.775,.016,.55);
  // rear housing with a vent ring and cord gland; socket, bulb, and the dome cap on three wires
  S(B,lathe([[0,-.3],[.08,-.3],[.11,-.28],[.12,-.24],[.13,-.02],[.15,.01],[0,.01]],32));ring(.128,.01,-.12);S('black',new THREE.CylinderGeometry(.022,.03,.08,12).translate(0,-.34,0));
  S('brass',new THREE.CylinderGeometry(.05,.055,.13,20).translate(0,.075,0));ring(.056,.008,.13);S('light',new THREE.SphereGeometry(.1,20,14).translate(0,.24,0));
  S(B,new THREE.SphereGeometry(.3,40,10,0,Math.PI*2,0,1).translate(0,.36-.3*Math.cos(1),0));S(B,new THREE.CircleGeometry(.252,40).rotateX(Math.PI/2).translate(0,.36,0));ring(.252,.008,.36);
  for(let k=0;k<3;k++){const a=k*2*Math.PI/3;S(B,rodGeo([.05*Math.cos(a),.13,.05*Math.sin(a)],[.2*Math.cos(a),.36,.2*Math.sin(a)],.006,5));}
  // the light: always on, a warm spot from the bulb out along the dish's axis (the silver throwing it forward; SPOT_LAMPS, made in
  // buildKitchenLights), and in the evening the lamp pool's point light too
  const bulb=V(0,.24,0).applyMatrix4(M),aim=V(0,6,0).applyMatrix4(M);
  if(p.wp){LAMPS.push({v:p.wp(bulb.x,bulb.y,bulb.z),k:'lamp',inst:p._inst});SPOT_LAMPS.push({v:p.wp(bulb.x,bulb.y,bulb.z),t:p.wp(aim.x,aim.y,aim.z),inst:p._inst});}
  // the cord: out of the gland, down behind the back leg to the floor, with an inline switch
  {const g0=V(0,-.38,0).applyMatrix4(M),c=new THREE.CatmullRomCurve3([g0,V(.04,g0.y-.35,g0.z-.12),V(.12,hubY-.2,-.4),V(.14,1.6,-.85),V(.14,.4,-1.2),V(.15,.02,-1.45),V(.3,.02,-2.1)]);
    p.g('black',new THREE.TubeGeometry(c,90,.012,6),0,0,0);const q=c.getPoint(.93);p.r('black',q.x,.02,q.z,.07,.04,.13,.015);}
  p.col(0,-.29,2.0,1.75,0,5.3);}
function pendantCone(tag,x,z,yc,ylow){LAMPS.push({v:new THREE.Vector3(x,ylow+.3,z),k:'pendant'});const p=P(tag,x,0,z,0);p.c('blackMetal',0,yc-.08,0,.2,.2,.08,12);p.c('blackMetal',0,ylow+.95,0,.015,.015,yc-ylow-1,6);
  p.c('blackMetal',0,ylow+.85,0,.1,.12,.12,12);p.g('glass',new THREE.CylinderGeometry(.12,.55,.85,20,1,true),0,ylow+.42,0);p.s('light',0,ylow+.2,0,.1);}
function chandelier(tag,x,z,yc){LAMPS.push({v:new THREE.Vector3(x,yc-2.3,z),k:'chandelier'});const p=P(tag,x,0,z,0),yb=yc-2.6;p.c('brass',0,yc-.06,0,.25,.25,.06,16);p.c('brass',0,yb,0,.035,.035,yc-yb,8);
  p.g('brass',lathe([[0,0],[.18,.05],[.16,.3],[0,.4]],14),0,yb-.3,0);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,r=1.15,cx=Math.cos(a)*r,cz=Math.sin(a)*r;
    beam(tag,'brass',[x,yb-.05,z],[x+cx*.95,yb-.05,z+cz*.95],.05,.05);p.c('brass',cx,yb-.15,cz,.06,.04,.12,8);p.c('ceramicWhite',cx,yb-.03,cz,.045,.045,.48,8);p.s('flame',cx,yb+.5,cz,.05,1,1.6,1);}}
function flushDrum(tag,x,z,yc,r){LAMPS.push({v:new THREE.Vector3(x,yc-1,z),k:'ceiling'});const p=P(tag,x,0,z,0);p.c('black',0,yc-.5,0,r,r,.45,28);p.c('shade',0,yc-.52,0,r-.04,r-.04,.04,28);p.c('black',0,yc-.06,0,.2,.2,.06,12);}
// 52" hugger ceiling fan with a light kit (upper-floor bedrooms): bronze canopy and motor, four bronze paddle blades pitched 12 degrees,
// and a frosted dome underneath that lights the room
function ceilingFan(tag,x,z,yc){LAMPS.push({v:new THREE.Vector3(x,yc-1.3,z),k:'ceiling'});const p=P(tag,x,0,z,0);
  p.c('bronze',0,yc-.12,0,.32,.36,.12,24);p.c('bronze',0,yc-.3,0,.18,.26,.18,20);p.c('bronze',0,yc-.62,0,.56,.5,.32,32);p.c('bronze',0,yc-.68,0,.5,.5,.06,32);
  p.g('shade',new THREE.SphereGeometry(.46,24,10,0,Math.PI*2,Math.PI/2,Math.PI/2),0,yc-.68,0,0,0,0,[1,.42,1]);
  const sh=new THREE.Shape(),L=1.75,pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push([t*L,.13+.15*Math.sin(Math.PI*Math.min(1,t*1.05))+.03*t]);}
  sh.moveTo(0,-.13);for(const [a,w] of pts)sh.lineTo(a,-w*.9);for(let i=pts.length-1;i>=0;i--)sh.lineTo(pts[i][0],pts[i][1]);sh.closePath();
  const blade=new THREE.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:false});blade.rotateX(-Math.PI/2+.21);
  for(let k=0;k<4;k++){const a=k*Math.PI/2+.3,ca=Math.cos(a),sa=Math.sin(a);
    p.g('bronze',new THREE.BoxGeometry(.5,.05,.16),ca*.62,yc-.5,-sa*.62,0,a,0);
    p.g('fanBlade',blade,ca*.42,yc-.5,-sa*.42,0,a,0);}}
function schoolhouse(tag,x,z,yc){LAMPS.push({v:new THREE.Vector3(x,yc-1,z),k:'ceiling'});const p=P(tag,x,0,z,0);p.c('brass',0,yc-.15,0,.25,.25,.15,16);p.g('frost',new THREE.SphereGeometry(.42,18,12,0,Math.PI*2,0,Math.PI*.62),0,yc-.55,0,Math.PI,0,0);}
// ----- decor -----
function art(tag,x,y,z,ry,w,h,mat,frame){const p=P(tag,x,y,z,ry);p.b(frame||'gold',0,-h/2,.03,w,h,.08);p.b('mat',0,-h/2+.12,.08,w-.24,h-.24,.02);
  p.b(mat,0,-h/2+.4,.095,w-.8,h-.8,.01);}
function mirror(tag,x,y,z,ry,w,h){const p=P(tag,x,y,z,ry);p.g('gold',roundedGeo(w,h,.1,.05),0,0,.05);p.g('mirror',roundedGeo(w-.24,h-.24,.03,.012),0,0,.1);
  const s=new THREE.Shape();s.absarc(0,0,w/2,0,Math.PI,false);s.lineTo(-w/2,0);p.g('gold',new THREE.ExtrudeGeometry(s,{depth:.1,bevelEnabled:false}),0,h/2,0);
  const s2=new THREE.Shape();s2.absarc(0,0,w/2-.12,0,Math.PI,false);s2.lineTo(-w/2+.12,0);p.g('mirror',new THREE.ExtrudeGeometry(s2,{depth:.03,bevelEnabled:false}),0,h/2,.09);}
function plant(p,x,y,z,kind){if(kind==='tall'){p.g('terracotta',lathe([[0,0],[.55,0],[.75,1.4],[0,1.4]],18),x,y,z);p.c('concrete',x,y+1.3,z,.7,.7,.06,16);
    for(let i=0;i<5;i++){const a=i*1.3,hh=2.5+i*.6;p.c('oakFurn',x+Math.cos(a)*.1,y+1.3,z+Math.sin(a)*.1,.03,.04,hh,5);
      for(let k=0;k<4;k++){const b=a+k*1.7;p.g('plantGreen',new THREE.SphereGeometry(.45,7,5),x+Math.cos(b)*.45,y+1.3+hh-.3-k*.55,z+Math.sin(b)*.45,0,b,.5,[1,.25,.65]);}}}
  else if(kind==='orchid'){p.g('terracotta',lathe([[0,0],[.28,0],[.33,.45],[0,.45]],16),x,y,z);for(let i=0;i<3;i++)p.g('plantGreen',new THREE.SphereGeometry(.3,6,4),x,y+.48,z,0,i*2,0,[1,.15,.35]);
    p.c('oakFurn',x,y+.45,z,.015,.015,1.4,4);for(let i=0;i<5;i++)p.s('flowerWhite',x+.08*Math.sin(i),y+1.2+i*.14,z+.1*i-.15,.13,1,.6,1);}
  else if(kind==='gladiolus'){p.g('ceramicWhite',lathe([[0,0],[.3,0],[.42,.4],[.3,.9],[.26,1.15],[.32,1.3],[0,1.3]],24),x,y,z);
    for(let i=0;i<7;i++){const a=i*.9,dx=Math.sin(a)*.45,dz=Math.cos(a)*.35,len=1.45;p.g('plantGreen',new THREE.CylinderGeometry(.03,.03,len,5),x+dx/2,y+1.25+.68,z+dz/2,Math.atan2(dz,1.35),0,-Math.atan2(dx,1.35));
      for(let k=0;k<3;k++)p.s('flowerWhite',x+dx*(1-k*.2),y+2.5-k*.25,z+dz*(1-k*.2),.12);}}
  else{p.g('terracotta',lathe([[0,0],[.3,0],[.36,.5],[0,.5]],16),x,y,z);p.s('plantGreen',x,y+.75,z,.42);}}
function drape(tag,a0,a1,ax,c,y0,y1){const n=Math.max(4,Math.round((a1-a0)/.22));
  for(let i=0;i<n;i++){const a=a0+(i+.5)*(a1-a0)/n,off=(i%2?.06:-.06);
    if(ax==='x')addGeo(tag,'curtain',new THREE.CylinderGeometry(.13,.15,y1-y0,8),M(a,(y0+y1)/2,c+off));else addGeo(tag,'curtain',new THREE.CylinderGeometry(.13,.15,y1-y0,8),M(c+off,(y0+y1)/2,a));}}
function rod(tag,a0,a1,ax,c,y){if(ax==='x'){box(tag,'brass',a0,a1,y-.05,y+.05,c-.05,c+.05);for(const a of [a0,a1])addGeo(tag,'brass',new THREE.SphereGeometry(.1,10,8),M(a,y,c));}
  else{box(tag,'brass',c-.05,c+.05,y-.05,y+.05,a0,a1);for(const a of [a0,a1])addGeo(tag,'brass',new THREE.SphereGeometry(.1,10,8),M(c,y,a));}}
function rug(tag,mat,x,y,z,w,d){addGeo(tag,mat,new THREE.BoxGeometry(w,.04,d),M(x,y+.02,z));}
// ----- bath -----
function toilet(p){p.r('porcelain',0,1.4,-.75,1.6,1.15,.62,.08);p.r('porcelain',0,2.5,-.75,1.7,.1,.7,.04);p.b('steel',-.55,2.25,-.43,.14,.05,.05);
  p.g('porcelain',lathe([[0,0],[.42,0],[.45,.5],[.62,1.15],[.66,1.32],[0,1.32]],24),0,0,.15,0,0,0,[1,1,1.3]);
  p.g('porcelain',new THREE.TorusGeometry(.55,.07,8,24),0,1.42,.17,Math.PI/2,0,0,[1,1.28,1]);p.r('porcelain',0,1.35,-.35,.8,.6,.55,.1);p.col(0,-.1,1.8,2.6,0,2.6);}
function vanity(p,w,d,o){o=o||{};const m=o.mat||'cab',sinks=o.sinks||1;p.b(m,0,.35,0,w,2.4,d);p.b('black',0,0,0,w-.1,.35,d-.2);
  p.b('quartz',0,2.75,.03,w+.06,.12,d+.06);const ww=w/sinks;
  for(let i=0;i<sinks;i++){const x=-w/2+ww*(i+.5);p.r('porcelain',x,2.62,.08,1.35,.2,1.0,.08);p.r('steel',x,2.82,.1,1.05,.03,.72,.01);
    p.c(o.tap||'brass',x,2.87,-d/2+.3,.05,.06,.75,10);
    p.c(o.tap||'brass',x,3.55,-d/2+.42,.035,.035,.32,8,Math.PI/2);for(const s of [-1,1])p.c(o.tap||'brass',x+s*.32,2.87,-d/2+.3,.05,.05,.22,8);
    for(const s of [-.25,.25])p.b(o.tap||'brass',x+s*ww*.6,1.6,d/2+.03,.05,.4,.05);}
  for(let i=0;i<sinks*2;i++)p.b(m,-w/2+(i+.5)*w/(sinks*2),.45,d/2+.005,w/(sinks*2)-.06,2.2,.02);
  p.col(0,0,w,d,0,2.9);}
function bathMirror(tag,x,y,z,ry,w,h){const p=P(tag,x,y,z,ry);p.r('blackMetal',0,-h/2,.03,w,h,.08,.03);p.b('mirror',0,-h/2+.06,.06,w-.12,h-.12,.02);}
function tub(tag,x0,x1,z0,z1,y){box(tag,'porcelain',x0,x1,y,y+1.7,z0,z0+.3);box(tag,'porcelain',x0,x1,y,y+1.7,z1-.3,z1);
  box(tag,'porcelain',x0,x0+.35,y,y+1.7,z0,z1);box(tag,'porcelain',x1-.35,x1,y,y+1.7,z0,z1);box(tag,'porcelain',x0,x1,y,y+.5,z0,z1);
  box(tag,'porcelain',x0+.33,x1-.33,y+.5,y+.6,z0+.28,z1-.28);addCol(x0,x1,z0,z1,y,y+1.7);}
function showerTileWalls(tag,segs,y0,y1){for(const [x0,x1,z0,z1] of segs)box(tag,'showerTile',x0,x1,y0,y1,z0,z1);}
function showerHead(tag,x,y,z,dx,dz){const p=P(tag,x,y,z,0);p.c('steel',0,0,0,.03,.03,.6,8,Math.PI/2*Math.abs(dz),Math.PI/2*Math.abs(dx));
  addGeo(tag,'steel',new THREE.CylinderGeometry(.35,.25,.08,20),M(x+dx*.55,y-.15,z+dz*.55));addGeo(tag,'steel',new THREE.CylinderGeometry(.15,.15,.1,14),M(x,y-3.0,z));}
function glassPanel(tag,ax,c,a0,a1,y0,y1){PIECES.push({tag,ax,a0,a1,c,t:.1,y0,y1,glass:true});if(ax==='x'){box(tag,'glass',a0,a1,y0,y1,c-.03,c+.03);box(tag,'steel',a0,a1,y1-.05,y1,c-.05,c+.05);addCol(a0,a1,c-.1,c+.1,y0,y1);}
  else{box(tag,'glass',c-.03,c+.03,y0,y1,a0,a1);box(tag,'steel',c-.05,c+.05,y1-.05,y1,a0,a1);addCol(c-.1,c+.1,a0,a1,y0,y1);}}
// ----- appliances -----
// French-door fridge: two doors over a freezer drawer; long bar handles at the doors' inner edges and across the drawer, each on two
// standoffs that run from the door face to the bar
function fridge(p){p.b('steel',0,0,0,3.0,6.0,2.5);p.b('black',0,0,1.25,2.9,.35,.04);p.b('black',0,1.86,1.27,2.92,.04,.04);p.b('black',0,1.9,1.27,.02,4.0,.045);
  const fz=1.295,bz=1.5;
  for(const s of [-1,1]){p.b('steel',s*.745,1.9,1.27,1.47,4.0,.05);const hx=s*.2;p.c('steel',hx,2.45,bz,.045,.045,2.75,12);
    for(const yy of [2.6,5.05])p.b('steel',hx,yy,(fz+bz)/2,.07,.08,bz-fz+.02);}
  p.b('steel',0,.4,1.27,2.9,1.44,.05);p.g('steel',new THREE.CylinderGeometry(.045,.045,2.3,12),0,1.6,bz,0,0,Math.PI/2);
  for(const x of [-1.05,1.05])p.b('steel',x,1.56,(fz+bz)/2,.08,.08,bz-fz+.02);p.col(0,0,3,2.5,0,6);}
function washer(p,dryer){p.r('washer',0,0,0,2.25,3.2,2.4,.06);p.b('washer',0,3.05,-.9,2.25,.35,.5);
  p.g('steel',new THREE.TorusGeometry(.62,.08,10,28),0,1.6,1.2);p.c(dryer?'washer':'blackGlass',0,1.6,1.15,.58,.58,.06,24,Math.PI/2);
  p.c('steel',.7,3.2,-.65,.1,.1,.06,12,Math.PI/2);p.b('black',-.4,3.12,-.64,.7,.18,.02);p.col(0,0,2.3,2.5,0,3.4);}


// ----- soft-goods geometry: superellipsoid "soft boxes", draped throws, pleated curtains -----
function superBox(w,h,d,e,ez,pinch,seg,feet){const g=new THREE.SphereGeometry(1,seg||28,Math.round((seg||28)*.75)),p=g.attributes.position,uv=g.attributes.uv,sp=(v,k)=>Math.sign(v)*Math.pow(Math.abs(v),k);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),X=sp(x,e),Y=sp(y,e);let Z=sp(z,ez);
    if(pinch)Z*=Math.max(.2,1-pinch*Math.pow(Math.abs(X),3)*Math.pow(Math.abs(Y),3)-pinch*.3*(Math.pow(Math.abs(X),8)+Math.pow(Math.abs(Y),8)));
    p.setXYZ(i,X*w/2,Y*h/2,Z*d/2);if(feet)uv.setXY(i,X*w/2+Z*d/4,Y*h/2);else uv.setXY(i,X*.5+.5,Y*.5+.5);}
  g.computeVertexNormals();return g;}
function rotE(ry,lean,roll){const m=new THREE.Matrix4().makeRotationY(ry||0).multiply(new THREE.Matrix4().makeRotationX(lean||0)).multiply(new THREE.Matrix4().makeRotationZ(roll||0));const e=new THREE.Euler().setFromRotationMatrix(m);return [e.x,e.y,e.z];}
function throwGeo(prof,width,amp,seed){const pts=[];for(let i=0;i<prof.length-1;i++){const [z0,y0]=prof[i],[z1,y1]=prof[i+1],n=Math.max(1,Math.ceil(Math.hypot(z1-z0,y1-y0)/.07));for(let k=0;k<n;k++)pts.push([z0+(z1-z0)*k/n,y0+(y1-y0)*k/n]);}pts.push(prof[prof.length-1]);
  const M=Math.ceil(width/.07)+1,N=pts.length,P=[],U=[],I=[];let s=0;
  for(let i=0;i<N;i++){if(i)s+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);const a=pts[Math.max(0,i-1)],b=pts[Math.min(N-1,i+1)];let tz=b[0]-a[0],ty=b[1]-a[1];const tl=Math.hypot(tz,ty)||1;tz/=tl;ty/=tl;
    for(let j=0;j<M;j++){const x=-width/2+width*j/(M-1),r=amp*(Math.sin(x*3.3+s*1.6+seed)*.55+Math.sin(x*7.9-s*1.1+seed*2.3)*.25+Math.sin(s*4.2+seed)*.2)*(.35+.65*Math.min(1,s/1.2));
      P.push(x+Math.sin(s*2.1+seed)*.05,pts[i][1]+tz*r,pts[i][0]-ty*r);U.push(x,s);}}
  for(let i=0;i<N-1;i++)for(let j=0;j<M-1;j++){const a=i*M+j,b=a+1,c=a+M,d=c+1;I.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();return g;}
function curtainGeo(w,h){const M=Math.ceil(w/.05)+1,N=Math.ceil(h/.25)+1,P=[],U=[],I=[];
  for(let i=0;i<N;i++){const y=h*i/(N-1),flare=1+.35*(1-y/h);for(let j=0;j<M;j++){const x=-w/2+w*j/(M-1);P.push(x*flare*.92,y,Math.sin(x/.42*Math.PI*2)*.1*flare+Math.sin(x*1.7+y*.6)*.02);U.push(x,y);}}
  for(let i=0;i<N-1;i++)for(let j=0;j<M-1;j++){const a=i*M+j,b=a+1,c=a+M,d=c+1;I.push(a,b,c,b,d,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();return g;}
function ovalGeo(rx,rz,th,hole){const s=new THREE.Shape();s.absellipse(0,0,rx,rz,0,Math.PI*2,false,0);if(hole){const h=new THREE.Path();h.absellipse(0,0,rx-hole,rz-hole,0,Math.PI*2,true,0);s.holes.push(h);}
  return new THREE.ExtrudeGeometry(s,{depth:th,bevelEnabled:!hole,bevelThickness:.02,bevelSize:.025,bevelSegments:3,curveSegments:48});}
function legTo(p,mat,a,b,r0,r1){const d=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),L=d.length(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()),e=new THREE.Euler().setFromQuaternion(q);
  p.g(mat,new THREE.CylinderGeometry(r1,r0,L,12),(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,e.x,e.y,e.z);}

function buildFurniture(){
  const e1=E[1],e2=E[2],e3=E[3],e4=E[4];
  const T=(tag,x,y,z,ry,name)=>{const p=P(tag,x,y,z,ry);p._tag=tag;p._grp=new THREE.Box3();FURN.push(p._grp);const h=here();p._owner={key:'FU@'+locKey(h),kind:'furniture',fn:'T',loc:h,label:name||''};
    const k=p._owner.key;INST_N[k]=(INST_N[k]||0)+1;p._inst={key:k+'#'+INST_N[k],n:INST_N[k],okey:k,tag:phTag(tag),ph:PH,buckets:new Map(),cols:[],lights:[],grp:p._grp,dx:0,dz:0,ry:0,ry0:ry||0,ox:x,oz:z};INSTS.push(p._inst);return p;};
  // ================= FAMILY ROOM (level 2), styled after the reference photo =================
  const SB=(p,mat,x,y,z,w,h,d,e,ez,o)=>{o=o||{};const [rx,ry,rz]=o.rot||[o.rx||0,0,0];p.g(mat,superBox(w,h,d,e,ez,o.pinch||0,o.seg||26,o.unit?false:true),x,y,z,rx,ry,rz);};
  const pillowAt=(p,mat,x,y,z,ry,s,lean,roll)=>SB(p,mat,x,y,z,s,s,.5,.38,.85,{pinch:.6,seg:30,unit:/Stripe|Chevron/.test(mat),rot:rotE(ry,lean,roll)});
  // rug: ivory shag with broken black stripes and fringed ends
  {const p=T('2',8.0,e2,8.5,0,'geometric shag rug');p.b('rugGeo',0,0,0,79/12,.06,9);}   // 6'7" x 9', the owner's photo (rugGeo)
  // sage sectional, return section along the windows (with the corner seat)
  {const p=T('2',0,e2,0,0,'sectional, window side');
    for(const [x,z] of [[4.8,1.2],[4.8,3.9],[9.2,1.2],[9.2,3.9],[13.75,1.2],[13.75,3.9]])p.c('walnutDark',x,0,z,.075,.05,.3,12);
    SB(p,'olive',9.25,.78,2.85,8.2,.95,2.5,.14,.14);SB(p,'olive',9.275,1.35,1.3,9.35,2.1,.6,.13,.2);SB(p,'olive',13.65,1.35,2.85,.6,2.1,2.5,.2,.13);
    SB(p,'olive',4.875,1.225,2.55,.55,1.85,3.1,.16,.16);
    for(const [a,b] of [[5.15,7.04],[7.04,8.93],[8.93,10.85]]){SB(p,'olive',(a+b)/2,1.51,3.09,b-a-.04,1.98,.52,.2,.6,{rx:-Math.PI/2});SB(p,'olive',(a+b)/2,2.1,1.95,b-a-.05,1.7,.72,.26,.7,{rot:rotE(0,-.12,0)});}
    SB(p,'olive',11.865,1.51,3.09,1.95,1.98,.52,.2,.6,{rx:-Math.PI/2});SB(p,'olive',11.75,2.1,1.95,1.7,1.7,.72,.26,.7,{rot:rotE(0,-.12,0)});
    SB(p,'olive',12.98,2.1,3.2,1.78,1.7,.72,.26,.7,{rot:rotE(-Math.PI/2,-.12,0)});SB(p,'olive',12.98,2.1,1.98,.74,1.7,.74,.3,.3);
    pillowAt(p,'pillowMustard',5.75,2.25,2.6,0,1.55,-.38,.1);pillowAt(p,'pillowTaupe',7.0,2.28,2.62,0,1.6,-.34,-.06);pillowAt(p,'pillowStripe',8.3,2.25,2.6,0,1.55,-.36,.05);
    p.g('knitIvory',throwGeo([[3.45,1.84],[2.75,1.86],[2.42,2.02],[2.33,2.6],[2.24,3.02],[1.98,3.1],[1.62,3.02],[1.32,2.52],[1.05,2.47],[.95,2.0],[.92,1.45]],2.3,.07,1.3),10.4,0,0);}
  // sage sectional, long section along the east wall
  {const p=T('2',0,e2,0,0,'sectional, wall side');
    for(const [x,z] of [[11.05,4.3],[13.75,4.3],[11.05,7.9],[13.75,7.9],[11.05,11.5],[13.75,11.5]])p.c('walnutDark',x,0,z,.075,.05,.3,12);
    SB(p,'olive',12.1,.78,7.625,2.5,.95,7.05,.14,.14);SB(p,'olive',13.65,1.35,7.9,.6,2.1,7.6,.2,.13);SB(p,'olive',12.4,1.225,11.425,3.1,1.85,.55,.16,.16);
    for(const [a,b] of [[4.12,6.46],[6.46,8.8],[8.8,11.13]]){SB(p,'olive',11.865,1.51,(a+b)/2,1.97,b-a-.04,.52,.2,.6,{rx:-Math.PI/2});SB(p,'olive',12.98,2.1,(a+b)/2,b-a-.05,1.7,.72,.26,.7,{rot:rotE(-Math.PI/2,-.12,0)});}
    pillowAt(p,'pillowStripe2',12.3,2.25,5.1,-Math.PI/2,1.55,-.36,.08);pillowAt(p,'pillowRust',12.32,2.22,9.35,-Math.PI/2,1.45,-.4,-.1);pillowAt(p,'pillowChevron',12.3,2.25,10.5,-Math.PI/2,1.55,-.35,.06);
    p.g('knitMustard',throwGeo([[9.9,1.84],[10.6,1.85],[11.05,1.98],[11.17,2.22],[11.42,2.27],[11.7,2.22],[11.8,1.9],[11.85,1.2],[11.93,.5],[12.1,.18]],2.6,.08,4.1),12.15,0,0);}
  // oval oak coffee table on splayed legs, with books, a candle and a sprig in a vase
  {const p=T('2',8.1,e2,7.7,0,'oval coffee table');
    p.g('oakFurn',ovalGeo(1.08,2.02,.07),0,1.33,0,-Math.PI/2,0,0);p.g('oakFurn',ovalGeo(.92,1.82,.16,.07),0,1.17,0,-Math.PI/2,0,0);
    for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]])legTo(p,'oakFurn',[sx*.62,1.24,sz*1.3],[sx*.78,0,sz*1.56],.065,.045);
    p.r('book1',-.12,1.45,.68,.95,.13,.7,.02,.18);p.r('pages',-.12,1.455,.68,.9,.11,.66,.01,.18);p.r('book2',-.08,1.58,.64,.82,.1,.6,.02,-.12);
    p.c('glass',.32,1.45,-.25,.17,.17,.42,24);p.c('ceramicWhite',.32,1.46,-.25,.14,.14,.28,20);p.c('black',.32,1.74,-.25,.006,.006,.05,4);p.s('flame',.32,1.81,-.25,.03,1,1.8,1);
    p.g('ceramicWhite',lathe([[0,0],[.1,0],[.15,.12],[.13,.32],[.07,.44],[.08,.5],[0,.5]],24),-.25,1.45,-.95);
    for(let i=0;i<6;i++){const a=i*1.05,l=.5+.12*(i%3);legTo(p,'plantGreen',[-.25,1.9,-.95],[-.25+Math.cos(a)*.18,1.9+l,-.95+Math.sin(a)*.18],.01,.008);
      for(let k=1;k<4;k++)p.s('plantGreen',-.25+Math.cos(a)*.18*k/3,1.9+l*k/3,-.95+Math.sin(a)*.18*k/3,.06,1,.3,.6);}}
  // tripod floor lamp with a linen drum shade by the window
  {const p=T('2',2.1,e2,1.6,0,'tripod floor lamp');for(const a of [Math.PI/2,Math.PI/2+2.094,Math.PI/2+4.189])legTo(p,'oakLight',[0,4.55,0],[Math.cos(a)*.8,0,Math.sin(a)*.8],.045,.035);
    p.c('blackMetal',0,4.45,0,.08,.08,.25,16);p.c('blackMetal',0,4.7,0,.02,.02,.55,8);p.g('shade',new THREE.CylinderGeometry(.62,.68,.85,48,1,true),0,5.45,0);
    p.g('blackMetal',new THREE.TorusGeometry(.68,.012,6,48),0,5.03,0,Math.PI/2,0,0);p.s('light',0,5.25,0,.12);LAMPS.push({v:p.wp(0,5.25,0),k:'lamp',inst:p._inst});}
  // mantel styling: dark bowl, white vase, trailing pothos
  {const p=T('2',1.75,e2+4.85,7.35,0,'mantel bowl');p.g('ceramicBlack',lathe([[0,0],[.16,0],[.3,.07],[.37,.2],[.35,.22],[.29,.11],[.15,.05],[0,.05]],32),0,0,0);}
  {const p=T('2',1.78,e2+4.85,7.85,0,'mantel vase');p.g('ceramicWhite',lathe([[0,0],[.13,0],[.2,.24],[.17,.6],[.09,.86],[.11,.95],[0,.95]],32),0,0,0);}
  {const p=T('2',1.82,e2+4.85,12.15,0,'trailing pothos');p.g('ceramicWhite',lathe([[0,0],[.19,0],[.23,.42],[.2,.42],[0,.42]],28),0,0,0);
    for(let k=0;k<14;k++){const a=rr(0,6.28),r=rr(0,.2);p.s('plantGreen',Math.cos(a)*r,.48+rr(0,.2),Math.sin(a)*r,.13,1,.3,.75);}
    for(let v=0;v<6;v++){let px=rr(.05,.2),pz=rr(-.25,.25),py=.42;const len=rr(1.4,2.6);for(let t=0;t<len;t+=.16){const nx=Math.min(.36,px+.08),ny=py-.16,nz=pz+rr(-.05,.05);
        legTo(p,'plantGreen',[px,py,pz],[nx,ny,nz],.008,.008);p.s('plantGreen',nx+(Math.floor(t/.16)%2?.07:-.02),ny,nz+(Math.floor(t/.16)%2?.06:-.06),.1,1,.28,.8);px=nx;py=ny;pz=nz;}}}
  // frame TV in art mode
  {const p=P('2',1.735,e2+6.425,9.8,Math.PI/2);p.b('artTV',0,-.9,0,3.35,1.8,.015);}
  // large concentric-arc print above the sofa
  // over the sectional: the owner's jungle-and-waterfalls print, 48" x 24", in a thin oak frame
  {const p=P('2',13.93,e2+5.3,7.6,-Math.PI/2);p.b('oakLight',0,-1.06,.04,4.12,2.12,.12);p.b('artJungle',0,-1,.105,4,2,.01);}
  // cream linen curtains hung just under the perimeter beam
  {const p=P('2',0,e2,0,0),ht=CEIL[2]-.72-e2;for(const cx of [3.45,12.15])p.g('linen2',curtainGeo(1.7,ht),cx,.04,.6);}
  box('2','blackMetal',2.4,13.4,CEIL[2]-.74,CEIL[2]-.68,.56,.64);for(const x of [2.4,13.4])addGeo('2','blackMetal',new THREE.SphereGeometry(.07,10,8),M(x,CEIL[2]-.71,.6));
  // ceiling beams
  for(const z of [0.55,4.6,8.9,13.2,17.5])box('C2','beam',0.3,14.2,CEIL[2]-.62,CEIL[2],z-.32,z+.32);
  box('C2','beam',0.4,1.05,CEIL[2]-.62,CEIL[2],0.3,19.6);box('C2','beam',13.5,14.15,CEIL[2]-.62,CEIL[2],0.3,19.6);
  // ================= EXISTING BEDROOM (level 2) =================
  {const p=T('2',3.95,e2,25.5,Math.PI/2);bed(p,5,6.8,{});}
  for(const z of [21.75,29.25]){const p=T('2',1.25,e2,z,Math.PI/2);nightstand(p);tableLamp(p,0,2.1,-.1,'black');}
  {const p=T('2',5.6,e2,20.55,0);dresser(p,4.4,1.6,2.9,'oakFurn',{rows:3,cols:2});}
  art('2',0.62,e2+7.3,25.5,Math.PI/2,2.6,2.0,'artLandscape','gold');
  // ================= BATH (level 2): vanity, toilet, shower =================
  {const p=T('2',17.55,e2,25.4,-Math.PI/2);p._tag='2';vanity(p,2.6,1.8,{mat:'doorWhite',tap:'steel'});}
  bathMirror('2',18.25,e2+7.0,25.4,-Math.PI/2,2.0,2.6);
  {const p=T('2',17.55,e2,27.9,-Math.PI/2);toilet(p);}
  showerTileWalls('2',[[13.85,18.25,31.18,31.28],[13.85,13.95,29.0,31.3],[18.15,18.25,29.0,31.3]],e2,e2+7.2);
  box('2','showerTile',13.9,18.2,e2,e2+.12,29.1,31.25);glassPanel('2','x',29.15,13.9,15.6,e2+.15,e2+6.9);
  showerHead('2',16,e2+6.6,31.05,0,-1);
  // ================= MAIN LEVEL: living room =================
  rug('3','rugLiving',22.4,e3,6.4,11.8,8.6);
  {const p=T('3',15.9,e3,11.4,2.23,'satellite floor lamp');satelliteLamp(p,20*Math.PI/180);}
  art('3',29.6,e3+5.6,0.32,0,1.3,1.6,'artLandscape','gold');
  rod('3',16.3,27.8,'x',0.62,7.65);drape('3',16.4,17.9,'x',0.62,0.05,7.6);drape('3',26.2,27.7,'x',0.62,0.05,7.6);
  // ================= dining =================
  rug('3','rugDining',37.6,e3,5.4,10.2,7.6);
  {const p=T('3',37.6,e3,5.4,0,'walnut dining table');walnutTable(p,5,3);}   // 60" x 36", the owner's photo
  chandelier('C3',37.6,5.4,CEIL[3]);
  rod('3',33.4,40.7,'x',0.62,7.65);drape('3',33.5,35.0,'x',0.62,0.05,7.6);drape('3',39.1,40.6,'x',0.62,0.05,7.6);
  // ================= kitchen =================
  const ct=e3+3.0;
  // cabinet fronts, after the listing photo: flat slab doors and drawers with even reveals over a dark backer, brass bar pulls on
  // standoffs, and hollow glass-front cabinets stacked at the top of the uppers. A face runs along x (ax 'x', face at z=f) or along z
  // (ax 'z', face at x=f); s is the direction the face looks (+1 or -1).
  const K=(ax,a0,a1,y0,y1,d0,d1,mat)=>ax==='x'?box('3',mat,a0,a1,y0,y1,Math.min(d0,d1),Math.max(d0,d1)):box('3',mat,Math.min(d0,d1),Math.max(d0,d1),y0,y1,a0,a1);
  const at=(ax,a,y,d)=>ax==='x'?[a,y,d]:[d,y,a];
  const pull=(ax,f,s,a,y,len,dir)=>{const d=f+s*.06,ends=dir==='v'?[[a,y-len/2+.05],[a,y+len/2-.05]]:[[a-len/2+.05,y],[a+len/2-.05,y]];
    for(const [aa,yy] of ends)K(ax,aa-.022,aa+.022,yy-.022,yy+.022,d,d+s*.085,'brass');
    const m=new THREE.Matrix4();if(dir==='h'){if(ax==='x')m.makeRotationZ(Math.PI/2);else m.makeRotationX(Math.PI/2);}
    m.setPosition(...at(ax,a,y,d+s*.105));addGeo('3','brass',new THREE.CylinderGeometry(.022,.022,len,10),m);};
  // kind: 'door' | 'drawer' | 'glass'; p: [pull position along the face, pull height, pull length, 'v'|'h'] or null
  const front=(ax,f,s,a0,a1,y0,y1,kind,p)=>{const g=.022,d0=f+s*.012,d1=f+s*.06;K(ax,a0,a1,y0,y1,f,d0,'cabGap');
    if(kind==='glass'){const w=.16;K(ax,a0+g,a1-g,y0+g,y0+g+w,d0,d1,'cab');K(ax,a0+g,a1-g,y1-g-w,y1-g,d0,d1,'cab');K(ax,a0+g,a0+g+w,y0+g+w,y1-g-w,d0,d1,'cab');K(ax,a1-g-w,a1-g,y0+g+w,y1-g-w,d0,d1,'cab');
      K(ax,a0+g+w,a1-g-w,y0+g+w,y1-g-w,f+s*.034,f+s*.04,'cabGlass');}
    else K(ax,a0+g,a1-g,y0+g,y1-g,d0,d1,'cab');
    if(p)pull(ax,f,s,p[0],p[1],p[2],p[3]);};
  // door pull near the opening edge ('l' = a0 side, 'r' = a1 side), high on base doors, low on uppers; drawer pull centred
  const dp=(a0,a1,side,y,len)=>[side==='l'?a0+.2:a1-.2,y,len||.55,'v'],wp=(a0,a1,y,len)=>[(a0+a1)/2,y,len||Math.min(.75,(a1-a0)*.5),'h'];
  // hollow glass-front cabinet: shell, back, a shelf and a few white pieces of tableware behind the glass
  const glassBox=(ax,f,s,a0,a1,y0,y1)=>{const wall=f-s*1.05;K(ax,a0,a1,y0,y1,wall,wall+s*.05,'cabInner');
    K(ax,a0,a0+.05,y0,y1,wall,f,'cab');K(ax,a1-.05,a1,y0,y1,wall,f,'cab');K(ax,a0,a1,y0,y0+.05,wall,f,'cabInner');K(ax,a0,a1,y1-.05,y1,wall,f,'cab');
    const dm=(wall+f)/2,n=Math.max(1,Math.round((a1-a0)/.7));
    for(let i=0;i<n;i++){const a=a0+(a1-a0)*(i+.5)/n;if(i%2)addGeo('3','ceramicWhite',new THREE.CylinderGeometry(.2,.12,.16,16),M(...at(ax,a,y0+.13,dm)));
      else addGeo('3','ceramicWhite',new THREE.CylinderGeometry(.07,.09,.42,14),M(...at(ax,a,y0+.26,dm)));}};
  // upper column: a solid door below and a glass cabinet above, to the ceiling; cols doors across
  const upper=(ax,f,s,a0,a1,y0,yS,y1,cols,pullSide)=>{K(ax,a0,a1,y0,yS,f-s*1.05,f,'cab');glassBox(ax,f,s,a0,a1,yS,y1);
    for(let i=0;i<cols;i++){const b0=a0+(a1-a0)*i/cols,b1=a0+(a1-a0)*(i+1)/cols,side=cols===2?(i?'l':'r'):pullSide;
      front(ax,f,s,b0,b1,y0,yS,'door',dp(b0,b1,side,y0+.45,.5));front(ax,f,s,b0,b1,yS,y1,'glass',null);}};
  const by0=e3+.38,by1=ct-.15,drawers=(ax,f,s,a0,a1,ys)=>{for(let i=0;i<ys.length-1;i++)front(ax,f,s,a0,a1,ys[i],ys[i+1],'drawer',wp(a0,a1,ys[i+1]-.32));};
  const D3=[by0,e3+1.15,e3+1.98,by1],D2=[by0,e3+1.65,by1],C=CEIL[3];

  // ---- south run under the window (fronts face north, z=29.25)
  box('3','cab',25.7,35.3,e3+.35,ct-.12,29.25,31.3);box('3','black',25.75,35.25,e3,e3+.35,29.4,31.3);
  box('3','quartz',25.7,29.4,ct-.12,ct,29.15,31.3);box('3','quartz',31.0,35.3,ct-.12,ct,29.15,31.3);box('3','quartz',29.4,31.0,ct-.12,ct,29.15,29.6);box('3','quartz',29.4,31.0,ct-.12,ct,30.7,31.3);
  front('x',29.25,-1,25.75,27.72,by0,by1,'door',dp(25.75,27.72,'r',by1-.45));
  front('x',29.25,-1,29.68,30.75,by0,by1,'door',dp(29.68,30.75,'r',by1-.45));front('x',29.25,-1,30.75,31.82,by0,by1,'door',dp(30.75,31.82,'l',by1-.45));
  drawers('x',29.25,-1,31.85,33.5,D3);
  // dishwasher: stainless door, black control strip, bar handle on standoffs
  box('3','steel',27.75,29.65,e3+.38,ct-.15,29.12,29.28);box('3','blackGlass',27.75,29.65,ct-.42,ct-.15,29.115,29.12);
  addGeo('3','steel',new THREE.CylinderGeometry(.035,.035,1.6,10),new THREE.Matrix4().makeRotationZ(Math.PI/2).setPosition(28.7,ct-.62,28.97));for(const x of [27.98,29.42])box('3','steel',x-.03,x+.03,ct-.65,ct-.59,28.97,29.12);
  // undermount sink and faucet
  box('3','steel',29.4,31.0,ct-.75,ct-.11,29.6,30.7);addGeo('3','black',new THREE.CylinderGeometry(.12,.12,.02,14),M(30.2,ct-.1,30.15));
  {const p=T('3',30.2,ct,31.0,0);p.c('black',0,0,0,.09,.11,.15,12);p.c('black',0,.1,0,.05,.05,1.2,8);p.g('black',new THREE.TorusGeometry(.35,.05,8,16,Math.PI),0,1.3,-.35,0,Math.PI/2,0);p.c('black',0,.95,-.7,.05,.05,.35,8);}
  // ---- east run with the cooktop (fronts face west, x=33.5)
  box('3','cab',33.5,35.3,e3+.35,ct-.12,21.9,29.25);box('3','black',33.6,35.3,e3,e3+.35,22,29.25);box('3','quartz',33.4,35.3,ct-.12,ct,21.9,29.25);
  drawers('z',33.5,-1,21.95,23.6,D3);drawers('z',33.5,-1,23.6,25.5,D2);drawers('z',33.5,-1,25.5,27.4,D2);
  front('z',33.5,-1,27.4,29.2,by0,by1,'door',dp(27.4,29.2,'l',by1-.45));
  box('3','blackGlass',33.7,35.1,ct,ct+.03,24.5,26.6);for(const [z,x] of [[25,34.1],[26.1,34.1],[25,34.75],[26.1,34.75]])addGeo('3','steel',new THREE.TorusGeometry(.22,.015,4,20),new THREE.Matrix4().makeRotationX(Math.PI/2).setPosition(x,ct+.04,z));
  // ---- uppers: solid doors below, glass-front cabinets above, all the way to the ceiling
  upper('x',30.25,-1,25.7,27.15,e3+4.6,e3+6.9,C-.02,1,'r');        // west of the window
  upper('x',30.25,-1,32.65,35.3,e3+4.6,e3+6.9,C-.02,2);            // east of the window
  upper('z',34.25,-1,21.9,24.35,e3+4.6,e3+6.9,C-.02,2);            // cooktop wall, by the fridge
  upper('z',34.25,-1,24.35,26.75,e3+6.0,e3+6.9,C-.02,2);           // over the cooktop (shorter, above the hood)
  upper('z',34.25,-1,26.75,30.25,e3+4.6,e3+6.9,C-.02,2);           // cooktop wall, by the window
  // warm LED strips under the uppers (they glow in the evening preset)
  for(const [x0,x1] of [[25.75,27.1],[32.7,35.25]])box('3','ledStrip',x0,x1,e3+4.57,e3+4.6,30.35,30.55);
  for(const [z0,z1] of [[21.95,24.3],[26.8,30.2]])box('3','ledStrip',34.35,34.55,e3+4.57,e3+4.6,z0,z1);
  // slim under-cabinet hood: stainless body with a front lip and a light strip underneath
  box('3','hoodSteel',33.95,35.3,e3+5.55,e3+6.0,24.4,26.7);box('3','hoodSteel',33.9,33.98,e3+5.5,e3+5.75,24.4,26.7);box('3','light',34.3,35.1,e3+5.54,e3+5.55,24.7,26.4);
  // backsplash (white subway): counter to the uppers, under and above the window, and up to the hood
  box('3','subway',25.7,27.15,ct,e3+4.6,31.26,31.3);box('3','subway',32.65,35.3,ct,e3+4.6,31.26,31.3);box('3','subway',27.15,32.65,ct,e3+3.45,31.26,31.3);
  box('3','subway',27.15,32.65,e3+7.4,C,31.26,31.3);
  box('3','subway',35.26,35.3,ct,e3+4.6,21.9,31.3);box('3','subway',35.26,35.3,e3+4.6,e3+5.55,24.35,26.75);
  // ---- fridge wall: the fridge, a two-door cabinet above it, a filler panel
  {const p=T('3',34.05,e3,19.8,-Math.PI/2);fridge(p);}
  box('3','cab',32.75,35.3,e3+6.05,C-.02,18.25,21.35);box('3','cab',32.75,35.3,e3,C-.02,21.35,21.9);
  front('z',32.75,-1,18.25,19.8,e3+6.05,C-.02,'door',dp(18.25,19.8,'r',e3+6.45,.45));front('z',32.75,-1,19.8,21.35,e3+6.05,C-.02,'door',dp(19.8,21.35,'l',e3+6.45,.45));
  // ---- west tall wall (fronts face east, x=25.75): a full-height pantry door, a stacked pair of pantry doors, and the oven tower with a
  // door above the double wall oven and a drawer below it
  box('3','cab',23.85,25.75,e3,C-.02,20.6,27.35);box('3','black',25.73,25.76,e3,e3+.35,20.6,27.35);
  front('z',25.75,1,20.65,22.85,by0,C-.04,'door',dp(20.65,22.85,'r',e3+3.8,1.6));
  for(const [a0,a1,side] of [[22.85,24.15,'r'],[24.15,25.45,'l']]){front('z',25.75,1,a0,a1,by0,e3+4.4,'door',dp(a0,a1,side,e3+3.6,.9));front('z',25.75,1,a0,a1,e3+4.4,C-.04,'door',dp(a0,a1,side,e3+4.95,.9));}
  front('z',25.75,1,25.45,27.35,by0,e3+1.36,'drawer',wp(25.45,27.35,e3+1.04));
  front('z',25.75,1,25.45,27.35,e3+5.55,C-.04,'door',wp(25.45,27.35,e3+5.9,.7));
  box('3','steel',25.73,25.8,e3+3.4,e3+5.5,25.55,27.2);box('3','blackGlass',25.79,25.83,e3+3.7,e3+5.0,25.75,27.0);box('3','steel',25.8,25.9,e3+5.2,e3+5.28,25.8,26.95);
  box('3','steel',25.73,25.8,e3+1.4,e3+3.35,25.55,27.2);box('3','blackGlass',25.79,25.83,e3+1.6,e3+2.9,25.75,27.0);box('3','steel',25.8,25.9,e3+3.1,e3+3.18,25.8,26.95);
  // corner base beside the tower
  box('3','cab',23.85,25.75,e3+.35,ct-.12,27.35,31.3);box('3','quartz',23.85,25.85,ct-.12,ct,27.35,31.3);box('3','black',25.6,25.76,e3,e3+.35,27.35,29.25);
  front('z',25.75,1,27.4,29.2,by0,by1,'door',dp(27.4,29.2,'l',by1-.45));
  addCol(23.85,25.75,20.6,31.3,e3,e3+3);addCol(25.7,35.3,29.15,31.3,e3,e3+3);addCol(33.4,35.3,21.9,29.25,e3,e3+3);addCol(32.75,35.3,18.25,21.9,e3,e3+8);
  // bar peninsula toward the living room
  box('3','cab',24.0,27.28,e3+.35,ct-.12,12.75,14.6);box('3','cab',28.47,31.6,e3+.35,ct-.12,12.75,14.6);box('3','cab',27.28,28.47,e3+.35,e3+.92,12.75,14.6);box('3','cab',27.28,28.47,ct-.25,ct-.12,12.75,14.6);box('3','quartz',23.95,31.6,ct-.12,ct,12.7,14.65);
  // kitchen side, after the listing photo (west to east): a drawer over a door, a microwave drawer over a warming drawer, a wine fridge,
  // then two drawer-over-door stacks; dark toe kick; white tile between the counter and the raised bar ledge, with two outlets
  {const F=14.6,yd=by1-.55;box('3','black',24.05,31.6,e3,e3+.35,12.8,14.45);
    for(const [a0,a1,side] of [[24.0,25.25,'r'],[28.5,30.05,'r'],[30.05,31.6,'l']]){front('x',F,1,a0,a1,yd,by1,'drawer',wp(a0,a1,by1-.27,.55));front('x',F,1,a0,a1,by0,yd,'door',dp(a0,a1,side,yd-.4,.5));}
    // microwave drawer: stainless body, black glass window and touch strip, no handle; warming drawer below with a bar handle
    const m0=25.28,m1=27.22,yM=ct-1.25;box('3','cabGap',25.25,27.25,by0,by1,F,F+.012);
    box('3','steel',m0,m1,yM,by1-.02,F,F+.07);box('3','blackGlass',m0+.18,m1-.18,yM+.15,by1-.32,F+.07,F+.075);box('3','blackGlass',m0+.1,m1-.1,by1-.25,by1-.08,F+.07,F+.075);
    box('3','steel',m0,m1,by0+.02,yM-.04,F,F+.07);addGeo('3','steel',new THREE.CylinderGeometry(.03,.03,1.5,10),new THREE.Matrix4().makeRotationZ(Math.PI/2).setPosition((m0+m1)/2,yM-.32,F+.16));
    for(const x of [m0+.25,m1-.25])box('3','steel',x-.025,x+.025,yM-.345,yM-.295,F+.07,F+.16);
    // wine fridge: stainless frame, tinted glass door with racks and bottle ends behind, a drawer below
    const w0=27.28,w1=28.47,yW=e3+.92;box('3','cabGap',27.25,28.5,by0,by1,F,F+.012);front('x',F,1,27.25,28.5,by0,yW,'drawer',wp(27.25,28.5,yW-.25,.55));
    box('3','black',w0+.05,w1-.05,yW+.02,by1-.05,F-1.4,F-1.38);box('3','cabGlass',w0+.12,w1-.12,yW+.12,by1-.18,F+.02,F+.06);
    box('3','steel',w0,w0+.12,yW,by1,F+.02,F+.06);box('3','steel',w1-.12,w1,yW,by1,F+.02,F+.06);box('3','steel',w0,w1,yW,yW+.12,F+.02,F+.06);box('3','steel',w0,w1,by1-.18,by1,F+.02,F+.06);
    for(let k=0;k<4;k++){const y=yW+.28+k*.38;box('3','walnutDark',w0+.1,w1-.1,y-.02,y,F-1.3,F-.05);for(const x of [w0+.35,w0+.6,w0+.85])addGeo('3',k%2?'blackGlass':'leather',new THREE.CylinderGeometry(.11,.11,.9,10),new THREE.Matrix4().makeRotationX(Math.PI/2).setPosition(x,y+.12,F-.6));}
    // tile backsplash up to the bar ledge, and two outlets
    box('3','subway',24.0,31.6,ct,e3+3.36,12.75,12.79);for(const x of [26.0,29.6])box('3','ceramicWhite',x-.1,x+.1,ct+.12,ct+.3,12.79,12.81);}
  box('3','wall',24.0,31.6,e3,e3+3.36,12.45,12.75);box('3','barTile',24.0,31.6,e3+.3,e3+3.36,12.42,12.45);box('3','trim',24.0,31.6,e3,e3+.3,12.4,12.45);
  box('3','wall',23.97,24.0,e3+.3,e3+3.36,12.45,12.75);box('3','trim',23.95,24.0,e3,e3+.3,12.42,12.75);box('3','quartz',23.85,31.6,e3+3.36,e3+3.48,11.75,12.95);addCol(23.85,31.6,11.75,14.65,e3,e3+3.6);
  for(const x of [25.2,27.6,30.0])pendantCone('C3',x,13.3,CEIL[3],e3+5.15);
  flushDrum('C3',29.7,22.5,CEIL[3],.9);KITCHEN_LIGHTS.drum=new THREE.Vector3(29.7,CEIL[3]-.55,22.5);
  // (the house's plants are imported models now: assets/models/manifest.json, plant-*)
  {const p=T('3',27.7,ct,30.95,0);p.c('ceramicWhite',0,0,0,.22,.18,.35,12);for(let i=0;i<7;i++)p.s('pillowOchre',.12*Math.cos(i),.45+.06*(i%3),.12*Math.sin(i),.08);}
  // ================= foyer & hall =================
  {const p=T('3',22.65,e3,27.6,-Math.PI/2);dresser(p,2.9,1.45,2.8,'doorGrey',{rows:3,cols:1,pull:'brass'});tableLamp(p,.6,2.8,0,'stacked');}
  art('3',23.28,e3+6.4,27.6,-Math.PI/2,1.4,1.8,'artLine','black');
  schoolhouse('C3',21.0,28.8,CEIL[3]);schoolhouse('C3',21.3,16.0,CEIL[3]);
  // upper-floor bedrooms: a ceiling fan with a light, centred in each room, and no other ceiling lights
  ceilingFan('C4',6.25,6.7,CEIL[4]);ceilingFan('C4',6.25,23.85,CEIL[4]);
  // ================= FOUR-SEASONS ROOM, gallery, suite (level 2, new) =================
  PH='a';
  rug('2','rugLiving',-11.4,e2,5.9,11,8.2);
  {const p=T('2',-11.4,e2,9.7,Math.PI,'four-seasons sofa');sofa(p,8.2,3.0,{mat:'fabricGrey',pillows:['pillowBlue','pillowOchre','pillowCream']});}
  {const p=T('2',-14.3,e2,2.6,.25);loungeChair(p,'fabricCream');} {const p=T('2',-8.5,e2,2.6,-.25);loungeChair(p,'fabricCream');}
  coffeeTable(T('2',-11.4,e2,6.1,0),4.2,2.2);  art('2',-2.45,e2+6.3,18.18,Math.PI,2.2,1.6,'artLandscape','gold');
  // closet rods & shelves
  for(const z of [13.15,18.15]){const s=z<15?1:-1;box('2','doorWhite',-21.2,-10.9,e2+5.6,e2+5.7,z,z+s*1.3);addGeo('2','steel',new THREE.CylinderGeometry(.04,.04,10.2,8),new THREE.Matrix4().makeRotationZ(Math.PI/2).setPosition(-16.05,e2+5.4,z+s*.8));
    for(let x=-20.8;x<-11.4;x+=.55)box('2',['linen','doorGrey','pillowBlue','fabricCream'][Math.floor(Math.abs(x*7))%4],x,x+.3,e2+2.4,e2+5.3,z+s*.45,z+s*1.25);}
  {const p=T('2',-7.75,e2,13.4,0);p.r('oakFurn',0,1.4,0,3.2,.2,1.1,.04);for(const s of [-1,1])p.b('oakFurn',s*1.4,0,0,.15,1.4,1.0);}
  // primary bedroom
  {const p=T('2',-3.85,e2,25.3,-Math.PI/2);bed(p,6.4,7.0,{head:'fabricGrey',throw:'linen'});}
  for(const z of [21.1,29.5]){const p=T('2',-0.95,e2,z,-Math.PI/2);nightstand(p,'walnutDark');tableLamp(p,0,2.1,-.1,'ribbed');}
  {const p=T('2',-8.4,e2,25.3,-Math.PI/2);p.r('linen',0,1.3,0,4.8,.35,1.4,.12);for(const s of [-1,1])p.b('walnutDark',s*2.2,0,0,.12,1.3,1.2);}
  {const p=T('2',-12.6,e2,29.6,Math.PI/2);dresser(p,4.6,1.7,2.9,'walnutDark',{rows:3,cols:2});}
  art('2',-0.35,e2+7.5,25.3,-Math.PI/2,3.2,2.2,'artBotanical','gold');
  rug('2','rugFamily',-5.6,e2,25.3,8,10);
  // primary bath: double vanity, toilet by the frosted window, walk-in shower
  {const p=T('2',-20.4,e2,21.6,Math.PI/2);p._tag='2';vanity(p,5.6,1.9,{mat:'cab',sinks:2});}
  for(const z of [20.2,23.0])bathMirror('2',-21.15,e2+7.2,z,Math.PI/2,1.9,2.6);
  {const p=T('2',-20.3,e2,26.15,Math.PI/2);toilet(p);}
  showerTileWalls('2',[[-21.2,-19.65,32.1,32.2],[-15.15,-14.0,32.1,32.2],[-21.2,-21.1,28.9,32.2],[-14.1,-14.0,28.9,32.2]],e2,e2+7.6);showerTileWalls('2',[[-19.65,-15.15,32.1,32.2]],e2,e2+1.7);showerTileWalls('2',[[-19.65,-15.15,32.1,32.2]],e2+7.05,e2+7.6);
  box('2','showerTile',-21.15,-14.05,e2,e2+.12,28.95,32.15);glassPanel('2','x',28.9,-19.0,-14.05,e2+.15,e2+7.0);showerHead('2',-17.6,e2+6.8,32.0,0,-1);
  PH=null;
  // ================= THE PATIO AS IT STANDS (current state; under the four-seasons room once it is built) =================
  // grey-brown wicker sofa and two armchairs with white cushions round a wood coffee table on a blue and white rug (the listing photo)
  PH='c';{const py=-16.05;rug('1','rugLiving',-14.6,py,0.9,7.4,5.6);
    {const p=T('1',-14.6,py,3.6,Math.PI,'patio wicker sofa');sofa(p,6.6,2.8,{mat:'wicker',pillows:['fabricCream','fabricCream']});}
    {const p=T('1',-16.7,py,-1.4,.12,'patio wicker armchair');loungeChair(p,'wicker');}{const p=T('1',-12.5,py,-1.4,-.12,'patio wicker armchair');loungeChair(p,'wicker');}
    coffeeTable(T('1',-14.6,py,1.0,0,'patio coffee table'),3.6,1.9);
    {const p=T('1',-10.4,py,-2.2,0,'patio planter');plant(p,0,0,0,'tall');}}PH=null;
  // ================= LEVEL 4 BATHS (fixtures only) =================
  {const p=T('4',16.45,e4,20.6,-Math.PI/2);p._tag='4';vanity(p,1.9,1.6,{mat:'doorWhite',tap:'steel'});}bathMirror('4',17.08,e4+7.0,20.6,-Math.PI/2,1.6,2.4);
  {const p=T('4',16.5,e4,22.6,-Math.PI/2);toilet(p);}
  tub('4',12.4,17.1,24.3,26.6,e4);showerTileWalls('4',[[12.4,17.1,26.55,26.6]],e4+1.7,e4+7);showerHead('4',12.65,e4+6.4,25.4,1,0);
  {const p=T('4',13.2,e4,27.75,0);p._tag='4';vanity(p,1.6,1.5,{mat:'doorWhite',tap:'steel'});}
  {const p=T('4',14.85,e4,27.95,0);toilet(p);}
  showerTileWalls('4',[[15.8,18.25,31.25,31.3],[18.2,18.25,27.0,31.3]],e4,e4+7);box('4','showerTile',15.8,18.25,e4,e4+.12,27,31.3);
  glassPanel('4','z',15.8,27.1,31.25,e4+.15,e4+6.9);showerHead('4',18.1,e4+6.4,29.2,-1,0);
  // upper-floor primary bedroom, a nursery (owner's layout; colours and feel from the inspiration photo). The recliner, crib and daybed
  // are imported models (assets/models/manifest.json)
  // an 8' x 10' rug, its long side across the room, under the front of the crib, recliner and daybed
  // (its pattern: the owner's charcoal floral rug, assets/textures/rug_floral_charcoal_8x10.jpg)
  {const p=T('4',6.25,e4,26.4,0,'8x10 charcoal floral rug');p.b('rugNurseryBig',0,0,0,10,.03,8);}
  // two-column toy cubbies under the west window, beside the closets (their back to the wall)
  {const p=T('4',.78,e4,18.75,-Math.PI/2,'light-oak toy cubbies with fabric bins'),cols=2,t=.07,W=2*1.38+t,H=2.0,D=.95;
    p.b('oakLight',0,0,0,W,t,D);p.b('oakLight',0,H-t,0,W,t,D);p.b('oakLight',0,H/2-t/2,0,W,t,D);p.b('oakLight',0,0,D/2-.03,W,H,.06);
    for(let k=0;k<=cols;k++)p.b('oakLight',-W/2+t/2+k*(W-t)/cols,0,0,t,H,D);
    const bins=[['fabricCream',0,0],['olive',1,0],['linen2',0,1]],cw=(W-t)/cols;
    for(const [m,c,r] of bins)p.r(m,-W/2+t+cw*(c+.5)-t/2,t+.02+r*(H/2),-.06,cw-.2,H/2-t-.22,D-.2,.05);
    p.col(0,0,W,D,0,H);}
  // Babyletto Gelato 3-drawer changer dresser (33.5" W x 19.25" D x 36.5" H with its removable changing tray, babyletto.com), all in the
  // crib's honey wood (cribWood): a case with softly rounded edges on four short round feet with gold tips, three drawer fronts with a
  // pair of round knobs each, and the empty tray on top. Against the front wall under
  // the front window (the bathroom door, in the corner beyond it, keeps its swing clear); a second one in the bedroom across the hall,
  // against its rear wall under the window (the crib takes its north wall), facing into the room
  for(const [x,z,ry,nm] of [[8.4,30.5,0,'Babyletto Gelato 3-drawer changer dresser, honey wood'],[6.9,1.15,Math.PI,'Babyletto Gelato changer dresser, second bedroom']]){
    const p=T('4',x,e4,z,ry,nm),W=33.5/12,D=19.25/12,H=36.5/12,leg=.36,top=34.5/12,zf=-D/2;
    p.r('cribWood',0,leg,0,W,top-leg,D,.09);
    const d0=leg+.12,d1=top-.12,gap=.035,dh=(d1-d0-2*gap)/3;
    for(let i=0;i<3;i++){const y=d0+i*(dh+gap);p.r('cribWood',0,y,zf-.03,W-.24,dh,.07,.025);
      for(const kx of [-W*.25,W*.25])p.c('cribWood',kx,y+dh/2-.06,zf-.12,.065,.055,.12,20,Math.PI/2);}
    for(const sx of [-1,1])for(const sz of [-1,1]){const x=sx*(W/2-.22),z=sz*(D/2-.2);p.c('cribWood',x,.05,z,.075,.055,leg-.05,18);p.c('gold',x,0,z,.056,.056,.06,18);}
    const tw=32.5/12,td=17.5/12,rh=H-top,rw=.07;p.r('cribWood',0,top,0,tw,.05,td,.02);
    for(const sz of [-1,1])p.r('cribWood',0,top,sz*(td/2-rw/2),tw,rh,rw,.03);for(const sx of [-1,1])p.r('cribWood',sx*(tw/2-rw/2),top,0,rw,rh,td,.03);
    p.col(0,0,W,D,0,H);}
  // second bedroom: an 8' x 10' rug, its long side along the room, under the front of the crib (an imported model, on the north wall) and
  // the changer dresser; its pattern is the owner's confetti-check rug, assets/textures/rug_confetti_check_8x10.jpg
  {const p=T('4',4.9,e4,6.4,0,'8x10 confetti check rug');p.b('rugCheck',0,0,0,8,.03,10);}
  cap('3',32.8,35.3,18.3,21.3,0,6);cap('3',23.85,25.75,20.6,27.35,0,7.6);cap('3',32.75,35.3,21.35,21.9,0,7.95);
  cap('2',0.3,1.6,7.0,12.6,e2,CEIL[2]);cap('X',-1.85,-0.3,6.9,12.9,-17,18.2);
  // ================= LOWER LEVEL: laundry & mechanicals =================
  // sitting room (listing photos): a brass sputnik light with ten globe bulbs; teddy rugs in it and the room past the cased opening, 8 in
  // from the walls (built like floors, so the photo texture tiles at its real size)
  {const g=8/12;box('1','rugTeddy',14.9+g,35.7-g,e1,e1+.05,0.3+g,12.0-g);box('1','rugTeddy',36.1+g,44.3-g,e1,e1+.05,0.3+g,9.0-g);}
  {const yc=CEIL[1],x=25.1,z=6.2,yh=yc-1.45;LAMPS.push({v:new THREE.Vector3(x,yh,z),k:'chandelier'});const p=P('C1',x,0,z,0,'sitting room light');
    p.c('brass',0,yc-.05,0,.22,.22,.05,16);p.c('brass',0,yh,0,.03,.03,yc-yh,8);p.g('brass',new THREE.SphereGeometry(.1,14,10),0,yh,0);
    for(let i=0;i<10;i++){const az=i*Math.PI/5+.2,el=(i%2?.38:-.3)+(i%3-1)*.12,L=1.05+(i%3)*.18,dx=Math.cos(el)*Math.cos(az)*L,dy=Math.sin(el)*L,dz=Math.cos(el)*Math.sin(az)*L;
      beam('C1','brass',[x,yh,z],[x+dx,yh+dy,z+dz],.035,.035);p.c('brass',dx*1.02,yh+dy*1.02-.04,dz*1.02,.045,.045,.08,8);p.g('light',new THREE.SphereGeometry(.15,14,10),dx*1.1,yh+dy*1.1,dz*1.1);}}
  // home theatre mock-up (the user's photo) on the sitting room's west wall, W19 (inside face x 14.9, z 0.3 to 12.0): a 100" 16:9 ALR screen
  // (picture 87.2" x 49") centred on it, 2.4 ft up; a long low console under it, its top slab flush with the two-drawer body, on slim black
  // legs; an ultra-short-throw laser projector on the console (bronze fabric grille round three sides, brushed top, the rear lid tilted open
  // over the lens, which faces the screen). Each faces the room (+x); their backs are local -z.
  {const zc=6.15;
    {const p=T('1',15.0,e1,zc,Math.PI/2,'ALR projector screen'),w=87.2/12,h=49/12,f=.05;p.b('black',0,2.4,0,w+2*f,h+2*f,.12);p.b('alrScreen',0,2.4+f,.061,w,h,.004);}
    {const p=T('1',15.0+.1+.78,e1,zc,Math.PI/2,'media console'),L=8.4,D=1.45,y0=.42,y1=1.13;
      for(const [x,z] of [[-L/2+.6,-D/2+.3],[L/2-.6,-D/2+.3],[-L/2+.6,D/2-.3],[L/2-.6,D/2-.3]])p.c('blackMetal',x,0,z,.04,.04,y0,10);
      p.b('blackMetal',0,y0-.03,0,L-1.0,.03,D-.5);p.b('consoleWalnut',.05,y0,0,L,y1-y0,D);
      p.b('consoleWalnut',.05,y1+.02,0,L,.12,D);p.b('black',.05,y1,0,L-.4,.02,D-.2);   // the top slab, flush with the body, floating on a shadow line
      for(const s of [-1,1]){p.b('consoleWalnut',.05+s*L/4,y0+.06,D/2,L/2-.08,y1-y0-.12,.02);p.b('black',.05+s*(L/2-.6),y0+.5,D/2+.012,.5,.025,.01);}   // drawer fronts, finger pulls
      p.b('black',.05,y0+.04,D/2+.006,.025,y1-y0-.08,.01);}
    {const p=T('1',15.95,e1+1.27,zc,Math.PI/2,'UST laser projector'),W=1.75,D=1.15;
      for(const [x,z] of [[-W/2+.15,-D/2+.15],[W/2-.15,-D/2+.15],[-W/2+.15,D/2-.15],[W/2-.15,D/2-.15]])p.c('black',x,0,z,.05,.05,.025,12);
      p.r('projGrille',0,.025,0,W,.29,D,.035);p.b('black',0,.31,0,W-.01,.014,D-.01);p.r('projBody',0,.32,0,W,.1,D,.03);
      p.b('tvScreen',0,.418,-D/2+.24,W*.62,.012,.3);p.b('steel',0,.421,D/2-.13,.22,.004,.05);
      const a=.38,zh=-D/2+.42,L=.4;p.g('projBody',new THREE.BoxGeometry(W*.66,.025,L),0,.43+Math.sin(a)*L/2,zh-Math.cos(a)*L/2,a,0,0);}}
  // washer and dryer side by side against the laundry's west wall (W18, x 18.5), facing into the room
  {const p=T('1',20.1,e1,29.9,Math.PI/2,'washer');washer(p,false);} {const p=T('1',20.1,e1,27.5,Math.PI/2,'dryer');washer(p,true);}
  for(const inst of INSTS){const b=inst.grp;if(b.isEmpty())continue;const h=b.max.y-b.min.y,a=(b.max.x-b.min.x)*(b.max.z-b.min.z);if(h<.35||a>140||a<.04)continue;
    const r=[b.min.x+.08,b.max.x-.08,b.min.z+.08,b.max.z-.08];inst.cols.push({c:addCol(r[0],r[1],r[2],r[3],b.min.y,b.max.y),r});}
}
