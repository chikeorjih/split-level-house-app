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
function mansard(){
  const X0=0,X1=19.2,Z0=0,Z1=31.6,d0=1.2,d1=.25,YT=12.7;
  const eave=(x,z)=>{if(x<0.3)return addRoofY(z)+.15;if(z<0)return x<=14.2?4.4:8.6;if(z>31.6)return x<18.5?4.4:9.05;return z<ROOF.RID?roofB(z):roofA(z);};
  const Ee=[[X0-d0,Z0-d0],[X1+d0,Z0-d0],[X1+d0,Z1+d0],[X0-d0,Z1+d0]],Tt=[[X0-d1,Z0-d1],[X1+d1,Z0-d1],[X1+d1,Z1+d1],[X0-d1,Z1+d1]];
  const L=(p,q,s)=>[p[0]+(q[0]-p[0])*s,p[1]+(q[1]-p[1])*s];
  for(let i=0;i<4;i++){const j=(i+1)%4,hz=i%2===0,a0=hz?Ee[i][0]:Ee[i][1],a1=hz?Ee[j][0]:Ee[j][1];
    const ts=new Set(),n=Math.ceil(Math.abs(a1-a0)/1.5);for(let k=0;k<=n;k++)ts.add(k/n);
    for(const b of (hz?[0.3,14.2,18.5]:[0,ROOF.RID,31.6])){const t=(b-a0)/(a1-a0);if(t>.003&&t<.997){ts.add(t-.002);ts.add(t+.002);}}
    const T=[...ts].sort((p,q)=>p-q);
    for(let k=0;k<T.length-1;k++){const ea=L(Ee[i],Ee[j],T[k]),eb=L(Ee[i],Ee[j],T[k+1]),ta=L(Tt[i],Tt[j],T[k]),tb=L(Tt[i],Tt[j],T[k+1]);
      quadSlab('roof','slateRoof',[[ea[0],eave(ea[0],ea[1]),ea[1]],[eb[0],eave(eb[0],eb[1]),eb[1]],[tb[0],YT,tb[1]],[ta[0],YT,ta[1]]],.25);}}
  hipRoof('roof','roof',X0-d1-.2,X1+d1+.2,Z0-d1-.2,Z1+d1+.2,YT-.05,3.0,.3);
  box('roof','frameDark',X0-d0-.05,18.5,4.25,4.45,Z1+.3,Z1+d0+.05);box('roof','frameDark',14.2,X1+d0+.05,8.5,8.68,Z0-d0-.05,Z0-.3);box('roof','frameDark',18.5,X1+d0+.05,8.95,9.1,Z1+.3,Z1+d0+.05);box('roof','frameDark',18.5,X1+d0+.05,8.2,9.1,Z1+d0-.05,Z1+d0+.05);box('3','brick',18.5,19.2,8.6,9.0,31.3,31.9);box('roof','frameDark',X0+.3,14.2,4.25,4.45,Z0-d0-.05,Z0-.3);
}
function dormer(cx,side,w){const wz=side>0?31.6:0,f=wz+side*1.05,y0=5.55,yh=11.35,hw=w/2,ww=w-.9,wy0=6.9,wy1=10.95,fr=.14;
  const Z=(a,b)=>[Math.min(a,b),Math.max(a,b)];const [za,zb]=Z(wz,f),[fa,fb]=Z(f-side*.14,f);
  for(const s of [-1,1]){const x=cx+s*(hw-.12);box('4','dormerClad',x-.12,x+.12,y0,yh,za,zb);PIECES.push({tag:'4',ax:'z',a0:za,a1:zb,c:x,t:.24,y0,y1:yh});
    const xi=cx+s*(hw-.26);box('4','wall',xi-.02,xi+.02,wy0,yh-.1,za,zb);}
  box('4','dormerClad',cx-hw,cx+hw,y0,wy0,fa,fb);box('4','dormerClad',cx-hw,cx+hw,wy1,yh,fa,fb);
  box('4','dormerClad',cx-hw,cx-ww/2,wy0,wy1,fa,fb);box('4','dormerClad',cx+ww/2,cx+hw,wy0,wy1,fa,fb);
  box('4','frameDark',cx-ww/2,cx+ww/2,wy0,wy0+fr,fa,fb);box('4','frameDark',cx-ww/2,cx+ww/2,wy1-fr,wy1,fa,fb);
  box('4','frameDark',cx-ww/2,cx-ww/2+fr,wy0,wy1,fa,fb);box('4','frameDark',cx+ww/2-fr,cx+ww/2,wy0,wy1,fa,fb);
  for(const k of [-1,1]){const x=cx+k*ww/6;box('4','frameDark',x-.06,x+.06,wy0,wy1,fa,fb);}
  const [ga,gb]=Z(f-side*.09,f-side*.05);box('4','glass',cx-ww/2+fr,cx+ww/2-fr,wy0+fr,wy1-fr,ga,gb);
  PIECES.push({tag:'4',ax:'x',a0:cx-ww/2,a1:cx+ww/2,c:f-side*.07,t:.12,y0:wy0,y1:wy1,glass:true});
  box('4','ceiling',cx-hw+.24,cx+hw-.24,yh-.1,yh,za,zb);box('4','trim',cx-hw+.24,cx+hw-.24,wy0-.1,wy0,za,zb);
  // segmental arched roof
  const hw2=hw+.2,rise=.8,R=(hw2*hw2+rise*rise)/(2*rise),a=Math.asin(hw2/R),cY=yh+rise-R,len=1.45,zc=wz+side*(1.05-len/2+.14);
  addGeo('4','slateRoof',new THREE.CylinderGeometry(R,R,len,28,1,true,Math.PI-a,2*a),new THREE.Matrix4().makeRotationX(Math.PI/2).setPosition(cx,cY,zc));
  const sh=new THREE.Shape();sh.absarc(0,0,R-.02,Math.PI/2+a,Math.PI/2-a,true);sh.closePath();
  addGeo('4','dormerClad',new THREE.ExtrudeGeometry(sh,{depth:.14,bevelEnabled:false,curveSegments:24}),new THREE.Matrix4().makeTranslation(cx,cY,side>0?f-.14:f));
}
// ================= HOUSE ASSEMBLY =================
let SPEC;
function buildHouse(){
  SPEC=buildSpec();
  for(const w of SPEC.walls)wallBuild(w);
  for(const f of SPEC.floors){OWNER={key:'F@'+(f.loc?locKey(f.loc):f.x0+','+f.z0),kind:'floor',fn:'F',loc:f.loc,label:f.mat+' floor'};box(String(f.lv),f.mat,f.x0,f.x1,f.y-.9,f.y,f.z0,f.z1);addWalk(f.x0,f.x1,f.z0,f.z1,f.y);}
  for(const c of SPEC.ceils){OWNER={key:'C@'+(c.loc?locKey(c.loc):c.x0+','+c.z0),kind:'ceiling',fn:'C',loc:c.loc,label:'ceiling'};box('C'+c.lv,'ceiling',c.x0,c.x1,c.y,c.y+.12,c.z0,c.z1);}
  OWNER=null;
  // recessed can lights (hidden with ceilings)
  const cans=[[2,2,12.5,2,17],[3,16,30,2,10],[3,25,34,15,30],[3,19.5,22.5,13,30],[4,2,11,2,12],[4,2,11,18,30],[1,3,34,3,28],[2,-20,-2,20,31],[2,2,10,21,30]];
  for(const [lv,x0,x1,z0,z1] of cans){const y=CEIL[lv];for(let x=x0;x<=x1;x+=Math.max(3.5,(x1-x0)/3))for(let z=z0;z<=z1;z+=Math.max(3.5,(z1-z0)/3)){
    addGeo('C'+lv,'light',new THREE.CylinderGeometry(.22,.22,.04,14),M(x,y-.01,z));addGeo('C'+lv,'trim',new THREE.TorusGeometry(.25,.03,5,16),new THREE.Matrix4().makeRotationX(Math.PI/2).setPosition(x,y-.02,z));}}

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
  // main block + garage: one continuous low hip, ridge east-west, hipped at the garage end
  const RF=(pts)=>quadSlab('roof','roof',pts,.38),A=roofA,B=roofB,RY=ROOF.RY,RID=ROOF.RID,GE=roofA(29.6);
  RF([[19.2,RY,RID],[35.6,RY,RID],[35.6,A(32.4),32.4],[19.2,A(32.4),32.4]]);
  RF([[35.6,RY,RID],[45.0,RY,RID],[54.9,GE,29.6],[35.6,GE,29.6]]);
  RF([[19.2,RY,RID],[44.6,RY,RID],[44.6,8.4,-0.8],[19.2,8.4,-0.8]]);
  RF([[44.6,RY,RID],[45.0,RY,RID],[54.9,GE,9.8],[44.6,GE,9.8]]);
  RF([[54.9,GE,9.8],[54.9,GE,29.6],[45.0,RY,RID],[45.0,RY,RID]]);
  polyWall('3','brick','z',35.6,.5,[[28.8,8.6],[28.8,A(28.8)],[31.6,A(31.6)],[31.6,8.6]]);
  polyWall('3','brick','z',44.6,.4,[[9.8,GE-.2],[9.8,B(9.8)],[RID,RY-.05]]);
  polyWall('3','brick','z',43.8,.6,[[0,8.45],[10.6,8.45],[10.6,B(10.6)],[0,B(0)]]);
  box('3','brick',35.6,54.4,8.6,GE+.1,28.5,29.1);box('3','brick',53.8,54.4,8.6,GE+.1,10.3,29.1);box('3','brick',44.6,54.4,8.6,GE+.1,10.3,10.9);
  // fascia along the front eaves
  box('roof','frameDark',23.7,35.6,A(32.4)-.55,A(32.4)-.05,32.35,32.5);box('roof','frameDark',35.6,54.95,GE-.55,GE-.05,29.55,29.7);
  // upper floor: mansard with slate-look skirt, low hipped cap, arched dormers front and back
  mansard();dormer(8.0,1,5.2);dormer(4.05,-1,5.4);
  // entry portico: small hip on two dark posts over the front doors
  hipRoof('roof','roof',19.0,23.6,31.6,35.5,7.75,1.1);
  box('3','frameDark',19.0,23.6,7.35,7.8,35.0,35.5);box('3','frameDark',19.0,23.6,7.72,7.8,31.6,35.5);
  for(const x of [19.3,23.3]){box('3','frameDark',x-.22,x+.22,-0.5,7.4,35.03,35.47);addCol(x-.22,x+.22,35.03,35.47,-0.5,7.4);}
  for(const [x,z] of [[18.75,31.98],[45.0,29.15],[35.95,29.15]]){box('3','blackMetal',x-.22,x+.22,5.6,6.5,z,z+.32);box('3','shade',x-.17,x+.17,5.68,6.38,z+.06,z+.3);LAMPS.push({v:new THREE.Vector3(x,6.0,z+.6),k:'outdoor'});}
  // addition: brick box under a near-flat dark standing-seam roof (draining to the rear), dark fascia
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
  // soffit under the four-seasons room + piers over the patio
  box('2','trim',-21.8,0,-6.0,-5.4,-1.95,12.9);
  for(const [x,z] of [[-21.2,-1.35],[-14.3,-1.35],[-7.3,-1.35],[-0.9,-1.35],[-21.2,5.8]]){box('X','brick',x-.65,x+.65,-16.05,-5.9,z-.65,z+.65);addCol(x-.65,x+.65,z-.65,z+.65,-16.05,-5.9);}
  box('X','beam',-21.8,0,-6.6,-5.95,-1.7,-1.0);

  // ---------- decks, porch, patio ----------
  const deck=(tag,mat,x0,x1,z0,z1,top,postMat)=>{box(tag,mat,x0,x1,top-.15,top,z0,z1);addWalk(x0,x1,z0,z1,top);
    for(let x=x0+.6;x<x1;x+=Math.max(3,(x1-x0)/3))for(const z of [z0+.6,z1-.6,(z0+z1)/2]){const g=terrainH(x,z);if(g<top-.6)box(tag,postMat,x-.25,x+.25,g-.5,top-.15,z-.25,z+.25);}
    box(tag,postMat,x0,x1,top-.9,top-.15,z0,z0+.15);box(tag,postMat,x0,x1,top-.9,top-.15,z1-.15,z1);};
  deck('1','deckOld',14.7,29.7,-8.9,0,E[1]-.1,'deckRailOld');
  railRun('1',[14.8,E[1]-.1,-8.8],[29.6,E[1]-.1,-8.8],3,'wood');
  railRun('1',[14.8,E[1]-.1,-8.8],[14.8,E[1]-.1,-3.6],3,'wood');railRun('1',[29.6,E[1]-.1,-8.8],[29.6,E[1]-.1,-3.1],3,'wood');
  stairFlight({x0:10.3,x1:14.7,z0:-3.6,z1:-0.3,yLow:-16.05,yHigh:E[1]-.1,dir:1},{tag:'1',tread:'deckOld',riser:'deckRailOld',open:true,stringer:'deckRailOld'});
  railRun('1',[10.3,-16.05,-3.55],[14.7,E[1]-.1,-3.55],3,'wood');
  stairFlight({x0:-2.4,x1:-0.3,z0:2.4,z1:6.0,yLow:-16.05,yHigh:E[1],dir:1},{tag:'1',tread:'paver',riser:'concrete',soffit:'concrete'});
  // new deck off the dining room (level 3) and Route A stair down to the existing deck
  deck('3','deckNew',43.8,54.1,-2.15,10.35,-0.15,'deckNew');deck('3','deckNew',43.8,46.8,-2.95,-2.15,-0.15,'deckNew');
  for(const [a,b] of [[[43.9,-.15,-2.85],[46.8,-.15,-2.85]],[[46.8,-.15,-2.85],[46.8,-.15,-2.05]],[[46.8,-.15,-2.05],[54.0,-.15,-2.05]],[[54.0,-.15,-2.05],[54.0,-.15,10.3]]])railRun('3',a,b,3,'wood',{post:'deckNew',rail:'deckNew',bal:'blackMetal',postDown:.9});
  stairFlight({x0:29.8,x1:43.8,z0:-3.0,z1:-0.05,yLow:E[1]-.1,yHigh:-0.15,dir:1},{tag:'3',tread:'deckNew',riser:'deckNew',open:true,stringer:'deckNew'});
  railRun('3',[29.8,E[1]-.1,-2.95],[43.8,-.15,-2.95],3,'wood',{post:'deckNew',rail:'deckNew',bal:'blackMetal'});
  for(const x of [31.5,35,38.5,42]){const z=-2.8,top=-0.15-(43.8-x)/14*(13.45),g=terrainH(x,z);box('3','deckNew',x-.22,x+.22,g-.4,top-.9,z-.22,z+.22);}
  // porch: raised stoop; the stair runs down to the left along the house front, as in the street photo
  deck('3','deckOld',18.1,26.6,31.75,36.4,-0.5,'deckRailOld');
  railRun('3',[26.5,-.5,31.9],[26.5,-.5,36.3],2.9,'wood');railRun('3',[18.2,-.5,36.3],[26.5,-.5,36.3],2.9,'wood');
  railRun('3',[18.2,-.5,35.95],[18.2,-.5,36.3],2.9,'wood',{collide:false});
  const sb=terrainH(8.6,34.4);
  stairFlight({x0:8.6,x1:18.1,z0:32.95,z1:35.85,yLow:sb,yHigh:-0.5,dir:1},{tag:'3',tread:'deckOld',riser:'deckRailOld',open:true,stringer:'deckRailOld'});
  railRun('3',[8.7,sb,35.75],[18.1,-.5,35.75],2.9,'wood');
  quadSlab('site','flagstone',[[2.6,sb+.05,32.5],[8.7,sb+.05,32.5],[8.7,sb+.05,37.4],[2.6,sb+.05,37.4]],.6);addWalk(2.6,8.7,32.5,37.4,sb+.05);
  // patio
  box('1','paver',-27,10.3,-16.25,-16.05,-3.75,0);box('1','paver',-27,0,-16.25,-16.05,0,6.5);
  addWalk(-27,10.3,-3.75,0,-16.05);addWalk(-27,0,0,6.5,-16.05);
  // garage apron & thresholds
  addWalk(35.6,54.1,28.6,29.2,-0.45);box('3','concrete',35.9,53.8,-0.9,-0.45,28.5,29.2);
}
