// 00-boot.js: boot: strict mode and the on-screen error reporter
"use strict";
// a WebGPU fault while the house is still being built (seen on iPad: "GPUDevice.createBindGroup … invalid state") reloads once on WebGL
window.addEventListener('error',e=>{if(window.GPU&&!window.APP_STARTED&&!/[?&]renderer=webgl/.test(location.search)){const u=new URL(location.href);u.searchParams.set('renderer','webgl');location.replace(u.href);return;}});
window.addEventListener('error',e=>{const b=document.getElementById('err');b.style.display='block';b.textContent='Something failed while building the scene: '+e.message+'. Reload the page to try again.';});
