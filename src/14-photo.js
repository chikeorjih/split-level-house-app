// 14-photo.js: "Photo for Gemini": a photographic capture of the walk view, to paste into Gemini (Nano Banana) with the house-photoreal skill
"use strict";
// ================= PHOTO FOR GEMINI =================
// The walk view, re-shot the way an interior photographer would: a 24 mm full-frame lens (3:2), the camera levelled at 4.5 ft with a
// vertical lens shift that keeps the framing the walker had (so verticals stay straight), everything in focus (no depth of field,
// colour fringing or vignette, which an image model can mistake for real detail), rendered off screen at 2048 x 1365 with the full Ultra
// pipeline and its whole accumulation, and the room-light probes built first. The PNG goes to the clipboard (and can be downloaded), and
// "shot notes" describe the room, the light and the furniture in view, for Gemini to read alongside the image.
const PHOTO={busy:false,W:2048,H:1365,lensMM:24,eye:4.5,blob:null,url:null,notes:'',name:'house.png'};
const photoRaf=()=>new Promise(r=>requestAnimationFrame(()=>r()));
const LIGHT_NOTES={morning:'Early morning: cool, crisp sunlight coming in low from the east, soft blue sky light.',
  midday:'Midday: bright, high sun with crisp shadows and neutral daylight.',
  afternoon:'Afternoon: warm sunlight from the southwest, soft natural daylight through the windows.',
  golden:'Golden hour: low, warm orange sun from the west, long soft shadows, glowing highlights.',
  dusk:'Evening: deep blue dusk outside the windows; inside, the warm lamps and ceiling lights are on and are the main light, with a soft cool glow from the windows.'};
// the photographic camera: level, 24 mm on a 36 x 24 mm frame, lens shift up or down to where the walker was looking
function photoCamera(){const W=PHOTO.W,H=PHOTO.H,t=12/PHOTO.lensMM,c=Math.max(-.45,Math.min(.45,Math.tan(WLK.pitch))),k=Math.abs(c)/(2*t);
  const H2=Math.round(H*(1+2*k)),y=c>0?0:H2-H,T=t*H2/H,cam=new THREE.PerspectiveCamera(2*Math.atan(T)*180/Math.PI,W/H2,.25,650);
  cam.position.set(WLK.x,WLK.f+PHOTO.eye,WLK.z);cam.rotation.set(0,WLK.yaw,0,'YXZ');cam.userData.shift={H2,y};cam.updateProjectionMatrix();cam.updateMatrixWorld();
  // a stand-in with the photo's own frustum (no shift bookkeeping), for picking what is in view
  const fc=cam.clone();fc.setViewOffset(W,H2,0,y,W,H);fc.updateProjectionMatrix();fc.updateMatrixWorld();return {cam,fc};}
function photoRoom(){const w=whereText();return w||'the house';}
// the room the walker stands in (its rectangles: a room can be several), or null outside
function photoRoomRects(){let best=null;for(const r of SPEC.rooms){const e=E[r.lv];if(WLK.x>=r.x0&&WLK.x<=r.x1&&WLK.z>=r.z0&&WLK.z<=r.z1&&Math.abs(WLK.f-e)<2.8&&(!best||Math.abs(WLK.f-e)<Math.abs(WLK.f-E[best.lv])))best=r;}
  return best?SPEC.rooms.filter(r=>r.lv===best.lv&&r.name===best.name):null;}
// the named furniture in the frame and in this room (T pieces with a name, imported models), nearest first
function photoFurniture(fc){const rr=photoRoomRects(),inRoom=c=>!rr||rr.some(r=>c.x>=r.x0-.5&&c.x<=r.x1+.5&&c.z>=r.z0-.5&&c.z<=r.z1+.5&&Math.abs(c.y-E[r.lv])<9);const fr=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(fc.projectionMatrix,fc.matrixWorldInverse)),out=[],seen=new Set();
  for(const i of INSTS){if(!i.group||!i.group.visible||i.hiddenByModel)continue;const name=i.isModel?i.model.m.name:((REG.get(i.okey)||{}).label||'');if(!name||seen.has(name))continue;
    const b=new THREE.Box3().setFromObject(i.group);if(b.isEmpty())continue;const c=b.getCenter(new THREE.Vector3()),d=c.distanceTo(fc.position);
    if(d>32||!fr.intersectsBox(b)||!inRoom(c))continue;seen.add(name);out.push([d,name]);}
  return out.sort((a,b)=>a[0]-b[0]).map(x=>x[1]);}
function photoNotes(fc){const P=PRESETS[LOOK.preset],furn=photoFurniture(fc);
  return ['Shot notes for the house-photoreal skill (keep everything in the image exactly where it is; these only name what is there).',
    'Room: '+photoRoom()+'.',
    'Light: '+(LIGHT_NOTES[LOOK.preset]||P.label)+((LOOK.sunTurn||0)?' (sun turned '+LOOK.sunTurn+' degrees from its usual direction)':''),
    'Camera: 24 mm full-frame lens, level at 4.5 ft, vertical lines straight, f/8, everything sharp; 3:2 landscape.',
    furn.length?'Furniture and fixtures in view, nearest first: '+furn.join('; ')+'.':'',
    'Make it a photograph of this exact room; do not add, remove or move anything.'].filter(Boolean).join('\n');}
