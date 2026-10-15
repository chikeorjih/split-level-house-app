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
function buildTerrain(){
  const X0=-95,X1=135,Z0=-95,Z1=150;
  const xs=new Set(),zs=new Set();
  for(let x=X0;x<=X1;x+=2)xs.add(x);for(let z=Z0;z<=Z1;z+=2)zs.add(z);
  for(const r of FOOT){xs.add(r[0]);xs.add(r[1]);zs.add(r[2]);zs.add(r[3]);}
  for(const v of [-27,-21.5,0,10.3])xs.add(v);for(const v of [-3.75,12.9,32.5,SITE.street0])zs.add(v);
  const XS=[...xs].sort((a,b)=>a-b),ZS=[...zs].sort((a,b)=>a-b),nx=XS.length,nz=ZS.length;
  const pos=new Float32Array(nx*nz*3),uv=new Float32Array(nx*nz*2),col=new Float32Array(nx*nz*3);
  const cA=new THREE.Color(0x5f7d3a),cB=new THREE.Color(0x4d5a2c),cC=new THREE.Color(0x6b5a3e),tmp=new THREE.Color();
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i,x=XS[i],z=ZS[j],h=terrainH(x,z);
    pos[k*3]=x;pos[k*3+1]=h;pos[k*3+2]=z;uv[k*2]=x;uv[k*2+1]=z;
    const n=.5+.5*Math.sin(x*.37+Math.cos(z*.23)*2)*Math.cos(z*.31-x*.11);
    const wood=sstep((-z-2)/18)+(x<-24?.6:0)+(x>58&&z<20?.5:0);
    tmp.copy(cA).lerp(cB,n*.6);tmp.lerp(cC,Math.min(.85,wood*.75)*(.6+.4*n));if(isBed(x,z))tmp.setRGB(.24,.15,.09);col[k*3]=tmp.r;col[k*3+1]=tmp.g;col[k*3+2]=tmp.b;}
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
  quadSlab('site','drive',[[36.0,-.52,28.95],[53.8,-.52,28.95],[53.8,-1.0,SITE.street0],[36.0,-1.0,SITE.street0]],2.5);
  addWalk(36,53.8,28.95,SITE.street0,-.8);
  quadSlab('site','concrete',[[33.5,-.6,29.3],[36.0,-.6,29.3],[36.0,-.6,33.5],[33.5,-.6,33.5]],1.5);
  for(let x=-95;x<135;x+=5){const a=yStreet(x),b=yStreet(x+5);
    quadSlab('site','asphalt',[[x,a,SITE.street0+.6],[x+5,b,SITE.street0+.6],[x+5,b,SITE.street1],[x,a,SITE.street1]],3);
    quadSlab('site','concrete',[[x,a+.35,SITE.street0],[x+5,b+.35,SITE.street0],[x+5,b+.35,SITE.street0+.6],[x,a+.35,SITE.street0+.6]],3);
    quadSlab('site','concrete',[[x,a+.35,SITE.street1],[x+5,b+.35,SITE.street1],[x+5,b+.35,SITE.street1+.6],[x,a+.35,SITE.street1+.6]],3);
    if(Math.floor(x/5)%3===0)quadSlab('site','trim',[[x,a+.02,74.4],[x+5,b+.02,74.4],[x+5,b+.02,74.6],[x,a+.02,74.6]],.05);}
  for(let x=-95;x<135;x+=2.5){const y=yStreet(x+1.25);addWalk(x,x+2.5,SITE.street0,SITE.street1+.6,y);}
  // chain-link fence: gates in front of the addition's lower openings, then out to the west lot line and around the back
  const fence=(pts)=>{for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1],L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(L/4));
      for(let k=0;k<n;k++){const ax=x0+(x1-x0)*k/n,az=z0+(z1-z0)*k/n,bx=x0+(x1-x0)*(k+1)/n,bz=z0+(z1-z0)*(k+1)/n,ya=terrainH(ax,az),yb=terrainH(bx,bz),u0=k*L/n,u1=(k+1)*L/n;
        const b=bucket('site','chain');const V=[[ax,ya+.15,az,u0,0],[bx,yb+.15,bz,u1,0],[bx,yb+4.1,bz,u1,3.95],[ax,ya+4.1,az,u0,3.95]];
        const nl=Math.hypot(bz-az,bx-ax)||1;for(const q of [0,1,2,0,2,3]){const v=V[q];b.p.push(v[0],v[1],v[2]);b.n.push((bz-az)/nl,0,-(bx-ax)/nl);b.u.push(v[3],v[4]);}
        addCol(Math.min(ax,bx)-.2,Math.max(ax,bx)+.2,Math.min(az,bz)-.2,Math.max(az,bz)+.2,Math.min(ya,yb)-2,Math.max(ya,yb)+4.2);
        beam('site','steel',[ax,ya+4.1,az],[bx,yb+4.1,bz],.12,.12);}
      for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n,z=z0+(z1-z0)*k/n,y=terrainH(x,z);addGeo('site','steel',new THREE.CylinderGeometry(.09,.09,4.6,8),M(x,y+2.1,z));}}};
  fence([[-0.6,33.3],[-21.9,33.3],[-30.5,46],[-30.5,-31]]);fence([[-30.5,-31],[63.2,-31],[63.2,27.6],[54.6,27.6]]);
  // neighbours across Dunwoody Drive (simple massing, seen through the kitchen window)
  for(const [x,w,d,c] of [[-30,46,30,'siding'],[30,40,28,'sidingNew'],[88,44,32,'siding']]){const z0=SITE.street1+30;
    const gy=Math.min(terrainH(x-w/2,z0),terrainH(x+w/2,z0)),ty=gy+13.3;box('site',c,x-w/2,x+w/2,gy-1,ty,z0,z0+d);quadSlab('site','roof',[[x-w/2-1,ty,z0-1],[x+w/2+1,ty,z0-1],[x+w/2+1,ty+7,z0+d/2],[x-w/2-1,ty+7,z0+d/2]],.4);
    quadSlab('site','roof',[[x-w/2-1,ty+7,z0+d/2],[x+w/2+1,ty+7,z0+d/2],[x+w/2+1,ty,z0+d+1],[x-w/2-1,ty,z0+d+1]],.4);
    for(let k=0;k<3;k++)box('site','glass',x-w/2+5+k*(w-10)/2.6,x-w/2+9+k*(w-10)/2.6,2,7,z0-.05,z0);
    box('site','doorWhite',x+w/2-16,x+w/2-2,-1.3,7,z0-.08,z0);box('site','drive',x+w/2-17,x+w/2-1,-1.3,-1.22,SITE.street1+.6,z0);}
  {const g=terrainH(95,30);box('site','siding',78,112,g-1,g+10,12,44);hipRoof('site','roofBrown',76.5,113.5,10.5,45.5,g+10,6,.4);
   for(const x of [83,92,101])box('site','glass',x,x+4,g+3,g+7,43.98,44.05);box('site','brick',78,112,g-1,g+2.5,43.95,44.2);}
}
function leafTex(small){const S=TX(256),C=S/2,[c,g]=cv(S,S);g.clearRect(0,0,S,S);
  for(let q=0;q<4;q++){const ox=(q%2)*C,oy=Math.floor(q/2)*C;g.save();g.beginPath();g.rect(ox,oy,C,C);g.clip();
    for(let i=0;i<(small?260:110);i++){const a=rr(0,6.283),d=Math.pow(rnd(),.7)*C*.44,x=ox+C/2+Math.cos(a)*d,y=oy+C/2+Math.sin(a)*d,L=(small?rr(3,6):rr(7,15))*S/256,W=L*rr(.35,.5),r=rr(0,6.283);
      g.save();g.translate(x,y);g.rotate(r);g.fillStyle=hsl(rr(78,118),rr(30,55),rr(small?16:20,small?32:42));g.beginPath();g.moveTo(-L,0);g.quadraticCurveTo(0,-W,L,0);g.quadraticCurveTo(0,W,-L,0);g.fill();
      g.strokeStyle='rgba(255,255,220,.18)';g.lineWidth=.6;g.beginPath();g.moveTo(-L*.8,0);g.lineTo(L*.8,0);g.stroke();g.restore();}
    g.restore();}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=MAXANISO;return t;}
