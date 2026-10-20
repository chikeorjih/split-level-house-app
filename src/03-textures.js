// 03-textures.js: procedural textures, relief maps and the material library (MAT)
"use strict";
// ================= TEXTURES & MATERIALS =================
const TEXQ=(window.matchMedia&&matchMedia('(pointer: coarse)').matches)?1:2;const TX=n=>Math.round(n*TEXQ);
let RNG_SEED=12345; function rnd(){RNG_SEED=(RNG_SEED*16807)%2147483647;return (RNG_SEED-1)/2147483646;}
const rr=(a,b)=>a+(b-a)*rnd();
function cv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function hsl(h,s,l){return `hsl(${h},${s}%,${l}%)`;}
let MAXANISO=4;
function tex(c,ftW,ftH,opts){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(1/ftW,1/(ftH||ftW));t.anisotropy=MAXANISO;t.colorSpace=THREE.SRGBColorSpace;
  if(opts&&opts.rot){t.center.set(.5,.5);t.rotation=opts.rot;} return t;}
function noise(g,w,h,amt,alpha){const d=g.getImageData(0,0,w,h);const p=d.data;for(let i=0;i<p.length;i+=4){const n=(rnd()-.5)*amt;p[i]+=n;p[i+1]+=n;p[i+2]+=n;}g.putImageData(d,0,0);}
// White-oak wide plank (photos: light, slightly warm, long boards ~7")
function oakTex(){const S=TX(1024),[c,g]=cv(S,S);const ppf=S/8,pw=0.58*ppf;
  for(let x=0;x<S;x+=pw){let y=-rr(0,S);while(y<S){const L=rr(3,8)*ppf;const h=rr(30,38),s=rr(30,46),l=rr(66,76);
      for(const yy of [y,y+S,y-S]){g.fillStyle=hsl(h,s,l);g.fillRect(x,yy,pw,L);
        for(let k=0;k<14;k++){g.strokeStyle=`rgba(120,80,40,${rr(.04,.13)})`;g.lineWidth=rr(.6,1.8);g.beginPath();
          const gx=x+rr(2,pw-2);g.moveTo(gx,yy);for(let t=0;t<=L;t+=24)g.lineTo(gx+Math.sin(t/rr(40,90)+k)*rr(1,3),yy+t);g.stroke();}
        g.fillStyle='rgba(90,60,35,.35)';g.fillRect(x,yy,pw,1.5);}
      y+=L;}
    g.fillStyle='rgba(70,48,30,.45)';g.fillRect(x,0,1.4,S);}
  noise(g,S,S,10);return tex(c,8,8,{rot:Math.PI/2});}
function brickTex(painted){const S=TX(512),[c,g]=cv(S,S);const ppf=S/4,bw=0.667*ppf,bh=0.222*ppf,m=Math.max(2,S/170);
  g.fillStyle=painted?'#d9d8d3':'#b9ae9e';g.fillRect(0,0,S,S);
  for(let i=0;i<S*6;i++){g.fillStyle=`rgba(${painted?'120,120,115':'90,80,70'},${rr(.05,.18)})`;g.fillRect(rr(0,S),rr(0,S),rr(1,2.5),rr(1,2.5));}
  for(let r=0;r*bh<S;r++){const off=(r%2)*bw/2;for(let x=-bw;x<S+bw;x+=bw){const bx=x+off+m/2,by=r*bh+m/2,w=bw-m,h=bh-m;
      const L=painted?rr(88,95):rr(28,44),H=painted?40:rr(4,18),Sa=painted?6:rr(40,60);
      const gr=g.createLinearGradient(0,by,0,by+h);gr.addColorStop(0,hsl(H,Sa,L+4));gr.addColorStop(.5,hsl(H,Sa,L));gr.addColorStop(1,hsl(H,Sa,L-5));g.fillStyle=gr;g.fillRect(bx,by,w,h);
      if(!painted){if(rnd()<.18){g.fillStyle=`rgba(25,12,8,${rr(.15,.35)})`;g.fillRect(bx,by,w,h);}if(rnd()<.12){g.fillStyle=`rgba(255,200,170,${rr(.06,.14)})`;g.fillRect(bx,by,w,h);}
        for(let k=0;k<w*h/60;k++){g.fillStyle=rnd()<.5?`rgba(30,15,10,${rr(.15,.4)})`:`rgba(230,180,150,${rr(.08,.2)})`;g.fillRect(bx+rr(0,w),by+rr(0,h),rr(.8,2.2),rr(.8,2.2));}}
      g.fillStyle=`rgba(0,0,0,${painted?.05:.18})`;g.fillRect(bx,by+h-1.5,w,1.5);g.fillRect(bx+w-1.5,by,1.5,h);
      g.fillStyle=`rgba(255,255,255,${painted?.12:.08})`;g.fillRect(bx,by,w,1.2);
      if(rnd()<.25){g.fillStyle=painted?'#d9d8d3':'#b9ae9e';g.beginPath();g.arc(bx+(rnd()<.5?0:w),by+(rnd()<.5?0:h),rr(1.5,4),0,7);g.fill();}}}
  noise(g,S,S,painted?8:16);return tex(c,4,4);}
