// Tuning panel for water.js. Loaded by rope-waves-sim.html always, and by the
// live page only on #tune -- see index.html. Everything it needs from the
// renderer comes through window.WATER; it reaches into nothing else.
(function(){
'use strict';
const WATER=window.WATER;
if(!WATER||!document.getElementById('panel')) return;
const P=WATER.P, DEF=WATER.DEF, STORE=WATER.STORE;

WATER.onFrame=function(fps,N,DPR){
  document.getElementById('hud').innerHTML=
    'fps <b>'+fps.toFixed(0)+'</b> · lines <b>'+N+'</b> · dpr <b>'+DPR+'</b>';
};

const SPEC=[
 ['gField',[
  ['lines','lines',30,260,1,0],
  ['horizon','horizon',.18,.72,.01,2],
  ['persp','perspective',.8,3.6,.05,2],
 ]],
 ['gRope',[
  ['amp','amplitude (z)',.005,.20,.005,3],
  ['ampNear','near boost',.2,4,.05,2],
  ['steep','crest sharpness',0,.9,.02,2],
  ['ropeRand','rope randomness',0,1.5,.02,2],
  ['chopAmt','disorder drift',0,6,.05,2],
  ['chopLen','disorder length (y)',.04,1.5,.01,2],
  ['chopRate','disorder rate',0,3,.05,2],
  ['waveLen','foam scale (x)',.08,2.0,.02,2],
  ['smooth','smoothing',0,1,.02,2],
  ['smoothPass','smooth passes',0,8,1,0],
 ]],
 ['gCross',[
  ['wind','wind strength',0,3,.05,2],
  ['gustRate','gusts per second',0,120,1,0],
  ['gustSize','gust size',4,60,1,0],
  ['windDir','wave heading',0,3.14,.05,2],
  ['windSpread','heading spread',0,1.2,.05,2],
  ['swell2','2nd swell share',0,.6,.02,2],
  ['swell2Ang','2nd swell angle',0,1.4,.05,2],
  ['swell2Len','2nd swell length',.5,3,.1,1],
  ['swell2Crest','2nd swell crest len',.5,3,.1,1],
  ['swell2Amp','2nd swell strength',0,1.5,.05,2],
  ['stiff','stiffness',.3,1.9,.02,2],
  ['damp','damping',.1,2,.02,2],
  ['visc','short-wave viscosity',0,1,.02,2],
  ['breakAt','break threshold',0,.02,.0005,4],
  ['breakRate','break rate',0,30,.5,1],
  ['simGain','wave height',2,80,1,0],
  ['simDepth','perspective sampling',0,1,.02,2],
  ['simTile','water tile',.3,3,.05,2],
  ['speed','wave speed',.05,1.5,.01,2],
  ['hzSkirt','horizon skirt',2,40,1,0],
  ['fetch','fetch band (off-frame)',0,80,1,0],
  ['gustDir','gust directionality',0,2,.05,2],
  ['skirt','near-edge absorb',4,50,1,0],
 ]],
 ['gTide',[
  ['simW','grid width',80,520,10,0],
  ['simH','grid depth',60,300,10,0],
 ]],
 ['gLook',[
  ['bright','brightness',.1,4,.05,2],
  ['bands','brightness levels',4,64,1,0],
  ['wSteps','width buckets',1,6,1,0],
  ['dithAmt','dither',0,1.5,.05,2],
  ['dimFar','horizon brightness',.1,1,.02,2],
  ['glow','glow spread',1,10,.1,1],
  ['width','line width',.2,3.5,.05,2],
  ['beam','lighthouse',0,2,.05,2],
  ['beamSweep','sweep seconds',.4,6,.1,2],
  ['beamGapMin','gap min',1,30,.5,1],
  ['beamGapMax','gap max',1,60,.5,1],
  ['beamDouble','double 1-in-N',0,12,1,0],
  ['beamWidth','beam width',.05,1.2,.01,2],
  ['beamSoft','beam softness',0,1,.02,2],
  ['beamLift','crest glint',0,4,.05,2],
  ['cliff','headland',0,1,1,0],
  ['cliffX','cliff position',.5,1,.01,2],
  ['cliffH','cliff height',0,.25,.005,3],
  ['cliffRough','cliff roughness',0,1,.02,2],
  ['towerH','tower height',0,.14,.005,3],
  ['lampX','lamp position',0,1,.01,2],
  ['beamWarm','beam warmth',0,1,.02,2],
  ['beamSat','beam saturation',0,1,.02,2],
  ['beamHaze','lamp haze',0,1,.02,2],
  ['beamGuard','copy guard',0,1,.02,2],
  ['copyClear','copy clearance',0,120,2,0],
  ['crest','crest contrast',0,2,.05,2],
  ['slopeLit','light on slopes',0,1,.02,2],
  ['slopeSmooth','slope smoothing',0,8,1,0],
  ['litRange','light range',.1,2,.05,2],
  ['litGamma','light curve',.2,2,.05,2],
  ['floor','shadow floor',0,.6,.01,2],
  ['foam','foam',0,2,.02,2],
  ['foamAt','foam threshold',1,3,.02,2],
 ]],
 ['gSeed',[
  ['randScale','randomness scale',1,60,1,0],
  ['randOct','randomness detail',1,5,1,0],
  ['seed','seed',1,60,1,0],
 ]],
];

const inputs={};
for(const [gid,rows] of SPEC){
  const host=document.getElementById(gid);
  for(const [key,label,lo,hi,st,dp] of rows){
    const d=document.createElement('div');d.className='ctl';
    d.innerHTML='<div class="lab"><span>'+label+'</span><b id="v_'+key+'"></b></div>';
    const r=document.createElement('input');
    r.type='range';r.min=lo;r.max=hi;r.step=st;r.value=P[key];
    r.addEventListener('input',()=>{P[key]=parseFloat(r.value);
      document.getElementById('v_'+key).textContent=P[key].toFixed(dp);});
    d.appendChild(r);host.appendChild(d);
    inputs[key]=[r,dp];
  }
}
function sync(){for(const k in inputs){const [r,dp]=inputs[k];r.value=P[k];
  document.getElementById('v_'+k).textContent=P[k].toFixed(dp);}}
sync();

const PRE={
  rope  :{},
  sheet :{wind:.35,gustRate:12,gustSize:30,windDir:1.45,windSpread:.15,damp:.35,simGain:34,lines:100,ropeRand:0,steep:.2},
  swell :{wind:1.4,gustRate:22,gustSize:24,windDir:1.45,windSpread:.25,damp:.45,stiff:1.9,simGain:40,
          lines:140,glow:5.6,width:1.1,steep:.55},
  chop  :{wind:1.1,gustRate:80,gustSize:11,windDir:1.45,windSpread:.7,damp:1.0,simGain:16,
          lines:200,glow:6.2,width:.75,bright:1.6,ropeRand:.75},
};
document.querySelectorAll('[data-pre]').forEach(b=>b.addEventListener('click',()=>{
  Object.assign(P,DEF,PRE[b.dataset.pre]);sync();}));
document.getElementById('reset').addEventListener('click',()=>{
  try{ localStorage.removeItem(STORE); }catch(e){}
  Object.assign(P,DEF);sync();flash('reset','RESET');});
document.getElementById('save').addEventListener('click',()=>{
  const o={}; for(const k of Object.keys(DEF)) o[k]=P[k];
  try{ localStorage.setItem(STORE,JSON.stringify(o)); flash('save','SAVED'); }
  catch(e){ flash('save','SAVE FAILED'); }});
// Confirm in the button label; there is no other feedback that a click landed.
function flash(id,msg){
  const b=document.getElementById(id), was=b.textContent;
  b.textContent=msg; setTimeout(()=>{b.textContent=was;},900);
}

// Copy the live values as a paste-ready DEF block. Written to the page as well
// as the clipboard, since clipboard writes fail without a user gesture in some
// contexts and a visible block still lets the values be selected by hand.
const outEl=document.getElementById('out');
document.getElementById('copy').addEventListener('click',()=>{
  const keys=Object.keys(DEF);
  const w=Math.max(...keys.map(k=>k.length));
  const body=keys.map(k=>'  '+(k+':').padEnd(w+1)+' '+
    (Number.isInteger(DEF[k])&&Number.isInteger(P[k])?P[k]:+P[k].toFixed(4))+',').join('\n');
  const txt='const DEF={\n'+body+'\n};';
  outEl.textContent=txt; outEl.classList.add('on');
  const btn=document.getElementById('copy');
  navigator.clipboard.writeText(txt).then(
    ()=>{btn.textContent='COPIED';setTimeout(()=>btn.textContent='COPY SETTINGS',1400);},
    ()=>{btn.textContent='SELECT BELOW';setTimeout(()=>btn.textContent='COPY SETTINGS',1800);});
});

const panel=document.getElementById('panel'), toggle=document.getElementById('toggle');
toggle.addEventListener('click',()=>panel.classList.toggle('hid'));
addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();WATER.paused=!WATER.paused;}
  if(e.key==='h')panel.classList.toggle('hid');
});


})();
