// 11-arrange.js: Arrange mode: move and rotate furniture, saved in localStorage
"use strict";
// ================= ARRANGE: move and rotate furniture =================
const ARR={on:false,sel:null,drag:null,ring:null},ARR_KEY='house-arrange-v1';
function instLabel(inst){if(inst.isModel)return inst.model.m.name||inst.model.m.id;const e=REG.get(inst.okey);return e?e.id+' '+elDesc(e):'furniture';}
function applyInst(inst,save){const g=inst.group,P0=inst.pivot0;if(!g)return;const c=Math.cos(inst.ry),s=Math.sin(inst.ry);
  g.position.set(P0.x+inst.dx,P0.y,P0.z+inst.dz);g.rotation.y=(inst.rybase||0)+inst.ry;g.updateMatrixWorld(true);if(inst.isModel)inst.model.box.setFromObject(g);
  const tf=(x,z)=>{const lx=x-P0.x,lz=z-P0.z;return [P0.x+inst.dx+lx*c+lz*s,P0.z+inst.dz-lx*s+lz*c];};
  for(const k of inst.cols){const [x0,x1,z0,z1]=k.r,q=[tf(x0,z0),tf(x1,z0),tf(x1,z1),tf(x0,z1)];
    k.c.x0=Math.min(...q.map(p=>p[0]));k.c.x1=Math.max(...q.map(p=>p[0]));k.c.z0=Math.min(...q.map(p=>p[1]));k.c.z1=Math.max(...q.map(p=>p[1]));}
  for(const L of inst.lights){const [x,z]=tf(L.v0.x,L.v0.z);L.light.position.set(x,L.v0.y,z);}
  if(ARR.sel===inst)arrRing();shadowDirty=true;dirty=true;if(save)arrSave();arrPanel();}
function arrRing(){if(ARR.ring&&(!ARR.sel||ARR.ring.userData.inst!==ARR.sel)){scene.remove(ARR.ring);ARR.ring=null;}
  const inst=ARR.sel;if(!inst)return;
  if(!ARR.ring){const bb=inst.grp,r=Math.max(1.3,Math.hypot(bb.max.x-bb.min.x,bb.max.z-bb.min.z)/2+.55),grp=new THREE.Group();grp.userData.inst=inst;
    const mat=new THREE.MeshBasicMaterial({color:0xff2d6f,transparent:true,opacity:.92,depthTest:false});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.07,8,72),mat);ring.rotation.x=Math.PI/2;grp.add(ring);
    const hit=new THREE.Mesh(new THREE.TorusGeometry(r,.5,6,48),new THREE.MeshBasicMaterial({visible:false}));hit.rotation.x=Math.PI/2;hit.userData.ringHit=true;grp.add(hit);
    const knob=new THREE.Mesh(new THREE.SphereGeometry(.3,16,10),mat);knob.position.set(0,0,r);knob.userData.ringHit=true;grp.add(knob);
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(.22,.5,12),mat);arrow.rotation.x=Math.PI/2;arrow.position.set(0,0,r+.55);grp.add(arrow);
    grp.traverse(o=>{o.renderOrder=70;});ARR.ring=grp;scene.add(grp);}
  ARR.ring.position.set(inst.pivot0.x+inst.dx,inst.pivot0.y+.06,inst.pivot0.z+inst.dz);ARR.ring.rotation.y=inst.ry;ARR.ring.updateMatrixWorld(true);dirty=true;}
function arrSelect(inst){ARR.sel=inst||null;arrRing();arrPanel();}
function arrRay(e){const rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1),activeCam());return rc;}
function floorPt(rc,y){const p=new THREE.Vector3();return rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-y),p)?p:null;}
function arrDown(e){const rc=arrRay(e),clip=CLIP_TOP.constant;
  if(ARR.sel&&ARR.ring){const h=rc.intersectObject(ARR.ring,true).find(x=>x.object.userData.ringHit);
    if(h){const inst=ARR.sel,c=floorPt(rc,inst.pivot0.y);if(c){ARR.drag={mode:'rot',a0:Math.atan2(c.x-(inst.pivot0.x+inst.dx),c.z-(inst.pivot0.z+inst.dz)),r0:inst.ry};return true;}}}
  const objs=[];for(const inst of INSTS)if(inst.group&&!inst.hiddenByModel)inst.group.traverse(o=>{if(o.isMesh&&!o.userData.isTwin&&o.visible&&!o.userData.faded)objs.push(o);});
  const h=rc.intersectObjects(objs,false).find(x=>x.point.y<=clip+.02);if(!h)return false;
  const others=[];for(const tag in TAGS){if(tag==='trees'||tag==='grass')continue;for(const m of meshesOf(tag))if(!m.userData.inst&&m.visible&&!m.userData.faded)others.push(m);}
  const o=rc.intersectObjects(others,false).find(x=>x.point.y<=clip+.02);if(o&&o.distance<h.distance-.05)return false;
  const inst=h.object.userData.inst;arrSelect(inst);const c=floorPt(rc,inst.pivot0.y);if(c)ARR.drag={mode:'move',ox:inst.dx-c.x,oz:inst.dz-c.z};return true;}