function buildTrees(){
  const tc=new THREE.Color();
  const B={p:[],n:[],u:[]},L={p:[],n:[],u:[]},S={p:[],n:[],u:[]},lcol=[],scol=[];
  const pushGeo=(arr,g,m)=>{let gg=g.index?g.toNonIndexed():g;gg.applyMatrix4(m);const p=gg.attributes.position.array,n=gg.attributes.normal.array,u=gg.attributes.uv?gg.attributes.uv.array:null;
    for(let i=0;i<p.length;i++){arr.p.push(p[i]);arr.n.push(n[i]);}for(let i=0;i<p.length/3;i++){arr.u.push(u?u[i*2]*2:0,u?u[i*2+1]*6:0);}};
  const up=new THREE.Vector3(0,1,0),_a=new THREE.Vector3(),_b=new THREE.Vector3(),_n=new THREE.Vector3(),_c=new THREE.Vector3(),_p=new THREE.Vector3();
  // alpha-cut leaf cards scattered through an ellipsoid; normals point out of the canopy so it shades like foliage
  const cards=(A,col,cx,cy,cz,R,sy,n,size,base)=>{for(let i=0;i<n;i++){_n.set(rr(-1,1),rr(-1,1),rr(-1,1)).normalize();const rad=R*Math.cbrt(rnd())*.92;
      _c.set(cx+_n.x*rad,cy+_n.y*rad*sy,cz+_n.z*rad);const s=size*rr(.7,1.25);
      _p.set(rr(-1,1),rr(-1,1),rr(-1,1)).normalize();_a.crossVectors(_p,up);if(_a.lengthSq()<1e-3)_a.set(1,0,0);_a.normalize();_b.crossVectors(_p,_a).normalize();
      const ou=rnd()<.5?0:.5,ov=rnd()<.5?0:.5;tc.copy(base).offsetHSL(rr(-.015,.015),rr(-.05,.05),rr(-.07,.07));
      const V=[[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]].map(([i1,j1,u,v])=>{const x=_c.x+(_a.x*i1+_b.x*j1)*s/2,y=_c.y+(_a.y*i1+_b.y*j1)*s/2,z=_c.z+(_a.z*i1+_b.z*j1)*s/2;
        let nx=(x-cx)/R,ny=(y-cy)/(R*sy)+.35,nz=(z-cz)/R;const l=Math.hypot(nx,ny,nz)||1;return [x,y,z,nx/l,ny/l,nz/l,ou+u*.5,ov+v*.5];});
      for(const q of [0,1,2,0,2,3]){const v=V[q];A.p.push(v[0],v[1],v[2]);A.n.push(v[3],v[4],v[5]);A.u.push(v[6],v[7]);col.push(tc.r,tc.g,tc.b);}}};
  const placed=[];RNG_SEED=987;
  const ok=(x,z,r)=>{if(z>28&&z<SITE.street0+2&&x>-34&&x<70)return false;if(x>70&&x<120&&z>5&&z<52)return false;if(x>-22-r*5&&x<55+r*5&&z>-3-r*5.5&&z<34+r*2)return false;if(x>-23-r&&x<1&&z>-3-r&&z<34)return false;
    if(x>12&&x<56&&z>-12&&z<0)return false;if(x>33&&x<57&&z>27&&z<SITE.street1+2)return false;if(x>17&&x<28&&z>30&&z<48)return false;
    if(z>SITE.street0-4&&z<SITE.street1+20)return false;for(const q of placed)if(Math.hypot(q[0]-x,q[1]-z)<q[2]+r*.9)return false;return true;};
  const tree=(x,z,big)=>{const g=terrainH(x,z),H=big?rr(42,62):rr(18,30),r=big?rr(.7,1.1):rr(.35,.6);
    pushGeo(B,new THREE.CylinderGeometry(r*.45,r,H,10),M(x,g+H/2-1,z));
    for(let k=0;k<(big?4:2);k++){const a=rr(0,6.3),len=rr(7,14),y0=g+H*rr(.45,.72);const ex=x+Math.cos(a)*len,ez=z+Math.sin(a)*len,ey=y0+len*.75;
      const d=new THREE.Vector3(ex-x,ey-y0,ez-z),L2=d.length();d.normalize();const q=new THREE.Quaternion().setFromUnitVectors(up,d);
      pushGeo(B,new THREE.CylinderGeometry(r*.15,r*.32,L2,6),new THREE.Matrix4().compose(new THREE.Vector3((x+ex)/2,(y0+ey)/2,(z+ez)/2),q,new THREE.Vector3(1,1,1)));}
    const n=big?Math.round(rr(7,11)):Math.round(rr(4,6)),R=big?rr(9,14):rr(5,8),base=new THREE.Color().setHSL(rr(.2,.27),rr(.22,.4),rr(.62,.78));
    for(let k=0;k<n;k++){const a=rr(0,6.3),d=rr(0,R*.75),bx=x+Math.cos(a)*d,bz=z+Math.sin(a)*d,by=g+H-rr(0,R*.9)+(big?2:1),br=rr(R*.45,R*.8);
      cards(L,lcol,bx,by,bz,br,rr(.6,.85),big?24:16,br*rr(.6,.85),base);}
    placed.push([x,z,big?6:3]);};
  let tries=0,count=0;
  while(count<160&&tries<9000){tries++;const x=rr(-95,135),z=rr(-95,26);const rear=z<5,side=x<-22||x>58;
    if(!rear&&(!side||rnd()<.6))continue;if(!ok(x,z,4))continue;tree(x,z,rnd()<.82);count++;}
  for(let i=0;i<90;i++){const x=rr(-80,120),z=rr(-85,20);if(z>5&&x>-22&&x<58)continue;if(!ok(x,z,2))continue;tree(x,z,false);}
  // foundation shrubs (boxwood) and the tall conical shrub by the porch stair
  const shrub=(x,z,r,sy)=>{const y=terrainH(x,z);cards(S,scol,x,y+r*.75*(sy||1),z,r,(sy||.8),Math.round(18+r*r*22),r*.85,new THREE.Color().setHSL(rr(.25,.3),.35,rr(.55,.68)));};
  for(let x=27.5;x<35;x+=2.2)shrub(x,33.0,.95);for(let z=34;z<60;z+=4)shrub(56.5,z,1.3);
  for(const [x,z,r] of [[10.5,37.6,1.1],[12.6,38.2,.9],[14.6,37.9,1.2],[0.8,33.6,1.0],[-0.6,36.4,1.15],[20.5,37.3,.9],[24.8,37.2,1.0],[28.5,36.4,1.2],[31.5,36.8,.9],[-12.5,35.6,.95],[-4,35.2,1.1]])shrub(x,z,r);
  shrub(17.0,38.4,2.2,1.45);
  for(const [x,z] of [[-5,46],[-23,54]]){const y=terrainH(x,z);pushGeo(B,new THREE.CylinderGeometry(.12,.18,9,7),M(x,y+4.5,z));
    for(let k=0;k<4;k++)cards(L,lcol,x+rr(-1,1),y+rr(7.8,10),z+rr(-1,1),rr(1.8,2.4),.85,18,1.8,new THREE.Color().setHSL(.25,.35,.75));}
  const mk=(A,mat,c)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(A.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(A.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(A.u,2));if(c)g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return new THREE.Mesh(g,mat);};
  const lt=leafTex(false),st=leafTex(true);
  const leafMat=(t)=>new THREE.MeshStandardMaterial({map:t,alphaTest:.42,side:THREE.DoubleSide,vertexColors:true,roughness:.78,clippingPlanes:CLIPS,clipShadows:true});
  const depthMat=(t)=>new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:t,alphaTest:.42,side:THREE.DoubleSide,clippingPlanes:CLIPS});
  const barkMat=MAT.bark;barkMat.clippingPlanes=CLIPS;barkMat.clipShadows=true;MAT.leafCards=leafMat(lt);MAT.shrubCards=leafMat(st);
  const grp=new THREE.Group();const tr=mk(B,barkMat),lv=mk(L,MAT.leafCards,lcol),sh=mk(S,MAT.shrubCards,scol);
  lv.customDepthMaterial=depthMat(lt);sh.customDepthMaterial=depthMat(st);grp.add(tr,lv,sh);
  grp.children.forEach(m=>{m.castShadow=true;m.receiveShadow=true;});sh.userData.shrub=true;
  return grp;
}
function bladeTex(){const S=TX(128),[c,g]=cv(S,S);g.clearRect(0,0,S,S);
  for(let i=0;i<46;i++){const x0=S/2+rr(-S*.32,S*.32),lean=rr(-.3,.3),h=rr(.55,.98)*S,w=rr(1.2,2.6)*S/128;g.fillStyle=hsl(rr(68,100),rr(32,55),rr(22,40));
    g.beginPath();g.moveTo(x0-w,S);g.quadraticCurveTo(x0+lean*h*.4,S-h*.5,x0+lean*h,S-h);g.quadraticCurveTo(x0+lean*h*.4+w*.5,S-h*.5,x0+w,S);g.fill();}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
function isBed(x,z){return (x>-1.5&&x<19.8&&z>31.6&&z<39.6)||(x>25&&x<37&&z>31.6&&z<35.4)||Math.hypot(x+5,z-46)<2.2||Math.hypot(x+23,z-54)<2.2||(x>55&&x<58&&z>32&&z<61);}
function buildGrass(){const n=COARSE?4500:16000;
  const g=new THREE.BufferGeometry(),P=[],N=[],U=[];
  for(const r of [0,Math.PI/2]){const c=Math.cos(r),s=Math.sin(r);for(const [i,j,u,v] of [[-.5,0,0,0],[.5,0,1,0],[.5,1,1,1],[-.5,0,0,0],[.5,1,1,1],[-.5,1,0,1]]){P.push(i*c,j,i*s);N.push(0,1,0);U.push(u,v);}}
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  const mat=new THREE.MeshStandardMaterial({map:bladeTex(),alphaTest:.45,side:THREE.DoubleSide,roughness:.85,clippingPlanes:CLIPS,clipShadows:true});
  const mesh=new THREE.InstancedMesh(g,mat,n),m=new THREE.Matrix4(),q=new THREE.Quaternion(),col=new THREE.Color();let k=0,tries=0;RNG_SEED=4242;
  while(k<n&&tries<n*6){tries++;const pick=rnd();let x,z;if(pick<.82){x=rr(-30,54);z=rr(33.5,62);}else{x=rr(54.5,63);z=rr(-4,62);}
    if(inFoot(x,z,1.2)||isBed(x,z))continue;if(x>35&&x<55&&z>28&&z<63)continue;if(x>-23&&x<1&&z<33.6)continue;if(x>2.4&&x<9&&z>32.3&&z<37.6)continue;if(x>8.4&&x<18.3&&z>32.7&&z<36.1)continue;
    if(x>-31&&x<-21.5&&z>33&&z<47&&Math.abs((z-33.3)-(-(x+21.9))*1.48)<.6)continue;
    const y=terrainH(x,z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),rr(0,6.28));const w=rr(.7,1.2);m.compose(new THREE.Vector3(x,y-.03,z),q,new THREE.Vector3(w,rr(.3,.55),w));
    mesh.setMatrixAt(k,m);col.setHSL(rr(.2,.27),rr(.35,.55),rr(.55,.8));mesh.setColorAt(k,col);k++;}
  mesh.count=k;mesh.receiveShadow=true;mesh.castShadow=false;mesh.frustumCulled=false;return mesh;}
