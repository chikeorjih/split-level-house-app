// 10-debug.js: Debug IDs mode: labels, tap-to-inspect, copy for Claude
"use strict";
// ================= DEBUG MODE: element IDs =================
const DBG={on:false,sel:null,hl:null,chips:[],sig:''};
const KCLASS=k=>k==='wall'?'k-wall':k==='floor'?'k-floor':k==='ceiling'?'k-ceil':k==='furniture'?'k-furn':k==='opening'?'k-open':'k-other';
function elUnion(e){const u=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(const b of e.boxes){for(let i=0;i<3;i++){u[i]=Math.min(u[i],b[i]);u[i+3]=Math.max(u[i+3],b[i+3]);}}return u;}
function elTags(e){return new Set(e.boxes.map(b=>b[6]));}
function elLevel(e){for(const t of elTags(e)){if(/^[1-4]$/.test(t))return +t;if(t[0]==='C'&&/[1-4]/.test(t[1]))return +t[1];}return null;}
function furnName(e){if(e.label)return e.label;if(!e.loc)return 'furniture';const L=srcLineOf(e.loc),c=e.loc.col-1;const before=L.slice(Math.max(0,c-40),c),after=L.slice(c,c+260);
  let m=before.match(/([a-zA-Z]\w*)\(\s*$/);if(m&&m[1]!=='T')return m[1];m=after.match(/;\s*([a-zA-Z]\w*)\(p[,)]/);if(m)return m[1];return 'furniture';}
function elDesc(e){if(e.kind==='furniture')return e.label||furnName(e).replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();if(e.kind==='opening'||e.kind==='wall'||e.kind==='floor')return e.label;if(e.fn&&e.kind==='part')return e.fn+' part';return e.kind;}
function snippet(e){if(!e.loc)return '';const L=srcLineOf(e.loc),c=Math.max(0,e.loc.col-1),a=Math.max(0,c-30),b=Math.min(L.length,c+170);return (a>0?'…':'')+L.slice(a,b).trim()+(b<L.length?'…':'');}
function copyText(e){const lv=elLevel(e);return `${e.id} (${elDesc(e)}${lv?', '+LEVEL_NAMES[lv].toLowerCase():''}) at ${e.loc?e.loc.file+' line '+e.loc.line+':'+e.loc.col:'(no single line)'}`+(e.loc?` — ${snippet(e).slice(0,120)}`:'');}
function dbgHighlight(e){if(DBG.hl){scene.remove(DBG.hl);DBG.hl.geometry.dispose();DBG.hl=null;}if(!e)return;
  let boxes=e.boxes;if(boxes.length>40){const u=elUnion(e);boxes=[u];}
  const P=[];for(const b of boxes){const [x0,y0,z0,x1,y1,z1]=b,c=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
    for(const [i,j] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])P.push(...c[i],...c[j]);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  DBG.hl=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xff2d6f,depthTest:false,transparent:true}));DBG.hl.renderOrder=60;DBG.hl.frustumCulled=false;scene.add(DBG.hl);dirty=true;}
function dbgSelect(e,extra){DBG.sel=e;dbgHighlight(e&&e.boxes?e:null);const box=$('dbg');if(!e){box.style.display='none';return;}
  const lv=e.boxes?elLevel(e):null,u=e.boxes?elUnion(e):null,f=v=>(Math.round(v*10)/10).toFixed(1);
  $('dbgId').textContent=e.id;$('dbgKind').textContent=elDesc(e)+(e.parent?' in '+e.parent:'');
  $('dbgLevel').textContent=lv?LEVEL_NAMES[lv]:(e.boxes&&elTags(e).has('S')?'Stair core, spans levels':(e.boxes&&elTags(e).has('roof')?'Roof':'Site and outdoors'));
  $('dbgLine').textContent=e.loc?`${e.loc.file}, line ${e.loc.line}, column ${e.loc.col}`:'not tied to a single line';
  $('dbgSrc').textContent=e.loc?snippet(e):(extra||'');
  $('dbgSize').textContent=u?`x ${f(u[0])} to ${f(u[3])}, z ${f(u[2])} to ${f(u[5])}, height ${f(u[1])} to ${f(u[4])} ft`:'';
  $('dbgMats').textContent=e.mats?[...e.mats].join(', '):'';$('dbgCopy').textContent='Copy for Claude';box.style.display='block';}
function dbgPick(cx,cy){const cam=activeCam(),rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(cx/innerWidth*2-1,-(cy/innerHeight)*2+1),cam);
  const objs=[];for(const tag in TAGS){if(tag==='trees'||tag==='grass')continue;for(const o of meshesOf(tag))if(o.visible&&!o.userData.faded)objs.push(o);}
  const hits=rc.intersectObjects(objs,false),clip=CLIP_TOP.constant,hit=hits.find(h=>h.point.y<=clip+.02&&!dollHidden(h));
  if(!hit){dbgSelect(null);return;}
  if(hit.object.userData.model){const r=MODELS.find(q=>q.m.id===hit.object.userData.model),b=r.box;
    dbgSelect({id:r.m.id,kind:'imported model',label:r.m.name||r.m.id,loc:null,boxes:[[b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z,r.tag]],mats:new Set([r.m.file])},'assets/models/manifest.json, model "'+r.m.id+'"'+(r.m.credit?'\n'+r.m.credit:''));return;}
  if(hit.object===TERRAIN){dbgSelect({id:'GROUND',kind:'terrain',label:'ground',loc:srcFind('function terrainH('),mats:new Set(['grass'])});return;}
  const fi=hit.object.userData.inst;if(fi){const e=REG.get(fi.okey);if(e){dbgSelect(e);const b=new THREE.Box3().setFromObject(fi.group);dbgHighlight({boxes:[[b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z]]});return;}}
  const p=hit.point,tag=hit.object.userData.tag;let best=null,bv=1e18;
  for(const e of REG.values())for(const b of e.boxes){if(b[6]!==tag)continue;
    if(p.x>=b[0]-.05&&p.x<=b[3]+.05&&p.y>=b[1]-.05&&p.y<=b[4]+.05&&p.z>=b[2]-.05&&p.z<=b[5]+.05){const v=Math.max(.01,b[3]-b[0])*Math.max(.01,b[4]-b[1])*Math.max(.01,b[5]-b[2]);if(v<bv){bv=v;best=e;}}}
  dbgSelect(best);}