function arrMove(e){const d=ARR.drag,inst=ARR.sel;if(!d||!inst)return;const c=floorPt(arrRay(e),inst.pivot0.y);if(!c)return;
  if(d.mode==='move'){const q=e.shiftKey?.5:1/12;inst.dx=Math.round((c.x+d.ox)/q)*q;inst.dz=Math.round((c.z+d.oz)/q)*q;}
  else{const a=Math.atan2(c.x-(inst.pivot0.x+inst.dx),c.z-(inst.pivot0.z+inst.dz)),q=(e.shiftKey?15:1)*Math.PI/180;inst.ry=Math.round((d.r0+a-d.a0)/q)*q;}
  applyInst(inst,false);}
function arrUp(){if(ARR.drag){ARR.drag=null;arrSave();}}
function arrTurn(deg){const inst=ARR.sel;if(!inst)return;inst.ry=Math.round((inst.ry+deg*Math.PI/180)/(Math.PI/180))*(Math.PI/180);applyInst(inst,true);}
function arrReset(inst){if(!inst)return;inst.dx=inst.dz=inst.ry=0;applyInst(inst,true);}
function arrSave(){try{const o={};for(const i of INSTS)if(i.dx||i.dz||i.ry)o[i.key]={dx:+i.dx.toFixed(3),dz:+i.dz.toFixed(3),ry:+i.ry.toFixed(4)};localStorage.setItem(ARR_KEY,JSON.stringify(o));}catch(e){}}
function arrLoad(){let o=null;try{o=JSON.parse(localStorage.getItem(ARR_KEY)||'null');}catch(e){}if(!o)return;
  for(const i of INSTS){const v=o[i.key];if(v&&i.group){i.dx=v.dx||0;i.dz=v.dz||0;i.ry=v.ry||0;applyInst(i,false);}}}
function moveText(i){if(i.isModel){const M=i.model.m,f=v=>Math.round(v*100)/100,deg=Math.round((((i.rybase+i.ry)*180/Math.PI)%360+360)%360);
    return `Imported model "${M.id}" (${M.name||M.file}) in assets/models/manifest.json: set its place to x ${f(i.pivot0.x+i.dx)}, z ${f(i.pivot0.z+i.dz)}, lv ${i.model.lv}, ry ${deg} (degrees, counterclockwise in plan)${M.variants&&i.variant!==M.variants[0].name?`, and its "variant" to "${i.variant}"`:''}, then run npm run model:check -- ${M.id}.`;}
  const e=REG.get(i.okey),f=v=>(Math.round(v*100)/100).toString(),deg=Math.round(((i.ry*180/Math.PI)%360+540)%360-180);
  const parts=[];if(Math.abs(i.dx)>.004)parts.push(`${f(i.dx)} ft along x (+ is east)`);if(Math.abs(i.dz)>.004)parts.push(`${f(i.dz)} ft along z (+ is toward the street)`);
  const mv=parts.length?'move '+parts.join(' and '):'',rt=deg?`rotate ${deg}° counterclockwise in plan around its centre (${f(i.pivot0.x)}, ${f(i.pivot0.z)})`:'';
  return `${e?e.id:'?'} ${e?elDesc(e):'furniture'}${i.n>1||(INST_N[i.okey]||1)>1?' (copy '+i.n+' from that line)':''} at ${e&&e.loc?e.loc.file+' line '+e.loc.line+':'+e.loc.col:'(unknown line)'}: ${[mv,rt].filter(Boolean).join(', then ')||'no change'}.`;}
function arrCopy(all){const list=all?INSTS.filter(i=>i.dx||i.dz||i.ry):(ARR.sel?[ARR.sel]:[]);const btn=all?$('arrCopyAll'):$('arrCopy');
  const t=list.length?(list.length>1?'Bake these furniture moves into the code:\n':'Bake this furniture move into the code: ')+list.map(moveText).join('\n'):'No furniture has been moved yet.';
  const label=btn.textContent,done=()=>{btn.textContent='Copied';setTimeout(()=>btn.textContent=label,1500);};
  const fb=()=>{const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();if(ok)done();else{$('arrInfo').textContent=t;}};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();}
