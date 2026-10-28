// 16-tour.js: Tour mode, a guided flythrough of the house (about 90 s), from the street through the main rooms to the addition
"use strict";
// ================= TOUR =================
// TOUR_SEGS lists the tour's parts. Each part sets a view ('three' for the 3/4 orbit, 'walk' for eye level, with collisions off), the
// light preset, the house state and the cut-open levels, all applied behind a fade to black, then flies the camera through its keys.
// A key is a camera position p and a point it looks at, in feet; dur is the time to fly there from the key before, hold the time it
// rests there (the view refines meanwhile), cap/sub the caption shown from the start of the flight to it, and do an action run as that
// flight starts ({state:'a'}: the Current to Addition wipe; {levels:[2]}: cut those levels open). Positions follow centripetal
// Catmull-Rom curves through the keys, eased only into and out of the keys where the camera rests.
const TOUR_SEGS=[
  {mode:'three',light:'morning',state:'c',levels:[],keys:[
    {p:[70,60,150],at:[14,-4,17],hold:.8,cap:'Dunwoody Drive',sub:'A split-level house in St. Louis'},
    {p:[30,12,62],at:[22,-1,28],dur:6.5,hold:1.2}]},
  {mode:'walk',light:'midday',state:'c',keys:[
    {p:[22.3,4.7,39],at:[22.3,4.2,30],hold:.6,cap:'Front entry'},
    {p:[21.6,5.3,28.5],at:[21.4,5,20],dur:3,cap:'Foyer'},
    {p:[21.3,5.3,17],at:[18,4.5,8],dur:2.6},
    {p:[25.5,5.3,7.5],at:[14.5,4.6,6.6],dur:3,hold:2.2,cap:'Living room',sub:'The sofa under the ibex print, and the satellite floor lamp'},
    {p:[33.5,5.3,2.2],at:[38.4,4.4,9.8],dur:3.2,hold:2.2,cap:'Dining area',sub:'Walnut table, rattan pendant, sideboard and hanging shelves'},
    {p:[33.6,5.3,12.5],at:[30,4.6,20],dur:2.8},
    {p:[29,5.3,19],at:[26,4.4,28],dur:2.4,hold:1.6,cap:'Kitchen'}]},
  {mode:'walk',light:'afternoon',state:'c',keys:[
    {p:[3,.8,18],at:[10,.3,6],hold:.5,cap:'Family room',sub:'The Drift sectional, fireplace, jungle print and timber beams'},
    {p:[3.5,.8,7.6],at:[13.9,.9,6.6],dur:3.6,hold:1.8},
    {p:[9,.8,15],at:[1.5,-.5,9.5],dur:2.8,hold:1.2}]},
  {mode:'walk',light:'afternoon',state:'c',keys:[
    {p:[34,-8.2,10.5],at:[26,-10.5,4.5],hold:.3,cap:'Lower level',sub:'The sitting room'},
    {p:[31,-8.2,9],at:[25,-10.5,3.5],dur:3,hold:1}]},
  {mode:'three',light:'afternoon',state:'c',levels:[4],keys:[
    {p:[26.8,51.9,54.1],at:[15,4.5,16],hold:.5,cap:'Bedroom level',sub:'The bedrooms and bath, cut open'},
    {p:[46.3,51.9,40.8],at:[15,4.5,16],dur:5,hold:1}]},
  {mode:'three',light:'golden',state:'c',levels:[],keys:[
    {p:[-66,42,53],at:[-6,-4,14],hold:1,cap:'The addition',sub:'A four-seasons room and primary suite on the west side'},
    {p:[-46,42,73],at:[-6,-4,14],dur:4.5,hold:.8,do:{state:'a'}},
    {p:[-31,30.6,40],at:[-10,-4.5,15],dur:3,do:{levels:[2]},cap:'Four-seasons room and primary suite',sub:'The family-room level, cut open'},
    {p:[-19.7,30.6,46.3],at:[-10,-4.5,15],dur:3.5,hold:1.2}]},
  {mode:'walk',light:'golden',state:'a',keys:[
    {p:[-4,.8,11.5],at:[-14,0,1],hold:.4,cap:'Four-seasons room',sub:'Glass on three sides, over the patio'},
    {p:[-7,.8,10.5],at:[-16,-.5,0],dur:3.5,hold:1.6}]},
  {mode:'three',light:'dusk',state:'a',levels:[],keys:[
    {p:[-48.3,70.7,131.2],at:[14,-4,17],hold:.4,cap:'Dunwoody Drive',sub:'As it could be, with the addition and the new deck'},
    {p:[58.6,70.7,139.1],at:[14,-4,17],dur:6.5,hold:2.5}]}];