// the capture itself; resolves to the PNG blob (or null if it could not run)
async function photoCapture(){if(PHOTO.busy||ST.view!=='walk')return null;
  const el=$('todBusy'),txt=$('busyText'),say=t=>{txt.textContent=t;};BUSY_N++;el.hidden=false;
  const q0=LOOK.quality,pr0=renderer.getPixelRatio(),save={ca:ULTRA.ca,vig:ULTRA.vig};let url=null;
  try{if(typeof ARR!=='undefined'&&ARR.sel)arrSelect(null);
    if(q0!=='ultra'){say('Switching to Ultra…');setQuality('ultra');await photoRaf();}
    if(LOOK.quality!=='ultra')throw new Error('Ultra is not available on this device');
    // the room light for this preset and sun (built in the background once the view is still), so the photo has it
    const t0=performance.now();LOOK.lastMove=0;
    for(;;){await photoRaf();const want=!PRESETS[LOOK.preset].lamps&&renderer.capabilities.isWebGL2&&!!PIPE.enc;
      if(!want||GI.atlas[giKey()]||performance.now()-t0>90000)break;
      say(GI.job?'Lighting the rooms, '+Math.round((GI.job.pass+GI.job.i/GI.probes.length)/ULTRA.giPasses*100)+'%':'Lighting the rooms…');}
    // the photo: its own camera, render size and a full Ultra accumulation, with the lens effects off
    const {cam,fc}=photoCamera();PHOTO.notes=photoNotes(fc);
    PHOTO.busy=true;ULTRA.ca=0;ULTRA.vig=0;renderer.setPixelRatio(1);renderer.setSize(PHOTO.W,PHOTO.H,false);setupPipe(PHOTO.W,PHOTO.H);
    LOOK.lastMove=0;LAMP_SIG='';updateLampPool(cam.position);PIPE.n=0;
    while(PIPE.n<PIPE.max){renderHigh(cam);if(PIPE.n<PIPE.max){if(PIPE.n%4===0){say('Rendering the photo, '+Math.round(PIPE.n/PIPE.max*100)+'%');await photoRaf();}}}
    url=renderer.domElement.toDataURL('image/png');}
  catch(e){console.warn('photo',e);say('');alert('The photo could not be made: '+e.message);}
  finally{ULTRA.ca=save.ca;ULTRA.vig=save.vig;renderer.setPixelRatio(pr0);PHOTO.busy=false;setQuality(q0);LAMP_SIG='';dirty=true;txt.textContent='';
    if(--BUSY_N<=0){BUSY_N=0;el.hidden=true;}}
  if(!url)return null;
  const blob=await (await fetch(url)).blob();if(PHOTO.url)URL.revokeObjectURL(PHOTO.url);PHOTO.blob=blob;PHOTO.url=URL.createObjectURL(blob);
  PHOTO.name='house-'+photoRoom().replace(/,.*$/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+LOOK.preset+'.png';return blob;}
// clipboard helpers (they need a click: the first copy is handed the capture's promise at the moment of the click)
function photoCopyImage(p){if(!navigator.clipboard||!window.ClipboardItem)return Promise.reject(new Error('no clipboard'));
  return navigator.clipboard.write([new ClipboardItem({'image/png':p})]);}
function photoPanel(msg){const pn=$('shot');pn.style.display='block';$('shotImg').src=PHOTO.url;$('shotMsg').textContent=msg;}
function bindPhoto(){
  $('tPhoto').addEventListener('click',()=>{if(PHOTO.busy)return;const p=photoCapture();let copied=false;
    const cp=photoCopyImage(p.then(b=>{if(!b)throw new Error('no photo');return b;})).then(()=>{copied=true;},()=>{});
    p.then(async b=>{if(!b)return;await cp;photoPanel(copied?'Copied to the clipboard. Paste it into Gemini, then paste the shot notes.':'Press Copy image, paste it into Gemini, then paste the shot notes.');});});
  $('shotCopy').addEventListener('click',()=>{if(!PHOTO.blob)return;photoCopyImage(PHOTO.blob).then(()=>{$('shotMsg').textContent='Image copied. Paste it into Gemini.';},()=>{$('shotMsg').textContent='The browser blocked the clipboard: use Download instead.';});});
  $('shotNotes').addEventListener('click',()=>{navigator.clipboard.writeText(PHOTO.notes).then(()=>{$('shotMsg').textContent='Shot notes copied. Paste them under the image in Gemini.';},()=>{$('shotMsg').textContent='The browser blocked the clipboard.';});});
  $('shotSave').addEventListener('click',()=>{if(!PHOTO.url)return;const a=document.createElement('a');a.href=PHOTO.url;a.download=PHOTO.name;document.body.appendChild(a);a.click();a.remove();});
  $('shotClose').addEventListener('click',()=>{$('shot').style.display='none';});}
