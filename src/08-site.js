// 08-site.js: terrain, street, driveway, fences, trees, shrubs, lawn, setback lines
"use strict";
// ================= SITE =================
const FOOT=[[0,18.5,0,31.6],[14.2,44.6,0,9.2],[14.2,35.9,0,31.6],[35.6,54.1,10.6,28.8],[35.6,44.6,9.2,10.6]];
function inFoot(x,z,m){m=m||0;for(const r of FOOT)if(x>r[0]-m&&x<r[1]+m&&z>r[2]-m&&z<r[3]+m)return true;return false;}
const SITE={rearSet:-2.15,westSet:-21.5,eastSet:54.1,frontSet:32.5,street0:62.5,street1:86.5};
function sstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
const FRONT_PTS=[[-95,-14.5],[-24,-11.8],[-2,-11.5],[3,-7],[14,-7],[18,-3.2],[26,-2.2],[30,-1.5],[135,-1.5]];
function yFront(x){const P=FRONT_PTS;if(x<=P[0][0])return P[0][1];for(let i=1;i<P.length;i++)if(x<=P[i][0]){const a=P[i-1],b=P[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return P[P.length-1][1];}
function yStreet(x){return x>=20?-1.3:-1.3-(20-x)*.07;}
function terrainH(x,z){
  const yF=yFront(x),yR=-16.25-Math.max(0,-z-12)*.12;
  let h=yR+(yF-yR)*sstep((z+1)/35);
  if(z>34)h=yF+(yStreet(x)-yF)*sstep((z-36)/24);
  if(z>SITE.street1)h=yStreet(x)+Math.min(2.5,(z-SITE.street1-1)*.05);
  if(x<-24)h-=(-24-x)*.04*(z<34?1:Math.max(0,1-(z-34)/26));
  if(x>60&&z<34)h+=Math.min(3,(x-60)*.03)*sstep((z+1)/35);
  if(x>-27&&x<=10.3&&z>-3.75&&z<=0)h=Math.min(h,-16.15);
  if(x>-27&&x<=0&&z>-3.75&&z<=15)h=Math.min(h,-16.15+Math.max(0,z-6.5)*.5);
  if(x>-21.5&&x<=0&&z>12.9&&z<32.5)h=Math.min(h,-12);
  return h;
}
// far ground: a coarse skirt from just inside the terrain's edge out to the horizon, at the height of the nearest terrain edge, so the view
// never runs off the world; the fog fades it into the sky
function buildSkirt(){const X0=-95,X1=135,Z0=-95,Z1=150,IN=4,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lines=(a0,a1)=>{const q=new Set([a0+IN,a1-IN]);for(const d of [0,25,60,110,180,280,420,620,900,1300,1800]){q.add(a0-d);q.add(a1+d);}for(let v=a0+IN;v<a1-IN;v+=10)q.add(v);return [...q].sort((a,b)=>a-b);};
  const XS=lines(X0,X1),ZS=lines(Z0,Z1),P=[],N=[],U=[],C=[],c=new THREE.Color(),cA=new THREE.Color(0x7a9443),cB=new THREE.Color(0x667c3c);
  const vtx=(x,z)=>{const y=terrainH(cl(x,X0,X1),cl(z,Z0,Z1))-.15;P.push(x,y,z);N.push(0,1,0);U.push(x,z);c.copy(cA).lerp(cB,.5+.5*Math.sin(x*.013+Math.cos(z*.011)*2));C.push(c.r,c.g,c.b);};
  for(let i=0;i<XS.length-1;i++)for(let j=0;j<ZS.length-1;j++){const x0=XS[i],x1=XS[i+1],z0=ZS[j],z1=ZS[j+1];
    if(x0>=X0+IN-1e-6&&x1<=X1-IN+1e-6&&z0>=Z0+IN-1e-6&&z1<=Z1-IN+1e-6)continue;
    for(const [x,z] of [[x0,z0],[x0,z1],[x1,z0],[x1,z0],[x0,z1],[x1,z1]])vtx(x,z);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));return g;}
function buildTerrain(){
  const X0=-95,X1=135,Z0=-95,Z1=150;
  const xs=new Set(),zs=new Set();
  for(let x=X0;x<=X1;x+=2)xs.add(x);for(let z=Z0;z<=Z1;z+=2)zs.add(z);
  for(const r of FOOT){xs.add(r[0]);xs.add(r[1]);zs.add(r[2]);zs.add(r[3]);}
  for(const v of [-27,-21.5,0,10.3])xs.add(v);for(const v of [-3.75,12.9,32.5,SITE.street0])zs.add(v);
  const XS=[...xs].sort((a,b)=>a-b),ZS=[...zs].sort((a,b)=>a-b),nx=XS.length,nz=ZS.length;
  const pos=new Float32Array(nx*nz*3),uv=new Float32Array(nx*nz*2),col=new Float32Array(nx*nz*3);
  const cA=new THREE.Color(0x7d9c45),cB=new THREE.Color(0x67823a),cC=new THREE.Color(0x76764a),tmp=new THREE.Color();
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i,x=XS[i],z=ZS[j],h=terrainH(x,z);
    pos[k*3]=x;pos[k*3+1]=h;pos[k*3+2]=z;uv[k*2]=x;uv[k*2+1]=z;
    const n=.5+.5*Math.sin(x*.37+Math.cos(z*.23)*2)*Math.cos(z*.31-x*.11);
    const wood=sstep((-z-2)/18)+(x<-24?.6:0)+(x>58&&z<20?.5:0);
    tmp.copy(cA).lerp(cB,n*.6);tmp.lerp(cC,Math.min(.6,wood*.45)*(.6+.4*n));if(isBed(x,z))tmp.setRGB(.24,.15,.09);col[k*3]=tmp.r;col[k*3+1]=tmp.g;col[k*3+2]=tmp.b;}
  const idx=[];
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const cx=(XS[i]+XS[i+1])/2,cz=(ZS[j]+ZS[j+1])/2;
    if(inFoot(cx,cz))continue;if(cz>SITE.street0&&cz<SITE.street1)continue;
    const a=j*nx+i,b=a+1,c=a+nx,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  return g;
}
function buildSiteHard(){
  // foundations below every exterior wall of the original house (grade drops away at the rear)
  const fd=(x0,x1,z0,z1,y1)=>box('X','brick',x0,x1,-18.5,y1,z0,z1);
  fd(-0.3,18.8,-0.3,0.3,-14.5);fd(-0.3,0.3,0,31.6,-14.5);fd(-0.3,18.8,31.3,31.9,-14.5);fd(18.2,18.8,31.6,31.9,-14.5);
  fd(14.2,44.9,-0.3,0.3,-14.5);fd(44.3,44.9,0,9.5,-14.5);fd(35.6,44.9,8.9,9.5,-14.5);fd(35.6,36.2,9.2,31.9,-14.5);fd(18.5,36.2,31.3,31.9,-14.5);
  box('X','brick',35.6,54.4,-4,-1,28.5,29.1);box('X','brick',53.8,54.4,-17,-1,10.3,29.1);
  // driveway and the street (which falls gently toward the west, like the lawn)
  // the driveway: a thin slab on top of the ground, stopping just inside the block's front face so it never shows in the soil cross-section
  quadSlab('site','driveway',[[36.0,-.52,28.95],[53.8,-.52,28.95],[53.8,-1.0,SITE.street0-.08],[36.0,-1.0,SITE.street0-.08]],.35);
  addWalk(36,53.8,28.95,SITE.street0,-.8);
  quadSlab('site','concrete',[[33.5,-.6,29.3],[36.0,-.6,29.3],[36.0,-.6,33.5],[33.5,-.6,33.5]],1.5);
  for(let x=-95;x<135;x+=5){const a=yStreet(x),b=yStreet(x+5);
    quadSlab('site','asphalt',[[x,a,SITE.street0+.6],[x+5,b,SITE.street0+.6],[x+5,b,SITE.street1],[x,a,SITE.street1]],3);
    quadSlab('site','concrete',[[x,a+.35,SITE.street0],[x+5,b+.35,SITE.street0],[x+5,b+.35,SITE.street0+.6],[x,a+.35,SITE.street0+.6]],3);
    quadSlab('site','concrete',[[x,a+.35,SITE.street1],[x+5,b+.35,SITE.street1],[x+5,b+.35,SITE.street1+.6],[x,a+.35,SITE.street1+.6]],3);
    if(Math.floor(x/5)%3===0)quadSlab('site','trim',[[x,a+.02,74.4],[x+5,b+.02,74.4],[x+5,b+.02,74.6],[x,a+.02,74.6]],.05);}
  for(let x=-95;x<135;x+=2.5){const y=yStreet(x+1.25);addWalk(x,x+2.5,SITE.street0,SITE.street1+.6,y);}
  // chain-link fence: gates in front of the addition's lower openings, then straight across to the west lot line, a square corner, and around the back
  const fence=(pts)=>{for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1],L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(L/4));
      for(let k=0;k<n;k++){const ax=x0+(x1-x0)*k/n,az=z0+(z1-z0)*k/n,bx=x0+(x1-x0)*(k+1)/n,bz=z0+(z1-z0)*(k+1)/n,ya=terrainH(ax,az),yb=terrainH(bx,bz),u0=k*L/n,u1=(k+1)*L/n;
        const b=bucket('site','chain');const V=[[ax,ya+.15,az,u0,0],[bx,yb+.15,bz,u1,0],[bx,yb+4.1,bz,u1,3.95],[ax,ya+4.1,az,u0,3.95]];
        const nl=Math.hypot(bz-az,bx-ax)||1;for(const q of [0,1,2,0,2,3]){const v=V[q];b.p.push(v[0],v[1],v[2]);b.n.push((bz-az)/nl,0,-(bx-ax)/nl);b.u.push(v[3],v[4]);}
        addCol(Math.min(ax,bx)-.2,Math.max(ax,bx)+.2,Math.min(az,bz)-.2,Math.max(az,bz)+.2,Math.min(ya,yb)-2,Math.max(ya,yb)+4.2);
        beam('site','steel',[ax,ya+4.1,az],[bx,yb+4.1,bz],.12,.12);}
      for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n,z=z0+(z1-z0)*k/n,y=terrainH(x,z);addGeo('site','steel',new THREE.CylinderGeometry(.09,.09,4.6,8),M(x,y+2.1,z));}}};
  fence([[-0.6,33.3],[-30.5,33.3],[-30.5,-31]]);fence([[-30.5,-31],[63.2,-31],[63.2,27.6],[54.6,27.6]]);
  {const g=terrainH(95,30);box('site','siding',78,112,g-1,g+10,12,44);hipRoof('site','roofBrown',76.5,113.5,10.5,45.5,g+10,6,.4);
   for(const x of [83,92,101])box('site','glass',x,x+4,g+3,g+7,43.98,44.05);box('site','brick',78,112,g-1,g+2.5,43.95,44.2);}
  frontLandscape();
}
function leafTex(small){const S=TX(256),C=S/2,[c,g]=cv(S,S);g.clearRect(0,0,S,S);
  for(let q=0;q<4;q++){const ox=(q%2)*C,oy=Math.floor(q/2)*C;g.save();g.beginPath();g.rect(ox,oy,C,C);g.clip();
    for(let i=0;i<(small?260:190);i++){const a=rr(0,6.283),d=Math.pow(rnd(),.7)*C*.44,x=ox+C/2+Math.cos(a)*d,y=oy+C/2+Math.sin(a)*d,L=(small?rr(3,6):rr(4.5,9))*S/256,W=L*(small?rr(.35,.5):rr(.6,.85)),r=rr(0,6.283);
      g.save();g.translate(x,y);g.rotate(r);g.fillStyle=hsl(rr(78,118),rr(30,55),rr(small?16:20,small?32:42));g.beginPath();g.moveTo(-L,0);g.quadraticCurveTo(0,-W,L,0);g.quadraticCurveTo(0,W,-L,0);g.fill();
      g.strokeStyle='rgba(255,255,220,.18)';g.lineWidth=.6;g.beginPath();g.moveTo(-L*.8,0);g.lineTo(L*.8,0);g.stroke();g.restore();}
    g.restore();}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=MAXANISO;return t;}
