// Tuning panel for water.js.
//
// Not linked from anywhere: water.js loads this on demand when someone finds the
// easter egg (three clicks on the lantern). Everything it needs from the renderer
// comes through window.WATER; it reaches into nothing else, so it stays loadable
// from any page that runs the renderer.
(function(){
'use strict';
const WATER=window.WATER;
if(!WATER||!WATER.P) return;
if(document.getElementById('wpanel')) return;   // already open
const P=WATER.P, FILE_DEF=WATER.DEF;

const CSS=`
#wpanel{position:fixed;top:0;right:0;width:272px;height:100vh;overflow-y:auto;
  font:11px/1.4 ui-monospace,Menlo,monospace;color:#9fb3c8;
  background:rgba(10,15,22,.94);border-left:1px solid #22303f;
  padding:40px 14px 40px;box-sizing:border-box;z-index:9;
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
#wpanel.hide{display:none}
#wpanel h4{margin:14px 0 6px;font-size:10px;letter-spacing:.09em;
  text-transform:uppercase;color:#ECC496;font-weight:600}
#wpanel h4:first-child{margin-top:0}
#wpanel .row{display:grid;grid-template-columns:1fr 46px;gap:6px;align-items:center;margin:3px 0}
#wpanel .row label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wpanel .row input[type=range]{grid-column:1/3;width:100%;height:14px;margin:0;accent-color:#ECC496}
#wpanel .row .v{text-align:right;color:#dbe6f0;font-variant-numeric:tabular-nums}
#wpanel .btn{display:inline-block;margin:10px 6px 0 0;padding:5px 9px;
  border:1px solid #35485c;border-radius:5px;color:#dbe6f0;cursor:pointer;
  background:#131c27;user-select:none}
#wpanel .btn:hover{border-color:#ECC496}
#wtoggle{position:fixed;top:12px;right:12px;z-index:10;cursor:pointer;
  font:11px ui-monospace,Menlo,monospace;color:#ECC496;
  background:rgba(10,15,22,.9);border:1px solid #35485c;border-radius:5px;
  padding:5px 9px;user-select:none}`;

const SLIDERS=[
  ['Look',null,null,null,null],
  ['width',      'line width',        .2,  3,   .05, 2],
  ['widthNear',  'near widening',     0,   4,   .05, 2],
  ['dimFar',     'far dimming',       0,   1,   .01, 2],
  ['bright',     'brightness',        .1,  2,   .02, 2],
  ['lines',      'line count',        20,  400, 1,   0],
  ['ptStep',     'point spacing px',  2,   14,  .5,  1],

  ['Shading',null,null,null,null],
  ['slopeLit',   'height <-> slope',  0,   1,   .02, 2],
  ['litRange',   'lit range',         .2,  2,   .02, 2],
  ['litGamma',   'mid-tone lift',     .3,  2,   .02, 2],
  ['floor',      'darkest',           0,   .6,  .01, 2],
  ['crest',      'crest gain',        1,   3,   .05, 2],
  ['glow',       'glow width',        0,   8,   .1,  1],
  ['glowAmt',    'glow strength',     0,   .6,  .01, 2],

  ['Light',null,null,null,null],
  ['beam',       'intensity',         0,   2,   .05, 2],
  ['lampX',      'lamp position',     0,   1,   .01, 2],
  ['beamWidth',  'cone width',        .05, 1,   .01, 2],
  ['beamSoft',   'edge softness',     0,   1,   .02, 2],
  ['beamLift',   'crest specular',    0,   4,   .05, 2],
  ['beamWarm',   'warmth',            0,   1,   .02, 2],
  ['beamSat',    'amber saturation',  0,   1,   .02, 2],
  ['beamSweep',  'sweep seconds',     .3,  8,   .1,  1],
  ['beamGapMin', 'gap min (s)',       0,   30,  1,   0],
  ['beamGapMax', 'gap max (s)',       1,   60,  1,   0],
  ['beamDouble', 'double 1-in-N',     0,   20,  1,   0],
  ['beamGuard',  'copy guard',        0,   1,   .05, 2],

  ['Lighthouse',null,null,null,null],
  ['sky',        'sky lift',          0,   2,   .05, 2],
  ['cliff',      'headland on',       0,   1,   1,   0],
  ['cliffX',     'cliff position',    .4,  .95, .01, 2],
  ['cliffH',     'mesa height',       .01, .3,  .005,3],
  ['cliffRough', 'rock roughness',    0,   1.5, .05, 2],
  ['towerH',     'tower height',      0,   .2,  .005,3],
  ['towerW',     'tower width',       .004,.05, .001,3],
  ['rockLift',   'rock value',        .5,  5,   .05, 2],
  ['rockHaze',   'rock base haze',    0,   2,   .05, 2],
  ['footHaze',   'waterline haze',    0,   1,   .02, 2],
  ['rim',        'lit rim',           0,   .6,  .01, 2],
  ['rimBase',    'rim when idle',     0,   1,   .05, 2],
  ['hazeBase',   'halo when idle',    0,   1,   .05, 2],
  ['haze',       'lamp halo',         0,   1.2, .02, 2],
  ['seed',       'rock seed',         1,   40,  1,   0],

  ['Framing',null,null,null,null],
  ['horizon',    'horizon',           .15, .6,  .01, 2],
  ['persp',      'perspective',       1,   3,   .05, 2],
  ['amp',        'wave height',       .01, .2,  .002,3],
  ['ampNear',    'near height boost', 0,   3,   .05, 2],
  ['simGain',    'field -> height',   .5,  12,  .25, 2],

  ['Water',null,null,null,null],
  ['speed',      'sim speed',         .02, .6,  .01, 2],
  ['stiff',      'stiffness',         .5,  1.9, .01, 2],
  ['damp',       'damping',           0,   .8,  .01, 2],
  ['visc',       'short-wave visc',   0,   1,   .01, 2],
  ['breakAt',    'breaking onset',    0,   .006,.0001,4],
  ['breakRate',  'breaking rate',     0,   20,  .5,  1],

  ['Wind',null,null,null,null],
  ['wind',       'gust strength',     0,   3,   .05, 2],
  ['gustRate',   'gusts / sec',       0,   80,  1,   0],
  ['gustSize',   'gust size',         4,   40,  1,   0],
  ['windDir',    'heading (rad)',     0,   6.28,.01, 2],
  ['windSpread', 'heading spread',    0,   1.2, .01, 2],
  ['gustDir',    'one-way launch',    0,   1,   .05, 2],

  ['Weather',null,null,null,null],
  ['gustVary',   'gust jitter',       0,   1,   .05, 2],
  ['weather',    'build / ease depth',0,   1,   .05, 2],
  ['weatherRate','build rate',        .02, 1.2, .01, 2],
  ['veer',       'heading wander',    0,   1,   .02, 2],
  ['veerRate',   'wander rate',       .01, .6,  .01, 2],
  ['lull',       'lull thinning',     0,   1,   .05, 2],

  ['Second swell',null,null,null,null],
  ['swell2',     'share of gusts',    0,   1,   .02, 2],
  ['swell2Ang',  'heading offset',    0,   3.14,.02, 2],
  ['swell2Len',  'wavelength x',      .5,  4,   .05, 2],
  ['swell2Crest','crest length x',    .2,  2,   .05, 2],
  ['swell2Amp',  'strength x',        0,   3,   .05, 2],
];

const PKEY='water.params';     // live session values, saved on every drag
const DKEY='water.defaults';   // your saved defaults, only written by the button

// Line count and spacing change the mesh itself, so the vertex buffer has to be
// rebuilt; the headland is baked at fit() time, so its shape params rebuild that.
// Everything else is a uniform and takes effect next frame.
const rebuildOn={lines:1, ptStep:1};
const cliffOn={sky:1, rockLift:1, rockHaze:1, footHaze:1, cliff:1, cliffX:1,
               cliffH:1, cliffRough:1, towerH:1, towerW:1, seed:1, haze:1,
               beam:1, lampX:1, horizon:1};

function savePanel(){ try{ localStorage.setItem(PKEY,JSON.stringify(P)); }catch(e){} }

const st=document.createElement('style'); st.textContent=CSS;
document.head.appendChild(st);

let html='';
for(const [k,lab,lo,hi,step,dp] of SLIDERS){
  if(lab===null){ html+='<h4>'+k+'</h4>'; continue; }
  html+='<div class="row"><label for="ws_'+k+'">'+lab+'</label>'+
        '<span class="v" id="wv_'+k+'">'+(+P[k]).toFixed(dp)+'</span>'+
        '<input type="range" id="ws_'+k+'" min="'+lo+'" max="'+hi+'" step="'+step+'" value="'+P[k]+'"></div>';
}
html+='<div><span class="btn" id="wsaveDef">save as default</span>'+
      '<span class="btn" id="wreset">revert</span>'+
      '<span class="btn" id="wresetFile">reset to file</span>'+
      '<span class="btn" id="wcopy">copy values</span></div>'+
      '<div id="wnote" style="margin-top:8px;color:#5d7186"></div>';

const panel=document.createElement('div');
panel.id='wpanel'; panel.innerHTML=html;
document.body.appendChild(panel);

const tg=document.createElement('div');
tg.id='wtoggle'; tg.textContent='hide panel';
document.body.appendChild(tg);
tg.onclick=()=>{
  panel.classList.toggle('hide');
  tg.textContent=panel.classList.contains('hide')?'show panel':'hide panel';
};

for(const [k,lab,lo,hi,step,dp] of SLIDERS){
  if(lab===null) continue;
  const el=document.getElementById('ws_'+k), out=document.getElementById('wv_'+k);
  el.addEventListener('input',()=>{
    P[k]=+el.value;
    out.textContent=(+P[k]).toFixed(dp);
    if(rebuildOn[k] && WATER.buildLines) WATER.buildLines();
    if(cliffOn[k] && WATER.buildCliff) WATER.buildCliff();
    savePanel();
  });
}

function note(msg){ const el=document.getElementById('wnote'); if(el) el.textContent=msg; }
function refreshNote(){
  let has=false;
  try{ has=!!localStorage.getItem(DKEY); }catch(e){}
  note(has?'defaults saved in this browser':'using file defaults');
}
refreshNote();

// Only the diff from the file, so a later change to a value I never touched is
// picked up rather than pinned to whatever it happened to be today.
document.getElementById('wsaveDef').onclick=()=>{
  const diff={};
  for(const k in P) if(P[k]!==FILE_DEF[k]) diff[k]=P[k];
  try{ localStorage.setItem(DKEY,JSON.stringify(diff)); }catch(e){}
  const b=document.getElementById('wsaveDef');
  b.textContent='saved'; setTimeout(()=>b.textContent='save as default',900);
  refreshNote();
};
// Back to your saved defaults, keeping them.
document.getElementById('wreset').onclick=()=>{
  try{ localStorage.removeItem(PKEY); }catch(e){}
  location.reload();
};
// Back to the values written in the file, discarding saved defaults too.
document.getElementById('wresetFile').onclick=()=>{
  try{ localStorage.removeItem(PKEY); localStorage.removeItem(DKEY); }catch(e){}
  location.reload();
};
document.getElementById('wcopy').onclick=()=>{
  // Only the changed lines, so what lands on the clipboard is a diff I can read
  // rather than 70 values of which 3 matter.
  const ch=SLIDERS.filter(r=>r[1]!==null&&P[r[0]]!==FILE_DEF[r[0]]);
  const txt=ch.length
    ? ch.map(r=>'  '+r[0]+':'+(+P[r[0]])+',   // was '+FILE_DEF[r[0]]).join('\n')
    : '(unchanged from file defaults)';
  navigator.clipboard&&navigator.clipboard.writeText(txt);
  const b=document.getElementById('wcopy');
  b.textContent='copied'; setTimeout(()=>b.textContent='copy values',900);
};

// Escape closes it, since there is no other way out once it is open.
addEventListener('keydown',function esc(e){
  if(e.key==='Escape'){
    panel.remove(); tg.remove(); st.remove();
    removeEventListener('keydown',esc);
  }
});
})();