function sidingTex(base){const S=TX(256),[c,g]=cv(S,S);const ppf=S/4,exp=0.5*ppf;g.fillStyle=base;g.fillRect(0,0,S,S);
  for(let y=0;y<S;y+=exp){const gr=g.createLinearGradient(0,y,0,y+exp);gr.addColorStop(0,'rgba(255,255,255,.06)');gr.addColorStop(.85,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=gr;g.fillRect(0,y,S,exp);}
  noise(g,S,S,6);return tex(c,4,4);}
function shingleTex(){const S=TX(512),[c,g]=cv(S,S);const ppf=S/6,row=0.42*ppf;g.fillStyle='#3a3d40';g.fillRect(0,0,S,S);
  for(let y=0;y<S;y+=row){let x=-rr(0,40);while(x<S){const w=rr(.6,1.4)*ppf;g.fillStyle=hsl(210,rr(2,7),rr(18,30));g.fillRect(x,y,w-2,row-3);x+=w;}
    g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,y+row-3,S,3);}
  noise(g,S,S,18);return tex(c,6,6);}
function herringboneTex(){const S=TX(512),[c,g]=cv(S,S);const Wd=S/8,L=Wd*4;g.fillStyle='#2b2e31';g.fillRect(0,0,S,S);
  const draw=(x,y,w,h)=>{for(const ox of [-S,0,S])for(const oy of [-S,0,S]){g.fillStyle=hsl(205,rr(4,9),rr(22,31));g.fillRect(x+ox+1.5,y+oy+1.5,w-3,h-3);}};
  for(let ch=-2;ch<3;ch++)for(let k=-12;k<12;k++){const bx=k*Wd+ch*8*Wd,by=k*Wd;draw(bx,by,L,Wd);draw(bx,by+Wd,Wd,L);}
  noise(g,S,S,14);return tex(c,2,2,{rot:Math.PI/4});}
function gridTileTex(tw,th,base,grout,ft,jitter){const S=TX(512),[c,g]=cv(S,S);const ppf=S/ft;g.fillStyle=grout;g.fillRect(0,0,S,S);
  const gw=1.5*TEXQ;for(let y=0,r=0;y<S;y+=th*ppf,r++){const off=jitter?(r%2)*tw*ppf/2:0;for(let x=-tw*ppf;x<S;x+=tw*ppf){g.fillStyle=base();g.fillRect(x+off+gw,y+gw,tw*ppf-2*gw,th*ppf-2*gw);g.fillStyle='rgba(255,255,255,.05)';g.fillRect(x+off+gw,y+gw,tw*ppf-2*gw,(th*ppf-2*gw)*.35);}}
  noise(g,S,S,6);return tex(c,ft,ft);}
function barTileTex(){const S=256,[c,g]=cv(S,S);g.fillStyle='#22324a';g.fillRect(0,0,S,S);
  const petal=(cx,cy,r)=>{g.fillStyle='#e9ece8';for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.ellipse(cx+Math.cos(a)*r*.55,cy+Math.sin(a)*r*.55,r*.38,r*.15,a,0,7);g.fill();}g.beginPath();g.arc(cx,cy,r*.15,0,7);g.fill();};
  for(const [x,y] of [[0,0],[S,0],[0,S],[S,S]])petal(x,y,46);petal(S/2,S/2,30);
  g.strokeStyle='rgba(220,225,230,.55)';g.lineWidth=2;g.strokeRect(1,1,S-2,S-2);noise(g,S,S,8);return tex(c,0.67,0.67);}
