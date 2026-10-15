// 01-registry.js: element registry behind Debug IDs (maps every piece of geometry to the source line that built it)
"use strict";
// ================= ELEMENT REGISTRY (powers debug mode) =================
// Every wall, opening, floor, ceiling, furniture piece and build call gets a stable ID tied to the line in this file that creates it.
try{Error.stackTraceLimit=40;}catch(e){}
const __SRC_TEXT=(document.currentScript&&document.currentScript.textContent)||'';
const __MARK_REPORTED=(()=>{const fr=parseStack(new Error().stack);return fr.length?fr[0].line:0;})();
const __LINE_OFFSET=(()=>{try{const h=document.documentElement.outerHTML,i=h.indexOf('<title>');return i<0?0:(3+(h.slice(0,i).match(/\n/g)||[]).length)-6;}catch(e){return 0;}})();
const __SRC_LINES=__SRC_TEXT.split('\n'),__MARK_IDX=Math.max(0,__SRC_LINES.findIndex(l=>l.indexOf('const __MARK_REPORTED=')>=0));
function parseStack(st){const out=[];for(const l of String(st||'').split('\n')){const s=l.trim();if(!s||/^Error/.test(s))continue;
    const m=s.match(/^(?:at\s+)?(?:(.*?)\s+\(|([^@\s]*)@)?(.*?):(\d+):(\d+)\)?$/);if(!m)continue;
    let fn=(m[1]||m[2]||'').replace(/^async\s+/,'').replace(/^new\s+/,'');fn=fn.split('.').pop();out.push({fn,line:+m[4],col:+m[5],url:m[3]||''});}return out;}
function fileLine(rep){return rep-__LINE_OFFSET;}
const __MARK_LINE=fileLine(__MARK_REPORTED);
const DIST_NAME='house-walkthrough.html',SRC_CACHE={};
// in the multi-file project each script is its own file; fetch their text once so the inspector can show code snippets
addEventListener('DOMContentLoaded',()=>{for(const s of document.querySelectorAll('script[src]')){const u=s.getAttribute('src');if(!/^src\/.*\.js$/.test(u))continue;
  fetch(u).then(r=>r.ok?r.text():'').then(t=>{SRC_CACHE[u]=t.split('\n');}).catch(()=>{});}});
function locOf(f){const u=f.url||'';if(/\.js([?#].*)?$/.test(u)){const path=u.replace(/^[a-z]+:\/\/[^/]+\//i,'').replace(/^\/+/,'').replace(/[?#].*$/,'');return {file:path,line:f.line,col:f.col};}
  return {file:DIST_NAME,line:fileLine(f.line),col:f.col};}
function locKey(l){return l?(l.file||'')+':'+l.line+':'+l.col:String(Math.random());}
function srcLineOf(l){if(!l)return '';if(l.file===DIST_NAME)return __SRC_LINES[l.line-__MARK_LINE+__MARK_IDX]||'';const c=SRC_CACHE[l.file];return c?(c[l.line-1]||''):'';}
function srcFind(text){const i=__SRC_LINES.findIndex(l=>l.indexOf(text)>=0);if(__SRC_TEXT&&i>=0)return {file:DIST_NAME,line:i-__MARK_IDX+__MARK_LINE,col:1};
  for(const f in SRC_CACHE){const j=SRC_CACHE[f].findIndex(l=>l.indexOf(text)>=0);if(j>=0)return {file:f,line:j+1,col:1};}return null;}
const TOP_FNS=new Set(['buildSpec','buildHouse','buildFurniture','buildSiteHard']);
function here(){const fr=parseStack(new Error().stack);for(let i=0;i<fr.length;i++)if(TOP_FNS.has(fr[i].fn))return Object.assign(locOf(fr[i]),{fn:i>0?fr[i-1].fn:''});return null;}
const REG=new Map(),REGC={};let OWNER=null;
const KIND_BY_FN={stairFlight:'stair',railRun:'railing',deck:'deck',art:'wall art',mirror:'mirror',bathMirror:'mirror',pendantCone:'light fixture',chandelier:'light fixture',flushDrum:'light fixture',
  schoolhouse:'light fixture',drape:'curtains',rod:'curtain rod',rug:'rug',tub:'tub',showerTileWalls:'shower',glassPanel:'shower glass',showerHead:'shower',mansard:'roof',dormer:'dormer',hipRoof:'roof',
  polyWall:'wall infill',b:'decor',g:'decor',fd:'foundation',fence:'fence',beam:'beam',box:'built-in part',quadSlab:'slab',addGeo:'part',RF:'roof'};
const OPEN_LABEL={win:'window',frost:'frosted window',door:'door',door2:'double door',gdoor:'glass door',dbl:'front doors',slide:'sliding door',closet:'closet doors',garage:'garage door',open:'cased opening',open0:'opening',bay:'bay window'};
function kindFor(fn,tag){if(tag==='roof')return fn==='dormer'?'dormer':'roof';if(tag&&tag[0]==='C')return 'ceiling light';return KIND_BY_FN[fn]||(tag==='site'?'site':'part');}
function nextId(kind){const p=kind==='wall'?'W':kind==='floor'?'F':kind==='ceiling'?'C':kind==='furniture'?'FU':(kind==='roof'||kind==='dormer')?'R':(kind==='stair'||kind==='railing')?'ST':'X';REGC[p]=(REGC[p]||0)+1;return p+REGC[p];}
function ensureEl(o){let e=REG.get(o.key);if(!e){e={key:o.key,kind:o.kind,fn:o.fn||'',label:o.label||'',loc:o.loc||null,parent:o.parent||null,boxes:[],mats:new Set(),id:o.id||nextId(o.kind)};REG.set(o.key,e);}return e;}
function regPiece(tag,mat,x0,y0,z0,x1,y1,z1){if(tag==='trees'||tag==='grass')return;if(!(x1>=x0&&y1>=y0&&z1>=z0))return;
  let e;if(OWNER)e=ensureEl(OWNER);else{const h=here();if(!h)return;e=ensureEl({key:'@'+locKey(h),kind:kindFor(h.fn,tag),fn:h.fn,loc:h});}
  e.boxes.push([x0,y0,z0,x1,y1,z1,tag]);e.mats.add(mat);}