function arrPanel(){const p=$('arr');p.style.display=ARR.on?'block':'none';if(!ARR.on)return;const i=ARR.sel;
  $('arrName').textContent=i?instLabel(i):'Nothing selected';$('arrSel').style.display=i?'flex':'none';
  const moved=INSTS.filter(x=>x.dx||x.dz||x.ry).length;$('arrCount').textContent=moved?moved+' moved':'';
  $('arrInfo').textContent=i?`Moved ${(Math.round(i.dx*12)/12).toFixed(2)} ft east, ${(Math.round(i.dz*12)/12).toFixed(2)} ft toward the street, turned ${Math.round(((i.ry*180/Math.PI)%360+540)%360-180)}°`:'Tap a piece of furniture to select it.';
  // a model with configurations (manifest "variants", e.g. the sectional's 4 and 5 pieces): one chip each, the current one lit
  const vr=$('arrVar'),V=i&&i.isModel&&i.model.m.variants;vr.hidden=!V;if(V&&vr.dataset.for!==i.key+'|'+i.variant){vr.dataset.for=i.key+'|'+i.variant;vr.textContent='';
    const lab=document.createElement('span');lab.className='arr-var-lab';lab.textContent='Configuration';vr.appendChild(lab);
    for(const v of V){const b=document.createElement('button');b.className='chip'+(v.name===i.variant?' on':'');b.textContent=v.label||v.name;b.title=v.note||'';b.setAttribute('aria-pressed',String(v.name===i.variant));
      b.addEventListener('click',()=>modelVariant(i,v.name,true));vr.appendChild(b);}}}
function arrToggle(){ARR.on=!ARR.on;$('tArrange').setAttribute('aria-pressed',String(ARR.on));if(!ARR.on){ARR.drag=null;arrSelect(null);}arrPanel();updateUI();dirty=true;}
// ---------- Save to code: write every moved piece's new position into the source (through the dev server), then reload ----------
// A T(...) piece's call gets its new origin and turn: the move turns the call's origin about the piece's footprint centre and shifts it.
// Imported models get a new place in the manifest. Pieces positioned by a loop variable, or built several times by one line, are skipped.
function bakeItem(i){const c=Math.cos(i.ry),s=Math.sin(i.ry);
  if(i.isModel){const deg=((i.rybase+i.ry)*180/Math.PI%360+360)%360;return {kind:'model',key:i.key,id:i.model.m.id,x:i.pivot0.x+i.dx,z:i.pivot0.z+i.dz,lv:i.model.lv,ry:deg};}
  const e=REG.get(i.okey);if(!e||!e.loc||!/^src\//.test(e.loc.file))return {key:i.key,error:'not tied to a line of code'};
  if((INST_N[i.okey]||1)>1)return {key:i.key,error:'built '+INST_N[i.okey]+' times by one line'};
  const lx=i.ox-i.pivot0.x,lz=i.oz-i.pivot0.z;
  return {kind:'T',key:i.key,file:e.loc.file,line:e.loc.line,col:e.loc.col,x:i.pivot0.x+i.dx+lx*c+lz*s,z:i.pivot0.z+i.dz-lx*s+lz*c,ry:i.ry0+i.ry};}
async function arrBake(){const moved=INSTS.filter(x=>x.dx||x.dz||x.ry),info=$('arrInfo');
  if(!moved.length){info.textContent='Nothing has been moved yet.';return;}
  if(!await editOk()){info.textContent='Saving to code needs the dev server (npm run dev). Use Copy all moves and send it to Claude instead.';return;}
  const items=moved.map(bakeItem),skip=items.filter(x=>x.error),send=items.filter(x=>!x.error);
  let r;try{r=await editPost('/__edit/arrange',{items:send});}catch(err){info.textContent='Save failed: '+err.message;return;}
  const failed=[...skip,...(r.failed||[])],names=k=>{const i=INSTS.find(x=>x.key===k);return i?instLabel(i):k;};
  // the saved pieces are now where the code puts them, so drop their browser-saved moves
  try{const o=JSON.parse(localStorage.getItem(ARR_KEY)||'{}');for(const k of r.done||[])delete o[k];localStorage.setItem(ARR_KEY,JSON.stringify(o));}catch(e){}
  if(!(r.done||[]).length){info.textContent='Nothing could be saved: '+failed.map(f=>names(f.key)+' ('+f.error+')').join('; ');return;}
  const msg='Saved '+r.done.length+' move'+(r.done.length>1?'s':'')+' into '+r.files.join(' and ')+'.'+(failed.length?' Not saved: '+failed.map(f=>names(f.key)+' ('+f.error+')').join('; ')+'.':'');
  try{sessionStorage.setItem('dbgDeleted',JSON.stringify({msg,view:Object.assign(dbgSaveView(),{arr:true})}));}catch(e){}
  info.textContent='Saved. Reloading…';setTimeout(()=>location.reload(),900);}
