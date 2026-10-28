// 02-spec.js: house layout data: levels, walls, openings, floors, ceilings, rooms, stairs (feet)
"use strict";
// ================= LAYOUT SPEC (feet; x = east, z = toward street, y = up) =================
// Levels: 1 = lower/basement, 2 = family-room level, 3 = main, 4 = bedrooms. Split-level offsets of ~4.5 ft.
const E = {1:-13.5, 2:-4.5, 3:0, 4:4.5};
const CEIL = {1:-5.5, 2:3.5, 3:8, 4:12.5};
const LEVEL_NAMES = {1:'Lower level', 2:'Family room level', 3:'Main level', 4:'Bedroom level'};
// ---------- the house's two states ----------
// 'a' (Addition): the plans: the four-seasons room and primary suite, the new deck off the dining room with its stair down to the lower
// deck, and the lower level opened up. 'c' (Current): the house as it stands: the balcony off the family room over the brick patio, the
// family room's west windows, a plain dining-room wall, and the lower level's closets. Whatever is built while PH is set belongs to that
// state only: its tag gets a suffix ('2+' addition only, '2-' current only), so it is a mesh of its own that the state shows or hides
// (setHouseState in 12-app.js), and the collision boxes, walkable tops, plan pieces, doors and lamps recorded meanwhile carry .ph.
// The addition has two floor plans (HOUSE.plan, setHousePlan): '1' the primary suite in the addition (bedroom, bath and walk-in closet);
// '2' an office and the primary bedroom in the addition, with the family-room level's existing bedroom made the primary bath. So .ph is
// 'c' (current), 'a' (the addition, either plan), '1' or '2' (that plan only) or 'c1' (current and plan 1: the existing bedroom); the
// plan-only states' tags end in '@1', '@2', '@c1'.
const HOUSE={ph:(()=>{const q=new URLSearchParams(location.search).get('state');let v=null;try{v=localStorage.getItem('houseState');}catch(e){}
  v=q||v;return v==='current'||v==='c'?'c':'a';})(),
  plan:(()=>{const q=new URLSearchParams(location.search).get('plan');let v=null;try{v=localStorage.getItem('housePlan');}catch(e){}
  v=q||v;return v==='2'||v==='office'?'2':'1';})()};
let PH=null;
const phase=(p,fn)=>{const q=PH;PH=p;try{return fn();}finally{PH=q;}};
const phTag=t=>PH?t+(PH==='a'?'+':PH==='c'?'-':'@'+PH):t,tagPh=t=>{const s=String(t),m=/@(\w+)$/.exec(s);if(m)return m[1];const c=s.slice(-1);return c==='+'?'a':c==='-'?'c':null;},
  tagBase=t=>{const s=String(t),m=/@\w+$/.exec(s);return m?s.slice(0,m.index):tagPh(s)?s.slice(0,-1):s;};