function dbgRoom(){let best=null;for(const r of SPEC.rooms){const e=r.lv?E[r.lv]:0;if(WLK.x>=r.x0&&WLK.x<=r.x1&&WLK.z>=r.z0&&WLK.z<=r.z1&&Math.abs(WLK.f-e)<2.8)best=r;}return best;}
function dbgScope(){const out=[],v=ST.pending||ST.view;
  if(v==='walk'){const r=dbgRoom();const lv=r?r.lv:null,ex=.8;
    for(const e of REG.values()){if(!e.boxes.length||['roof','dormer','site','foundation','fence'].includes(e.kind))continue;const u=elUnion(e);
      if(r){if(u[3]<r.x0-ex||u[0]>r.x1+ex||u[5]<r.z0-ex||u[2]>r.z1+ex)continue;if(u[4]<E[lv]-.6||u[1]>CEIL[lv]+.4)continue;}
      else{const cx=(u[0]+u[3])/2,cz=(u[2]+u[5])/2;if(Math.hypot(cx-WLK.x,cz-WLK.z)>22||Math.abs((u[1]+u[4])/2-WLK.f-3)>9)continue;}
      out.push(e);}}
  else if(ST.cutL){const L=ST.cutL,cut=cutH(L);
    for(const e of REG.values()){if(!e.boxes.length||e.kind==='ceiling'||e.kind==='ceiling light')continue;const tg=elTags(e),u=elUnion(e);
      if(shownLv().some(l=>tg.has(String(l)))||(tg.has('S')&&u[1]<=cut&&u[4]>=E[L]-.5))out.push(e);}}
  return out.slice(0,260);}
function dbgAnchor(e){const u=elUnion(e),cx=(u[0]+u[3])/2,cz=(u[2]+u[5])/2,top=Math.min(u[4],CLIP_TOP.constant-.25);
  if(e.kind==='floor')return [cx,u[4]+.06,cz];if(e.kind==='ceiling')return [cx,u[1]-.08,cz];
  if(e.kind==='wall')return [cx,Math.min(top,u[1]+4.6),cz];if(e.kind==='opening')return [cx,Math.min(top,(u[1]+u[4])/2),cz];return [cx,Math.min(top,u[4]+.15),cz];}
const NOCHIP=new Set(['built-in part','part','slab','railing','wall infill','foundation','curtain rod','beam']);
function dbgRebuild(){const host=$('labels');for(const c of DBG.chips)c.el.remove();DBG.chips=[];if(!DBG.on)return;
  for(const e of dbgScope()){if(NOCHIP.has(e.kind))continue;const b=document.createElement('button');b.className='dbgchip '+KCLASS(e.kind);b.textContent=e.id;b.title=elDesc(e);
    b.addEventListener('click',ev=>{ev.stopPropagation();dbgSelect(e);});host.appendChild(b);DBG.chips.push({el:b,e,a:dbgAnchor(e)});}
  dbgPlace();}
function dbgPlace(){if(!DBG.on||!DBG.chips.length)return;const cam=activeCam(),w=innerWidth,h=innerHeight,v=new THREE.Vector3();
  for(const c of DBG.chips){v.set(c.a[0],c.a[1],c.a[2]).project(cam);const ok=v.z<1&&v.z>-1&&v.x>-1.05&&v.x<1.05&&v.y>-1.05&&v.y<1.05;
    c.el.style.display=ok?'block':'none';if(ok){c.el.style.left=((v.x+1)/2*w)+'px';c.el.style.top=((1-v.y)/2*h)+'px';}}}
function dbgTick(){if(!DBG.on)return;const v=ST.pending||ST.view,r=v==='walk'?dbgRoom():null;
  const sig=v+'|'+ST.cutL+'|'+(r?r.name+r.lv:(v==='walk'?Math.round(WLK.x/6)+','+Math.round(WLK.z/6):''))+'|'+CLIPT.t.toFixed(1);
  if(sig!==DBG.sig){DBG.sig=sig;dbgRebuild();}else dbgPlace();}
function dbgToggle(){DBG.on=!DBG.on;$('tDebug').setAttribute('aria-pressed',String(DBG.on));DBG.sig='';if(!DBG.on){dbgSelect(null);dbgRebuild();}else dbgTick();
  updateUI();dirty=true;}
function dbgCopy(){if(!DBG.sel)return;const t=copyText(DBG.sel),btn=$('dbgCopy');
  const done=()=>{btn.textContent='Copied';setTimeout(()=>btn.textContent='Copy for Claude',1500);};
  const fallback=()=>{const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();if(ok)done();else{$('dbgSrc').textContent=t;btn.textContent='Select the text above to copy';}};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fallback);else fallback();}
