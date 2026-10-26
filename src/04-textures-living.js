// 04-textures-living.js: family-room textures and materials (sectional fabric, knits, rug, art)
"use strict";
// ================= FAMILY ROOM TEXTURES (from the reference photo) =================
function weaveTex(col,ft){const S=TX(256),[c,g]=cv(S,S);g.fillStyle=col;g.fillRect(0,0,S,S);const st=Math.max(2,S/96);
  for(let y=0;y<S;y+=st){g.fillStyle=`rgba(255,255,255,${rr(.02,.08)})`;g.fillRect(0,y,S,st*.5);}
  for(let x=0;x<S;x+=st){g.fillStyle=`rgba(0,0,0,${rr(.03,.09)})`;g.fillRect(x,0,st*.5,S);}
  for(let i=0;i<S*S/30;i++){g.fillStyle=`rgba(${rnd()<.5?'255,255,255':'0,0,0'},${rr(.03,.09)})`;g.fillRect(rr(0,S),rr(0,S),rr(1,4),1);}
  noise(g,S,S,10);return tex(c,ft||1,ft||1);}
function knitTex(col){const S=TX(256),[c,g]=cv(S,S);g.fillStyle=col;g.fillRect(0,0,S,S);const cw=S/8,rh=S/10;
  for(let x=0;x<S;x+=cw)for(let y=-rh;y<S+rh;y+=rh*.85){for(const s of [-1,1]){const gr=g.createLinearGradient(x+cw/2,y,x+cw/2+s*cw*.5,y+rh);
      gr.addColorStop(0,'rgba(255,255,255,.28)');gr.addColorStop(.6,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.3)');g.fillStyle=gr;
      g.beginPath();g.moveTo(x+cw/2,y+rh*.2);g.quadraticCurveTo(x+cw/2+s*cw*.55,y+rh*.1,x+cw/2+s*cw*.45,y+rh*.9);g.quadraticCurveTo(x+cw/2+s*cw*.15,y+rh*.75,x+cw/2,y+rh*1.05);g.fill();}
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x+cw/2-.8,y,1.6,rh);}
  noise(g,S,S,10);return tex(c,1,1);}