// the state shown (phKey): 'c', or the addition's plan '1' / '2'; phIn: is a thing of state p shown in k ('a': in either addition plan)
const phKey=()=>HOUSE.ph==='c'?'c':HOUSE.plan;
const phIn=(p,k)=>!p||(k==='c'?p.includes('c'):k==='a'?p!=='c':p==='a'||p.includes(k));
const phOn=p=>phIn(p,phKey());
// lists whose entries are stamped with the state being built when they are added
const phStamp=a=>{a.push=function(...x){for(const o of x)if(o&&typeof o==='object'&&o.ph===undefined)o.ph=PH;return Array.prototype.push.apply(this,x);};return a;};
function buildSpec(){
  const TI=0.4, TE=0.6;
  const walls=[], floors=[], ceils=[], rooms=[], stairs=[];
  const W=o=>{o.t=o.t||TI; o.ops=o.ops||[]; o.loc=here(); if(o.ph===undefined)o.ph=PH||(o.isNew?'a':null); walls.push(o); return o;};
  const win=(c,w,e,sill,head,n)=>({k:'win',c,w,y0:e+sill,y1:e+head,n:n||Math.max(1,Math.round(w/2))});
  const door=(c,w,e,sw,h)=>({k:'door',c,w:w||2.6,y0:e,y1:e+(h||6.8),sw:sw||[-1,1]});
  const op=(k,c,w,e,h,extra)=>Object.assign({k,c,w,y0:e,y1:e+h},extra||{});
  const E1=E[1],E2=E[2],E3=E[3],E4=E[4];
  const F=(lv,x0,x1,z0,z1,mat,y)=>floors.push({lv,x0,x1,z0,z1,mat,y:(y===undefined?E[lv]:y),loc:here(),ph:PH});
  const C=(lv,x0,x1,z0,z1,y)=>ceils.push({lv,x0,x1,z0,z1,y:(y===undefined?CEIL[lv]:y),loc:here(),ph:PH});
  const R=(lv,name,dim,x0,x1,z0,z1,isNew)=>rooms.push({lv,name,dim,x0,x1,z0,z1,isNew:!!isNew,ph:PH||(isNew?'a':null)});

  // ---------- WING exterior (family room / bedrooms side) ----------
  W({lv:1,x0:0,z0:0,x1:14.2,z1:0,t:TE,y0:-14.5,y1:-5.5,ext:{side:-1,mat:'brick'},bb:[[E1,1]]});
  // (the upper-floor primary bedroom is a nursery: all four walls painted olive, MAT.sage)
  // the wing's back (back photo): white lap siding from the top of the lower level's brick up to the roof, over two storeys, with the
  // family room's 5-pane window and a small 3-pane bedroom window near the top (no mansard or dormer on this side)
  W({lv:2,x0:0,z0:0,x1:14.2,z1:0,t:TE,y0:-5.5,y1:3.5,ops:[win(7.85,8.1,E2,1.2,7.3,5)],ext:{side:-1,mat:'sidingWhite'},bb:[[E2,1]],paint:[{side:1,a0:0.3,a1:14.2,y0:E2,y1:CEIL[2],mat:'wallCream'}]});
  W({lv:4,x0:0,z0:0,x1:14.2,z1:0,t:TE,y0:3.5,y1:12.65,ops:[win(6.9,5.0,E4,4.0,7.2,3)],ext:{side:-1,mat:'sidingWhite'},bb:[[E4,1]]});
  W({lv:1,x0:0,z0:0,x1:0,z1:31.6,t:TE,y0:-14.5,y1:-5.5,ops:[op('gdoor',4.5,2.7,E1,6.8,{sw:[1,1]}),win(20.95,4.4,E1,3,6.8,2),win(28.25,4.2,E1,3,6.8,2)],ext:{side:-1,mat:'brick'},bb:[[E1,1]]});
  // L2 west wall: now an interior wall shared with the addition. Existing door stays (1); window beside fireplace becomes a door (2); bedroom window covered (3).
  // As it stands (cur): an outside brick wall; the door (1) opens onto the balcony, with the window (2) and the bedroom window (3) in it.
  W({lv:2,x0:0,z0:0,x1:0,z1:31.6,t:0.6,y0:-5.5,y1:3.5,ops:[op('gdoor',4.4,2.7,E2,6.9,{sw:[-1,-1]}),op('door',15.8,2.9,E2,6.9,{sw:[1,-1],isNew:true})],bb:[[E2,1],[E2,-1]],paint:[{side:1,a0:0.3,a1:19.6,y0:E2,y1:CEIL[2],mat:'wallCream'}],
    p2:{ops:[op('gdoor',4.4,2.7,E2,6.9,{sw:[-1,-1]}),op('door',15.8,2.9,E2,6.9,{sw:[1,-1],isNew:true}),op('door',21.6,2.8,E2,6.9,{sw:[-1,1],isNew:true})]},   // (plan 2: door 3, from the bedroom's entry into the primary bath, opening against the family-room wall)
    cur:{ops:[op('gdoor',4.4,2.7,E2,6.9,{sw:[-1,-1]}),win(15.8,2.8,E2,1.2,7.3,2),win(22.4,2.8,E2,2.6,7.0,2)],ext:{side:-1,mat:'brick'},bb:[[E2,1]]}});
  W({lv:4,x0:0,z0:0,x1:0,z1:31.6,t:TE,y0:3.5,y1:12.5,ops:[op('open0',18.75,3.1,E4+2.9,3.85,{noReveal:true})],ext:{side:-1,mat:'brick',y1:8.35},bb:[[E4,1]],paint:[{side:1,a0:16.4,a1:31.3,y0:E4,y1:CEIL[4],mat:'sage'}]});   // brick up to the mansard (as on the front)
  W({lv:1,x0:0,z0:31.6,x1:18.5,z1:31.6,t:TE,y0:-14.5,y1:-5.5,ext:{side:1,mat:'stone'},bb:[[E1,-1]]});
  // front of the wing (front photo): a 3-light window with black shutters (06-house.js) under the dormer; brick up to the mansard (8.35 ft, level with the main roof's eave)
  W({lv:2,x0:0,z0:31.6,x1:18.5,z1:31.6,t:TE,y0:-5.5,y1:3.5,ops:[win(8.0,4.6,E2,2.6,7.2,3)],ext:{side:1,mat:'brick'},bb:[[E2,-1]]});
  W({lv:4,x0:0,z0:31.6,x1:18.5,z1:31.6,t:TE,y0:3.5,y1:12.5,ops:[op('open0',8.0,5.3,E4+2.9,3.85,{noReveal:true})],ext:{side:1,mat:'brick',y1:8.35},bb:[[E4,-1]],paint:[{side:-1,a0:0.3,a1:12.2,y0:E4,y1:CEIL[4],mat:'sage'}]});
  // wing east wall beside the living room, shared by levels 2/3/4
  W({lv:'S',x0:14.2,z0:0,x1:14.2,z1:12.2,t:0.5,y0:-5.5,y1:12.5,bb:[[E2,-1],[E3,1],[E4,-1]],paint:[{side:-1,a0:0.3,a1:12.2,y0:E2,y1:CEIL[2],mat:'wallCream'}]});
  W({lv:4,x0:14.2,z0:12.2,x1:14.2,z1:15.7,t:TI,y0:3.5,y1:12.5,bb:[[E4,-1]]});
  // stair core
  W({lv:'S',x0:14.2,z0:12.2,x1:19.2,z1:12.2,t:TI,y0:-5.5,y1:8,bb:[[E3,-1]]});
  W({lv:'S',x0:14.2,z0:15.7,x1:19.2,z1:15.7,t:0.3,y0:-13.5,y1:0});
  W({lv:'S',x0:19.2,z0:15.7,x1:25.0,z1:15.7,t:0.3,y0:-13.5,y1:-1});
  W({lv:'S',x0:14.2,z0:15.7,x1:19.2,z1:15.7,t:0.3,y0:8,y1:12.5});
  W({lv:'S',x0:14.2,z0:19.6,x1:19.2,z1:19.6,t:TI,y0:-13.5,y1:12.5,bb:[[E2,1],[E4,1]]});
  W({lv:'S',x0:19.2,z0:15.7,x1:19.2,z1:19.6,t:TI,y0:8,y1:12.5});
  W({lv:'S',x0:18.5,z0:19.6,x1:18.5,z1:31.6,t:0.5,y0:-14.5,y1:12.5,bb:[[E1,-1],[E1,1],[E2,-1],[E4,-1]]});

  // ---------- WING interior ----------
  W({lv:1,x0:14.7,z0:0,x1:14.7,z1:12.2,y0:-13.5,y1:-5.5,bb:[[E1,-1],[E1,1]],paint:[{side:1,a0:0.3,a1:12.2,y0:E1,y1:CEIL[1],mat:'slatePaint'}]});
  W({lv:1,x0:0.3,z0:9,x1:7.5,z1:9,y0:-13.5,y1:-5.5,ops:[door(5.1,2.4,E1,[1,-1])],bb:[[E1,-1],[E1,1]]});
  W({lv:1,x0:7.5,z0:9,x1:7.5,z1:14.6,y0:-13.5,y1:-5.5,bb:[[E1,-1],[E1,1]]});
  W({lv:1,x0:0.3,z0:14.6,x1:7.5,z1:14.6,y0:-13.5,y1:-5.5,bb:[[E1,-1],[E1,1]]});
  W({lv:1,x0:14.2,z0:15.7,x1:14.2,z1:19.6,y0:-13.5,y1:-5.5,ops:[door(17.65,2.4,E1,[-1,-1])],bb:[[E1,-1]]});
  W({lv:1,x0:18.6,z0:15.7,x1:18.6,z1:19.6,y0:-13.5,y1:-8.7});
  W({lv:2,x0:0.3,z0:19.6,x1:11.2,z1:19.6,y0:-4.5,y1:3.5,bb:[[E2,-1],[E2,1]],paint:[{side:-1,a0:0.3,a1:11.2,y0:E2,y1:CEIL[2],mat:'wallCream'}]});
  W({lv:2,x0:11.2,z0:19.6,x1:11.2,z1:31.6,y0:-4.5,y1:3.5,ops:[door(21.3,2.6,E2,[-1,-1]),op('closet',27.4,7.4,E2,6.9)],bb:[[E2,-1],[E2,1]],p2:{ops:[],z1:23.1}});   // (plan 2: only the hall's side, closed, behind the shower; the closet is part of the bath)
  W({lv:2,x0:13.6,z0:23.1,x1:13.6,z1:31.6,y0:-4.5,y1:3.5,bb:[[E2,1]],p2:{bb:[[E2,-1],[E2,1]]}});
  W({lv:2,x0:11.2,z0:23.1,x1:18.5,z1:23.1,y0:-4.5,y1:3.5,ops:[door(15.4,2.4,E2,[-1,1])],bb:[[E2,-1],[E2,1]]});
  W({lv:2,x0:16.4,z0:19.6,x1:16.4,z1:23.1,y0:-4.5,y1:3.5,ops:[door(21.35,2.0,E2,[-1,1])],bb:[[E2,-1]]});
  W({lv:4,x0:12.2,z0:0.3,x1:12.2,z1:13.1,y0:4.5,y1:12.5,ops:[op('closet',3.1,5.0,E4,6.9),op('closet',8.4,4.2,E4,6.9)],bb:[[E4,-1]]});
  W({lv:4,x0:12.2,z0:6.0,x1:14.2,z1:6.0,y0:4.5,y1:12.5});
  W({lv:4,x0:12.2,z0:10.8,x1:14.2,z1:10.8,y0:4.5,y1:12.5});
  W({lv:4,x0:0.3,z0:13.1,x1:14.2,z1:13.1,y0:4.5,y1:12.5,ops:[door(10.5,2.6,E4,[-1,-1]),door(13.2,1.6,E4,[1,1])],bb:[[E4,-1],[E4,1]]});
  W({lv:4,x0:8.8,z0:13.1,x1:8.8,z1:16.4,y0:4.5,y1:12.5,bb:[[E4,1]]});
  W({lv:4,x0:4.4,z0:13.1,x1:4.4,z1:16.4,y0:4.5,y1:12.5});
  W({lv:4,x0:0.3,z0:16.4,x1:12.2,z1:16.4,y0:4.5,y1:12.5,ops:[op('closet',2.2,3.6,E4,6.9),op('closet',6.6,3.6,E4,6.9)],bb:[[E4,1],[E4,-1]],paint:[{side:1,a0:0.3,a1:12.2,y0:E4,y1:CEIL[4],mat:'sage'}]});
  W({lv:4,x0:12.2,z0:16.4,x1:12.2,z1:31.6,y0:4.5,y1:12.5,ops:[door(18.0,2.4,E4,[-1,-1]),door(30.2,2.2,E4,[1,1])],bb:[[E4,-1],[E4,1]],paint:[{side:-1,a0:16.4,a1:31.3,y0:E4,y1:CEIL[4],mat:'sage'}]});
  W({lv:4,x0:12.2,z0:19.6,x1:14.2,z1:19.6,y0:4.5,y1:12.5,ops:[door(13.2,1.8,E4,[-1,1])]});
  W({lv:4,x0:17.3,z0:19.6,x1:17.3,z1:26.8,y0:4.5,y1:12.5,bb:[[E4,-1]]});
  W({lv:4,x0:12.2,z0:26.8,x1:18.5,z1:26.8,y0:4.5,y1:12.5,bb:[[E4,-1],[E4,1]]});

  // ---------- MAIN BLOCK exterior ----------
  W({lv:1,x0:14.2,z0:0,x1:44.6,z1:0,t:TE,y0:-14.5,y1:-2.5,ops:[op('slide',21.7,7.8,E1,6.9),win(39.4,6.0,E1,3,6.8,3)],ext:{side:-1,mat:'brick'},bb:[[E1,1]],paint:[{side:1,a0:14.7,a1:35.6,y0:E1,y1:CEIL[1],mat:'slatePaint'}]});
  W({lv:1,x0:44.6,z0:0,x1:44.6,z1:9.2,t:TE,y0:-14.5,y1:-1,ext:{side:1,mat:'brick'},bb:[[E1,-1]]});
  W({lv:1,x0:35.9,z0:9.2,x1:44.6,z1:9.2,t:TE,y0:-14.5,y1:-1,ext:{side:1,mat:'brick'},bb:[[E1,-1]]});
  W({lv:1,x0:35.9,z0:9.2,x1:35.9,z1:31.6,t:TE,y0:-14.5,y1:-1,ext:{side:1,mat:'brick'},bb:[[E1,-1]]});
  W({lv:1,x0:18.5,z0:31.6,x1:35.9,z1:31.6,t:TE,y0:-14.5,y1:-1,ext:{side:1,mat:'stone'},bb:[[E1,-1]]});
  // back of the main level: white lap siding down to about 1.5 ft below the main floor, over the lower level's brick (back photo)
  W({lv:3,x0:14.2,z0:0,x1:43.8,z1:0,t:TE,y0:-2.5,y1:8.3,ops:[win(22.05,9.6,E3,1.4,7.3,5),win(37,5.8,E3,1.4,7.3,3)],ext:{side:-1,mat:'sidingWhite'},bb:[[E3,1]],paint:[{side:1,a0:32.0,a1:43.5,y0:0,y1:8}]});
  W({lv:3,x0:43.8,z0:0,x1:43.8,z1:10.6,t:TE,y0:-1,y1:8.3,ops:[op('slide',5.3,6.0,E3,6.9,{isNew:true})],ext:{side:1,mat:'sidingWhite'},bb:[[E3,-1]],paint:[{side:-1,a0:0.3,a1:10.3,y0:0,y1:8}],
    cur:{ops:[]}});   // (as it stands: a plain wall, no door to the deck)
  W({lv:3,x0:35.6,z0:10.6,x1:43.8,z1:10.6,t:0.5,y0:-1,y1:8.6,bb:[[E3,-1],[E3,1]],paint:[{side:-1,a0:35.6,a1:43.5,y0:0,y1:8}]});
  // kitchen / dining wall, set back in line with the bar peninsula, with a cased opening between them; meets the living/dining wall (next block) in a clean corner
  W({lv:3,x0:32.0,z0:12.6,x1:35.6,z1:12.6,t:0.4,y0:-1,y1:8.6,ops:[op('open',33.65,2.7,E3,7.0)],bb:[[E3,-1],[E3,1]],paint:[{side:-1,a0:32.0,a1:35.4,y0:0,y1:8}]});
  W({lv:3,x0:43.8,z0:10.6,x1:54.1,z1:10.6,t:TE,y0:-1,y1:8.6,ops:[win(46.9,4.2,E3,4,7,2)],ext:{side:-1,mat:'brick'}});
  // (walls under the front and back eaves stop at 8.3 ft, just under the roof surface at their outer face, so no brick shows through the roof)
  // garage front flush with the kitchen's front wall (front photo), so the garage is about 2.8 ft deeper than the listing plan's 17'10"
  W({lv:3,x0:54.1,z0:10.6,x1:54.1,z1:31.6,t:TE,y0:-1,y1:8.6,ext:{side:1,mat:'brick'}});
  W({lv:3,x0:35.6,z0:31.6,x1:54.1,z1:31.6,t:TE,y0:-1,y1:8.3,ops:[op('garage',40.5,8.4,E3-0.5,7.3),op('garage',49.5,8.0,E3-0.5,7.3)],ext:{side:1,mat:'brick'}});
  W({lv:3,x0:35.6,z0:10.6,x1:35.6,z1:31.6,t:0.5,y0:-1,y1:8.3,ops:[op('door',16.65,2.7,E3,6.8,{sw:[-1,-1],dark:true,closed:true})],bb:[[E3,-1]]});
  W({lv:3,x0:18.5,z0:31.6,x1:35.6,z1:31.6,t:TE,y0:-1,y1:8.3,ops:[op('dbl',21.2,4.4,E3,7.0),win(29.9,4.8,E3,3.45,7.1,3)],ext:{side:1,mat:'brick'},bb:[[E3,-1]]});
  // garage foundation (exposed where the lot drops away at the rear)
  W({lv:'X',x0:35.6,z0:10.6,x1:54.1,z1:10.6,t:TE,y0:-17,y1:-1,ext:{side:-1,mat:'brick'}});
  W({lv:'X',x0:54.1,z0:10.6,x1:54.1,z1:31.6,t:TE,y0:-17,y1:-1,ext:{side:1,mat:'brick'}});

  // ---------- MAIN interior ----------
  // the two closets at the foot of the stairs are gone, and so is the double door to the hall (owner's change): the sitting room, the foot
  // of the stairs and the closets' old space are one open area. This wall stops where the double door began, still screening the space
  // under the stairs; the closets' back wall stays as the wall to the laundry
  W({lv:1,x0:14.7,z0:12.2,x1:22.15,z1:12.2,y0:-13.5,y1:-5.5,bb:[[E1,-1],[E1,1]],ph:'a',paint:[{side:-1,a0:14.7,a1:22.15,y0:E1,y1:CEIL[1],mat:'slatePaint'}]});
  // as it stands: the hall wall runs on, with the double door into the sitting room and the walk-in closet's door, and the closet's walls
  W({lv:1,x0:14.7,z0:12.2,x1:35.9,z1:12.2,y0:-13.5,y1:-5.5,ops:[op('door2',23.95,3.6,E1,6.8,{sw:[0,-1]}),door(33.6,2.4,E1,[1,1])],bb:[[E1,-1],[E1,1]],ph:'c',paint:[{side:-1,a0:14.7,a1:35.6,y0:E1,y1:CEIL[1],mat:'slatePaint'}]});
  W({lv:1,x0:28,z0:12.2,x1:28,z1:17.1,y0:-13.5,y1:-5.5,ops:[door(14.6,2.2,E1,[-1,1])],bb:[[E1,-1]],ph:'c'});
  W({lv:1,x0:31.1,z0:12.2,x1:31.1,z1:17.1,y0:-13.5,y1:-5.5,ph:'c'});
  W({lv:1,x0:28,z0:17.1,x1:35.9,z1:17.1,y0:-13.5,y1:-5.5,bb:[[E1,1],[E1,-1]]});
  W({lv:1,x0:19.2,z0:19.6,x1:25,z1:19.6,y0:-13.5,y1:-1,bb:[[E1,1]]});
  W({lv:1,x0:25,z0:19.6,x1:28,z1:19.6,y0:-13.5,y1:-5.5,ops:[door(26.55,2.6,E1,[1,1])],bb:[[E1,1]]});
  W({lv:1,x0:28,z0:17.1,x1:28,z1:19.6,y0:-13.5,y1:-5.5});
  W({lv:1,x0:35.9,z0:0,x1:35.9,z1:9.2,y0:-13.5,y1:-5.5,ops:[op('open',5.1,6.0,E1,6.9)],paint:[{side:-1,a0:0.3,a1:9.2,y0:E1,y1:CEIL[1],mat:'slatePaint'}]});
  W({lv:3,x0:31.8,z0:0.3,x1:31.8,z1:12.8,y0:0,y1:8,ops:[op('open',5.3,8.0,E3,7.0)],bb:[[E3,-1],[E3,1]],paint:[{side:1,a0:0.3,a1:12.4,y0:0,y1:8}]});
  W({lv:3,x0:23.6,z0:19.6,x1:23.6,z1:31.6,y0:0,y1:8,bb:[[E3,-1]]});
  W({lv:3,x0:20.0,z0:19.6,x1:20.0,z1:26.2,t:0.3,y0:0,y1:8,ops:[op('closet',22.9,5.8,E3,6.9)],bb:[[E3,1]]});
  W({lv:3,x0:18.5,z0:26.2,x1:20.0,z1:26.2,t:0.3,y0:0,y1:8,bb:[[E3,1]]});
  W({lv:3,x0:19.2,z0:19.6,x1:20.15,z1:19.6,t:TI,y0:0,y1:8,bb:[[E3,-1]]});   // closes the foyer closet's stair end, between the stair core's wall and W68

  // ---------- ADDITION (new, level 2) ----------
  const A={x0:-21.5,x1:0,z0:-1.65,z1:32.5};
  PH='a';
  W({lv:2,x0:A.x0,z0:A.z0,x1:0,z1:A.z0,t:TE,y0:-5.5,y1:3.95,isNew:true,ops:[win(-17.3,5.6,E2,1.0,7.6,2),win(-10.25,5.5,E2,1.0,7.6,2),win(-3.1,5.6,E2,1.0,7.6,2)],ext:{side:-1,mat:'brick'},bb:[[E2,1]]});
  W({lv:2,x0:0,z0:A.z0,x1:0,z1:0,t:TE,y0:-5.5,y1:3.95,isNew:true,ext:{side:1,mat:'brick'}});
  W({lv:2,x0:A.x0,z0:A.z0,x1:A.x0,z1:A.z1,t:TE,y0:-5.5,y1:3.9,isNew:true,ops:[win(1.55,3.7,E2,1.0,7.6,2),win(5.65,3.9,E2,1.0,7.6,2),win(9.6,3.7,E2,1.0,7.6,2),win(26.15,4.3,E2,3.0,7.0,2)],ext:{side:-1,mat:'brick'},bb:[[E2,1]],
    p2:{ops:[win(1.55,3.7,E2,1.0,7.6,2),win(5.65,3.9,E2,1.0,7.6,2),win(9.6,3.7,E2,1.0,7.6,2),win(17.0,3.6,E2,3.0,7.0,2),win(26.75,9.6,E2,2.0,6.8,4)]}});   // (plan 2: the office window over the desk, and a run of windows along the bedroom)
  W({lv:2,x0:A.x0,z0:A.z1,x1:0,z1:A.z1,t:TE,y0:-5.5,y1:4.6,isNew:true,ops:[Object.assign(win(-16.9,4.2,E2,2.0,6.8,2),{dh:true}),Object.assign(win(-10.9,4.2,E2,2.0,6.8,2),{dh:true}),Object.assign(win(-3.25,3.0,E2,2.0,6.8,2),{k:'frost',dh:true})],ext:{side:1,mat:'brick'},bb:[[E2,-1]],
    p2:{ops:[Object.assign(win(-13.9,4.0,E2,2.0,6.8,2),{dh:true}),Object.assign(win(-8.1,4.0,E2,2.0,6.8,2),{dh:true})]}});   // (plan 2: the bedroom's two windows)
  W({lv:2,x0:0,z0:31.6,x1:0,z1:A.z1,t:TE,y0:-5.5,y1:4.6,isNew:true,ext:{side:1,mat:'brick'}});
  W({lv:2,x0:A.x0,z0:12.9,x1:-4.9,z1:12.9,y0:-4.5,y1:4.0,isNew:true,bb:[[E2,-1],[E2,1]]});
  // plan 1: entry, walk-in closet (9'), the primary bedroom on the outside walls and the bath beside the existing bedroom
  PH='1';
  W({lv:2,x0:-12.6,z0:12.9,x1:-12.6,z1:18.4,y0:-4.5,y1:3.5,isNew:true,ops:[op('open0',15.5,2.9,E2,6.9)]});
  W({lv:2,x0:-4.9,z0:12.9,x1:-4.9,z1:18.4,y0:-4.5,y1:3.5,isNew:true,ops:[op('open0',15.6,3.8,E2,7.0)]});
  W({lv:2,x0:A.x0,z0:18.4,x1:-12.6,z1:18.4,y0:-4.5,y1:3.5,isNew:true,bb:[[E2,-1],[E2,1]]});
  // (the gallery door is hinged on the office side, so it opens flat against the office wall, clear of the way to the bath)
  W({lv:2,x0:-7.5,z0:18.4,x1:0,z1:18.4,y0:-4.5,y1:3.5,isNew:true,bb:[[E2,-1],[E2,1]]});   // (runs 2.6' past the entry's east wall: the bath's north wall)
  W({lv:2,x0:-7.5,z0:18.4,x1:-7.5,z1:A.z1,y0:-4.5,y1:3.5,isNew:true,ops:[door(19.95,2.4,E2,[-1,1])],bb:[[E2,-1],[E2,1]]});
  // plan 2 (the owner's office plan): an office behind the four-seasons room, a door from the gallery into the bedroom's entry, windows along
  // the bedroom's west wall; the existing bedroom (x 0.3-11.2, with its old closet) becomes the primary bath (the owner's layout): a 44" closet on its addition side,
  // the toilet on the family-room wall, two vanities facing each other, and a glassed wet room (tub and shower) across the window wall
  PH='2';
  W({lv:2,x0:-4.9,z0:12.9,x1:-4.9,z1:21.0,y0:-4.5,y1:3.5,isNew:true,ops:[door(15.9,2.8,E2,[-1,-1])],bb:[[E2,-1],[E2,1]]});
  W({lv:2,x0:A.x0,z0:21.0,x1:-4.9,z1:21.0,y0:-4.5,y1:3.5,isNew:true,bb:[[E2,-1],[E2,1]]});
  W({lv:2,x0:-4.9,z0:18.4,x1:0,z1:18.4,y0:-4.5,y1:3.5,isNew:true,ops:[door(-3.3,2.8,E2,[-1,1])],bb:[[E2,-1],[E2,1]]});
  W({lv:2,x0:0.3,z0:23.2,x1:4.4,z1:23.2,y0:-4.5,y1:3.5,isNew:true,ops:[op('closet',2.15,2.6,E2,6.9)],bb:[[E2,-1],[E2,1]]});
  W({lv:2,x0:4.2,z0:23.0,x1:4.2,z1:31.6,y0:-4.5,y1:3.5,isNew:true,bb:[[E2,-1],[E2,1]]});
  PH='a';
  // addition foundation under the suite; the four-seasons room sits on piers over the patio
  // (its side and front are concrete, the same as the house's exposed foundation on the front: MAT.stone; there is no wall under the
  // four-seasons room's edge, so the space under the suite opens onto the patio)
  W({lv:'X',x0:A.x0,z0:12.9,x1:A.x0,z1:A.z1,t:TE,y0:-17,y1:-5.5,ext:{side:-1,mat:'stone'},paint:[{side:1,mat:'stone'}]});
  W({lv:'X',x0:A.x0,z0:A.z1,x1:0,z1:A.z1,t:TE,y0:-17,y1:-5.5,ops:[op('open0',-17.0,6.0,-11.7,5.1),op('open0',-7.6,7.0,-11.7,5.1)],ext:{side:1,mat:'stone'},paint:[{side:-1,mat:'stone'}]});  PH=null;

  // ---------- FLOORS ----------
  F(1,0.3,14.7,0.3,12.2,'laminate'); F(1,0.3,18.5,12.2,31.3,'laminate'); F(1,14.7,28,12.2,15.6,'laminate');
  F(1,14.7,35.6,0.3,12.2,'laminate'); F(1,35.9,44.3,0.3,9.2,'laminate'); F(1,35.6,35.9,2.1,8.1,'laminate'); F(1,25,28,15.6,19.6,'laminate');   // (35.6-35.9: the threshold under the cased opening)
  F(1,28,35.6,12.2,17.1,'laminate'); F(1,18.5,35.6,19.6,31.3,'tileBath'); F(1,28,35.6,17.1,19.6,'tileBath');
  F(2,0.3,14.2,0.3,19.6,'oak'); F(2,11.2,14.2,19.6,23.1,'oak'); F(2,14.2,18.5,19.6,23.1,'oak');
  phase('c1',()=>F(2,0.3,11.2,19.6,31.3,'oak'));phase('2',()=>F(2,0.3,11.2,19.6,31.3,'tileBath')); phase('c1',()=>F(2,11.2,13.6,23.1,31.3,'oak'));phase('2',()=>F(2,11.2,13.6,23.1,31.3,'tileBath')); F(2,13.6,18.5,23.1,31.3,'tileBath');
  F(3,14.2,43.5,0.3,10.6,'oak'); F(3,19.2,35.6,10.6,26.2,'oak'); F(3,14.2,19.2,10.6,12.2,'oak');
  F(3,23.6,35.6,26.2,31.3,'oak'); F(3,18.5,23.6,26.2,31.3,'slate'); F(3,20.0,23.6,19.6,26.2,'oak'); F(3,18.5,20.0,19.6,26.2,'oak');
  F(4,0.3,14.2,0.3,13.1,'oak'); F(4,0.3,14.2,13.1,16.4,'oak'); F(4,12.2,14.2,16.4,19.6,'oak');
  F(4,0.3,12.2,16.4,31.3,'oak'); F(4,12.2,17.3,19.6,26.8,'tileBath'); F(4,12.2,18.5,26.8,31.3,'tileBath');
  PH='a';F(2,A.x0+0.3,0,A.z0+0.3,18.4,'oak');PH='1';F(2,A.x0+0.3,-7.5,18.4,A.z1-0.3,'oak'); F(2,-7.5,0,18.4,A.z1-0.3,'tileBath');PH='2';F(2,A.x0+0.3,0,18.4,A.z1-0.3,'oak');PH=null;
  // garage slab
  F(3,35.9,53.8,10.9,31.3,'concrete',-0.5);
  // ---------- CEILINGS ----------
  C(1,0,44.6,0,15.7); C(1,0,14.2,15.7,31.6); C(1,25,35.9,15.7,31.6); C(1,14.2,25,19.6,31.6); C(2,0,14.2,0,31.6); C(2,14.2,18.5,19.6,31.6); C(3,14.2,43.8,0,10.6); C(3,18.5,35.6,10.6,31.6); C(3,14.2,19.2,10.6,15.7);
  C(4,0,14.2,0,31.6); C(4,14.2,19.2,15.7,19.6); C(4,12.2,18.5,19.6,31.6);
  PH='a';C(2,-21.5,0,12.9,32.5);PH=null; C(3,35.6,54.1,10.6,31.6,8);

  // ---------- ROOMS ----------
  R(1,'Recreation room',"18'5\" × 31'4\"",0.3,18.5,15.7,31.3); R(1,'Recreation room','',0.3,14.7,0.3,15.7);
  R(1,'Sitting room',"21'0\" × 11'10\"",14.7,35.6,0.3,12.2); R(1,'Room',"8'2\" × 8'5\"",35.9,44.3,0.3,9.2);
  R(1,'Laundry / storage',"17'0\" × 14'1\"",18.5,35.6,19.6,31.3); R(1,'Hall','',14.7,28,12.2,19.6);
  PH='a';R(1,'Sitting room','',28,35.6,12.2,17.1);PH='c';R(1,'Walk-in closet','',31.1,35.6,12.2,17.1);R(1,'Closet','',28,31.1,12.2,17.1);R(2,'Balcony',"8'11\" × 16'5\"",-8.9,0,0,16.4);PH=null; R(1,'Storage','',0.3,7.5,9,14.6);
  R(2,'Family room',"13'11\" × 19'1\"",0.3,14.2,0.3,19.6); PH='c1';R(2,'Bedroom',"13'2\" × 13'6\"",0.3,11.2,19.6,31.3);PH='2';R(2,'Primary bath',"13'2\" × 13'6\", old bedroom",4.2,11.2,24.3,31.3,true);R(2,'Primary bath','',4.2,11.2,19.6,24.3,true);R(2,'Primary bath','',0.3,4.2,19.6,23.2,true);R(2,'Primary bath','',11.2,13.6,23.1,31.3,true);R(2,'Bath closet','',0.3,4.2,23.2,31.3,true);PH=null;
  R(2,'Bath',"4'11\" × 8'3\"",13.6,18.5,23.1,31.3); R(2,'Hall','',11.2,16.4,19.6,23.1);
  R(2,'Four-seasons room',"21'8\" × 14'6\"",A.x0,-1.8,A.z0,12.9,true); R(2,'Gallery','',-4.9,0,12.9,18.4,true);
  PH='1';R(2,'Entry',"7'8\" × 5'6\"",-12.6,-4.9,12.9,18.4,true); R(2,'Closet',"9' × 5'6\"",A.x0,-12.6,12.9,18.4,true);
  R(2,'Primary bedroom',"13'6\" × 13'6\"",A.x0,-7.5,18.4,A.z1,true); R(2,'Primary bath',"7' × 13'6\"",-7.5,0,18.4,A.z1,true);
  PH='2';R(2,'Office',"15'8\" × 7'8\"",A.x0,-4.9,12.9,21.0,true);R(2,'Primary bedroom',"20'11\" × 10'5\" plus entry",A.x0,0,21.0,A.z1,true);R(2,'Primary bedroom','',-4.9,0,18.4,21.0,true);PH=null;
  R(3,'Living room',"18'5\" × 10'7\"",14.2,31.8,0.3,12.2); R(3,'Dining area',"12'0\" × 10'3\"",31.8,43.8,0.3,10.6);R(3,'Dining area','',31.8,35.6,10.6,12.4);
  R(3,'Kitchen',"22'2\" × 22'4\"",23.6,35.6,12.2,31.3); R(3,'Foyer',"5'11\" × 11'11\"",18.5,23.6,19.6,31.3);
  R(3,'Garage',"18'6\" × 20'7\" as modeled",35.6,54.1,10.6,31.6); R(3,'Stair hall','',19.2,23.6,12.2,19.6);
  R(3,'New deck',"10'4\" × 12'9\" as modeled",43.8,54.1,-2.15,10.35,true); R(3,'Entry walk',"17'11\" × 4'5\"",18.1,36,31.6,36);
  R(1,'Deck',"14'10\" × 8'8\"",14.7,29.7,-8.9,0); R(1,'Patio','',-27,0,-3.75,6.5);
  R(4,'Bedroom',"11'9\" × 12'10\"",0.3,12.2,0.3,13.1); R(4,'Primary bedroom',"11'9\" × 15'2\"",0.3,12.2,16.4,31.3);
  R(4,'Bath',"4'7\" × 6'1\"",12.2,17.3,19.6,26.8); R(4,'Bath',"6'4\" × 4'8\"",12.2,18.5,26.8,31.3);
  R(4,'Hall',"5'10\" × 6'3\"",8.8,14.2,13.1,19.6);

  // ---------- STAIRS (x-direction flights) ----------
  // dir +1: rises toward +x. lv 'S' so they show on both levels they join.
  stairs.push({id:'A', x0:14.2,x1:19.2,z0:12.2,z1:15.6, yLow:E2,yHigh:E3,dir:1});   // family room up to main
  stairs.push({id:'Bup',x0:14.2,x1:19.2,z0:15.8,z1:19.6, yLow:E3,yHigh:E4,dir:-1});  // main up to bedrooms
  stairs.push({id:'Bdn',x0:14.2,x1:25.0,z0:15.8,z1:19.6, yLow:E1,yHigh:E2,dir:-1});  // family room down to lower level
  return {walls,floors,ceils,rooms,stairs,A};
}