// cream wool rug with a soft tone-on-tone motif of little paw-print clusters (nursery play mat)
function nurseryRugTex(){const W=512,[c,g]=cv(W,W);g.fillStyle='#ebe4d5';g.fillRect(0,0,W,W);
  for(let i=0;i<9000;i++){g.fillStyle=rnd()<.5?'rgba(255,252,244,.35)':'rgba(170,155,130,.18)';g.fillRect(rr(0,W),rr(0,W),rr(1,3),rr(1,3));}
  g.fillStyle='rgba(196,182,155,.55)';for(let gy=0;gy<6;gy++)for(let gx=0;gx<6;gx++){const x=(gx+.5+(gy%2)*.5)*W/6,y=(gy+.5)*W/6;if(x>W-10)continue;
    g.beginPath();g.ellipse(x,y+5,9,7,0,0,7);g.fill();for(const [dx,dy] of [[-10,-8],[-4,-13],[4,-13],[10,-8]]){g.beginPath();g.arc(x+dx,y+dy,3.2,0,7);g.fill();}}
  g.strokeStyle='rgba(205,193,170,.8)';g.lineWidth=6;g.strokeRect(10,10,W-20,W-20);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
// the nursery's large rug: heathered oat wool, a fine lattice tone-on-tone, a soft olive double border (sized for an 11 x 11 ft rug)
function nurseryBigRugTex(){const W=1024,[c,g]=cv(W,W);g.fillStyle='#e2d8c4';g.fillRect(0,0,W,W);
  for(let i=0;i<40000;i++){g.fillStyle=rnd()<.5?'rgba(250,244,230,.3)':'rgba(150,135,105,.14)';g.fillRect(rr(0,W),rr(0,W),rr(1,4),rr(1,2));}
  g.strokeStyle='rgba(185,170,140,.35)';g.lineWidth=2;const n=14,st=(W-160)/n;
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const x=80+i*st,y=80+j*st;g.beginPath();g.moveTo(x,y-st/2);g.lineTo(x+st/2,y);g.lineTo(x,y+st/2);g.lineTo(x-st/2,y);g.closePath();g.stroke();}
  g.strokeStyle='rgba(122,128,92,.85)';g.lineWidth=14;g.strokeRect(34,34,W-68,W-68);g.lineWidth=4;g.strokeRect(62,62,W-124,W-124);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
// the round play mat on top of it: soft cream padding in quilted rings, the outer ring olive, little paw prints in the middle ring
function playMatTex(){const W=512,[c,g]=cv(W,W),C=W/2;g.fillStyle='#f3eee2';g.fillRect(0,0,W,W);
  const ring=(r,col)=>{g.fillStyle=col;g.beginPath();g.arc(C,C,r,0,7);g.fill();};ring(C,'#9fa27f');ring(C*.86,'#f3eee2');ring(C*.62,'#e7dcc5');ring(C*.42,'#f3eee2');
  g.strokeStyle='rgba(150,140,115,.45)';g.lineWidth=3;for(const r of [.86,.62,.42])g.beginPath(),g.arc(C,C,C*r,0,7),g.stroke();
  g.fillStyle='rgba(175,160,130,.6)';for(let k=0;k<10;k++){const a=k/10*6.283,x=C+Math.cos(a)*C*.52,y=C+Math.sin(a)*C*.52;g.beginPath();g.ellipse(x,y+4,7,5.5,0,0,7);g.fill();
    for(const [dx,dy] of [[-8,-6],[-3,-10],[3,-10],[8,-6]]){g.beginPath();g.arc(x+dx,y+dy,2.6,0,7);g.fill();}}
  for(let i=0;i<5000;i++){g.fillStyle=rnd()<.5?'rgba(255,255,255,.25)':'rgba(120,110,90,.08)';g.fillRect(rr(0,W),rr(0,W),rr(1,3),rr(1,3));}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
// fine straight-grained wood for furniture faces (per-face 0-1 UVs: the grain runs along u), in a given base colour
function woodGrainTex(base){const W=512,[c,g]=cv(W,W);g.fillStyle=base;g.fillRect(0,0,W,W);
  for(let i=0;i<220;i++){const y=rr(0,W),h=rr(1,5);g.fillStyle=rnd()<.6?'rgba(95,55,25,'+rr(.04,.14)+')':'rgba(255,225,180,'+rr(.04,.12)+')';
    g.beginPath();g.moveTo(0,y);for(let x=0;x<=W;x+=32)g.lineTo(x,y+Math.sin(x*.012+i)*rr(1,4));g.lineTo(W,y+h);for(let x=W;x>=0;x-=32)g.lineTo(x,y+h+Math.sin(x*.012+i)*2);g.fill();}
  noise(g,W,W,5);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
function rugTex(kind){const W=512,H=640,[c,g]=cv(W,H);
  const P={family:{f:'#cdc9bd',m:'#5d77a3',d:'#38507e',b:'#d8d2c2'},living:{f:'#d3d0c9',m:'#8d8f92',d:'#55595e',b:'#c9c5bc'},dining:{f:'#ddd6c8',m:'#a9a6a0',d:'#7f8c9e',b:'#e3dccd'}}[kind];
  g.fillStyle=P.f;g.fillRect(0,0,W,H);
  if(kind==='living'){for(let i=0;i<2600;i++){g.fillStyle=rnd()<.5?P.m:P.d;g.globalAlpha=rr(.05,.25);g.fillRect(rr(0,W),rr(0,H),rr(2,14),rr(1,4));}g.globalAlpha=1;}
  else{const bw=38;g.fillStyle=P.d;g.globalAlpha=.75;g.fillRect(14,14,W-28,bw);g.fillRect(14,H-14-bw,W-28,bw);g.fillRect(14,14,bw,H-28);g.fillRect(W-14-bw,14,bw,H-28);g.globalAlpha=1;
    g.fillStyle=P.b;for(let i=0;i<60;i++){g.beginPath();g.arc(rr(20,W-20),rr(20,H-20),rr(2,5),0,7);}
    g.strokeStyle=P.m;g.lineWidth=3;for(let r=0;r<5;r++){g.globalAlpha=.55;g.beginPath();g.ellipse(W/2,H/2,60+r*28,90+r*36,0,0,7);g.stroke();}
    for(let i=0;i<220;i++){const x=rr(60,W-60),y=rr(60,H-60);g.fillStyle=rnd()<.6?P.m:P.d;g.globalAlpha=rr(.2,.6);g.save();g.translate(x,y);g.rotate(rr(0,6));g.beginPath();g.ellipse(0,0,rr(4,12),rr(2,5),0,0,7);g.fill();g.restore();}
    g.globalAlpha=1;g.fillStyle=P.d;g.beginPath();g.ellipse(W/2,H/2,40,58,0,0,7);g.fill();}
  for(let i=0;i<9000;i++){g.fillStyle=`rgba(255,255,255,${rr(0,.12)})`;g.fillRect(rr(0,W),rr(0,H),rr(1,6),1);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
function grassTex(){const S=TX(512),[c,g]=cv(S,S);g.fillStyle='#6a7f33';g.fillRect(0,0,S,S);
  for(let i=0;i<S*S/40;i++){g.fillStyle=hsl(rr(62,74),rr(26,36),rr(29,34));g.fillRect(rr(0,S),rr(0,S),rr(2,6),rr(2,6));}
  for(let i=0;i<S*S/22;i++){const x=rr(0,S),y=rr(0,S),l=rr(3,8)*TEXQ,a=rr(-.5,.5);g.strokeStyle=hsl(rr(66,86),rr(30,42),rr(30,40));g.lineWidth=rr(.6,1.0)*TEXQ;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.sin(a)*l,y-Math.cos(a)*l);g.stroke();}
  g.filter='blur('+(.6*TEXQ)+'px)';g.drawImage(c,0,0);g.filter='none';
  return tex(c,10,10);}
// brushed stainless: fine streaks of slightly varying brightness
function brushedTex(){const S=TX(256),[c,g]=cv(S,S);g.fillStyle='#e9eaeb';g.fillRect(0,0,S,S);
  for(let i=0;i<S*2.5;i++){const y=rr(0,S);g.fillStyle=`rgba(${rnd()<.5?'255,255,255':'120,124,128'},${rr(.015,.05)})`;g.fillRect(0,y,S,rr(.3,.8));}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,4);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
function plainNoise(col,ft,amt){const S=TX(256),[c,g]=cv(S,S);g.fillStyle=col;g.fillRect(0,0,S,S);noise(g,S,S,amt);return tex(c,ft,ft);}
function deckTex(h,s,l){const S=TX(512),[c,g]=cv(S,S);const ppf=S/4,bw=0.46*ppf;g.fillStyle='#1a1410';g.fillRect(0,0,S,S);
  for(let y=0;y<S;y+=bw){g.fillStyle=hsl(h+rr(-4,4),s+rr(-6,6),l+rr(-5,5));g.fillRect(0,y+2,S,bw-4);
    for(let k=0;k<5;k++){g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,y+rr(4,bw-4),S,1);}}noise(g,S,S,10);return tex(c,4,4);}
function beamTex(){const S=TX(256),[c,g]=cv(S,S);g.fillStyle='#6b4a2f';g.fillRect(0,0,S,S);
  for(let i=0;i<120;i++){g.strokeStyle=`rgba(${rr(30,70)},${rr(20,40)},10,${rr(.15,.4)})`;g.lineWidth=rr(1,3);const y=rr(0,S);g.beginPath();g.moveTo(0,y);g.bezierCurveTo(S/3,y+rr(-6,6),2*S/3,y+rr(-6,6),S,y);g.stroke();}
  noise(g,S,S,20);return tex(c,3,3);}
function barkTex(){const S=TX(128),[c,g]=cv(S,S);g.fillStyle='#4f4740';g.fillRect(0,0,S,S);
  for(let i=0;i<90;i++){g.fillStyle=`rgba(${rr(20,90)},${rr(20,80)},${rr(15,60)},.5)`;g.fillRect(rr(0,S),0,rr(1,4),S);}noise(g,S,S,25);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,4);t.colorSpace=THREE.SRGBColorSpace;return t;}
function artTex(kind,w,h){const [c,g]=cv(w,h);
  if(kind==='botanical'){g.fillStyle='#f3efe4';g.fillRect(0,0,w,h);g.strokeStyle='#6c7a4e';g.lineWidth=3;
    for(let i=0;i<3;i++){const x=w*(.35+.15*i);g.beginPath();g.moveTo(x,h*.85);g.quadraticCurveTo(x+rr(-20,20),h*.5,x+rr(-10,10),h*.25);g.stroke();
      g.fillStyle='#7f8f5a';for(let k=0;k<4;k++){g.beginPath();g.ellipse(x+(k%2?10:-10),h*(.75-k*.12),12,5,k%2?.6:-.6,0,7);g.fill();}
      g.fillStyle=['#c98f9b','#b3687a','#d7b2a3'][i];g.beginPath();g.arc(x,h*.25,12,0,7);g.fill();}}
  else if(kind==='blueprint'){g.fillStyle='#f2f0ea';g.fillRect(0,0,w,h);g.fillStyle='#2f4c7c';
    for(let i=0;i<9;i++){g.save();g.translate(rr(.2,.8)*w,rr(.2,.8)*h);g.rotate(rr(0,6));g.beginPath();g.ellipse(0,0,rr(10,26),rr(4,9),0,0,7);g.fill();g.restore();}
    g.strokeStyle='#2f4c7c';g.lineWidth=3;g.beginPath();g.moveTo(w*.5,h*.9);g.quadraticCurveTo(w*.4,h*.5,w*.55,h*.1);g.stroke();}
  else if(kind==='landscape'){const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#c9b48a');gr.addColorStop(.55,'#8c7a55');gr.addColorStop(1,'#4b3f2c');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='rgba(60,70,50,.6)';for(let i=0;i<8;i++){g.beginPath();g.arc(rr(0,w),h*.55,rr(8,20),0,7);g.fill();}}
  else {g.fillStyle='#ece9e2';g.fillRect(0,0,w,h);g.strokeStyle='#30343a';g.lineWidth=2;for(let i=0;i<14;i++){g.beginPath();g.moveTo(rr(0,w),rr(0,h));g.quadraticCurveTo(rr(0,w),rr(0,h),rr(0,w),rr(0,h));g.stroke();}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}


function slateTex(){const S=TX(512),[c,g]=cv(S,S);const ppf=S/6,row=0.5*ppf,tw=0.95*ppf;g.fillStyle='#24272a';g.fillRect(0,0,S,S);
  for(let y=0,r=0;y<S;y+=row,r++){const off=(r%2)*tw/2;for(let x=-tw;x<S+tw;x+=tw){const h=rr(195,230),l=rr(22,36);g.fillStyle=hsl(h,rr(4,12),l);
      g.fillRect(x+off+1.5,y+1,tw-3,row-3);g.fillStyle='rgba(255,255,255,.04)';g.fillRect(x+off+1.5,y+1,tw-3,row*.3);}
    g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,y+row-2.5,S,2.5);}
  noise(g,S,S,14);return tex(c,6,6);}
function seamTex(){const S=TX(256),[c,g]=cv(S,S);const ppf=S/4;g.fillStyle='#2f3337';g.fillRect(0,0,S,S);
  for(let x=0;x<S;x+=1.5*ppf){g.fillStyle='#4a4f54';g.fillRect(x,0,3,S);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x+3,0,2,S);}
  noise(g,S,S,6);return tex(c,4,4);}
function soldierTex(){const S=TX(256),[c,g]=cv(S,S);const ppf=S/2,bw=.222*ppf,m=3;g.fillStyle='#bdb3a4';g.fillRect(0,0,S,S);
  for(let x=0;x<S;x+=bw){g.fillStyle=hsl(rr(4,14),rr(46,60),rr(27,38));g.fillRect(x+m/2,0,bw-m,S);}noise(g,S,S,22);return tex(c,2,100);}
function flagTex(){const S=TX(512),[c,g]=cv(S,S);g.fillStyle='#5b5145';g.fillRect(0,0,S,S);
  for(let i=0;i<70;i++){const x=rr(0,S),y=rr(0,S),r=rr(30,70),n=Math.floor(rr(5,8));g.fillStyle=hsl(rr(20,38),rr(18,40),rr(48,66));
    for(const [ox,oy] of [[0,0],[S,0],[-S,0],[0,S],[0,-S]]){g.beginPath();for(let k=0;k<n;k++){const a=k/n*6.283+rr(-.2,.2),rad=r*rr(.7,1);const px=x+ox+Math.cos(a)*rad,py=y+oy+Math.sin(a)*rad;k?g.lineTo(px,py):g.moveTo(px,py);}g.closePath();g.fill();}}
  noise(g,S,S,16);return tex(c,6,6);}
function chainTex(){const S=128,[c,g]=cv(S,S);g.clearRect(0,0,S,S);g.strokeStyle='rgba(175,180,182,.95)';g.lineWidth=2.2;
  const d=S/4;for(let i=-4;i<8;i++){g.beginPath();g.moveTo(i*d,0);g.lineTo(i*d+S,S);g.stroke();g.beginPath();g.moveTo(i*d+S,0);g.lineTo(i*d,S);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=MAXANISO;t.colorSpace=THREE.SRGBColorSpace;return t;}
function brownShingleTex(){const S=TX(512),[c,g]=cv(S,S);const ppf=S/6,row=0.42*ppf;g.fillStyle='#4a3428';g.fillRect(0,0,S,S);
  for(let y=0;y<S;y+=row){let x=-rr(0,40);while(x<S){const w=rr(.6,1.4)*ppf;g.fillStyle=hsl(rr(14,24),rr(30,45),rr(24,34));g.fillRect(x,y,w-2,row-3);x+=w;}
    g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,y+row-3,S,3);}noise(g,S,S,16);return tex(c,6,6);}
function addFacadeMaterials(){
  MAT.slateRoof=std({map:slateTex(),roughness:.7});
  MAT.metalRoof=std({map:seamTex(),roughness:.45,metalness:.35});
  MAT.soldier=std({map:soldierTex(),roughness:.9});
  MAT.stone=std({map:plainNoise('#b9ad97',4,24),roughness:.95});
  MAT.edgeStone=std({map:plainNoise('#8a8072',3,30),roughness:.95});
  MAT.frameDark=std({color:0x3b3f37,roughness:.55});
  MAT.dormerClad=std({color:0xf1f1ec,roughness:.55});   // painted white, as in the front photo
  MAT.garageDoor=std({color:0xefede7,roughness:.5});
  MAT.garageDoorPanel=std({color:0xe1ded7,roughness:.55});
  MAT.doorWood=std({color:0x4a2f1f,roughness:.45});     // dark brown front doors (front photo)
  MAT.flagstone=std({map:flagTex(),roughness:.95});
  MAT.mulch=std({color:0x5a3b28,roughness:1});
  MAT.roofBrown=std({map:brownShingleTex(),roughness:.95});
  MAT.chain=std({map:chainTex(),transparent:true,depthWrite:false,side:THREE.DoubleSide,metalness:.5,roughness:.5});
  MAT.underside=std({color:0x1d1b19,roughness:1});
}


function normalFrom(map,strength,invert){if(!map||!map.image)return null;const src=map.image,W=src.width,H=src.height;
  const d=src.getContext('2d').getImageData(0,0,W,H).data,h=new Float32Array(W*H);
  for(let i=0;i<W*H;i++){const l=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)/255;h[i]=invert?1-l:l;}
  const [c,g]=cv(W,H),o=g.createImageData(W,H),q=o.data,at=(x,y)=>h[((y+H)%H)*W+((x+W)%W)];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const dx=(at(x+1,y-1)+2*at(x+1,y)+at(x+1,y+1))-(at(x-1,y-1)+2*at(x-1,y)+at(x-1,y+1));
    const dy=(at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1))-(at(x-1,y-1)+2*at(x,y-1)+at(x+1,y-1));
    let nx=-dx*strength,ny=dy*strength,nz=1;const L=Math.hypot(nx,ny,nz);const k=(y*W+x)*4;q[k]=(nx/L*.5+.5)*255;q[k+1]=(ny/L*.5+.5)*255;q[k+2]=(nz/L*.5+.5)*255;q[k+3]=255;}
  g.putImageData(o,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.copy(map.repeat);t.center.copy(map.center);t.rotation=map.rotation;t.anisotropy=MAXANISO;return t;}