const TOUR={on:false,paused:false,seg:0,t:0,phase:'',f:0,wait:0,next:0,leg:-1,cap:'',saved:null,curves:null,speed:1,seen:[]};   // (speed: the smoke test plays it faster; seen: the parts reached)
const TOUR_FADE_OUT=.45,TOUR_FADE_IN=.6;
const tourV=a=>new THREE.Vector3(a[0],a[1],a[2]);
function tourSegLen(s){return s.keys.reduce((a,k,i)=>a+(i?k.dur||0:0)+(k.hold||0),0);}
const TOUR_TOTAL=()=>TOUR_SEGS.reduce((a,s)=>a+tourSegLen(s)+TOUR_FADE_OUT+TOUR_FADE_IN,0);
// ---------- applying a part: light, house state, view, levels (all instant: the screen is black) ----------
function tourSetup(s){
  if(s.light&&LOOK.preset!==s.light){applyPreset(s.light);$('tod').value=s.light;}
  if(s.state&&HOUSE.ph!==s.state){setHouseState(s.state);if(PHT){PHT.t=PHT.dur;animate(0);}}
  const lv=s.levels||[];ST.levels=lv.slice();ST.level=lv.length?Math.max(...lv):'all';
  ST.view=s.mode;if(s.mode==='walk')WLK.inited=true;else ORB.fov=38;
  setVis(true);resize();
  const n=s.keys.length;TOUR.curves=n>1?{p:new THREE.CatmullRomCurve3(s.keys.map(k=>tourV(k.p)),false,'centripetal'),at:new THREE.CatmullRomCurve3(s.keys.map(k=>tourV(k.at)),false,'centripetal')}:null;
  TOUR.t=0;TOUR.leg=-1;tourPlace(tourV(s.keys[0].p),tourV(s.keys[0].at));tourCaption(s.keys[0]);}
// the camera at p looking at `at`: the walk camera's eye and turn, or the orbit's target, distance and angles
function tourPlace(p,at){const d=at.clone().sub(p);
  if(ST.view==='walk'){Object.assign(WLK,{x:p.x,z:p.z,f:p.y-5.25,yaw:Math.atan2(-d.x,-d.z),pitch:Math.atan2(d.y,Math.hypot(d.x,d.z)),vy:0,ground:true});}
  // (the orbit shots are framed for a wide screen: on a portrait one the camera backs off along the same line, up to 1.6x)
  else{const r=d.length(),asp=innerWidth/innerHeight;ORB.t.copy(at);ORB.d=r*(asp<1?Math.min(1.6,1/Math.sqrt(asp)):1);ORB.th=Math.atan2(-d.x,-d.z);ORB.ph=Math.acos(Math.max(-1,Math.min(1,-d.y/r)));}}
function tourCaption(k){const c=(k.cap||'')+'|'+(k.sub||'');if(!k.cap||c===TOUR.cap)return;TOUR.cap=c;
  const card=$('tourCard');$('tourCap').textContent=k.cap;$('tourSub').textContent=k.sub||'';card.classList.remove('fresh');void card.offsetWidth;card.classList.add('fresh');}
function tourDo(a){if(!a)return;if(a.state&&HOUSE.ph!==a.state){setHouseState(a.state);updateUI();}
  if(a.levels){ST.levels=a.levels.slice();ST.level=a.levels.length?Math.max(...a.levels):'all';setVis();}}
// ---------- the camera inside a part, at time t ----------
function tourFly(s,t){const K=s.keys,n=K.length;let i=0,u=0,leg=0;t-=K[0].hold||0;
  if(t>0)for(i=1;i<n;i++){const du=K[i].dur||.001;if(t<du){u=t/du;leg=i;break;}t-=du;if(t<(K[i].hold||0)){u=1;leg=i;break;}t-=K[i].hold||0;}
  if(i>=n){i=n-1;u=1;leg=n-1;}
  if(leg>TOUR.leg){for(let j=TOUR.leg+1;j<=leg;j++){if(j>0)tourDo(K[j].do);}TOUR.leg=leg;}
  // (a key's caption comes up once the flight to it is 60% done, so it names the room the camera is arriving in)
  for(let j=Math.min(leg,n-1);j>=0;j--)if(K[j].cap&&(j<leg||j===0||u>=.6)){tourCaption(K[j]);break;}
  if(!TOUR.curves||leg===0){tourPlace(tourV(K[0].p),tourV(K[0].at));return;}
  const a=i===1||(K[i-1].hold||0)>0,b=i===n-1||(K[i].hold||0)>0;let e=u;
  if(a&&b)e=u*u*(3-2*u);else if(a)e=u*u;else if(b)e=1-(1-u)*(1-u);
  const q=(i-1+e)/(n-1);tourPlace(TOUR.curves.p.getPoint(q),TOUR.curves.at.getPoint(q));}
