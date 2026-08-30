// Simulated water for the masthead. The height field is a real wave equation
// (see simStep); the lines read it off the surface rather than making it.
//
// Developed in designs/rope-waves-sim.html, which loads this same file and adds
// the tuning panel on top. Tuned values live in DEF below -- edit them here.
//
// The canvas sizes to its parent, not the window, so the hero can be any height.
(function(){
'use strict';

const cv=document.getElementById('scene');
if(!cv) return;
const g=cv.getContext('2d');

// The panel (designs/water-panel.js) fills these in when it loads. Without it
// they stay inert, so the renderer has no UI dependency.
const WATER={paused:false, onFrame:null};
window.WATER=WATER;

// ---- ?bare=N -- bisect the render cost -------------------------------------
// Each level adds one stage back, so reloading through 0..4 says WHERE the cost
// appears rather than only whether it exists. Compare against level 0: that is a
// cleared canvas plus a rAF loop and nothing else, so if level 0 is already slow
// the cost is not in this file at all.
//   0 clear only   1 +sky/sea/lighthouse   2 +wave simulation
//   3 +line geometry (no strokes)          4 full render (default)
const BARE=(function(){
  const m=/[?&]bare=(\d)/.exec(location.search);
  return m?Math.max(0,Math.min(4,+m[1])):4;
})();
WATER.bare=BARE;

// ?bare is a measuring tool, so it carries its own readout -- the panel is
// #tune-only and there would otherwise be no fps number to read.
let bareHud=null;
if(/[?&]bare=/.test(location.search)){
  addEventListener('DOMContentLoaded',()=>{
    bareHud=document.createElement('div');
    bareHud.style.cssText='position:fixed;left:10px;top:10px;z-index:99999;'+
      'font:600 13px/1.5 ui-monospace,Menlo,monospace;color:#F0A94C;'+
      'background:rgba(7,10,16,.92);border:1px solid #1B2430;border-radius:7px;'+
      'padding:7px 11px;white-space:pre;pointer-events:none';
    document.body.appendChild(bareHud);
  });
}
const BARE_WHAT=['clear only','+ sky / sea / lighthouse','+ wave simulation',
                 '+ line geometry (no strokes)','full render'];
function bareReport(fps,N){
  if(!bareHud) return;
  bareHud.textContent='bare='+BARE+'  '+fps.toFixed(0)+' fps\n'+BARE_WHAT[BARE]+
    (N?('\nlines '+N):'');
}

let W=0,H=0,DPR=1;
function fit(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  // A fixed canvas (the lab file) covers the viewport; an absolute one fills
  // its positioned parent (the live page's hero). Measuring the element itself
  // does not work -- we set its inline size below, so it would measure its own
  // output -- so take the size from whichever box it is stretched to.
  const box=cv.offsetParent;
  if(getComputedStyle(cv).position==='fixed'||!box){ W=innerWidth; H=innerHeight; }
  else { W=box.clientWidth; H=box.clientHeight; }
  cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
  g.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener('resize',fit);
// The hero can change height without the window resizing -- fonts landing, the
// copy rewrapping, a stylesheet arriving late. Watch the box we size against.
if('ResizeObserver' in window){
  // Only ever react to a size we did not cause. fit() writes the canvas's inline
  // size, which can feed back through the parent's layout; comparing against the
  // last size we applied breaks that loop.
  let lastW=-1,lastH=-1;
  const ro=new ResizeObserver(()=>{
    const box=cv.offsetParent;
    const w=box?box.clientWidth:innerWidth, h=box?box.clientHeight:innerHeight;
    if(w===lastW&&h===lastH) return;
    lastW=w; lastH=h; fit();
  });
  ro.observe(cv.offsetParent||document.body);
}
fit();

// ---- parameters -----------------------------------------------------------
// AXES, as specified: x runs left-right across the screen, y runs front-to-back
// (depth into the scene), z is altitude above sea level. Screen position is
// x directly, and (depth row baseline - z) vertically.
const DEF={
  lines:120, horizon:.34, persp:1.75,


  // the water simulation
  simW:340, simH:210,   // grid resolution (simH includes the fetch band)
  simTile:1.0,        // how much of the grid one screen width spans
  simDepth:1.0,       // 1 = rows sample with true perspective depth, 0 = linear
  simGain:4,         // height field -> wave height
  // Stiffness has a HARD stability ceiling at 2.0 and it is not a matter of
  // taste: above it the scheme diverges at ANY damping (measured -- 2.02
  // whites out, 2.0 survives only with heavy damping, 1.9 is safe across the
  // whole damping range). That is the CFL limit for this stencil, and it is
  // why every copy of this shader on the internet hardcodes 2.0. The slider
  // stops at 1.9 and simStep clamps anyway, since a preset or a pasted
  // settings blob can reach past the slider.
  stiff:1.85,         // how hard a cell is pulled toward its neighbours
  breakAt:.0008,      // squared-slope threshold where a crest starts to break.
                      // Below this a wave is untouched, so swell carries. Chosen
                      // off the measured slope distribution: this is the 95th
                      // percentile, so ~5% of the surface is breaking at a time.
                      // The first guess (.004) sat above the field maximum and
                      // never fired at all.
  breakRate:6,        // how hard the excess steepness is bled off. 0 = no
                      // breaking, which is the pre-breaking behaviour.
  visc:.35,           // short-wave viscosity: extra decay applied ONLY to the
                      // small-scale part of the velocity field, so chop dies
                      // fast and long swell carries. 0 = uniform damping.
  damp:.12,           // per-STEP decay, so a longer grid costs more: with the
                      // fetch band added, .55 killed the swell halfway across
                      // (near rows at 0.017 vs 0.031 at the horizon). .12
                      // carries it the full depth -- near/far energy 1.07.
  speed:.13,          // simulated seconds per real second. 1.0 crossed in 2.8s
  gustDir:1.0,        // how one-way each gust launches. 0 = radiates both ways
  hzSkirt:6,          // absorbing band at the horizon edge, in cells
  fetch:34,           // off-frame rows upwind where waves are generated
  skirt:20,           // near-edge absorbing band, in cells
  wind:1.15,           // gust strength
  gustRate:34,        // gusts per second
  gustSize:17,        // gust footprint in cells
  windDir:1.45,       // wave heading, radians. ~pi/2 travels toward the viewer
  windSpread:.10,     // how much headings scatter around it. 0 = glassy corduroy
  swell2:.50,         // share of gusts belonging to the crossing swell
  swell2Ang:.9,       // its heading offset, radians. 0 = no crossing at all.
                      // Must clear ~50 degrees to READ as a second direction:
                      // at the old .6 (34 deg) the angular histogram showed a
                      // single blob at 90, not two peaks -- the trains were
                      // generated apart and merged, so the surface still looked
                      // like everything moved one way. windSpread matters as
                      // much: above ~13 deg the two peaks smear back together
                      // whatever the separation.
  swell2Len:1.7,      // its wavelength vs the main train (older = longer)
  swell2Crest:0.7,    // its crest length vs the main train. Kept near 1: this is
                      // footprint, not wavelength, and a wide stamp erases heading.
  swell2Amp:1.4,      // its strength vs the main train

  // Disorder that travels front-to-back. This shifts where a line READS its
  // per-line randomness rather than adding height, so bands of the field go
  // rough and then settle without competing with the water for the same
  // visual channel.
  chopLen:.55,        // how far apart the rough bands sit along y
  chopRate:.85,       // how fast they travel
  chopAmt:3.0,        // how far the read head shifts — 0 = disorder stands still

  // rope look (the sim supplies height; these shape how it is drawn)
  amp:.064,           // z amplitude, fraction of the sea band height
  waveLen:.45,        // only sets the per-line wavenumber the foam test uses
  // Perspective ALREADY makes far waves small: the row gap runs 1.4px at the
  // horizon to 7.2px in front, a 10x size difference for free. ampNear multiplies
  // on top of that, so 1.9 compounded to ~190x and gave a flat horizon under a
  // storming foreground.
  //
  // The obvious fix -- ampNear 0, equal pixel height at every depth -- destroys
  // the scene, and the reason is worth keeping. Perspective packs the far rows
  // 9x closer together, so equal PIXEL amplitude makes a far wave 9x too big
  // for the rows it belongs to. It does not read as flat, it reads as
  // overscaled, and with no size gradient left the eye has nothing to judge
  // distance by: the water becomes a vertical wall of brushed metal. 0.55 is
  // already halfway there, the mid-field going to fabric whorls.
  //
  // Measured in row-spacings -- the units that decide whether a wave looks
  // like a wave -- 1.0 is nearly flat ALREADY: 3.5 row-gaps at the horizon
  // against 4.6 in front, a 1.3x spread hiding inside a 12.8x pixel ratio.
  // The apparent front-to-back imbalance was mostly brightness; see dimFar.
  ampNear:1.0,        // how much taller the near lines swing
  // Gerstner steepness. A sine is symmetric -- crest and trough the same shape --
  // but water particles move in circles, so real waves have SHARP crests over
  // BROAD flat troughs. Measured skew: pure sine 0.00, our 2nd harmonic -0.34
  // (pointing the wrong way, sharpening the troughs), Gerstner at .45 gives
  // +0.48, inside the +0.3..+0.8 range real ocean sits in. Points are pushed
  // horizontally toward each crest, which bunches them there and thins the
  // troughs -- the visual signature of water rather than a wiggly line.
  steep:.45,
  ropeRand:.55,
  // Reflection and crossing swells used to be parameters here: a hand-added
  // backwards copy of the wave, and four hand-placed headings. Both are gone
  // because the simulation does them for real -- a wave meeting the near-edge
  // skirt, or two gusts meeting each other, interfere because that is what the
  // neighbour coupling DOES. Ten sliders became four gust controls.
  smooth:.6,          // Taubin smoothing strength
  smoothPass:2,       // how many smoothing passes
  // groups: swell arrives in sets. This is an ENVELOPE, not a wave -- it
  // scales how hard each patch of water swings rather than adding height of
  // its own. It replaces what used to be a "tide" that also lifted lines
  // bodily: measured, that additive lift LOWERED group contrast (1.26 vs 1.30
  // without it), because moving every point of a rope by the same amount
  // cannot make one patch livelier than another. The crossing swells now carry
  // the y-direction height the tide used to fake.
  // chop: disorder that travels front-to-back. This is the surviving half of
  // the old ripple: it shifts where a line READS its randomness rather than
  // adding a displacement, so bands of the field go choppy and then settle
  // without competing with the rope's own randomness for the same channel.

  // look
  bright:1.0, glow:4.2, width:1.0, crest:1.4,
  // --- Lighthouse ---------------------------------------------------------
  beam:1.0,           // master intensity. 0 = off.
  beamSweep:2.0,      // seconds for one crossing of the field.
  beamGapMin:8,       // seconds of dark between sweeps, low end...
  beamGapMax:20,      // ...and high end. Randomised per sweep: a FIXED gap is
                      // still a metronome, just a sparser one, and behind body
                      // copy a predictable beat pulls the eye off the text.
  beamDouble:6,       // odds of a double sweep: 1-in-N. 0 = never. Random
                      // rather than every-Nth for the same reason as the gap --
                      // a deterministic count is a pattern at a longer period.
  beamWidth:.30,      // angular half-width of the cone, in radians.
  beamSoft:.55,       // fraction of the cone that is soft edge.
  beamLift:1.6,       // specular gain on crests facing the lamp.
  cliff:1,            // draw the headland. 0 = open water, lamp floats on the horizon.
  cliffX:.80,          // where the cliff face meets the horizon, 0..1.
  cliffH:.085,        // mesa top above the horizon, as a fraction of height.
  cliffRough:.55,     // how broken the cliff face and top edge are. 0 = clean.
  towerH:.055,        // tower height above the mesa, fraction of height.
  lampX:.42,          // lamp position across the screen, 0..1. Ignored when
                      // cliff is on -- the lamp rides the tower instead.
  beamSat:0.72,      // amber saturation. 1 = full amber, 0 = neutral warm-white.
  beamWarm:1.0,       // how far lit water shifts toward amber. 0 = stays cool.
  copyClear:26,       // px of water-free margin kept under the masthead copy.
                      // Pushes the horizon down on short viewports rather than
                      // letting waves run under the text. 0 disables.
  beamGuard:1.0,      // how strongly the beam is held back behind the masthead
                      // copy. Measured: at viewport heights under ~591px the
                      // horizon rises past the copy, and an amber wash under the
                      // intro paragraph took contrast to 1.0 (text and water the
                      // same colour -- literally invisible) against WCAG AA's
                      // 4.5 for body text. 0 disables the guard.
  beamHaze:.35,       // glow bloom around the lamp itself. In CLEAR air a beam
                      // is invisible from the side -- you only see where it
                      // LANDS -- so there is deliberately no cone drawn in the
                      // sky. Only the lamp gets a halo, which is the one part
                      // real photographs show without fog.
  wSteps:2,           // line-width buckets. Multiplies stroke count; see pass 3.
  // Points per line are spaced ptStep CSS px apart, so this scales the whole
  // geometry pass with viewport width. Nearly all the frame cost is per-point:
  // halving the grid resolution or the brightness bands measured as noise, while
  // this and ptRef together took a 2000px window from 40 to 55 fps.
  ptStep:4.5,
  ptScale:1,          // 1 = widen point spacing on large viewports, 0 = off
  ptRef:1100,         // viewport width below which spacing is left alone
  // Gerstner refinement iterations. Each one costs a full simAtBox (up to 6
  // height samples on far rows), so this multiplies the inner loop directly.
  gerstner:3,
  bands:48,           // brightness levels. This is a BATCHING budget, not a look:
                      // each band is one beginPath/stroke for every segment in
                      // it, so the count trades draw calls against tonal
                      // smoothness. Measured: 32->118fps, 64->100, 96->75,
                      // 200->59. 64 is where the terracing stops being visible
                      // and the cost is still small.
  dithAmt:0,          // Jitter across band edges. OFF: measured free (118 vs 116
                      // fps), so it was never earning its keep, and what it
                      // actually did was trade contour lines for speckle -- the
                      // water read as grainy rather than wet. With enough bands
                      // there is no edge left to hide, which is the better fix.
  dimFar:.55,         // horizon brightness as a fraction of the foreground's
  // Lighting mix. Height-based lighting glows AT the crest, which reads as a
  // glowing ridge; real water glows where the surface TILTS toward the light,
  // which is on the flanks. Slope lighting puts two bright bands per wave with a
  // dark seam along the crest itself. Pure slope loses which way is up, so this
  // blends: 0 = all height (as before), 1 = all slope. 0.55 lit almost the whole
  // surface and washed out the troughs, so the default sits lower.
  slopeLit:.70,
  slopeSmooth:4,      // taps each side when low-passing slope along a line. 0 =
                      // raw per-segment slope, which speckles (see the draw loop).
  litRange:.95,       // lit value that maps to full brightness. Lower = the
                      // shading reaches white sooner, so more of the water is
                      // in the bright half of the scale.
  litGamma:.75,       // curve on the shading. <1 lifts the mid-tones, which is
                      // where nearly all the surface sits.
  floor:.14,          // darkest a segment gets, as a fraction of full. Replaces
                      // the old hardcoded 0.65, which wasted 19 bands.
  // Foam: bright specks on the steepest crests only. The trigger is slope
  // normalised by the line's own amp*k, which is scale-free -- a fixed slope
  // threshold caught 8% of far lines and 60% of near ones, since slope scales
  // with amplitude. At 2.0 about 2-6% of segments foam, and it responds to
  // steepness the way it should: 0% at crest sharpness .2, ~10% at .7.
  foam:.45, foamAt:2.0,

  seed:7,             // reroll the per-line randomness
  randScale:8,        // lines per random anchor — how slowly randomness drifts
  randOct:4,          // octaves of detail on top of that drift
};
// Live tweaks are lost on reload unless saved. SET AS DEFAULT writes the current
// values here; RESET drops them and returns to the DEF block above.
const STORE='rws.defaults';
function loadSaved(){
  try{
    const raw=localStorage.getItem(STORE); if(!raw) return null;
    const o=JSON.parse(raw); if(!o||typeof o!=='object') return null;
    // Only accept keys DEF knows about, so a stale save can't inject junk.
    const clean={};
    for(const k of Object.keys(DEF)) if(typeof o[k]==='number'&&isFinite(o[k])) clean[k]=o[k];
    return clean;
  }catch(e){ return null; }
}
const SAVED=loadSaved();
const P={...DEF,...(SAVED||{})};

// ---- draw -----------------------------------------------------------------
const COOL=[143,182,217], AMBER=[236,196,150], TAU=Math.PI*2;
// Warm-tint buckets: a segment's colour is COOL->AMBER by how much beam it
// caught. Banding by alpha alone would force one colour per band, so the beam
// gets its own axis and each band is drawn once per tint bucket it uses.
const TINTS=5;

// Per-line randomness, drawn ONCE per (seed, line count) and cached. Rolling new
// numbers every frame would make the lines flicker; what makes neighbours differ
// without jitter is that each line keeps its own offsets for good.
let RND=null, rndKey='';
function lineRandom(N,seed,scale,oct){
  const key=N+':'+seed+':'+scale.toFixed(2)+':'+oct;
  if(key===rndKey) return RND;
  let sd=(seed>>>0)||1;
  const rnd=()=>{sd^=sd<<13;sd>>>=0;sd^=sd>>17;sd^=sd<<5;sd>>>=0;return sd/4294967296;};

  // Coherent noise along the line index. Instead of an independent random number
  // per line, pick values at anchors every `scale` lines and interpolate between
  // them with a smoothstep — so a line's value is always close to its
  // neighbours' and the randomness itself reads as a slow wave along y.
  // `oct` octaves add finer detail on top at half amplitude each, which is what
  // keeps it from looking like a plain sine.
  function coherent(N,scale,oct){
    const out=new Float64Array(N);
    let amp=1, tot=0, sc=Math.max(1,scale);
    for(let o=0;o<Math.max(1,oct);o++){
      // Periodic: the anchor ring wraps, so noise[N-1] flows back into noise[0].
      // Chop slides the sampling position past both ends of this array, and
      // a non-periodic one leaves an 8x discontinuity at the join that sweeps
      // through the field as a visible crease.
      const nA=Math.max(2,Math.round(N/sc)), A=new Float64Array(nA);
      for(let a=0;a<nA;a++) A[a]=rnd()*2-1;
      for(let i=0;i<N;i++){
        const f=i/sc, a0=f|0, u=f-a0;
        const w=u*u*(3-2*u);              // smoothstep: flat slope at each anchor
        out[i]+=amp*(A[a0%nA]*(1-w)+A[(a0+1)%nA]*w);
      }
      tot+=amp; amp*=0.5; sc*=0.5;
    }
    for(let i=0;i<N;i++) out[i]/=tot;     // renormalise back to about [-1,1]
    return out;
  }

  const r={
    len:    coherent(N,scale,oct),
    amp:    coherent(N,scale,oct),
  };
  RND=r; rndKey=key; return r;
}

// Read a noise array at a fractional line position. Chop shifts where a
// line samples its randomness, and that shift is continuous — sampling at the
// nearest whole index instead would snap from line to line and flicker.
function sampleN(arr,f){
  const n=arr.length;
  // wrap rather than clamp: chop can push the sampling position well past
  // either end, and clamping would make every line out there read the same
  // value — a flat dead band at the horizon and in the foreground.
  let g=f%n; if(g<0)g+=n;
  const i0=g|0, u=g-i0, w=u*u*(3-2*u);
  return arr[i0]*(1-w)+arr[(i0+1)%n]*w;
}

// Rows are spaced so they crowd toward the horizon — the whole depth cue.
function rowY(i,N,hz){
  const u=i/(N-1);
  return hz + (H-hz)*Math.pow(u,P.persp);
}

let t=0, last=performance.now(), fps=60;

// ---------------------------------------------------------------------------
// The water itself.
//
// This is the discrete wave equation, the same eight lines every GPU water toy
// runs: each cell accelerates toward the average height of its four neighbours,
// velocity is damped, height integrates. Waves are not written down here --
// they are what the loop DOES. Reflection is what happens at a boundary,
// interference is what happens when two ripples meet, and groups fall out of
// dispersion. The sine version had to fake all three by hand.
//
// It runs on the CPU because it is cheap: 0.19ms per step at 320x160, about
// 1.5% of a frame. A GPU version would buy nothing and cost the build step.
//
// What it CANNOT do is sharp crests. The linear wave equation is symmetric by
// construction -- measured skew hovers at 0.0 no matter how it is forced --
// while real water has sharp crests over broad troughs. So the Gerstner warp
// stays, now applied to the simulated surface rather than to a sine.
// ---------------------------------------------------------------------------
const SIM={W:0,H:0,h:null,v:null,acc:0};

// A fixed 64-entry blue-ish noise table for dithering the alpha bands. Fixed
// rather than Math.random() per segment: random would make every segment
// shimmer independently every frame, which reads as static crawling over the
// water. Indexed by position along the line, so the pattern is stable frame to
// frame and the dither disappears into texture instead of animating.
const dith=(()=>{
  const a=new Float64Array(64); let sd=1013904223;
  for(let i=0;i<64;i++){sd=(sd*1664525+1013904223)>>>0; a[i]=sd/4294967296;}
  return a;
})();

function simInit(w,hh){
  SIM.W=w; SIM.H=hh;
  SIM.h=new Float32Array(w*hh); SIM.v=new Float32Array(w*hh); SIM.acc=0;
}

function simStep(){
  const {W:w,H:hh,h,v}=SIM;
  const k=Math.min(1.95,Math.max(0,P.stiff)), damp=1-Math.max(0,P.damp)*0.02;
  // Viscosity is wavelength-dependent in real water -- decay goes roughly as
  // 1/lambda^2, which is why chop dies in a few seconds and ocean swell crosses
  // an ocean. A single scalar damp cannot do that: it takes the same bite out of
  // a 15px ripple and a 26px swell, so everything faded in lockstep and a crest
  // crossed the whole field keeping 64% of its height.
  //
  // The 4-neighbour mean of v is a low-pass of the velocity field, so v minus
  // that mean is its SHORT-wavelength part. Damping only the residual leaves long
  // waves nearly untouched while chop decays fast. Costs one extra mean per cell.
  const visc=Math.max(0,P.visc)*0.25;
  // Breaking. Viscosity alone damps every wave by the same fraction whatever its
  // shape, and measured against real water that is the wrong mechanism entirely:
  // at this framing pure viscous decay gives a 1.2m wave a half-life of HOURS,
  // so it is not what makes real waves die. Breaking is. A wave steepens until
  // its face collapses, dumping energy all at once, and a gentle swell alongside
  // it keeps going untouched. That is why real water looks like it decays fast
  // while ocean swell still crosses oceans -- the loss depends on STEEPNESS, not
  // on time.
  //
  // So: past a slope threshold, bleed velocity in proportion to the excess. The
  // gradients are already loaded here for the wave equation, so this reuses them
  // -- no extra memory traffic, and comparing squared slope against a squared
  // threshold avoids a sqrt per cell. Measured at 0.25% of wall time.
  const brk=Math.max(0,P.breakAt), brkR=Math.max(0,P.breakRate);
  const doBrk=brkR>0;
  for(let y=1;y<hh-1;y++){
    const r=y*w;
    for(let x=1;x<w-1;x++){
      const i=r+x;
      const hl=h[i-1], hr=h[i+1], hu=h[i-w], hd=h[i+w];
      const avg=(hl+hr+hu+hd)*0.25;
      let nv=(v[i]+(avg-h[i])*k)*damp;
      const vAvg=(v[i-1]+v[i+1]+v[i-w]+v[i+w])*0.25;
      nv-=(nv-vAvg)*visc;
      if(doBrk){
        const gx=(hr-hl)*0.5, gy=(hd-hu)*0.5;
        const sq=gx*gx+gy*gy;
        // Clamped: this term is the only nonlinear one in the scheme, and an
        // unbounded state-dependent subtraction can outrun the CFL limit. Half
        // the velocity is the most any single step may remove.
        if(sq>brk) nv*=1-Math.min(.5,(sq-brk)*brkR);
      }
      v[i]=nv;
    }
  }
  for(let i=0;i<h.length;i++) h[i]+=v[i];

  // Open water, not a pool. Their demo is a box with hard walls and it rings
  // like a drum; ours has to run off past the edge of the frame.
  //   x wraps: no side walls at all, swell just keeps going.
  //   BOTH y edges get a damping skirt so waves leave instead of bouncing.
  //
  // The horizon edge used to be left clamped, on the theory that it was "live"
  // so swell could march in from beyond the frame. Nothing forces it there,
  // though, so in practice it was simply a wall: a single pulse sent at it came
  // back with 20% of its energy, and the returning waves stood against the
  // incoming ones. That standing pattern is what read as a POOL -- 25% of all
  // motion was whole rows heaving in unison, the bounce off the far end,
  // instead of crests travelling past. Absorbing at both ends drops that to a
  // few percent and the swell reads as passing through.
  for(let y=0;y<hh;y++){
    h[y*w]=h[y*w+w-2]; h[y*w+w-1]=h[y*w+1];
    v[y*w]=v[y*w+w-2]; v[y*w+w-1]=v[y*w+1];
  }
  const sk=Math.max(1,P.skirt|0);
  for(let y=hh-sk;y<hh;y++){
    const f=0.5+0.5*(hh-1-y)/sk, r=y*w;
    for(let x=0;x<w;x++){ h[r+x]*=f; v[r+x]*=f; }
  }
  const hsk=Math.max(1,P.hzSkirt|0);
  for(let y=0;y<hsk;y++){
    const f=0.5+0.5*y/hsk, r=y*w;
    for(let x=0;x<w;x++){ h[r+x]*=f; v[r+x]*=f; }
  }

  // No mean-subtraction here. It is tempting -- the standing pattern shows up
  // as rows bobbing -- but for swell travelling along y the row mean IS the
  // wave: a crest running along x lifts that whole row as it passes. Removing
  // per-row means would erase the swell and keep only the cross-swell texture.
  // The standing pattern is fixed at its source instead: waves that reflect
  // (absorbed at both ends now) and gusts that radiate backwards (see simGust).


  // Backstop. The clamp above keeps the scheme inside its stability limit, but
  // a big enough wind on a small enough grid can still pump energy in faster
  // than the skirt takes it out, and an unbounded height field renders as a
  // white screen rather than as anything recognisable. Check occasionally --
  // every step would cost more than the simulation -- and if the surface has
  // run away, scale the whole field back rather than clearing it, so the water
  // sags instead of blinking out.
  if((SIM.tick=(SIM.tick|0)+1)%30===0){
    let e=0;
    for(let i=0;i<h.length;i+=7) e+=h[i]*h[i];
    const rms=Math.sqrt(e/(h.length/7));
    if(!isFinite(rms) || rms>3){
      if(!isFinite(rms)){ h.fill(0); v.fill(0); }
      else { const f=3/rms; for(let i=0;i<h.length;i++){ h[i]*=f; v[i]*=f; } }
    }
  }
}

// Wind forcing. Point drops (their raindrops) give skew +1.4 -- pond, not sea.
// Full-width crest lines give skew 0.0 and just rebuild the sine problem. A
// localized elliptical patch of ripple is the middle: a gust hitting one bit of
// water, which then spreads and interferes on its own.
let gustSeed=12345, gustAcc=0;
function grnd(){gustSeed^=gustSeed<<13;gustSeed>>>=0;gustSeed^=gustSeed>>17;gustSeed^=gustSeed<<5;gustSeed>>>=0;return gustSeed/4294967296;}
function simGust(){
  const {W:w,H:hh,h,v}=SIM;
  // Gusts carry a HEADING. Round gusts dropped at random places make a pond:
  // energy radiates outward equally in every direction, so the field is
  // isotropic and there is no swell to look at. Measured, the old forcing sat
  // at anisotropy 1.0 (mean |dh/dx| over |dh/dy|), and no combination of size,
  // rate and length moved it off 1.0 without collapsing to 2-4 huge waves --
  // the sliders traded density against direction and could not give both.
  //
  // Real water gets its direction from wind fetch: the wind blows one way, so
  // successive gusts reinforce the same crest lines instead of cancelling.
  // Modelling that is one rotation. Each gust is an ellipse elongated ALONG
  // the crest (across the travel direction) carrying a sinusoid whose phase
  // advances only along travel, and headings are drawn from a narrow spread
  // around windDir rather than the full circle. That lands at anisotropy 0.30,
  // with the crests running across the view and marching toward the viewer.
  // A SECOND SWELL, crossing the first. With one train the surface has 69.5% of
  // its gradient energy inside a single 30-degree band, so crests only ever
  // stack -- they superpose and pass through, and nothing cancels. Real water
  // almost always carries more than one train (local wind sea over a swell from
  // an older, distant storm), and the moments where a crest briefly doubles or
  // flattens out are those two trains crossing. Widening windSpread does NOT
  // produce this: it blurs one train into mush rather than adding a second
  // direction. So gusts are drawn from one of two headings.
  const second = grnd() < P.swell2;
  const base = second ? P.windDir + P.swell2Ang : P.windDir;
  const th = base + (grnd()-0.5)*2*P.windSpread;
  // Waves are BORN UPWIND, off-frame, and travel in. Spawning across the whole
  // visible depth meant crests materialised in the middle of the scene, which
  // no real water does -- swell always arrives from somewhere. The grid carries
  // a fetch band above the first drawn row that is simulated but never seen;
  // gusts land there and march into view already formed.
  const cx=grnd()*w|0;
  const cy=(P.hzSkirt|0)+1+grnd()*Math.max(1,P.fetch)|0;
  // The crossing train is longer-period. It is also STRONGER than the main train,
  // which looks wrong written down but is what the measurement demanded: the
  // short train is steeper for the same height, so at equal amplitude it owns the
  // gradient histogram and the long swell never resolves as its own direction.
  // At swell2Amp .85 the second peak was 24% of the first; at 1.4 it is 79%.
  const gs = P.gustSize * (second ? P.swell2Len : 1);
  // Footprint does NOT follow wavelength. Scaling both together made the long
  // swell's stamp 127px across a 156px-deep field -- one gust covering the whole
  // pool lifts everything at once instead of drawing a crest line, so its angular
  // histogram came out flat (5% peak vs 13% for the short train) and the surface
  // read as "one direction plus mush". A long swell has LONG CRESTS, not a bigger
  // blob: stretch the wavelength, keep the patch the size of the base gust.
  const fp = P.gustSize;
  const along =Math.max(3,fp*0.9);   // extent along travel
  const across=Math.max(3,fp*2.2*(second?P.swell2Crest:1));   // crest length, the long axis
  const ph=grnd()*TAU, str=P.wind*0.10*(second?P.swell2Amp:1);
  // Wavelength follows gust size. Setting it independently (the old gustLen)
  // let short waves carry big-wave amplitude, which crosses the ropes over each
  // other -- water never does that, and it read as grass rather than a surface.
  const kk=2*Math.PI/Math.max(2,gs*0.9);
  const ct=Math.cos(th), st=Math.sin(th);
  const R=Math.ceil(Math.max(along,across));
  for(let dy=-R;dy<=R;dy++){
    const y=cy+dy; if(y<1||y>=hh-1) continue;
    for(let dx=-R;dx<=R;dx++){
      const u  =  dx*ct + dy*st;   // along travel
      const vv = -dx*st + dy*ct;   // along crest
      const d=Math.hypot(u/along, vv/across);
      if(d>=1) continue;
      const x=((cx+dx)%w+w)%w;
      const env=str*(0.5+0.5*Math.cos(d*Math.PI));
      // Launch the gust ALREADY MOVING downwind. Adding height alone makes a
      // bump that collapses and radiates both ways, so half of every gust ran
      // backwards toward the horizon and stood against the waves coming the
      // other way -- measured, 24 of 70 frames drifted the wrong way. Setting
      // the velocity in quadrature with the height (v = -c dh/du) is the
      // standard way to launch a one-way wave: the pair reinforces downwind and
      // cancels upwind.
      h[y*w+x]+=Math.sin(u*kk+ph)*env;
      v[y*w+x]-=Math.cos(u*kk+ph)*env*kk*P.gustDir;
    }
  }
}

// Sample the height field at a fractional grid position, bilinear so ropes
// glide across cells instead of stepping between them.
function simAt(fx,fy){
  const {W:w,H:hh,h}=SIM;
  let x0=Math.floor(fx), y0=Math.floor(fy);
  const tx=fx-x0, ty=fy-y0;
  y0=Math.max(0,Math.min(hh-2,y0));
  const xa=((x0%w)+w)%w, xb=((x0+1)%w+w)%w;
  const r0=y0*w, r1=r0+w;
  return (h[r0+xa]*(1-tx)+h[r0+xb]*tx)*(1-ty)
       + (h[r1+xa]*(1-tx)+h[r1+xb]*tx)*ty;
}

// Same read, but averaged over a footprint. Perspective means a far rope
// covers many grid cells in the depth it spans while a near rope covers a
// fraction of one; sampling both at a point aliases the far rows into hard
// vertical bands -- the grid showing through as scenery. `fw` is how many
// cells this rope's row is responsible for, so each one averages exactly the
// water it actually covers.
function simAtBox(fx,fy,fw){
  if(fw<=1.2) return simAt(fx,fy);
  const n=Math.min(6,Math.max(2,Math.round(fw)));
  let a=0;
  for(let q=0;q<n;q++) a+=simAt(fx,fy+(q/(n-1)-0.5)*fw);
  return a/n;
}

// --- Lighthouse ------------------------------------------------------------
// A steady orbit reads as a metronome behind text, so the lamp does one fast
// eased sweep and then goes dark for a randomised gap. BEAM.a is the current
// beam bearing in radians (0 = pointing straight at the viewer, +/- = off to
// the sides); BEAM.on is 0 while dark.
const BEAM={next:4, until:0, dir:1, left:0, on:0, a:0, lx:0, elev:.12};
const GUARD={on:0, x0:0, x1:0, y1:0};
// Gradient objects are expensive to build and only change when the geometry or
// the beam state does, so they are rebuilt on a key rather than every frame.
const GRAD={val:{}, key:{}};
// Reused segment buckets for the draw pass, so a frame allocates nothing.
const DRAW={buf:null, n:0};
function grad(name,key,make){
  if(GRAD.key[name]!==key){ GRAD.key[name]=key; GRAD.val[name]=make(); }
  return GRAD.val[name];
}
function beamStep(t){
  if(P.beam<=0){BEAM.on=0;return;}
  if(t>=BEAM.next && BEAM.left<=0){
    // Schedule a fresh burst: one sweep, or occasionally two back to back.
    const n=(P.beamDouble|0)>0 && Math.random()<1/(P.beamDouble|0) ? 2 : 1;
    // A lamp rotates one way, so every sweep runs the same direction. Viewed
    // from the water with the light up on the right, clockwise carries the
    // beam right-to-left, out toward open sea.
    BEAM.left=n; BEAM.dir=-1;
    BEAM.until=t+P.beamSweep;
  }
  if(BEAM.left>0 && t<BEAM.until){
    const k=1-(BEAM.until-t)/Math.max(.01,P.beamSweep); // 0..1 across the sweep
    // Ease: a real lamp rotating at constant rate crosses the field fastest
    // when it points at you, because the bearing is a rotation projected onto
    // a plane. smoothstep-inverse gives that accelerate-through-middle feel.
    const e=k<.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2;
    const span=Math.PI*0.62;
    BEAM.a=BEAM.dir*(-span/2+e*span);
    BEAM.on=1;
  } else if(BEAM.left>0){
    BEAM.left--;
    if(BEAM.left>0){ BEAM.until=t+P.beamSweep; }        // double: go again now
    else {
      const lo=Math.min(P.beamGapMin,P.beamGapMax), hi=Math.max(P.beamGapMin,P.beamGapMax);
      BEAM.next=t+lo+Math.random()*(hi-lo);
    }
    BEAM.on=0;
  } else BEAM.on=0;
}

function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  fps+= ((1/Math.max(1e-4,dt))-fps)*0.08;
  if(!WATER.paused) t+=dt;
  beamStep(t);

  if(BARE===0){                       // floor: clear a canvas, nothing more
    g.globalCompositeOperation='source-over';
    g.fillStyle='#070A10'; g.fillRect(0,0,W,H);
    bareReport(fps,0);
    if(WATER.onFrame) WATER.onFrame(fps,0,DPR);
    requestAnimationFrame(tick); return;
  }

  // Horizon, floored below the masthead copy. Measured at 1100x560: the copy
  // bottom (201px) sits past a 0.34*H horizon (190px) and the white wave lines
  // run straight under the intro paragraph -- contrast 3.14 average and 1.0
  // worst case, i.e. text pixels the same colour as the water. That is the
  // water itself, not the beam: with the beam off it was still 3.14, and with
  // the water off it was 7.37. Below about 591px of viewport height the layout
  // simply has no room, so the horizon yields instead of the text.
  let hz=H*P.horizon;
  if(P.copyClear>0){
    // .copy in the lab file, .masthead on the live page -- whichever copy block
    // the horizon has to clear.
    const ce=document.querySelector('.copy, .masthead');
    if(ce){
      // Relative to the CANVAS, not the viewport. Both rects are viewport-based,
      // so subtracting cancels the scroll offset -- otherwise scrolling the page
      // walks the copy up the screen and drags the horizon along with it.
      const cb=ce.getBoundingClientRect().bottom-cv.getBoundingClientRect().top+P.copyClear;
      if(cb>hz) hz=Math.min(H*0.82,cb);}
  }
  const N=P.lines|0;
  // Where the lamp sits on screen: a fixed point on the horizon, off to one
  // side. The beam sweeps from here, so the glare path converges on it.
  // With the headland on, the lamp is pinned to the top of the tower so the
  // glare path converges on the light the viewer can actually see. CLIFF is
  // filled here and drawn after the water, since the water composites with
  // 'lighter' and would glow straight through a clipped silhouette.
  const CLIFF={on:P.cliff>0&&P.cliffH>0, x:W*P.cliffX, top:0, lampX:0, lampY:0};
  let lampX, lampY;
  if(CLIFF.on){
    CLIFF.top=hz-H*P.cliffH;
    CLIFF.lampX=CLIFF.x+(W-CLIFF.x)*0.42;
    CLIFF.lampY=CLIFF.top-H*P.towerH;
    lampX=CLIFF.lampX; lampY=CLIFF.lampY;
  } else { lampX=W*P.lampX; lampY=hz-2; }
  // Masthead guard box, in CSS px, refreshed each frame so it tracks layout.
  // Read from the DOM rather than hardcoded: the copy is clamp()-positioned and
  // its height changes with wrapping, so a fixed rect would drift.
  if(P.beamGuard>0){
    const ce=document.querySelector('.copy, .masthead');
    if(ce){const r=ce.getBoundingClientRect();
      GUARD.on=1; GUARD.x0=r.left; GUARD.x1=r.right; GUARD.y1=r.bottom;
    } else GUARD.on=0;
  } else GUARD.on=0;

  BEAM.lx=lampX;
  BEAM.elev=0.12+(CLIFF.on?(P.cliffH+P.towerH)*1.1:0);

  g.fillStyle='#070A10';g.fillRect(0,0,W,H);
  const sky=grad('sky',hz,()=>{
    const q=g.createLinearGradient(0,0,0,hz);
    q.addColorStop(0,'#080C14');q.addColorStop(1,'#0E1620');return q;});
  g.fillStyle=sky;g.fillRect(0,0,W,hz);
  if(P.beam>0 && P.beamHaze>0){
    // Only a halo at the source -- no shaft. In clear air the beam is invisible
    // from the side and shows only where it lands; the solid cone-in-the-sky is
    // a fog effect, and drawing it is what makes stylised lighthouses read as
    // cartoons. Brightens while sweeping, never fully dark.
    const pulse=0.30+0.70*(BEAM.on?1:0);
    const rr=Math.max(8,W*0.075*P.beamHaze);
    const gl=grad('halo',lampX+'|'+lampY+'|'+rr+'|'+pulse+'|'+P.beamHaze,()=>{
      const q=g.createRadialGradient(lampX,lampY,0,lampX,lampY,rr);
      q.addColorStop(0,'rgba(240,169,76,'+(0.34*pulse*P.beamHaze).toFixed(3)+')');
      q.addColorStop(.45,'rgba(240,169,76,'+(0.10*pulse*P.beamHaze).toFixed(3)+')');
      q.addColorStop(1,'rgba(240,169,76,0)');return q;});
    g.fillStyle=gl;g.fillRect(lampX-rr,lampY-rr,rr*2,rr*2);
    g.fillStyle='rgba(255,214,150,'+(0.55*pulse).toFixed(3)+')';
    g.beginPath();g.arc(lampX,lampY,Math.max(1,W*0.0022),0,TAU);g.fill();
  }
  const sea=grad('sea',hz+'|'+H,()=>{
    const q=g.createLinearGradient(0,hz,0,H);
    q.addColorStop(0,'#0A121C');q.addColorStop(1,'#070A10');return q;});
  g.fillStyle=sea;g.fillRect(0,hz,W,H-hz);

  if(BARE===1){                       // gradients and lamp, no water at all
    bareReport(fps,0);
    if(WATER.onFrame) WATER.onFrame(fps,0,DPR);
    requestAnimationFrame(tick); return;
  }

  g.globalCompositeOperation='lighter';
  g.lineCap='round';

  // x wavenumber: waveLen is a fraction of the viewport, so kx = 2pi / (len*W)
  const kx=TAU/Math.max(1,P.waveLen*W);

  // Advance the water on a FIXED timestep, decoupled from the display rate.
  // The wave equation is only stable for a given step size, so feeding it a
  // variable dt would make the surface behave differently on a 60Hz and a
  // 120Hz screen -- and blow up on a slow frame. Capped so a background tab
  // returning after a stall catches up over a few frames instead of running
  // hundreds of steps in one.
  const gw2=Math.max(32,P.simW|0), gh2=Math.max(24,P.simH|0);
  if(!SIM.h || SIM.W!==gw2 || SIM.H!==gh2) simInit(gw2,gh2);
  if(!WATER.paused){
    SIM.acc=Math.min(SIM.acc+dt, 0.25);
    // Wave speed. The scheme's speed is fixed by its stiffness, which is pinned
    // near the CFL limit for stability -- so the only honest way to slow the
    // water is to advance it through less simulated time per real second.
    // Measured at speed 1.0 a crest crossed the whole field in 2.8s, which
    // reads as a puddle in a hurry; real swell at this framing takes 10-20s.
    const fixed=(1/120)/Math.max(.05,P.speed);
    let n=0;
    while(SIM.acc>=fixed && n<12){
      simStep();
      gustAcc+=(1/120)*P.gustRate;   // gusts stay on the real-time clock
      while(gustAcc>=1){ simGust(); gustAcc-=1; }
      SIM.acc-=fixed; n++;
    }
  }
  if(BARE===2){                       // sim runs, nothing reads it
    g.globalCompositeOperation='source-over';
    bareReport(fps,0);
    if(WATER.onFrame) WATER.onFrame(fps,0,DPR);
    requestAnimationFrame(tick); return;
  }

  const R=lineRandom(N,P.seed|0,P.randScale,P.randOct|0);

  // ---- pass 1: build every line -----------------------------------------
  // Every line is built before any is drawn, so the draw pass can run far-to-near
  // and let nearer ropes occlude the ones behind. One shared x grid across every
  // line, so point j of line i sits directly in front of point j of line i+1.
  // Point spacing widens on large viewports. Cost is linear in width, so a 2560
  // window was paying 2.7x a 900 one for the same scene -- and a wide display is
  // exactly where the frame budget is already tightest. Above the reference
  // width, spacing grows with sqrt(W/ref): 2560 lands at 75% of the linear point
  // count, 3440 at 65%, while anything at or below the reference is untouched.
  // Still monotonic, so a bigger screen never renders coarser in absolute terms.
  const wScale=P.ptScale>0?Math.max(1,Math.sqrt(W/Math.max(320,P.ptRef))):1;
  const step=Math.max(1,P.ptStep*wScale), M=Math.ceil((W+80)/step)+1;
  WATER.step=step; WATER.pts=M*N;   // shown in the hud; the scaling is otherwise invisible
  const PY_=new Float64Array(N*M);          // y of every point
  const baseY=new Float64Array(N), ampA=new Float64Array(N), nearA=new Float64Array(N);
  const kxA=new Float64Array(N);   // per-line wavenumber, needed by the foam test in pass 3

  for(let i=0;i<N;i++){
    const u=i/(N-1);
    const y0=rowY(i,N,hz);
    const near=Math.pow(u,1.25);

    // Chop drives where this line reads its randomness. Lines sitting in a
    // chop crest sample the noise further along than lines in a trough, so
    // the disorder itself travels front-to-back: bands of the field go choppy
    // and then settle. Because it moves the sampling POSITION rather than
    // adding another displacement, it does not compete with the rope's own
    // randomness for the same visual channel the way the old ripple height did.
    const yDepth0=1-u;

    // The sampling position DRIFTS rather than oscillating, and it drifts slowly.
    // A sin() here swept the read head forward and back, so the surface replayed
    // its own randomness in reverse on every return stroke. Marching it forward
    // fixed the reversals but not the stutter: at the obvious rate the head
    // scanned a whole noise anchor every tenth of a second, faster than the eye
    // integrates. The 0.12 is measured — at that rate a tracked point reverses
    // direction 4 times in 240 frames, the same floor as the plain swing with
    // all randomness off, while still travelling further than the swing alone.
    const fi=i + (yDepth0*TAU/Math.max(.02,P.chopLen))*P.chopAmt*P.randScale*0.16
               + t*P.chopRate*P.chopAmt*P.randScale*0.12;

    const rAmp=sampleN(R.amp,fi), rLen=sampleN(R.len,fi);

    const amp=(H-hz)*P.amp*(0.06+near*P.ampNear)
              *(1+rAmp*P.ropeRand*0.45);
    baseY[i]=y0; ampA[i]=amp; nearA[i]=near;

    const yDepth=1-u;
    const kxi = kx*(1+rLen*P.ropeRand*0.35);
    kxA[i]=kxi;
    // This line's row in the height field. Perspective squashes the far rows
    // on screen, and they should sample the water the same way: u^persp maps
    // screen row to true depth, so the far ropes really are further out on the
    // water rather than just drawn smaller.
    const gy=P.fetch + Math.pow(u,P.persp)*(SIM.H-1-P.skirt-P.fetch)*P.simDepth
             + (1-P.simDepth)*u*(SIM.H-1-P.skirt-P.fetch);
    // How many grid cells of depth this row spans: d(gy)/di. Near the horizon
    // u^persp is nearly flat so this is large; in front it approaches a cell.
    const uN=Math.min(1,(i+1)/(N-1));
    const gyN=P.fetch + Math.pow(uN,P.persp)*(SIM.H-1-P.skirt-P.fetch)*P.simDepth
              + (1-P.simDepth)*uN*(SIM.H-1-P.skirt-P.fetch);
    const gyW=Math.max(0.2,Math.abs(gyN-gy));

    const row=i*M;
    for(let j=0;j<M;j++){
      const x=-40+j*step;
      // Gerstner: shift the sample point toward the nearest crest before
      // evaluating height. Doing it as a fixed-point iteration keeps the line
      // single-valued -- a direct x displacement can fold the wave over itself
      // at high steepness, which reads as tearing.
      // Where this point sits on the water, in grid cells. x wraps with the
      // simulation; y is the line's true distance into the scene, so the rows
      // sample the field with the same perspective compression they are drawn
      // with -- far ropes read a thin sliver of water, near ropes a wide one.
      const gx=(x/W)*SIM.W*P.simTile;
      // Gerstner, now warping the SAMPLE POSITION on a simulated surface rather
      // than the phase of a sine. Same purpose: the linear wave equation has
      // symmetric crests and real water does not. Fixed-point so the line stays
      // single-valued instead of folding over at high steepness.
      let sx=gx;
      if(P.steep>0){
        const s0=gx;
        const gi=P.gerstner|0;
        for(let q=0;q<gi;q++) sx=s0+P.steep*3.0*simAtBox(sx,gy,gyW)*P.simGain;
      }
      let z=simAtBox(sx,gy,gyW)*P.simGain;
      PY_[row+j]=y0 - z*amp;
    }
  }

  if(BARE===3){                       // geometry computed, nothing stroked
    g.globalCompositeOperation='source-over';
    bareReport(fps,N);
    if(WATER.onFrame) WATER.onFrame(fps,N,DPR);
    requestAnimationFrame(tick); return;
  }

  // ---- pass 3: draw ------------------------------------------------------
  // Buckets are GLOBAL, not per line. They used to be allocated inside this
  // loop, so the batching only ever grouped a single line's segments: 120 lines
  // x ~8 occupied bands x 2 strokes came to ~1980 stroke() calls per frame
  // rather than the few hundred the banding exists to achieve. Compositing is
  // 'lighter' and therefore order-independent, so segments from different lines
  // can share one path. lineWidth varies per line, so it becomes a third bucket
  // axis quantised into WSTEPS, and alpha folds into the band index because
  // `base` is per-line as well.
  // Width is a bucket axis, so it multiplies the stroke count directly: at 6
  // steps a 41-band field costs 246 buckets rather than 41. The visible spread
  // is about 1.5px of line width across the whole field, so 2 steps carries the
  // near/far weight difference and the rest was paying 3x for nothing.
  const BANDS=P.bands|0, WSTEPS=Math.max(1,P.wSteps|0);
  const NBUCK=BANDS*TINTS*WSTEPS;
  if(!DRAW.buf || DRAW.n!==NBUCK){
    DRAW.buf=[]; for(let q=0;q<NBUCK;q++)DRAW.buf.push([]); DRAW.n=NBUCK;
  } else {
    for(let q=0;q<NBUCK;q++) if(DRAW.buf[q].length) DRAW.buf[q].length=0;
  }
  const bucket=DRAW.buf, foamAll=[];
  const lwLo=0.5*P.width, lwHi=2.0*P.width, lwSpan=Math.max(1e-6,lwHi-lwLo);
  for(let i=0;i<N;i++){
    const row=i*M, y0=baseY[i], amp=ampA[i], near=nearA[i], kxi=kxA[i];

    const pts=[];
    for(let j=0;j<M;j++) pts.push([-40+j*step, PY_[row+j]]);

    // Taubin smoothing along the line itself: each point slides toward the
    // midpoint of its two neighbours in x. Every shrinking pass (+lam) is
    // paired with an expanding one (-mu) so repeated passes do not flatten the
    // wave. Endpoints stay pinned so the line still spans the full width.
    if(P.smooth>0 && P.smoothPass>0){
      const lam=0.6*P.smooth, mu=-0.63*P.smooth, n=pts.length;
      const by=new Float64Array(n);
      const relax=f=>{
        for(let k2=0;k2<n;k2++) by[k2]=pts[k2][1];
        for(let k2=1;k2<n-1;k2++) pts[k2][1]=by[k2]+f*((by[k2-1]+by[k2+1])*0.5-by[k2]);
      };
      for(let q=0;q<P.smoothPass;q++){relax(lam);relax(mu);}
    }

    // Depth ramp for brightness. This used to be a hardwired 9x from horizon
    // to front, which is why the back rows looked dim and, because you cannot
    // see motion you cannot see, also looked FLAT -- the amplitude complaint
    // was partly a brightness one. Real water does not dim with distance;
    // haze is slight over a few hundred metres and a glancing angle reflects
    // MORE sky, so distant water often reads brighter. dimFar is the fraction
    // of near brightness the horizon keeps: 1 = no ramp at all.
    const dim=P.dimFar+(1-P.dimFar)*near;
    const base=0.33*dim*P.bright;
    const lwLine=(0.5+near*1.5)*P.width;
    const wi=Math.max(0,Math.min(WSTEPS-1,((lwLine-lwLo)/lwSpan*WSTEPS)|0));
    // Alpha bands. Every segment in a band is stroked at ONE alpha, so this is
    // literally colour quantization and the band count is the bit depth: at 6
    // the whole surface had only 6 possible brightnesses, a mean error of 24%
    // and 37%-of-base jumps between neighbours -- visible as posterized
    // terracing once the simulated surface gave the light something detailed
    // to fall on. The sine version hid it because its brightness varied slowly.
    //
    // Stroking every segment at its true alpha is the correct fix and costs 76x
    // the path operations. Cost is LINEAR in band count though, so buying more
    // bands is the cheap way out: 32 puts the step at ~3% of range, under what
    // the eye picks up on a smooth gradient, for 5x the path ops on a frame
    // that was running at twice its target.
    // Slope is a finite difference between ADJACENT samples, so it is inherently
    // high-frequency: every bit of grid noise lands in it at full strength. Measured
    // along real lines, lighting from slope alone reverses direction sample-to-sample
    // 15% of the time (mean jump 0.082 of full range); lighting from crest alone
    // flips 4% (jump 0.017). That alternation IS the dither-looking speckle -- it is
    // not the crest term, and not the band quantization. Low-passing slope along the
    // line keeps its tonal range (which crest lacks: crest is hard-zero 54% of the
    // time) while removing the flicker. slopeSmooth is the tap count; 0 disables.
    const sm=P.slopeSmooth|0;
    const rawSl=new Float32Array(pts.length), smSl=new Float32Array(pts.length);
    for(let j=1;j<pts.length;j++)
      rawSl[j]=Math.min(2.5,Math.abs(pts[j][1]-pts[j-1][1])/step*14);
    if(sm>0){
      for(let j=1;j<pts.length;j++){
        let acc=0,n=0;
        for(let d=-sm;d<=sm;d++){const k=j+d; if(k>=1&&k<pts.length){acc+=rawSl[k];n++;}}
        smSl[j]=acc/n;
      }
    } else smSl.set(rawSl);
    for(let j=1;j<pts.length;j++){
      const a2=pts[j-1], b2=pts[j];
      const crest=Math.max(0,(y0-a2[1])/(amp+.001));
      // |dy/dx| over the segment, low-passed along the line (see above).
      const slope=smSl[j];
      // scale-free: divides out this line's own amplitude and wavenumber
      const nslope=Math.abs(b2[1]-a2[1])/step/(amp*kxi+1e-6);
      // Normalise the lighting into 0..1 before it becomes brightness.
      // The old form was base*(0.65 + lit*crest), and the constant 0.65 was a
      // floor so troughs never vanished -- but as a CONSTANT it ate 19 of the 64
      // brightness bands before any shading happened, and lit itself only spans
      // about 0..0.9. Measured, that left 17 bands in use, 10 of them carrying
      // everything, all clumped between band 18 and 27: a quarter of the range,
      // which is why the water read as "bright lines and dim lines" with nothing
      // in between. Mapping lit through its own range and applying a gamma uses
      // the whole scale, and `floor` stays available as a real minimum.
      let lit=crest*(1-P.slopeLit) + slope*P.slopeLit;
      // Lighthouse. The beam is an angular wedge in the horizontal plane: this
      // segment's bearing is its offset from screen centre divided by its depth,
      // so near segments need a big x offset to leave the cone and far ones a
      // small one -- that divergence is what makes the lit patch read as a cone
      // lying ON the water rather than a stripe painted over it.
      let hit=0;
      if(BEAM.on){
        // Depth from `near` (1 = foreground): the draw pass is a separate loop
        // from the build pass, so the build pass's yDepth is out of scope here.
        const bd=1-near;
        // Elevation grows with the tower: a light on a mesa throws a longer,
        // narrower glare path than one sitting at sea level.
        const bearing=Math.atan2((a2[0]-BEAM.lx)/W, BEAM.elev+bd*1.6);
        const d=Math.abs(bearing-BEAM.a);
        const hw=Math.max(.01,P.beamWidth);
        // Soft-edged wedge: full inside, falling to 0 across the outer `soft`.
        const inner=hw*(1-P.beamSoft);
        let cone=d<=inner ? 1
                 : d>=hw ? 0
                 : 1-(d-inner)/Math.max(1e-4,hw-inner);
        if(cone>0){
          if(GUARD.on){
            // Feather over `fx` px horizontally and `fy` px above the box's
            // bottom edge, so the beam fades out under the text instead of
            // ending on a hard line that would read as a rectangle.
            const fx=90, fy=70;
            const sx=a2[0]<GUARD.x0 ? (GUARD.x0-a2[0])/fx
                   : a2[0]>GUARD.x1 ? (a2[0]-GUARD.x1)/fx : 0;
            const sy=a2[1]>GUARD.y1 ? (a2[1]-GUARD.y1)/fy : 0;
            const away=Math.min(1,Math.max(sx,sy));
            cone*=away+(1-away)*(1-P.beamGuard);
          }
        }
        if(cone>0){
          hit=cone*cone;
          // Specular: faces tilted toward the lamp bounce it at the viewer.
          // slope is |dy/dx| smoothed, so it stands in for how far this facet is
          // tilted out of horizontal -- crests glint, flat troughs stay dark.
          const glint=1+P.beamLift*Math.min(1,slope*0.8);
          lit+=P.beam*cone*cone*glint*0.45;
        }
      }
      const litN=Math.min(1,Math.max(0,lit/Math.max(.01,P.litRange)));
      const shade=Math.pow(litN,Math.max(.05,P.litGamma));
      // crest contrast scales the SHADING against the floor, so 0 gives flat
      // lines at the floor value and higher values open the gap between lit and
      // unlit. It used to sit outside as *(1+P.crest) -- a flat multiplier on the
      // whole line, which is just `bright` under another name, and with bright at
      // 1.55 it pinned 90-100% of segments at alpha 1. One band held everything:
      // the tonal range existed in `shade` and was then flattened against the
      // ceiling. Keep the gain low enough that shade still has somewhere to go.
      let al=base*Math.min(1,P.floor+(1-P.floor)*shade*P.crest);
      if(al<0.004)continue;
      // Dither. More bands shrink the steps but leave the boundaries in fixed
      // places, so what is left of the terracing still runs as continuous
      // CONTOUR LINES across the water -- the eye finds an edge far more
      // easily than a 3% brightness difference. Jittering each segment by up
      // to half a band converts that edge into noise: a segment near a
      // boundary lands on either side at random, so the transition scatters
      // instead of drawing a line. Costs one multiply and keeps the batching.
      // Amplitude scales with dithAmt, not a fixed half-band: at 32 bands a
      // full +/-0.5 jitter is a large fraction of the remaining error budget
      // and shows up as speckle, and because the jitter is one-sided in
      // aggregate it also lifts the mean brightness. 0.35 of a band clears the
      // contours without the noise reading as grain.
      // Band straight off the normalised shade: the whole 0..BANDS range is
      // reachable now, instead of the 25% the old al/(base*2.2) mapping allowed.
      // Final alpha, not per-line shade: `base` carries the depth fade, so it
      // has to be inside the quantisation for a global bucket to be one colour.
      const aFinal=base*2.2*(P.floor+(1-P.floor)*shade);
      const fb=aFinal/(0.33*P.bright*2.2)*BANDS + (dith[j&63]-0.5)*P.dithAmt;
      const bi=Math.max(0,Math.min(BANDS-1,fb|0));
      const ti=Math.min(TINTS-1,(hit*P.beamWarm*TINTS)|0);
      bucket[(bi*TINTS+ti)*WSTEPS+wi].push(a2,b2);
      if(P.foam>0 && nslope>P.foamAt) foamAll.push(a2,b2);
    }

  }

  // One flush for the whole field. Empty buckets cost nothing, so the stroke
  // count is the number of (alpha, tint, width) combinations actually present.
  const maxA=0.33*P.bright*2.2;
  for(let b=0;b<BANDS;b++){
    const al=maxA*(b+0.5)/BANDS;
    for(let ti=0;ti<TINTS;ti++){
      const m=TINTS>1?ti/(TINTS-1):0;
      let r=COOL[0]+(AMBER[0]-COOL[0])*m,
          gg=COOL[1]+(AMBER[1]-COOL[1])*m,
          bb=COOL[2]+(AMBER[2]-COOL[2])*m;
      const sat=P.beamSat, lum=0.2126*r+0.7152*gg+0.0722*bb;
      r=lum+(r-lum)*sat; gg=lum+(gg-lum)*sat; bb=lum+(bb-lum)*sat;
      const col=(r|0)+','+(gg|0)+','+(bb|0);
      for(let wq=0;wq<WSTEPS;wq++){
        const seg=bucket[(b*TINTS+ti)*WSTEPS+wq];
        if(!seg.length)continue;
        const lw=lwLo+lwSpan*(wq+0.5)/WSTEPS;
        g.beginPath();
        for(let k2=0;k2<seg.length;k2+=2){g.moveTo(seg[k2][0],seg[k2][1]);g.lineTo(seg[k2+1][0],seg[k2+1][1]);}
        g.strokeStyle='rgba('+col+','+(al*0.20).toFixed(4)+')';g.lineWidth=lw*P.glow;g.stroke();
        g.strokeStyle='rgba('+col+','+Math.min(1,al).toFixed(4)+')';g.lineWidth=lw;g.stroke();
      }
    }
  }

  // Foam sits on top, whiter and tighter than the water beneath it.
  if(foamAll.length){
    g.beginPath();
    for(let k2=0;k2<foamAll.length;k2+=2){g.moveTo(foamAll[k2][0],foamAll[k2][1]);g.lineTo(foamAll[k2+1][0],foamAll[k2+1][1]);}
    g.strokeStyle='rgba(226,240,255,'+Math.min(1,0.33*P.bright*2.2*P.foam).toFixed(4)+')';
    g.lineWidth=(lwLo+lwSpan*0.75)*1.5; g.stroke();
  }
  g.globalCompositeOperation='source-over';

  // --- Headland ------------------------------------------------------------
  // Drawn last, opaque: it occludes the water by painting over it. A clip on
  // the water pass would not work, because 'lighter' compositing means the
  // rope lines add to whatever is beneath them rather than being hidden by it.
  if(CLIFF.on){
    const x0=CLIFF.x, top=CLIFF.top, base=hz+H*0.012;
    // Deterministic jitter so the rock is steady frame to frame -- a fresh
    // Math.random() per frame would make the silhouette boil.
    const rk=(i)=>{const v=Math.sin(i*12.9898+P.seed*3.71)*43758.5453;return v-Math.floor(v);};
    const rough=P.cliffRough;

    g.beginPath();
    g.moveTo(W,base);
    g.lineTo(x0,base);
    // Face: a steep scarp, not a dome. Nearly vertical for most of the rise so
    // the top edge arrives as a defined shoulder -- that break is what reads as
    // a mesa. A gentler curve here rounds it into a hill.
    const FN=9, span=(W-x0);
    for(let i=0;i<=FN;i++){
      const u=i/FN;
      // Batter: the face leans back as it rises, and the jitter is applied
      // along it rather than only near the top, so the scarp reads as broken
      // rock instead of a cut edge.
      const x=x0+span*(0.16*u) + span*0.030*rough*(rk(i)-0.5);
      const y=base+(top-base)*Math.pow(u,0.40) + (base-top)*0.055*rough*(rk(i+40)-0.5);
      g.lineTo(x,y);
    }
    // Mesa top: flat, tilting very slightly inland, with small breaks only.
    const TN=6;
    for(let i=0;i<=TN;i++){
      const u=i/TN;
      const x=x0+span*(0.16+0.84*u);
      // Small, mostly-downward breaks: a mesa top is flat but not milled.
      const y=top - (base-top)*0.03*u + (base-top)*0.022*rough*rk(i+90);
      g.lineTo(x,y);
    }
    g.lineTo(W,top-(base-top)*0.03);
    g.closePath();
    g.fillStyle='#05080D';g.fill();

    // A faint lit rim on the seaward edge, brightening while the lamp sweeps.
    g.save();g.clip();
    const ri=(0.05+0.09*(BEAM.on?1:0)).toFixed(3);
    const rim=grad('rim',x0+'|'+top+'|'+base+'|'+ri,()=>{
      const q=g.createLinearGradient(x0,top,x0+(W-x0)*0.5,base);
      q.addColorStop(0,'rgba(236,196,150,'+ri+')');
      q.addColorStop(1,'rgba(236,196,150,0)');return q;});
    g.fillStyle=rim;g.fillRect(x0,top-20,W-x0,base-top+20);
    g.restore();

    // Tower: tapered, on the mesa, set in from the seaward edge.
    const tw=Math.max(3,W*0.0125), ty=CLIFF.lampY, tx=CLIFF.lampX;
    const tb=top+(base-top)*0.16;   // sunk into the rock, no visible gap
    g.beginPath();
    g.moveTo(tx-tw*0.72,tb);
    g.lineTo(tx-tw*0.46,ty+tw*0.5);
    g.lineTo(tx+tw*0.46,ty+tw*0.5);
    g.lineTo(tx+tw*0.72,tb);
    g.closePath();
    g.fillStyle='#080C12';g.fill();
    // Lantern room and cap.
    g.fillStyle='#05080D';
    g.fillRect(tx-tw*0.60,ty-tw*0.30,tw*1.20,tw*0.86);
    g.beginPath();
    g.moveTo(tx-tw*0.66,ty-tw*0.30);
    g.lineTo(tx+tw*0.66,ty-tw*0.30);
    g.lineTo(tx,ty-tw*1.05);
    g.closePath();g.fill();
    // The lit glass itself, so the source reads as a point on the structure.
    const lg=(0.34+0.62*(BEAM.on?1:0)).toFixed(3);
    g.fillStyle='rgba(255,222,168,'+lg+')';
    g.fillRect(tx-tw*0.30,ty-tw*0.14,tw*0.60,tw*0.54);
  }

  bareReport(fps,N);
  if(WATER.onFrame) WATER.onFrame(fps,N,DPR);
  requestAnimationFrame(tick);
}
// The panel reaches in through these; nothing else does.
WATER.P=P; WATER.DEF=DEF; WATER.STORE=STORE; WATER.fit=fit;

// Reduced motion: draw one frame so the hero is not blank, then stop. Honour a
// later change of the setting too -- some people toggle it while reading.
const RM=matchMedia('(prefers-reduced-motion: reduce)');

// A hidden tab already throttles rAF to ~1Hz, but an off-screen hero in a long
// page does not. Both waste a wave simulation nobody is looking at.
let visible=true;
if('IntersectionObserver' in window){
  new IntersectionObserver(es=>{
    const wasVisible=visible; visible=es[0].isIntersecting;
    if(visible&&!wasVisible&&!RM.matches) requestAnimationFrame(frame);
  },{threshold:0}).observe(cv);
}

// The gate. frame() re-arms through here, so a hidden or reduced-motion hero
// stops the loop entirely rather than spinning on a canvas nobody sees.
function tick(now){
  if(!visible||RM.matches) return;   // restarted by the observer / media listener
  frame(now);
}
// One frame either way, so the hero is never blank -- then the gate decides.
requestAnimationFrame(RM.matches?frame:tick);
RM.addEventListener('change',()=>{ if(!RM.matches) requestAnimationFrame(tick); });

})();