function addRelief(){const R=[['oak',1.6],['brick',3.5,1],['brickWhite',2.5],['siding',2.5],['sidingNew',2.5],['sidingWhite',2.5],['roof',3],['slateRoof',3.5],['slate',3],['tileBath',2.5],['subway',2.5],['showerTile',2.5],
    ['paver',3],['deckOld',3],['deckNew',3],['flagstone',3],['metalRoof',2],['soldier',3,1],['grass',1.4],['bark',3],['concrete',1.2],['drive',1.2],['asphalt',1.5],['stone',1.6],['beam',2],['roofBrown',3],['olive',1.6],['pillowTaupe',1.4],['pillowRust',1.2],['knitIvory',3.5],['knitMustard',3.5],['rugShag',2.6],['rugNursery',2.2],['rugNurseryBig',1.6],['playMat',1.2],['linen2',1]];
  for(const [k,st,inv] of R){const m=MAT[k];if(m&&m.map){const n=normalFrom(m.map,st*.5,!!inv);if(n){m.normalMap=n;m.needsUpdate=true;}}}}
const MAT={};
const CLIP_TOP=new THREE.Plane(new THREE.Vector3(0,-1,0),1e5), CLIP_BOT=new THREE.Plane(new THREE.Vector3(0,1,0),1e5);
// the diorama's sides: everything outside the block is cut away in the 3/4 view (constants are 1e5 when off)
const CLIP_X0=new THREE.Plane(new THREE.Vector3(1,0,0),1e5),CLIP_X1=new THREE.Plane(new THREE.Vector3(-1,0,0),1e5),CLIP_Z0=new THREE.Plane(new THREE.Vector3(0,0,1),1e5),CLIP_Z1=new THREE.Plane(new THREE.Vector3(0,0,-1),1e5);
const CLIPS=[CLIP_TOP,CLIP_BOT,CLIP_X0,CLIP_X1,CLIP_Z0,CLIP_Z1],CLIPS_V=[CLIP_TOP,CLIP_BOT];
function std(o,clip){const m=new THREE.MeshStandardMaterial(Object.assign({roughness:.8,metalness:0},o));if(clip!==false)m.clippingPlanes=CLIPS;return m;}
function physify(k,cc,ccr){const m=MAT[k];if(!m||!m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)return;const p=new THREE.MeshPhysicalMaterial();
  THREE.MeshStandardMaterial.prototype.copy.call(p,m);if(!window.GPU)p.defines={STANDARD:'',PHYSICAL:''};p.onBeforeCompile=m.onBeforeCompile;p.customProgramCacheKey=m.customProgramCacheKey;npClonePatches(m,p);
  p.clearcoat=0;p.clearcoatRoughness=ccr;p.userData.cc=[cc,ccr];MAT[k]=p;m.dispose();}