function pillowTex(kind){const S=TX(256),[c,g]=cv(S,S);g.fillStyle=kind==='stripe2'?'#efe9de':'#ece5d6';g.fillRect(0,0,S,S);
  for(let i=0;i<S*S/18;i++){g.fillStyle=`rgba(0,0,0,${rr(.02,.06)})`;g.fillRect(rr(0,S),rr(0,S),rr(1,3),1);}
  if(kind==='stripe'){for(const [y,h,cl] of [[.30,.035,'#2a2826'],[.38,.06,'#9a4b30'],[.47,.02,'#2a2826'],[.58,.06,'#9a4b30'],[.67,.035,'#2a2826']]){g.fillStyle=cl;g.fillRect(0,y*S,S,h*S);}}
  else if(kind==='stripe2'){for(let k=0;k<5;k++){g.fillStyle='#2b2a28';g.fillRect(0,(.22+k*.13)*S,S,.025*S);}}
  else{g.strokeStyle='#6e2430';g.lineWidth=S*.045;g.lineJoin='miter';for(const yy of [.4,.6]){g.beginPath();for(let x=-1;x<=8;x++){const px=x*S/6,py=(yy+(x%2?.07:-.07))*S;x<0?g.moveTo(px,py):g.lineTo(px,py);}g.stroke();}}
  noise(g,S,S,8);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
function shagTex(){const W=TX(512),H=Math.round(W*11.8/8.8),[c,g]=cv(W,H);g.fillStyle='#ebe5d8';g.fillRect(0,0,W,H);
  for(let i=0;i<W*H/6;i++){g.fillStyle=`rgba(${rnd()<.55?'255,252,245':'120,110,95'},${rr(.05,.2)})`;const x=rr(0,W),y=rr(0,H);g.fillRect(x,y,rr(1,2.4),rr(2,5));}
  const rows=[.08,.11,.2,.23,.33,.36,.39,.5,.53,.64,.67,.7,.8,.83,.92,.95];
  for(const r of rows){let x=rr(-20,30);const y0=r*H;while(x<W){const L=rr(18,90)*W/512;g.strokeStyle=`rgba(28,26,26,${rr(.75,.95)})`;g.lineWidth=rr(3,6)*W/512;g.lineCap='round';
      g.beginPath();g.moveTo(x,y0+rr(-2,2));g.lineTo(x+L,y0+rr(-3,3));g.stroke();x+=L+rr(6,40)*W/512;}}
  for(let i=0;i<W*H/14;i++){g.fillStyle=`rgba(235,229,216,${rr(.15,.35)})`;g.fillRect(rr(0,W),rr(0,H),1,rr(2,4));}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
function fringeTex(){const [c,g]=cv(256,64);g.clearRect(0,0,256,64);for(let x=1;x<256;x+=2.2){g.strokeStyle=hsl(40,rr(15,25),rr(84,92));g.lineWidth=1.3;g.beginPath();g.moveTo(x,0);g.lineTo(x+rr(-2,2),rr(46,63));g.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function arcArtTex(){const W=TX(320),H=Math.round(W*1.2),[c,g]=cv(W,H);g.fillStyle='#f3efe6';g.fillRect(0,0,W,H);g.strokeStyle='#161514';g.lineWidth=W*.036;g.lineCap='butt';
  for(const cx of [.22,.55]){for(let k=0;k<4;k++){const r=W*(.06+k*.065),x0=W*cx,y=H*.5;g.beginPath();g.moveTo(x0,y-r);g.arc(x0+W*.02,y,r,-Math.PI/2,Math.PI/2);g.lineTo(x0,y+r);g.stroke();}}
  noise(g,W,H,5);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function tvArtTex(){const W=TX(512),H=Math.round(W*9/16),[c,g]=cv(W,H);g.fillStyle='#ece8df';g.fillRect(0,0,W,H);g.strokeStyle='#22201e';g.lineWidth=W*.004;
  g.beginPath();g.arc(W*.62,H*.42,H*.2,0,7);g.stroke();for(let i=0;i<5;i++){g.beginPath();g.moveTo(W*(.2+i*.03),H*.85);g.bezierCurveTo(W*(.3+i*.02),H*.2,W*(.55-i*.02),H*.95,W*(.8-i*.03),H*.3);g.stroke();}
  g.fillStyle='rgba(180,150,110,.35)';g.beginPath();g.ellipse(W*.4,H*.55,W*.08,H*.18,.4,0,7);g.fill();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function addLivingMaterials(){
  MAT.olive=std({map:weaveTex('#6b7150',1),roughness:.96});
  MAT.pillowMustard=std({map:weaveTex('#c4902e',1),roughness:.8});MAT.pillowTaupe=std({map:weaveTex('#8e877b',.8),roughness:.95});MAT.pillowRust=std({map:weaveTex('#9e4f30',1),roughness:.9});
  MAT.pillowStripe=std({map:pillowTex('stripe'),roughness:.95});MAT.pillowStripe2=std({map:pillowTex('stripe2'),roughness:.95});MAT.pillowChevron=std({map:pillowTex('chevron'),roughness:.95});
  MAT.knitIvory=std({map:knitTex('#ebe3d2'),roughness:1,side:THREE.DoubleSide});MAT.knitMustard=std({map:knitTex('#c3892b'),roughness:1,side:THREE.DoubleSide});
  MAT.rugShag=std({map:shagTex(),roughness:1});
  // the family room's geometric shag rug: the owner's product photo (assets/textures/manifest.json) over the shag's pile relief (addRelief);
  // the shag's own colours stand in until the photo loads, and in the single-file build
  MAT.rugGeo=std({map:MAT.rugShag.map,roughness:1});
  // the living room's abstract rug: the owner's photo (manifest), over the shag's pile relief; a dusty pink until it loads
  MAT.rugAbstract=std({color:0xc9a596,roughness:1});MAT.rugFringe=std({map:fringeTex(),alphaTest:.45,side:THREE.DoubleSide,roughness:1});
  MAT.linen2=std({map:weaveTex('#eee8dc',1),roughness:.95,side:THREE.DoubleSide});
  MAT.wicker=std({map:weaveTex('#8b8275',1),roughness:.9});MAT.rattan=std({color:0xd3ad74,roughness:.72});   // (the dining pendant's strips)
  // the dining pendant's parts, shown whole in the 3/4 cutaway of its level (not cut by CLIP_TOP)
  for(const [k,src] of [['rattanHang','rattan'],['blackHang','black'],['lightHang','light']]){MAT[k]=npClonePatches(MAT[src],MAT[src].clone());MAT[k].clippingPlanes=CLIPS_NOTOP;}   // the patio set (current state)
  // the lower-level sitting room (listing photos): dark grey walls; its rugs (and the next room's) are Poly Haven's Curly Teddy Natural
  // (assets/textures/manifest.json; this weave until it loads, and in the single-file build)
  // the home theatre: the projected picture (a sunset over the sea, painted here; it glows as a running projector's image
  // would), the projector's bronze fabric grille and brushed champagne top, the console's dark walnut
  {const W=1024,H=576,[c,g]=cv(W,H);let gr=g.createLinearGradient(0,0,0,H*.7);gr.addColorStop(0,'#7d7896');gr.addColorStop(.45,'#d9ad8c');gr.addColorStop(1,'#f4c27a');g.fillStyle=gr;g.fillRect(0,0,W,H);
    gr=g.createRadialGradient(W*.3,H*.62,10,W*.3,H*.62,W*.45);gr.addColorStop(0,'rgba(255,214,140,.9)');gr.addColorStop(1,'rgba(255,214,140,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(let i=0;i<70;i++){const x=rr(W*.45,W),y=rr(H*.05,H*.5),r=rr(20,70);gr=g.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,'rgba(255,240,225,.55)');gr.addColorStop(1,'rgba(255,240,225,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}
    g.fillStyle='rgba(120,118,150,.7)';g.fillRect(W*.62,H*.665,W*.38,H*.035);
    gr=g.createLinearGradient(0,H*.7,0,H);gr.addColorStop(0,'#6b5646');gr.addColorStop(1,'#1d1b20');g.fillStyle=gr;g.fillRect(0,H*.7,W,H*.3);
    for(let i=0;i<500;i++){g.fillStyle='rgba(255,'+Math.round(rr(170,220))+',140,'+rr(.05,.25)+')';g.fillRect(rr(0,W),rr(H*.7,H),rr(4,26),1.5);}
    gr=g.createRadialGradient(W*.32,H*.69,4,W*.32,H*.69,60);gr.addColorStop(0,'rgba(255,248,225,1)');gr.addColorStop(1,'rgba(255,220,150,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);   // the setting sun
    for(let i=0;i<260;i++){const x=W*.32+rr(-60,60)*(1+rnd()),y=rr(H*.71,H);g.fillStyle='rgba(255,226,160,'+rr(.2,.6)+')';g.fillRect(x,y,rr(6,30),1.5);}   // its path on the water
    const t=tex(c,1,1);MAT.alrScreen=std({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.85,roughness:.75});}
  MAT.projGrille=std({map:weaveTex('#7d6b52',1),roughness:.85});MAT.projBody=std({map:brushedTex(),color:0xb3aa9c,metalness:.8,roughness:.32});
  MAT.consoleWalnut=std({map:woodGrainTex('#2e2722'),roughness:.5});
  MAT.slatePaint=std({color:0x45474a,roughness:.92});MAT.rugTeddy=std({map:weaveTex('#dcd3c3',1.1),roughness:1});
  MAT.artArcs=std({map:arcArtTex(),roughness:.85});
  // the family room's print (the owner's image, assets/textures/manifest.json); a muted olive stands in until it loads and in the single-file build
  MAT.artJungle=std({color:0x6b6448,roughness:.85});
  // the living room's ibex print (the owner's image, assets/textures/manifest.json); a dark teal stands in until it loads and in the single-file build
  MAT.artIbex=std({color:0x2f6f74,roughness:.85});
  // the living room's abstract (after the owner's reference): four rounded colour fields on cream linen, burnt orange top left over teal
  // bottom left with a navy circle, deep teal-navy top right, warm orange bottom right (warmer than the reference's reds, at the owner's request); a faint weave and noise so it reads as painted canvas
  {const seed0=RNG_SEED,S=TX(1024),[c,g]=cv(S,S),u=v=>v*S,rr=(x,y,w,h,r,col)=>{g.fillStyle=col;g.beginPath();g.roundRect(u(x),u(y),u(w),u(h),r.map(u));g.fill();};
    g.fillStyle='#ead9b8';g.fillRect(0,0,S,S);
    rr(-.05,.4,.53,.7,[.1,.3,.04,.04],'#56aba2');
    {const gr=g.createLinearGradient(0,0,u(.45),u(.6));gr.addColorStop(0,'#ef8a3a');gr.addColorStop(1,'#d9632a');rr(-.05,-.05,.53,.66,[.12,.28,.22,.1],gr);}
    g.fillStyle='#1d2742';g.beginPath();g.arc(u(.27),u(.87),u(.12),0,Math.PI*2);g.fill();
    rr(.63,.05,.42,.44,[.21,.08,.06,.2],'#1c4552');rr(.58,.48,.47,.6,[.22,.06,.06,.18],'#ec7a45');
    g.globalAlpha=.06;g.fillStyle='#000';for(let i=0;i<S;i+=3){g.fillRect(i,0,1,S);g.fillRect(0,i,S,1);}g.globalAlpha=1;noise(g,S,S,14);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;MAT.artBlobs=std({map:t,roughness:.9});RNG_SEED=seed0;}MAT.artTV=std({map:tvArtTex(),roughness:.3,emissive:0xffffff,emissiveIntensity:.06,emissiveMap:null});
  MAT.ceramicBlack=std({color:0x1c1c1e,roughness:.55});MAT.book1=std({color:0x6f8173,roughness:.8});MAT.book2=std({color:0xd8cbb4,roughness:.8});MAT.pages=std({color:0xf1ece0,roughness:.9});
}