// ---------- per frame (called from frame() in 12-app.js before the cameras update) ----------
function tourStep(dt){if(!TOUR.on)return;dt*=TOUR.speed;const s=TOUR_SEGS[TOUR.seg],fade=$('tourFade');
  if(TOUR.phase==='out'){TOUR.f=Math.min(1,TOUR.f+dt/TOUR_FADE_OUT);fade.style.opacity=TOUR.f;if(TOUR.f>=1){TOUR.phase='setup';TOUR.wait=3;}}
  else if(TOUR.phase==='setup'){if(TOUR.wait===3){if(TOUR.next<0){tourRestore();return;}TOUR.seg=TOUR.next;TOUR.seen.push(TOUR.seg);tourSetup(TOUR_SEGS[TOUR.seg]);}if(--TOUR.wait<=0)TOUR.phase='in';}
  else if(TOUR.phase==='in'){TOUR.f=Math.max(0,TOUR.f-dt/TOUR_FADE_IN);fade.style.opacity=TOUR.f;if(TOUR.f<=0)TOUR.phase='play';}
  if(TOUR.phase==='in'||TOUR.phase==='play'){if(!TOUR.paused)TOUR.t+=dt;tourFly(s,TOUR.t);
    if(TOUR.phase==='play'&&TOUR.t>=tourSegLen(s))tourGo(TOUR.seg+1<TOUR_SEGS.length?TOUR.seg+1:-1);}
  tourProgress();dirty=true;}
function tourProgress(){let a=0;for(let i=0;i<TOUR.seg;i++)a+=tourSegLen(TOUR_SEGS[i])+TOUR_FADE_OUT+TOUR_FADE_IN;
  a+=Math.min(TOUR.t,tourSegLen(TOUR_SEGS[TOUR.seg]));$('tourBar').style.width=(100*Math.min(1,a/TOUR_TOTAL())).toFixed(1)+'%';}
// fade out and go to part i (-1: end the tour)
function tourGo(i){TOUR.next=i;TOUR.phase='out';}
// ---------- start, stop, controls ----------
function tourStart(){if(TOUR.on)return;if(typeof ARR!=='undefined'&&ARR.on)arrToggle();if(ST.pending){const d=CT&&CT.done;CT=null;if(d)d();}
  TOUR.saved={view:ST.view,orb:snapOrb(),wlk:{...WLK},preset:LOOK.preset,ph:HOUSE.ph,levels:ST.levels.slice(),level:ST.level,q:LOOK.quality};
  // the tour plays in Ultra (Path would wait for a resting camera; the tour keeps moving), except on phones and tablets, which keep theirs
  if(!COARSE&&LOOK.quality!=='ultra')setQuality('ultra');else if(LOOK.quality==='path')setQuality('ultra');
  Object.assign(TOUR,{on:true,paused:false,seg:0,t:0,f:0,cap:'',seen:[]});$('tour').hidden=false;document.documentElement.classList.add('touring');tourPauseUI();tourGo(0);}
function tourStop(){if(TOUR.on&&TOUR.next!==-1)tourGo(-1);}
function tourRestore(){const S=TOUR.saved;
  if(LOOK.preset!==S.preset){applyPreset(S.preset);$('tod').value=S.preset;}
  if(HOUSE.ph!==S.ph){setHouseState(S.ph);if(PHT){PHT.t=PHT.dur;animate(0);}}
  ST.levels=S.levels;ST.level=S.level;Object.assign(WLK,S.wlk);Object.assign(ORB,{th:S.orb.th,ph:S.orb.ph,d:S.orb.d,fov:S.orb.fov});ORB.t.copy(S.orb.t);
  ST.view=S.view==='plan'?'three':S.view;setVis(true);resize();if(S.view==='plan')setView('plan');if(S.q!==LOOK.quality)setQuality(S.q);
  TOUR.on=false;TOUR.phase='';$('tourFade').style.opacity=0;$('tour').hidden=true;document.documentElement.classList.remove('touring');updateUI();dirty=true;}
function tourPauseUI(){const b=$('tourPlay');b.textContent=TOUR.paused?'▶':'❚❚';b.setAttribute('aria-label',TOUR.paused?'Play':'Pause');}
function tourBind(){$('tTour').addEventListener('click',tourStart);$('tourExit').addEventListener('click',tourStop);
  $('tourPlay').addEventListener('click',()=>{TOUR.paused=!TOUR.paused;tourPauseUI();});
  $('tourPrev').addEventListener('click',()=>{if(TOUR.phase==='play'||TOUR.phase==='in')tourGo(TOUR.t>2||TOUR.seg===0?TOUR.seg:TOUR.seg-1);});
  $('tourNext').addEventListener('click',()=>{if(TOUR.phase==='play'||TOUR.phase==='in')tourGo(TOUR.seg+1<TOUR_SEGS.length?TOUR.seg+1:-1);});
  // while touring the keys drive the tour (Space pause, arrows previous / next, Esc stop) and nothing else
  addEventListener('keydown',e=>{if(!TOUR.on)return;const c=e.code;
    if(c==='Escape')tourStop();else if(c==='Space'){TOUR.paused=!TOUR.paused;tourPauseUI();}else if(c==='ArrowLeft')$('tourPrev').click();else if(c==='ArrowRight')$('tourNext').click();
    else if(/^F\d+$/.test(c))return;
    e.preventDefault();e.stopImmediatePropagation();},true);}
