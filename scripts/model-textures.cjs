// npm run model:textures -- <in.glb> <out.glb> [maxPx=1024]: shrink a GLB's embedded textures (before gltfpack -c; not on meshopt-compressed files)
// Each embedded image is decoded in Chrome (the installed one, through Playwright), scaled so its longer side is at most maxPx, and
// re-encoded (WebP stays WebP; PNG and JPEG become JPEG unless they have alpha); the binary chunk is rebuilt with the new offsets.
const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const [src,dst,MAX]=[process.argv[2],process.argv[3],+(process.argv[4]||1024)];
const b=fs.readFileSync(src);const jl=b.readUInt32LE(12);const j=JSON.parse(b.slice(20,20+jl).toString());const binStart=20+jl+8,bl=b.readUInt32LE(20+jl);const bin=b.slice(binStart,binStart+bl);
if((j.extensionsUsed||[]).includes('EXT_meshopt_compression'))throw new Error('meshopt-compressed input: use the uncompressed source');
const br=await chromium.launch({channel:'chrome'});const p=await br.newPage();const repl=new Map();let before=0,after=0;
for(const im of j.images||[]){if(im.bufferView===undefined)continue;const v=j.bufferViews[im.bufferView];const bytes=bin.slice(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);before+=bytes.length;
  const r=await p.evaluate(async([b64,mime,MAX])=>{const blob=await (await fetch('data:'+mime+';base64,'+b64)).blob();const bm=await createImageBitmap(blob);const s=Math.min(1,MAX/Math.max(bm.width,bm.height));
    const w=Math.max(1,Math.round(bm.width*s)),h=Math.max(1,Math.round(bm.height*s));const c=new OffscreenCanvas(w,h),g=c.getContext('2d');g.drawImage(bm,0,0,w,h);
    let alpha=false;if(mime!=='image/webp'){const d=g.getImageData(0,0,w,h).data;for(let i=3;i<d.length;i+=4)if(d[i]<255){alpha=true;break;}}
    const type=mime==='image/webp'?'image/webp':alpha?'image/png':'image/jpeg';const out=await c.convertToBlob({type,quality:.85});const buf=new Uint8Array(await out.arrayBuffer());
    let s2='';for(let i=0;i<buf.length;i+=32768)s2+=String.fromCharCode.apply(null,buf.subarray(i,i+32768));return {b64:btoa(s2),type,w,h,ow:bm.width,oh:bm.height};},[bytes.toString('base64'),im.mimeType,MAX]);
  const nb=Buffer.from(r.b64,'base64');if(nb.length<bytes.length){repl.set(im.bufferView,nb);im.mimeType=r.type;after+=nb.length;}else after+=bytes.length;
  console.log('  image',r.ow+'x'+r.oh,'->',r.w+'x'+r.h,(bytes.length/1024|0)+' KB ->',((nb.length<bytes.length?nb.length:bytes.length)/1024|0)+' KB');}
await br.close();
// rebuild the binary chunk: every buffer view of buffer 0 in order, 4-byte aligned, images replaced
const parts=[];let off=0;const order=j.bufferViews.map((v,i)=>i).filter(i=>(j.bufferViews[i].buffer||0)===0).sort((a,c)=>(j.bufferViews[a].byteOffset||0)-(j.bufferViews[c].byteOffset||0));
for(const i of order){const v=j.bufferViews[i];const data=repl.get(i)||bin.slice(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);const pad=(4-off%4)%4;if(pad){parts.push(Buffer.alloc(pad));off+=pad;}v.byteOffset=off;v.byteLength=data.length;parts.push(data);off+=data.length;}
const pad=(4-off%4)%4;if(pad)parts.push(Buffer.alloc(pad));const nbin=Buffer.concat(parts);j.buffers[0].byteLength=nbin.length;
let js=Buffer.from(JSON.stringify(j));const jp=(4-js.length%4)%4;js=Buffer.concat([js,Buffer.alloc(jp,0x20)]);
const head=Buffer.alloc(12);head.writeUInt32LE(0x46546C67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+js.length+8+nbin.length,8);
const c1=Buffer.alloc(8);c1.writeUInt32LE(js.length,0);c1.writeUInt32LE(0x4E4F534A,4);const c2=Buffer.alloc(8);c2.writeUInt32LE(nbin.length,0);c2.writeUInt32LE(0x004E4942,4);
fs.writeFileSync(dst,Buffer.concat([head,c1,js,c2,nbin]));console.log(src,'textures',(before/1024|0)+' KB ->',(after/1024|0)+' KB');})().catch(e=>{console.error(e);process.exit(1);});