function makeMaterials(){
  const T=n=>n;
  MAT.oak=std({map:oakTex(),roughness:.55});
  MAT.wall=std({color:0xd9d8d3,roughness:.92});            // light warm grey, as in living/family/kitchen photos
  MAT.charcoal=std({color:0x4a4e53,roughness:.9});          // dining room walls
  MAT.ceiling=std({color:0xf5f4f0,roughness:.95});
  MAT.trim=std({color:0xf6f6f2,roughness:.5});
  MAT.brick=std({map:brickTex(false),roughness:.9});
  MAT.brickWhite=std({map:brickTex(true),roughness:.85});
  MAT.siding=std({map:sidingTex('#9ea39f'),roughness:.8});
  MAT.sidingNew=std({map:sidingTex('#a3aaa8'),roughness:.8});
  MAT.sidingWhite=std({map:sidingTex('#f1f1ed'),roughness:.75});   // white lap siding on the back and east side of the main level (back-yard photo)
  MAT.roof=std({map:shingleTex(),roughness:.95});
  MAT.slate=std({map:herringboneTex(),roughness:.6});
  MAT.tileBath=std({map:gridTileTex(1,2,()=>hsl(40,4,rr(82,88)),'#a9a8a3',4,true),roughness:.35});
  MAT.subway=std({map:gridTileTex(.5,.25,()=>hsl(40,6,rr(93,97)),'#cfcdc6',2,true),roughness:.2});
  MAT.showerTile=std({map:gridTileTex(.33,.66,()=>hsl(200,4,rr(88,93)),'#b9bcbc',2,false),roughness:.25});
  MAT.barTile=std({map:barTileTex(),roughness:.35});
  MAT.concrete=std({map:plainNoise('#a7a59f',6,20),roughness:.95});
  MAT.drive=std({map:plainNoise('#b2afa7',8,18),roughness:.95});
  MAT.driveway=std({map:plainNoise('#a9a69e',8,18),roughness:.95});
  MAT.asphalt=std({map:plainNoise('#3d3f41',8,22),roughness:.95});
  MAT.paver=std({map:gridTileTex(2,2,()=>hsl(30,8,rr(55,64)),'#6e6a63',8,false),roughness:.9});
  MAT.deckOld=std({map:deckTex(14,42,30),roughness:.8});
  MAT.deckNew=std({map:deckTex(30,14,46),roughness:.75});
  MAT.deckRailOld=std({color:0x6e3a28,roughness:.7});
  MAT.grass=std({map:grassTex(),vertexColors:true,roughness:1});
  // glass: almost clear head-on, turning to a mirror toward grazing angles (Fresnel). The colour it adds is its reflection only (a barely
  // tinted, near-black body), blended as "add the reflection, let through what is not reflected": src x 1 + dst x (1 - coverage), where the
  // coverage rises with the Fresnel term from the base opacity. Its reflections come from the sky outdoors and from the room indoors
  // (updateGlassEnv in 09-look-pipeline.js), and from the scene itself in Ultra (the reflection pass draws glass too)
  MAT.glass=std({color:0x0b100f,transparent:true,opacity:.035,roughness:.03,metalness:0,depthWrite:false,envMapIntensity:1.3,
    blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendEquation:THREE.AddEquation});
  MAT.glass.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',
    '{float gNdV=clamp(abs(dot(normalize(vViewPosition),normal)),0.,1.);float gF=.04+.96*pow(1.-gNdV,5.);diffuseColor.a=clamp(opacity+(1.-opacity)*gF,0.,1.);}\n#include <opaque_fragment>');};
  MAT.glass.customProgramCacheKey=()=>'fresnelGlass';
  npAdd(MAT.glass,{opacity:()=>{const {positionView,normalView,abs,dot,pow,clamp,float}=NP,ndv=clamp(abs(dot(positionView.normalize(),normalView)),0,1);
    return NP.materialOpacity.add(float(1).sub(NP.materialOpacity).mul(float(.04).add(float(.96).mul(pow(float(1).sub(ndv),5))))).clamp(0,1);}});
  MAT.frost=std({color:0xf2f4f4,transparent:true,opacity:.82,roughness:.4});
  MAT.cab=std({color:0x2e3134,roughness:.42});
  MAT.cabGap=std({color:0x131415,roughness:.8});MAT.cabGlass=std({color:0x2b3034,transparent:true,opacity:.32,roughness:.04,metalness:.1,depthWrite:false});MAT.hoodSteel=std({map:brushedTex(),color:0x6f7377,metalness:.55,roughness:.5});MAT.cabInner=std({color:0x4a4d51,roughness:.5});
  MAT.cabDark=std({color:0x5a5f64,roughness:.55});
  MAT.quartz=std({color:0xefeeea,roughness:.25});
  MAT.steel=std({map:brushedTex(),color:0xc4c7ca,metalness:.88,roughness:.3});
  MAT.blackGlass=std({color:0x111214,roughness:.1,metalness:.3});
  MAT.black=std({color:0x1e1f21,roughness:.5});
  MAT.blackMetal=std({color:0x222325,metalness:.6,roughness:.4});
  MAT.brass=std({color:0xb48b4c,metalness:.8,roughness:.32});
  MAT.beam=std({map:beamTex(),roughness:.8});
  MAT.tread=std({color:0x252526,roughness:.45});
  MAT.doorWhite=std({color:0xf2f2ee,roughness:.45});
  MAT.doorGrey=std({color:0x50565b,roughness:.45});
  MAT.fabricCream=std({color:0xe4ded3,roughness:.95});
  MAT.fabricGrey=std({color:0xd3cfc7,roughness:.95});
  MAT.linen=std({color:0xc9c2b6,roughness:.95});
  MAT.pillowBlue=std({color:0x2f4b7a,roughness:.9});
  MAT.pillowCream=std({color:0xeae5d9,roughness:.95});
  MAT.pillowOchre=std({color:0xc79a4c,roughness:.95});
  MAT.leather=std({color:0x8b4a25,roughness:.5});
  MAT.walnutDark=std({color:0x26231f,roughness:.45});
  MAT.oakFurn=std({color:0xb8874f,roughness:.55});
  MAT.oakLight=std({color:0xc9a06d,roughness:.6});
  MAT.porcelain=std({color:0xf8f8f6,roughness:.15});
  MAT.mirror=std({color:0xdfe6ea,metalness:1,roughness:.04});
  MAT.shade=std({color:0xf4ecd8,roughness:.9,emissive:0xffe3b0,emissiveIntensity:.35,side:THREE.DoubleSide});
  MAT.light=std({color:0xffffff,emissive:0xfff3dc,emissiveIntensity:1.2});
  MAT.ledStrip=std({color:0xfff2dc,emissive:0xffc98a,emissiveIntensity:.1});
  MAT.flame=std({color:0xfff2c8,emissive:0xffd890,emissiveIntensity:1.5});
  MAT.curtain=std({color:0xf3f0e8,roughness:.95,side:THREE.DoubleSide});
  MAT.plantGreen=std({color:0x4d6b37,roughness:.8,side:THREE.DoubleSide});
  MAT.flowerWhite=std({color:0xfbfaf6,roughness:.7});
  MAT.ceramicWhite=std({color:0xf1efe9,roughness:.35});
  MAT.terracotta=std({color:0xc9a27a,roughness:.7});
  MAT.mattress=std({color:0xf4f2ec,roughness:.95});
  MAT.duvet=std({color:0xe9e6df,roughness:.95});
  MAT.duvetBlue=std({color:0x8ea2b8,roughness:.95});
  MAT.washer=std({color:0xeef0f1,roughness:.3});
  MAT.tvScreen=std({color:0x0b0c0e,roughness:.08,metalness:.4});
  MAT.firebox=std({color:0x161210,roughness:.95});
  MAT.poche=new THREE.MeshBasicMaterial({color:0x2a2f35});
  MAT.pocheNew=new THREE.MeshBasicMaterial({color:0x2c66c9});
  MAT.pocheGlass=new THREE.MeshBasicMaterial({color:0x9fc4dd});
  MAT.rugFamily=std({map:rugTex('family'),roughness:1});
  MAT.rugLiving=std({map:rugTex('living'),roughness:1});
  MAT.rugDining=std({map:rugTex('dining'),roughness:1});
  // upper-floor primary bedroom, now a nursery (inspiration photo): soft olive walls, a large oat rug under the furniture, a round play mat
  MAT.sage=std({color:0x777b58,roughness:.92});MAT.rugNurseryBig=std({map:nurseryBigRugTex(),roughness:1});MAT.playMat=std({map:playMatTex(),roughness:.9});
  MAT.cribWood=std({map:woodGrainTex('#b68a60'),roughness:.5});   // the crib model's honey wood (its texture's median colour), for the Gelato dresserMAT.oat=std({color:0xe4dccb,roughness:.92});MAT.rugNursery=std({map:nurseryRugTex(),roughness:1});
  MAT.bark=std({map:barkTex(),roughness:1},false);
  MAT.leaf=new THREE.MeshStandardMaterial({roughness:.85,flatShading:true});
  MAT.artBotanical=std({map:artTex('botanical',256,320),roughness:.8});
  MAT.artBlue=std({map:artTex('blueprint',256,320),roughness:.8});
  MAT.artLandscape=std({map:artTex('landscape',256,200),roughness:.6});
  MAT.artLine=std({map:artTex('line',256,320),roughness:.8});
  MAT.mat=std({color:0xf7f5ef,roughness:.9});
  MAT.gold=std({color:0xc49a52,metalness:.85,roughness:.3});
  MAT.bronze=std({color:0x3a2c23,metalness:.55,roughness:.42});     // oil-rubbed bronze (ceiling fans)
  MAT.fanBlade=std({color:0x3d2b21,roughness:.6});
  MAT.shutter=std({color:0x2a2c2f,roughness:.85});          // dark grey painted shutters (front)
  addFacadeMaterials();addLivingMaterials();
  addRelief();
  // clear coats (Ultra only): floors, cabinets, counters, tile and lacquered or leather furniture become physical materials with a coat of
  // [strength, roughness]; applyLightBalance turns the coat on in Ultra (at 0 the physical shader looks the same as the standard one)
  for(const [k,cc,ccr] of [['oak',.11,.12],['cab',.2,.15],['cabDark',.2,.15],['quartz',.6,.04],['walnutDark',.6,.07],['oakFurn',.5,.1],['oakLight',.4,.12],['leather',.3,.25],
    ['tileBath',.6,.04],['subway',.7,.03],['showerTile',.6,.04],['barTile',.6,.05],['porcelain',.8,.03],['ceramicWhite',.6,.05],['washer',.5,.06],['doorWhite',.25,.15],['tread',.4,.1],['slate',.35,.15]])physify(k,cc,ccr);
  antiTile(MAT.grass,true,.16);for(const k of ['drive','driveway','concrete','asphalt'])antiTile(MAT[k],false,.16);for(const k of ['brick','roof','slateRoof'])antiTile(MAT[k],false,.1);
}
// break up visible texture repeats: optionally blend in a second, rotated and rescaled sample of the same texture through a noise mask,
// and add broad light/dark patches. Settings are uniforms, so every patched material shares one shader program.
function antiTile(m,swap,macro){if(!m)return;const U={atSwap:{value:swap?1:0},atMacro:{value:macro}};
  // WebGPU: the same blend, in nodes (the texture sampled again at a turned, rescaled UV, mixed in by value noise, plus broad patches)
  npAdd(m,{color:(c,mt)=>{const {texture,uv,vec2,mat2,mix,smoothstep,fract,sin,dot,floor,float}=NP;if(!mt.map)return c;
    const h=q=>fract(sin(dot(q,vec2(127.1,311.7))).mul(43758.5453)),n=q=>{const i=floor(q),f=fract(q),w=f.mul(f).mul(f.mul(-2).add(3));
      return mix(mix(h(i),h(i.add(vec2(1,0))),w.x),mix(h(i.add(vec2(0,1))),h(i.add(vec2(1,1))),w.x),w.y);};
    mt.map.updateMatrix();const u=NP.uniform(mt.map.matrix).mul(NP.vec3(uv(),1)).xy;let t=texture(mt.map,u);
    if(swap){const uB=mat2(.82,-.57,.57,.82).mul(u).mul(.43).add(vec2(.31,.17));t=mix(t,texture(mt.map,uB),smoothstep(.3,.7,n(u.mul(.13)).mul(.65).add(n(u.mul(.41)).mul(.35))));}
    const k=float(1).add(float(macro).mul(n(u.mul(.05)).add(n(u.mul(.17)).mul(.5)).sub(.75)));
    return NP.vec4(NP.uniform(mt.color).mul(t.rgb).mul(k),t.a);}});
  m.onBeforeCompile=s=>{Object.assign(s.uniforms,U);
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
uniform float atSwap,atMacro;
float atH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float atN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(atH(i),atH(i+vec2(1.,0.)),f.x),mix(atH(i+vec2(0.,1.)),atH(i+vec2(1.,1.)),f.x),f.y);}`)
    .replace('#include <map_fragment>',`#ifdef USE_MAP
  vec4 texelColor=texture2D(map,vMapUv);
  if(atSwap>.5){vec2 uB=mat2(.82,-.57,.57,.82)*vMapUv*.43+vec2(.31,.17);vec4 tB=texture2D(map,uB);
    texelColor=mix(texelColor,tB,smoothstep(.3,.7,atN(vMapUv*.13)*.65+atN(vMapUv*.41)*.35));}
  texelColor.rgb*=1.+atMacro*(atN(vMapUv*.05)+atN(vMapUv*.17)*.5-.75);
  diffuseColor*=texelColor;
#endif`);};}
