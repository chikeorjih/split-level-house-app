// 00-boot.js: boot: strict mode and the on-screen error reporter
"use strict";
window.addEventListener('error',e=>{const b=document.getElementById('err');b.style.display='block';b.textContent='Something failed while building the scene: '+e.message+'. Reload the page to try again.';});