function setbackLines(){const g=new THREE.Group();const mat=new THREE.LineDashedMaterial({color:0xd0453b,dashSize:2.2,gapSize:1.4,depthTest:false,transparent:true});
  const line=(pts)=>{const L=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(p[0],terrainH(p[0],p[1])+.4,p[1]))),mat);L.computeLineDistances();L.renderOrder=20;g.add(L);};
  const seg=(x0,z0,x1,z1)=>{const pts=[],n=Math.ceil(Math.hypot(x1-x0,z1-z0)/2);for(let i=0;i<=n;i++)pts.push([x0+(x1-x0)*i/n,z0+(z1-z0)*i/n]);line(pts);};
  seg(-31,SITE.rearSet,66,SITE.rearSet);seg(SITE.westSet,-31,SITE.westSet,SITE.street0);seg(SITE.eastSet,-31,SITE.eastSet,SITE.street0);seg(-31,SITE.frontSet,66,SITE.frontSet);
  const lot=new THREE.LineBasicMaterial({color:0x6b6f73,depthTest:false,transparent:true,opacity:.7});
  for(const [x0,z0,x1,z1] of [[-31.5,-32.15,64.1,-32.15],[-31.5,-32.15,-31.5,SITE.street0],[64.1,-32.15,64.1,SITE.street0]]){const pts=[],n=40;
    for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,z=z0+(z1-z0)*i/n;pts.push(new THREE.Vector3(x,terrainH(x,z)+.4,z));}const L=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lot);L.renderOrder=20;g.add(L);}
  g.userData.labels=[{t:'Rear setback, 30′',x:-12,z:SITE.rearSet-1.6},{t:'Side setback, 10′',x:SITE.westSet-1.5,z:44,rot:true},{t:'Side setback, 10′',x:SITE.eastSet+1.5,z:44},{t:'Front setback, 30′ from Dunwoody Drive',x:6,z:SITE.frontSet+2.2},{t:'Dunwoody Drive',x:20,z:SITE.street0+12}];
  return g;}