// ---------- the 3/4 view's diorama: the lot cut out as a block of earth standing on a plain studio floor, in a soft lavender studio.
// Outside the block the ground and buildings are clipped away (CLIP_X0..Z1), and the woods beyond it and the horizon tree band are
// hidden (FAR_TREES); the trees on the block, behind and beside the house, stay.
const DIO={x0:-40,x1:72,z0:-52,z1:62.5,base:-25,on:false,grp:null},FAR_TREES={value:0};
const inDio=(x,z,m)=>{m=m||0;return x>DIO.x0+m&&x<DIO.x1-m&&z>DIO.z0+m&&z<DIO.z1-m;};
function farPatch(m){const o=m.onBeforeCompile;m.onBeforeCompile=sh=>{if(o)o(sh);sh.uniforms.uFar=FAR_TREES;
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uFar;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n  if(uFar>.5)discard;');};
  m.customProgramCacheKey=()=>'far|'+(o?String(o):'');return m;}
function soilTex(){const S=TX(512),[c,g]=cv(S,S);const gr=g.createLinearGradient(0,0,0,S);gr.addColorStop(0,'#5a4130');gr.addColorStop(1,'#3b2a20');g.fillStyle=gr;g.fillRect(0,0,S,S);
  let y=0;while(y<S){const h=rr(6,30)*S/512;g.fillStyle='rgba('+(rnd()<.5?'120,90,60':'40,28,20')+','+rr(.05,.18)+')';g.fillRect(0,y,S,h);y+=h;}
  for(let i=0;i<S*3;i++){g.fillStyle='rgba('+(rnd()<.5?'150,120,90':'25,18,12')+','+rr(.1,.35)+')';g.fillRect(rr(0,S),rr(0,S),rr(1,3),rr(1,2));}
  return tex(c,12,12);}
// the studio floor under the block: plain soft lilac, fading out toward its edges into the backdrop
function studioFloorTex(){const W=TX(512),[c,g]=cv(W,W),C=W/2,rg=g.createRadialGradient(C,C,0,C,C,C);
  rg.addColorStop(0,'rgba(233,230,245,1)');rg.addColorStop(.55,'rgba(226,223,242,1)');rg.addColorStop(1,'rgba(220,217,240,0)');g.fillStyle=rg;g.fillRect(0,0,W,W);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
// the block's contact shadow on the studio floor: dark right at its foot, falling off quickly, plus a wide soft ambient-occlusion halo.
// The texture covers the footprint grown by S feet on every side; alpha comes from each pixel's distance (feet) outside the footprint.
function contactShadowTex(w,d,S){const R=TX(512),[c,g]=cv(R,R),im=g.createImageData(R,R),W=w+2*S,D=d+2*S;
  for(let j=0;j<R;j++)for(let i=0;i<R;i++){const x=Math.max(0,Math.abs((i+.5)/R*W-W/2)-w/2),z=Math.max(0,Math.abs((j+.5)/R*D-D/2)-d/2),e=Math.hypot(x,z);
    const a=Math.min(1,.9*Math.exp(-e/.7)+.225*Math.exp(-e/4.5))*Math.max(0,1-e/S),k=(j*R+i)*4;im.data[k]=im.data[k+1]=im.data[k+2]=12;im.data[k+3]=Math.round(a*255);}
  g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
function buildDiorama(){const grp=new THREE.Group(),P=[],N=[],U=[],B=DIO.base;
  const quad=(a,b,c2,d,n)=>{for(const v of [a,b,c2,a,c2,d]){P.push(v[0],v[1],v[2]);N.push(...n);U.push(v[3],v[1]);}};
  const side=(ax,fixed,a0,a1,n)=>{for(let a=a0;a<a1-1e-6;a+=2){const b=Math.min(a1,a+2),pt=t=>ax==='x'?[t,fixed]:[fixed,t],[xa,za]=pt(a),[xb,zb]=pt(b),ya=terrainH(xa,za)+.06,yb=terrainH(xb,zb)+.06;
    quad([xa,ya,za,a],[xb,yb,zb,b],[xb,B,zb,b],[xa,B,za,a],n);}};
  side('x',DIO.z1,DIO.x0,DIO.x1,[0,0,1]);side('x',DIO.z0,DIO.x0,DIO.x1,[0,0,-1]);side('z',DIO.x0,DIO.z0,DIO.z1,[-1,0,0]);side('z',DIO.x1,DIO.z0,DIO.z1,[1,0,0]);quad([DIO.x0,B,DIO.z0,0],[DIO.x1,B,DIO.z0,DIO.x1-DIO.x0],[DIO.x1,B,DIO.z1,DIO.x1-DIO.x0],[DIO.x0,B,DIO.z1,0],[0,-1,0]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  MAT.soil=new THREE.MeshStandardMaterial({map:soilTex(),roughness:1,side:THREE.DoubleSide});
  const soil=new THREE.Mesh(g,MAT.soil);soil.castShadow=true;soil.receiveShadow=true;grp.add(soil);
  // the block stands right on a plain studio floor and casts its shadow onto it
  const cx=(DIO.x0+DIO.x1)/2,cz=(DIO.z0+DIO.z1)/2,SZ=520,tb=new THREE.Mesh(new THREE.PlaneGeometry(SZ,SZ),new THREE.MeshStandardMaterial({map:studioFloorTex(),transparent:true,depthWrite:false,roughness:1}));
  tb.rotation.x=-Math.PI/2;tb.position.set(cx,B-.04,cz);tb.receiveShadow=true;tb.renderOrder=-2;grp.add(tb);DIO.table=tb;
  // contact shadow and ambient occlusion where the block meets the floor
  const w=DIO.x1-DIO.x0,d=DIO.z1-DIO.z0,S=14,ao=new THREE.Mesh(new THREE.PlaneGeometry(w+2*S,d+2*S),new THREE.MeshBasicMaterial({map:contactShadowTex(w,d,S),transparent:true,depthWrite:false}));
  ao.rotation.x=-Math.PI/2;ao.position.set(cx,B-.02,cz);ao.renderOrder=-1;grp.add(ao);
  grp.visible=false;return grp;}
function buildTrees(){
  const tc=new THREE.Color();
  const B={p:[],n:[],u:[]},L={p:[],n:[],u:[]},S={p:[],n:[],u:[]},lcol=[],scol=[];
  // trees inside the block (Bn, Ln) stay whole in the diorama; the woods beyond it (B, L) are hidden there
  const Bn={p:[],n:[],u:[]},Ln={p:[],n:[],u:[]},lcn=[];let TB=Bn,TL=Ln,TLC=lcn;
  const pushGeo=(arr,g,m)=>{let gg=g.index?g.toNonIndexed():g;gg.applyMatrix4(m);const p=gg.attributes.position.array,n=gg.attributes.normal.array,u=gg.attributes.uv?gg.attributes.uv.array:null;
    for(let i=0;i<p.length;i++){arr.p.push(p[i]);arr.n.push(n[i]);}for(let i=0;i<p.length/3;i++){arr.u.push(u?u[i*2]*2:0,u?u[i*2+1]*6:0);}};
  const up=new THREE.Vector3(0,1,0),_a=new THREE.Vector3(),_b=new THREE.Vector3(),_n=new THREE.Vector3(),_c=new THREE.Vector3(),_p=new THREE.Vector3();
  // alpha-cut leaf cards scattered through an ellipsoid; normals point out of the canopy so it shades like foliage.
  // `shell` packs them toward the surface so a crown has a defined outline; cards deeper in and lower down are darker (cheap self-shadowing)
  const cards=(A,col,cx,cy,cz,R,sy,n,size,base,shell)=>{for(let i=0;i<n;i++){_n.set(rr(-1,1),rr(-1,1),rr(-1,1)).normalize();
      const f=shell?.45+.55*Math.sqrt(rnd()):Math.cbrt(rnd()),rad=R*f*.92;
      _c.set(cx+_n.x*rad,cy+_n.y*rad*sy,cz+_n.z*rad);const s=size*rr(.7,1.25);
      _p.set(rr(-1,1),rr(-1,1),rr(-1,1)).normalize();_a.crossVectors(_p,up);if(_a.lengthSq()<1e-3)_a.set(1,0,0);_a.normalize();_b.crossVectors(_p,_a).normalize();
      const ou=rnd()<.5?0:.5,ov=rnd()<.5?0:.5;tc.copy(base).offsetHSL(rr(-.015,.015),rr(-.05,.05),rr(-.07,.07)).multiplyScalar((.45+.55*f)*(.86+.14*_n.y));
      const V=[[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]].map(([i1,j1,u,v])=>{const x=_c.x+(_a.x*i1+_b.x*j1)*s/2,y=_c.y+(_a.y*i1+_b.y*j1)*s/2,z=_c.z+(_a.z*i1+_b.z*j1)*s/2;
        let nx=(x-cx)/R,ny=(y-cy)/(R*sy)+.35,nz=(z-cz)/R;const l=Math.hypot(nx,ny,nz)||1;return [x,y,z,nx/l,ny/l,nz/l,ou+u*.5,ov+v*.5];});
      for(const q of [0,1,2,0,2,3]){const v=V[q];A.p.push(v[0],v[1],v[2]);A.n.push(v[3],v[4],v[5]);A.u.push(v[6],v[7]);col.push(tc.r,tc.g,tc.b);}}};
  const placed=[];RNG_SEED=987;
  const ok=(x,z,r)=>{if(z>28&&z<SITE.street0+2&&x>-34&&x<70)return false;if(x>70&&x<120&&z>5&&z<52)return false;if(x>-22-r*5&&x<55+r*5&&z>-3-r*5.5&&z<34+r*2)return false;if(x>-23-r&&x<1&&z>-3-r&&z<34)return false;
    if(x>12&&x<56&&z>-12&&z<0)return false;if(x>33&&x<57&&z>27&&z<SITE.street1+2)return false;if(x>17&&x<28&&z>30&&z<48)return false;
    if(z>SITE.street0-4&&z<SITE.street1+20)return false;for(const q of placed)if(Math.hypot(q[0]-x,q[1]-z)<q[2]+r*.9)return false;return true;};
  // limb from (x0,y0,z0) to (x1,y1,z1), tapering from radius r0 to r1
  const limb=(x0,y0,z0,x1,y1,z1,r0,r1,seg)=>{const d=new THREE.Vector3(x1-x0,y1-y0,z1-z0),L2=d.length();d.normalize();const q=new THREE.Quaternion().setFromUnitVectors(up,d);
    pushGeo(TB,new THREE.CylinderGeometry(r1,r0,L2,seg||5),new THREE.Matrix4().compose(new THREE.Vector3((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),q,new THREE.Vector3(1,1,1)));};
  // broadleaf shade tree, like the maples and oaks in a mature lawn: a short trunk that forks into limbs, each carrying a clump of
  // leaf cards; the clumps overlap into a rounded crown with gaps you can see branches through
  // back-yard trees (z<5) get a height factor from 1 to 2, so the tallest are twice their usual height; crowns and trunks grow a little with them
  const tree=(x,z,big,orn)=>{const near=inDio(x,z,1);TB=near?Bn:B;TL=near?Ln:L;TLC=near?lcn:lcol;const hk=!orn&&z<5?rr(1,2):1,g=terrainH(x,z),H=(orn?rr(11,14):big?rr(30,44):rr(17,25))*hk,th=H*(orn?.42:rr(.3,.38)),r=(orn?.2:big?rr(.55,.8):rr(.3,.45))*(1+(hk-1)*.5);
    const CR=(orn?rr(3.4,4.4):big?rr(11,15):rr(6,8.5))*(1+(hk-1)*.3),cy=g+th+(H-th)*.48,sy=(H-th)*.5/CR,base=new THREE.Color().setHSL(rr(.22,.28),rr(.3,.42),rr(.8,.92));
    limb(x,g-.5,z,x+rr(-.3,.3),g+th+CR*sy*.4,z+rr(-.3,.3),r,r*.45,8);
    const n=orn?3:big?Math.round(rr(5,6)):4,top=g+th;
    for(let k=0;k<n;k++){const a=k/n*6.283+rr(-.4,.4),d=CR*rr(.4,.55),cx=x+Math.cos(a)*d,cz=z+Math.sin(a)*d,ccy=cy+rr(-.2,.45)*CR*sy,R=CR*rr(.48,.6);
      limb(x,top-th*.1,z,x+(cx-x)*.75,top+(ccy-top)*.7,z+(cz-z)*.75,r*.45,r*.14);
      cards(TL,TLC,cx,ccy,cz,R,sy*rr(.85,1.05),orn?18:big?34:24,R*.7,base,true);}
    cards(TL,TLC,x,cy+CR*sy*.15,z,CR*.7,sy,orn?20:big?52:34,CR*.5,base,true);
    placed.push([x,z,orn?2:big?CR*.55:CR*.5]);};
  let tries=0,count=0;
  while(count<120&&tries<9000){tries++;const x=rr(-95,135),z=rr(-95,26);const rear=z<5,side=x<-22||x>58;
    if(!rear&&(!side||rnd()<.6))continue;if(!ok(x,z,4))continue;tree(x,z,rnd()<.8);count++;}
  for(let i=0;i<70;i++){const x=rr(-80,120),z=rr(-85,20);if(z>5&&x>-22&&x<58)continue;if(!ok(x,z,2))continue;tree(x,z,false);}
  // side yards: a loose row of trees down each side of the lot, inside the diorama block
  for(const [x,z] of [[-35,-42],[-35.5,-22],[-34.5,-4],[-36,14],[-34,26],[66.5,-42],[67,-22],[66,-4],[67.5,14],[66.5,24]])if(ok(x,z,2))tree(x,z,rnd()<.6);
  // foundation shrubs (boxwood), the planting strip outside the entry walk's wall, and the tall conical shrub at the walk's west end
  const shrub=(x,z,r,sy,col)=>{const y=terrainH(x,z);cards(S,scol,x,y+r*.75*(sy||1),z,r,(sy||.8),Math.round(18+r*r*22),r*.85,col||new THREE.Color().setHSL(rr(.25,.3),.35,rr(.55,.68)));};
  const hsl3=(h,s,l)=>new THREE.Color().setHSL(h,s,l);
  // planting strip outside the entry walk's wall
  for(let x=27.5;x<35;x+=2.2)shrub(x,37.4,.95);shrub(20.5,37.5,.9);shrub(24.8,37.4,1.0);
  // the curved front bed: a back row of rounded shrubs along the house, two big mounded shrubs in front, low fillers toward the edging,
  // and the tall conical shrub at its east end
  for(const [x,z,r] of [[-9,34.4,1.45],[-5.2,34.6,1.6],[-1.4,34.5,1.5],[2.6,34.3,1.65],[6.4,34.4,1.55],[10.2,34.6,1.65],[13.8,34.5,1.5]])shrub(x,z,r,.85,hsl3(rr(.26,.3),.36,rr(.5,.6)));
  shrub(3.4,37.8,2.3,.8,hsl3(.27,.38,.55));shrub(8.8,38.6,2.1,.85,hsl3(.29,.42,.42));
  for(const [x,z,r] of [[-6,37.2,1.05],[-2,38.4,1.0],[13.6,39.1,1.05],[-9.8,36.4,.95]])shrub(x,z,r,.75,hsl3(rr(.2,.24),.42,rr(.58,.66)));
  shrub(16.6,38.6,2.0,1.4);
  // the deep flowering hedge along the driveway's east side (hydrangea and mixed shrubs), two staggered rows
  for(let z=31;z<61;z+=1.9){shrub(55.6+rr(-.2,.2),z+rr(-.3,.3),rr(1.3,1.7),rr(1.05,1.35),hsl3(rr(.22,.3),rr(.3,.42),rr(.48,.6)));
    shrub(57.5+rr(-.2,.2),z+.95,rr(1.2,1.6),rr(1.0,1.3),rnd()<.25?hsl3(rr(.05,.09),.28,rr(.6,.68)):hsl3(rr(.24,.3),.36,rr(.5,.6)));}
  // mid-lawn: a small ornamental tree, an ornamental grass clump, a shrub by the street, and the low shrub bed near the street on the west
  tree(15,49,false,true);
  {const g=terrainH(25,45);for(let k=0;k<5;k++)cards(Ln,lcn,25+rr(-.4,.4),g+1.6+rr(0,.6),45+rr(-.4,.4),1.3,1.6,14,1.4,hsl3(.18,.35,.6));}
  shrub(33,59.5,1.1,.9);
  for(const [x,z,r] of [[-25.5,55.4,.8],[-23.2,55.8,.95],[-20.8,55.3,.8]])shrub(x,z,r,.75);
  const mk=(A,mat,c)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(A.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(A.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(A.u,2));if(c)g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return new THREE.Mesh(g,mat);};
  const lt=leafTex(false),st=leafTex(true);
  const leafMat=(t,cl)=>new THREE.MeshStandardMaterial({map:t,alphaTest:.42,side:THREE.DoubleSide,vertexColors:true,roughness:.78,clippingPlanes:cl||CLIPS_V,clipShadows:true});
  const depthMat=(t,cl)=>new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:t,alphaTest:.42,side:THREE.DoubleSide,clippingPlanes:cl||CLIPS_V});
  const barkMat=MAT.bark;barkMat.clippingPlanes=CLIPS_V;barkMat.clipShadows=true;MAT.leafCards=leafMat(lt);MAT.shrubCards=leafMat(st);
  MAT.barkFar=farPatch(barkMat.clone());MAT.barkFar.clippingPlanes=CLIPS;MAT.leafFar=farPatch(leafMat(lt,CLIPS));
  const grp=new THREE.Group();const tr=mk(Bn,barkMat),lv=mk(Ln,MAT.leafCards,lcn),sh=mk(S,MAT.shrubCards,scol),trF=mk(B,MAT.barkFar),lvF=mk(L,MAT.leafFar,lcol);
  lv.customDepthMaterial=depthMat(lt);sh.customDepthMaterial=depthMat(st);lvF.customDepthMaterial=farPatch(depthMat(lt));
  trF.customDepthMaterial=farPatch(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,clippingPlanes:CLIPS_V}));trF.userData.far=lvF.userData.far=true;grp.add(tr,lv,sh,trF,lvF);
  grp.children.forEach(m=>{m.castShadow=true;m.receiveShadow=true;});sh.userData.shrub=true;
  // horizon: one alpha-cut band of distant treetops around the site, hazed by the fog, so the woods carry on past the lot
  {const [c,g]=cv(1024,256);g.clearRect(0,0,1024,256);
    for(let i=0;i<150;i++){const x=rr(0,1024),r=rr(16,38),cy=256-rr(70,205);g.fillStyle=hsl(rr(80,108),rr(22,36),rr(17,28));
      g.fillRect(x-r*.8,cy,r*1.6,256-cy);for(let k=0;k<4;k++){g.beginPath();g.arc(x+rr(-r*.6,r*.6),cy+rr(-r*.4,r*.3),r*rr(.55,.85),0,6.283);g.fill();}}
    for(const dx of [-1024,1024])g.drawImage(c,dx,0);
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=THREE.RepeatWrapping;t.repeat.set(7,1);
    MAT.treeline=farPatch(new THREE.MeshStandardMaterial({map:t,alphaTest:.5,side:THREE.BackSide,roughness:1,color:0xd8e0c8}));
    const band=new THREE.Mesh(new THREE.CylinderGeometry(560,560,70,72,1,true),MAT.treeline);band.position.set(20,-46+35,25);band.userData.horizon=true;grp.add(band);}
  return grp;
}
// lawn grass, after "How to Make The Fluffiest Grass With Three.js" (Codrops, 2025): clumps of alpha-cut cards fanned out and tilted so
// they read as grass from any angle, even from above; a dark base fading to a lighter tip (fake ambient occlusion); two tip colours mixed by
// a noise field; every card lit as if it faced straight up, so both faces shade the same and the lawn looks soft. Clumps are merged into
// 16 ft chunks so off-screen chunks are skipped. (No wind: the high-quality view converges by averaging still frames.)
function grassCardTex(){const W=TX(256),H=TX(128),[c,g]=cv(W,H);g.clearRect(0,0,W,H);g.fillStyle='#fff';
  for(let i=0;i<34;i++){const x0=rr(.04,.96)*W,h=rr(.5,1)*H,w=rr(1.6,3.2)*W/256,lean=rr(-.22,.22);
    g.beginPath();g.moveTo(x0-w,H);g.quadraticCurveTo(x0+lean*h*.35,H-h*.55,x0+lean*h,H-h);g.quadraticCurveTo(x0+lean*h*.35+w*.4,H-h*.55,x0+w,H);g.fill();}
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.anisotropy=MAXANISO;return t;}
// front landscaping, laid out from the aerial listing photo: a curved, stone-edged mulch bed across the front of the house (half an ellipse
// centred x 9, z 33, 21 ft by 9 ft), a flagstone stepping path around its outside from the driveway to the west side yard, mulch rings for
// a small ornamental tree and an ornamental grass mid-lawn and a shrub by the street, a low shrub bed near the street on the west, and a
// deep flowering hedge along the east side of the driveway
const BED={cx:9,cz:33,rx:21,rz:9};
function bedEdgeZ(x){const t=(x-BED.cx)/BED.rx;return Math.abs(t)>1?-1e9:BED.cz+BED.rz*Math.sqrt(1-t*t);}
function isBed(x,z){return (z>31.6&&z<bedEdgeZ(x))||(x>17.6&&x<36&&z>36.3&&z<38.7)||Math.hypot(x-15,z-49)<2.3||Math.hypot(x-25,z-45)<1.7||Math.hypot(x-33,z-59.5)<1.7||
  ((x+23)*(x+23)/12+(z-55.5)*(z-55.5)/2.6<1)||(x>54.6&&x<58.6&&z>30&&z<61.6);}
// the stepping path: a polyline from the driveway, round the outside of the bed, to the west side yard; stones are placed along it
const FRONT_PATH=(()=>{const P=[[35.8,40.4],[31,41.6],[25.5,42.6]];
  for(let th=Math.acos((BED.cx-21)/BED.rx);th<=Math.PI+1e-6;th+=.08){const x=BED.cx-BED.rx*Math.cos(th),z=BED.cz+BED.rz*Math.sin(th),nx=(x-BED.cx)/(BED.rx*BED.rx),nz=(z-BED.cz)/(BED.rz*BED.rz),l=Math.hypot(nx,nz);
    P.push([x+nx/l*2.1,z+nz/l*2.1]);}
  P.push([-17,34.3],[-21,35.2],[-25,36.2]);return P;})();
let PATH_STONES=[];
function nearPath(x,z,r){return PATH_STONES.some(q=>Math.hypot(q[0]-x,q[1]-z)<(r||1));}
function frontLandscape(){
  // stepping stones, about every 1.75 ft along the path, irregular and slightly rotated
  let carry=0;PATH_STONES=[];
  for(let i=0;i<FRONT_PATH.length-1;i++){const [x0,z0]=FRONT_PATH[i],[x1,z1]=FRONT_PATH[i+1],L=Math.hypot(x1-x0,z1-z0);
    for(let d=carry;d<L;d+=1.75){const f=d/L,x=x0+(x1-x0)*f+rr(-.12,.12),z=z0+(z1-z0)*f+rr(-.12,.12),r=rr(.62,.78),y=terrainH(x,z);
      addGeo('site','flagstone',new THREE.CylinderGeometry(1,1,1,6),M(x,y+.02,z,rr(0,6.3),r*rr(1.15,1.4),.1,r*rr(.85,1)));PATH_STONES.push([x,z]);}
    carry=(Math.ceil(L/1.75)*1.75-L+carry)%1.75;}
  // natural stone edging along the bed's curve (stopping where it meets the entry wall)
  for(let th=0;th<=Math.PI;th+=.028){const x=BED.cx-BED.rx*Math.cos(th),z=BED.cz+BED.rz*Math.sin(th)+.15;if(x>17.8&&z<36.8)continue;
    const tx=BED.rx*Math.sin(th),tz=BED.rz*Math.cos(th),ry=-Math.atan2(tz,tx),y=terrainH(x,z);
    addGeo('site','edgeStone',new THREE.DodecahedronGeometry(.5,0),M(x,y+.06,z,ry+rr(-.2,.2),rr(1.3,1.7),rr(.45,.6),rr(.85,1.05)));}
}
function buildGrass(){const CH=16,dens=COARSE?1.1:8.6,cell=1/Math.sqrt(dens),chunks=new Map();RNG_SEED=4242;
  const lin=h=>new THREE.Color(h).convertSRGBToLinear(),tipA=lin(0x7fa245),tipB=lin(0x93ad55),tipDeep=lin(0x5f8436),tipDry=lin(0xbdb36e),tmp=new THREE.Color(),cc=new THREE.Color();
  const hard=(x,z)=>inFoot(x,z,.8)||isBed(x,z)||nearPath(x,z,.95)||WALKS.some(w=>x>w.x0-.4&&x<w.x1+.4&&z>w.z0-.4&&z<w.z1+.4)||SPEC.rooms.some(r=>x>Math.min(r.x0,r.x1)-.4&&x<Math.max(r.x0,r.x1)+.4&&z>Math.min(r.z0,r.z1)-.4&&z<Math.max(r.z0,r.z1)+.4)||
    (x>-31&&x<-.4&&Math.abs(z-33.3)<.5);
  const noise=(x,z)=>.5+.25*Math.sin(x*.21+Math.cos(z*.17)*1.7)+.25*Math.sin(z*.13-x*.07+Math.sin(x*.05)*2);
  // more fields for natural variety: patches of taller grass, lusher deep-green areas and drier, straw-tinted spots
  const tallF=(x,z)=>.5+.3*Math.sin(x*.33+Math.sin(z*.29)*2.1)+.2*Math.sin(z*.41-x*.19),deepF=(x,z)=>noise(z*1.7+31,x*1.3-17),dryF=(x,z)=>noise(x*2.3-7,z*2.1+13);
  const cl=v=>Math.min(1,Math.max(0,v));
  for(let x=DIO.x0;x<DIO.x1;x+=cell)for(let z=DIO.z0;z<SITE.street0-.3;z+=cell){const px=x+rr(0,cell),pz=z+rr(0,cell);if(hard(px,pz))continue;
    const k=Math.floor(px/CH)+','+Math.floor(pz/CH);let A=chunks.get(k);if(!A){A={p:[],n:[],u:[],c:[],i:[]};chunks.set(k,A);}
    const y=terrainH(px,pz)-.03,yaw=rr(0,3.1416),w=rr(.7,1.1),t=cl(Math.pow(rnd(),2.2)*.75+Math.max(0,tallF(px,pz)-.55)*1.4+(rnd()<.04?rr(.4,.9):0)),h=.56*(1+2*t);
    // height: .56 ft at the low end, up to three times that (.56 plus twice .56) in taller patches and the odd stray tuft
    tmp.copy(tipA).lerp(tipB,cl(noise(px,pz)+rr(-.15,.15))).lerp(tipDeep,cl(deepF(px,pz)-.4)*1.3).lerp(tipDry,cl(dryF(px,pz)-.68)*1.1+t*.1+rr(0,.04))
      .multiplyScalar(rr(.86,1.1));
    for(let q=0;q<5;q++){const ang=yaw+q*Math.PI/5,ca=Math.cos(ang),sa=Math.sin(ang),tilt=(q%2?1:-1)*rr(.25,.6),hq=h*rr(.8,1.15),tx=-sa*Math.sin(tilt)*hq,tz=ca*Math.sin(tilt)*hq,ty=Math.cos(tilt)*hq,u0=rr(0,1),base=A.p.length/3;
      cc.copy(tmp).offsetHSL(rr(-.012,.012),rr(-.04,.04),0).multiplyScalar(rr(.9,1.08));
      for(const [e,top] of [[-1,0],[1,0],[1,1],[-1,1]]){A.p.push(px+ca*e*w/2+(top?tx:0),y+(top?ty:0),pz+sa*e*w/2+(top?tz:0));A.n.push(0,1,0);A.u.push(u0+(e+1)*.25,top);A.c.push(cc.r,cc.g,cc.b);}
      A.i.push(base,base+1,base+2,base,base+2,base+3);}}
  const mat=new THREE.MeshStandardMaterial({map:grassCardTex(),vertexColors:true,alphaTest:.5,alphaToCoverage:true,side:THREE.DoubleSide,roughness:1,clippingPlanes:CLIPS,clipShadows:true});
  const gBase={value:lin(0x3e4f1f)};
  mat.onBeforeCompile=sh=>{sh.uniforms.gBase=gBase;
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 gBase;')
      .replace('#include <color_fragment>','#include <color_fragment>\n  diffuseColor.rgb=mix(gBase,diffuseColor.rgb,smoothstep(0.,.9,vUv.y));')
      .replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n  normal=normalize(vNormal);');};
  const grp=new THREE.Group();grp.userData.mat=mat;
  for(const A of chunks.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(A.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(A.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(A.u,2));g.setAttribute('color',new THREE.Float32BufferAttribute(A.c,3));g.setIndex(A.i);g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat);m.receiveShadow=true;m.castShadow=false;grp.add(m);}
  return grp;}
function setbackLines(){const g=new THREE.Group();const mat=new THREE.LineDashedMaterial({color:0xd0453b,dashSize:2.2,gapSize:1.4,depthTest:false,transparent:true});
  const line=(pts)=>{const L=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(p[0],terrainH(p[0],p[1])+.4,p[1]))),mat);L.computeLineDistances();L.renderOrder=20;g.add(L);};
  const seg=(x0,z0,x1,z1)=>{const pts=[],n=Math.ceil(Math.hypot(x1-x0,z1-z0)/2);for(let i=0;i<=n;i++)pts.push([x0+(x1-x0)*i/n,z0+(z1-z0)*i/n]);line(pts);};
  seg(-31,SITE.rearSet,66,SITE.rearSet);seg(SITE.westSet,-31,SITE.westSet,SITE.street0);seg(SITE.eastSet,-31,SITE.eastSet,SITE.street0);seg(-31,SITE.frontSet,66,SITE.frontSet);
  const lot=new THREE.LineBasicMaterial({color:0x6b6f73,depthTest:false,transparent:true,opacity:.7});
  for(const [x0,z0,x1,z1] of [[-31.5,-32.15,64.1,-32.15],[-31.5,-32.15,-31.5,SITE.street0],[64.1,-32.15,64.1,SITE.street0]]){const pts=[],n=40;
    for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,z=z0+(z1-z0)*i/n;pts.push(new THREE.Vector3(x,terrainH(x,z)+.4,z));}const L=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lot);L.renderOrder=20;g.add(L);}
  g.userData.labels=[{t:'Rear setback, 30′',x:-12,z:SITE.rearSet-1.6},{t:'Side setback, 10′',x:SITE.westSet-1.5,z:44,rot:true},{t:'Side setback, 10′',x:SITE.eastSet+1.5,z:44},{t:'Front setback, 30′ from Dunwoody Drive',x:6,z:SITE.frontSet+2.2},{t:'Dunwoody Drive',x:20,z:SITE.street0+12}];
  return g;}
