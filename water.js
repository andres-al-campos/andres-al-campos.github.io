// Animated water for the hero, on the GPU.
//
// The wave equation runs as a fragment shader over a 340x210 float texture --
// R = height, G = velocity, ping-ponged between two framebuffers. The lines are
// tessellated in a vertex shader: each segment becomes two triangles, which is
// what Canvas2D's stroke() did for free. Gusts stay on the CPU, where the random
// numbers and branching they need are cheap, and upload once per frame.
//
// This replaces a Canvas2D renderer that cost ~13.9ms of GPU time per frame
// against ~3.2ms here, measured with EXT_disjoint_timer_query. The old renderer
// is gone rather than kept as a fallback: it was slower than this path is on the
// machines that would need a fallback at all.
//
// Two things in here look like mistakes and are not:
//
//   * The sim texture is CLAMP_TO_EDGE and x is wrapped with fract() in the
//     shader, rather than using REPEAT. WebGL1 treats a non-power-of-two texture
//     with REPEAT as INCOMPLETE, and every texture2D on it silently returns
//     (0,0,0,1) -- no error, no warning, and the sim runs perfectly while reading
//     nothing but zeros.
//
//   * Lines carry their own edge antialiasing in the fragment shader. MSAA only
//     smooths where triangles meet, and a line's long edges are the silhouette of
//     a single quad, so without it every line has hard stair-stepped sides.
window.WATER = window.WATER || {};
(function(){
'use strict';
const cv=document.getElementById('scene');
if(!cv) return;
const gl=cv.getContext('webgl',{antialias:true,alpha:false,depth:false});
if(!gl) throw new Error('WebGL unavailable. This spike needs WebGL 1 with float '+
  'textures; in Firefox check webgl.disabled is false in about:config.');

// Float textures are not optional here: the sim stores height and velocity, both
// signed and both small, and 8-bit would quantise the whole field to mush.
const EXT_F=gl.getExtension('OES_texture_float');
if(!EXT_F) throw new Error('OES_texture_float missing. The wave sim stores signed '+
  'height/velocity per cell and cannot run in 8-bit. Try a different browser or GPU.');

const P={
  // --- geometry / framing (matches water.js) ---
  // Rows swing far more vertically than they are spaced apart, so they cross each
  // other constantly and the crossings read as a crosshatch -- the "pixelation".
  // Fewer rows and a smaller swing give each strand its own lane. The ratio of
  // swing to row spacing was 13-19x here; at these values it is 6-8x.
  lines:70, horizon:.34, persp:1.75,
  // Keeps the horizon below the masthead so body copy never sits on busy water.
  // Measured against the live page: with the water running under the intro the
  // contrast was 3.14 average and 1.0 worst case -- text pixels the same colour
  // as the water. That is the water itself, not the beam. Below about 591px of
  // viewport height the layout has no room, so the horizon yields instead.
  copyClear:26,       // px of water-free margin kept under the masthead copy
  // Segment length in CSS px. At 4.5 a segment spanned 9 device px and 2.1 sim
  // texels, so every curve was a polyline of straight chords sampled coarser
  // than the field it draws -- faceting, which looks like aliasing but is not.
  ptStep:2.0,
  amp:.046, ampNear:1.0,
  // Amplitude the farthest row keeps, as a fraction of the near field. At this
  // camera angle the horizon is nearly edge-on, so a wave a metre high covers a
  // pixel or two of screen -- the far rows should read as a flat line and let
  // depth come from spacing, not from swell they cannot resolve at that size.
  ampFar:.02,

  // --- the simulation (values carried over from water.js, already tuned) ---
  simW:340, simH:210,
  simGain:4,
  stiff:1.85,         // hard CFL ceiling at 2.0; see water.js
  breakAt:.0008,      // squared-slope threshold where a crest starts to break
  breakRate:6,        // how hard excess steepness is bled off
  visc:.35,           // short-wave-only viscosity
  damp:.12,           // per-step decay
  speed:.13,          // simulated seconds per real second
  gustDir:1.0,
  hzSkirt:6, fetch:34, skirt:20,
  wind:1.15, gustRate:34, gustSize:17,
  warmup:25,          // seconds of sim run before the first paint. 0 = start flat
  windDir:1.45, windSpread:.10,

  // --- stage 2: weather -----------------------------------------------------
  // The gust forcing above is a constant: every gust for the rest of time is the
  // same strength, so the sea reaches one energy level and sits there. Real water
  // is never in steady state -- it builds, holds, and eases over minutes. These
  // modulate wind strength and heading slowly so the surface has a history.
  gustVary:.55,       // per-gust strength jitter. 0 = every gust identical
  weather:.60,        // depth of the slow build/ease. 0 = steady wind
  // Rates are in SIM seconds and the sim runs at speed 0.13, so a real-time
  // period is 1/rate/0.13. These give ~26s and ~75s of wall clock: long enough
  // that the surface is not obviously cycling, short enough that someone who
  // looks for a few seconds sees it change rather than assuming it is static.
  weatherRate:.30,    // ~26s real
  veer:.22,           // how far the heading wanders, radians
  veerRate:.10,       // ~77s real
  lull:.30,           // chance a gust is skipped, thinning the field in the lulls
  swell2:.50, swell2Ang:.9, swell2Len:1.7, swell2Crest:0.7, swell2Amp:1.4,

  // --- look ---
  // widthNear was 1.5, giving far lines 0.5x and near ones 2.0x -- a 4:1 spread
  // that made the foreground read as a different drawing from the background.
  // Depth is carried by dimFar and the shading; width barely needs to help.
  // Width and brightness trade against each other under additive blending. At
  // width 1.25 / bright 1.55 a line reached full white inside a single pixel --
  // the fragment stage computed its edge ramp and the blend then clipped it flat,
  // which is a hard edge no amount of antialiasing can fix. Measured off the
  // drawing buffer, that profile was "44 255 40": background, saturated, back.
  // Spreading the same light over a wider line leaves room for the ramp to land.
  width:2.2, widthNear:.45, dimFar:.30, bright:.95,

  // --- stage 3: shading -----------------------------------------------------
  // Height-based lighting glows AT the crest, which reads as a glowing ridge.
  // Real water glows where the surface TILTS toward the light, which is on the
  // flanks -- that puts two bright bands per wave with a darker seam along the
  // crest itself. Pure slope loses which way is up, so this blends the two.
  slopeLit:.70,       // 0 = all height, 1 = all slope
  litRange:.95,       // lit value mapping to full brightness
  litGamma:.75,       // <1 lifts the mid-tones, where nearly all the surface sits
  floor:.14,          // darkest a segment gets, as a fraction of full
  crest:1.4,          // extra gain on the sharpest crests
  glow:2.2,           // width multiplier for the glow pass. 0 = no glow
  glowAmt:.20,        // its alpha, relative to the line

  // --- stage 3: the light ---------------------------------------------------
  // A position and a sweep, standing in for the lighthouse. Where the beam lands
  // the water lifts and warms; elsewhere it keeps the cool base colour.
  beam:1.0,           // master intensity. 0 = off
  lampX:.42,          // where the lamp sits across the screen, 0..1
  beamWidth:.30,      // angular half-width of the lit cone, radians
  beamSoft:.55,       // fraction of the cone that is soft edge
  beamLift:1.6,       // specular gain on crests facing the lamp
  beamWarm:1.0,       // how far lit water shifts toward amber
  beamSat:.72,        // amber saturation. 1 = full amber, 0 = neutral warm-white
  beamSweep:2.0,      // seconds for one crossing
  beamGapMin:8,       // seconds of dark between sweeps, low end...
  beamGapMax:20,      // ...and high. Randomised: a FIXED gap is still a metronome,
                      // just a sparser one, and a predictable beat behind copy
                      // pulls the eye off the text.
  beamDouble:6,       // odds of a double sweep, 1-in-N. 0 = never

  // --- stage 4: the lighthouse ----------------------------------------------
  // The structure the light comes from. With the headland on, lampX is ignored:
  // the lamp rides the top of the tower, so the glare path on the water converges
  // on the light the viewer can actually see rather than on a floating point.
  sky:.55,            // lift of the sky band above the flat ground. 0 = no sky.
                      // Not decoration: the rock is near-black, so without a
                      // lighter band behind it the headland has nothing to read
                      // against and simply vanishes.
  cliff:1,            // draw the headland. 0 = open water, lamp sits on the horizon
  cliffX:.70,         // where the cliff face meets the horizon, 0..1
  cliffH:.085,        // mesa top above the horizon, as a fraction of height
  cliffRough:.55,     // how broken the face and top edge are. 0 = clean
  towerH:.075,        // tower height above the mesa, fraction of height
  towerW:.0155,       // tower width, fraction of screen width
  lampPos:.14,        // where the tower stands on the mesa, 0 = seaward edge,
                      // 1 = off the right of frame. Real lighthouses sit out on
                      // the point, not back on the headland.
  // The headland is the nearest solid thing in frame, and at night the sky is
  // lighter than the land under it, not darker. Pure black rock on a near-black
  // sky gives about 1.4:1 and simply vanishes; this lifts it until the outline
  // reads without the rock ever looking lit.
  rockLift:2.8,       // overall value of the rock. 1 = the old near-black
  rockHaze:.75,       // extra lift at the base, where distance haze pales it
  rim:.34,            // lit rim on the seaward edge, brightening as the lamp sweeps
  rimBase:.55,        // how much rim survives between sweeps. 0 = dark when idle
  seed:7,             // reshuffles the rock jitter. Any integer
  // A halo, not a shaft. In clear air a beam is invisible from the side and shows
  // only where it lands; the solid cone-in-the-sky is a fog effect, and drawing it
  // is what makes stylised lighthouses read as cartoons.
  haze:.52,           // glow bloom around the lamp itself. 0 = bare point
  hazeBase:.60,       // how much halo survives between sweeps. 0 = dark when idle
  // Where the rock meets the sea there is nothing marking the line, so the two
  // dark masses run together. A thin pale band separates them the way real
  // distance haze does at a waterline.
  footHaze:.42,       // brightness of the band at the cliff foot. 0 = none
  // The beam sweeps behind the hero copy, and a moving bright wedge under text is
  // the one thing that actually hurts readability here. This holds it back.
  beamGuard:1.0,      // 0 = no guard, 1 = beam fully suppressed behind the copy
};
// The values as written in this file, captured BEFORE any saved blob is layered
// on top. 'reset to file' returns here; 'save as default' writes the current P
// over the stored copy, so a later reset returns to what you saved rather than
// to what I last typed.
const FILE_DEF={...P};

// Saved tuning is applied here, not in water-panel.js: the panel only loads once
// someone finds the easter egg, which is long after the first paint and after
// the geometry has been built from these numbers. Reading it there meant saved
// defaults silently did nothing until you opened the panel.
//
// Only keys already present in P are copied, and only finite numbers -- the blob
// is whatever an older version of the panel happened to write, and a stale or
// hand-edited key should not be able to introduce a param the renderer has no
// meaning for.
(function loadSaved(){
  let raw=null;
  try{ raw=localStorage.getItem('water.defaults'); }catch(e){ return; }
  if(!raw) return;
  let blob;
  try{ blob=JSON.parse(raw); }catch(e){ return; }
  if(!blob || typeof blob!=='object') return;
  for(const k in blob){
    if(!Object.prototype.hasOwnProperty.call(P,k)) continue;
    const v=blob[k];
    if(typeof v==='number' && isFinite(v)) P[k]=v;
  }
})();
const TAU=Math.PI*2;

let W=0,H=0,DPR=1;

// The horizon, pushed down if the masthead would otherwise overhang the water.
// Both the cliff builder and the line shader read this, so they cannot disagree
// about where the sea starts.
function horizonY(){
  let hz=H*P.horizon;
  if(P.copyClear>0){
    const ce=document.querySelector('.copy, .masthead');
    if(ce){
      // Relative to the CANVAS, not the viewport. Both rects are viewport-based,
      // so subtracting cancels the scroll offset -- otherwise scrolling the page
      // walks the copy up the screen and drags the horizon along with it.
      const cb=ce.getBoundingClientRect().bottom-cv.getBoundingClientRect().top+P.copyClear;
      if(cb>hz) hz=Math.min(H*0.82,cb);
    }
  }
  return hz;
}

function fit(){
  DPR=Math.min(2,devicePixelRatio||1);
  W=innerWidth; H=innerHeight;
  cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR);
  buildLines();
  buildCliff();
}

// ---------------------------------------------------------------- shaders ---
function sh(type,src){
  const o=gl.createShader(type);
  gl.shaderSource(o,src); gl.compileShader(o);
  if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))
    throw new Error('Shader compile failed: '+gl.getShaderInfoLog(o)+'\n'+src);
  return o;
}
function prog(vsSrc,fsSrc){
  const p=gl.createProgram();
  gl.attachShader(p,sh(gl.VERTEX_SHADER,vsSrc));
  gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fsSrc));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))
    throw new Error('Program link failed: '+gl.getProgramInfoLog(p));
  return p;
}

const VS_QUAD=`
attribute vec2 p; varying vec2 uv;
void main(){ uv=p*0.5+0.5; gl_Position=vec4(p,0.,1.); }`;

// One step of the wave equation. R = height, G = velocity.
// This is water.js simStep(), term for term.
const FS_SIM=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
uniform vec2 texel;
uniform float stiff, damp, visc, brkAt, brkRate;
uniform float skirtT, skirtB;

// x is periodic -- the sea runs off both sides into itself -- but y is not, so
// only s is wrapped. This is done in the shader rather than with REPEAT because
// the grid is 340x210: WebGL1 treats a non-power-of-two texture with REPEAT as
// INCOMPLETE, and every texture2D on it silently returns (0,0,0,1). No error, no
// warning, and the sim runs perfectly while reading nothing but zeros.
vec4 tap(vec2 p){ return texture2D(src, vec2(fract(p.x), clamp(p.y,0.001,0.999))); }

void main(){
  vec4 c=tap(uv);
  float h=c.r, v=c.g;

  vec4 L=tap(uv-vec2(texel.x,0.)), R=tap(uv+vec2(texel.x,0.));
  vec4 U=tap(uv-vec2(0.,texel.y)), D=tap(uv+vec2(0.,texel.y));

  float avg=(L.r+R.r+U.r+D.r)*0.25;
  float nv=(v+(avg-h)*stiff)*damp;

  // Wavelength-dependent viscosity. The 4-neighbour mean of v is a low-pass of
  // the velocity field, so v minus that mean is its SHORT-wavelength part.
  // Damping only the residual lets chop die fast while long swell carries.
  float vAvg=(L.g+R.g+U.g+D.g)*0.25;
  nv-=(nv-vAvg)*visc;

  // Breaking. Viscosity damps every wave by the same fraction whatever its
  // shape, which is the wrong mechanism: real waves die by steepening until the
  // face collapses, while a gentle swell alongside carries on untouched. So past
  // a slope threshold, bleed velocity in proportion to the excess.
  float gx=(R.r-L.r)*0.5, gy=(D.r-U.r)*0.5;
  float sq=gx*gx+gy*gy;
  // Clamped at half: this is the only nonlinear term in the scheme, and an
  // unbounded state-dependent subtraction can outrun the CFL limit.
  if(sq>brkAt) nv*=1.0-min(0.5,(sq-brkAt)*brkRate);

  float nh=h+nv;

  // Absorbing skirts at both y edges, so waves LEAVE instead of bouncing. A
  // reflecting far edge makes the field ring like a pool: returning waves stand
  // against incoming ones and whole rows heave in unison.
  float f=1.0;
  if(uv.y<skirtT)       f*=0.5+0.5*(uv.y/skirtT);
  if(1.0-uv.y<skirtB)   f*=0.5+0.5*((1.0-uv.y)/skirtB);

  gl_FragColor=vec4(nh*f, nv*f, 0., 1.);
}`;

// Line tessellation. Each segment becomes two triangles; a.z picks which side of
// the centreline this vertex sits on. Canvas2D's stroke() does this for free,
// and doing it by hand is the one genuinely fiddly part of the port.
const VS_LINE=`
precision highp float;
attribute vec3 a;                 // x = line index, y = column, z = corner (-1/+1)
uniform sampler2D sim;
uniform vec2 res;
uniform float N, M, step, hz, persp, amp, ampNear, ampFar;
uniform float simGain, simH, fetch, skirt, lineW, widthNear;
uniform float slopeLit, litRange, litGamma, floorLit, crestGain;
uniform float dpr;
uniform float beam, beamWidth, beamSoft, beamLift, beamPhase, beamOn;
uniform vec2 lampP;
uniform float guard;
uniform vec4 guardBox;   // x0,y0,x1,y1 in CSS px
uniform float glowW;                 // 0 for the core pass, >0 for the glow pass
varying float vNear;
varying float vLit;                  // 0..1 shading, before colour
varying float vWarm;                 // 0..1 how much beam this vertex catches
varying float vEdge;                 // -1..1 across the line, for edge fade
varying float vHalf;                 // half width in device px
varying float vCov;                  // <1 when the line is sub-pixel

float rowU(float i){ return (i+0.5)/N; }

// Grid position for a line/column, shared by the point and its slope taps so the
// two cannot drift apart.
vec2 gridAt(float i, float j){
  float u=rowU(i);
  float gy=fetch + pow(u,persp)*(simH-1.0-skirt-fetch);
  float x=-40.0 + j*step;
  return vec2(fract(x/res.x), gy/simH);
}
float hAt(vec2 g){ return texture2D(sim,g).r; }

vec2 pointAt(float i, float j){
  float u=rowU(i);
  // Rows are spaced by a power law, so they crowd toward the horizon the way a
  // receding plane does.
  float y0=hz + (res.y-hz)*pow(u,persp);
  float near=pow(u,1.25);
  // Sample BELOW the fetch band: those rows are simulated but never drawn, so
  // waves arrive already formed instead of materialising mid-scene.
  float x=-40.0 + j*step;
  float hgt=hAt(gridAt(i,j))*simGain;
  float a2=(res.y-hz)*amp*(ampFar+near*ampNear);
  return vec2(x, y0 - hgt*a2);
}

void main(){
  vec2 p0=pointAt(a.x,a.y);
  vec2 p1=pointAt(a.x,min(a.y+1.0,M-1.0));
  vec2 dir=normalize(p1-p0+vec2(1e-6,0.));
  vec2 nrm=vec2(-dir.y,dir.x);
  // How far from horizontal this segment runs. The quad is offset along nrm, so
  // on a steep flank the stroke tilts with it and its VERTICAL extent collapses
  // to |dir.x| of the flat-water thickness -- at these amplitudes that reaches
  // 80 degrees and a sixth of the width, which is the thick/thin banding along
  // one line. Steep segments are widened back toward a constant apparent weight.
  float horiz=abs(dir.x);
  float near=pow(rowU(a.x),1.25);
  vNear=near;

  // ---- shading ----
  // Slope along the line and across it, straight from the field. On the CPU this
  // needed an explicit low-pass over several taps to stop it speckling; here the
  // texture sample is already bilinear across a grid coarser than the point
  // spacing, which does the smoothing for free.
  vec2 g=gridAt(a.x,a.y);
  float hC=hAt(g);
  float dX=hAt(gridAt(a.x,a.y+1.0))-hAt(gridAt(a.x,a.y-1.0));
  float dY=hAt(g+vec2(0.,1.5/simH))-hAt(g-vec2(0.,1.5/simH));

  // Height term: bright at the crest. Slope term: bright on the flank facing up.
  float litH=clamp(hC*simGain*0.5+0.5, 0.0, 1.0);
  float litS=clamp(-dY*simGain*6.0+0.5, 0.0, 1.0);
  float lit=mix(litH, litS, slopeLit);

  // Sharpest crests get extra gain, which is what reads as the glint on a
  // breaking face rather than a uniformly brighter wave.
  float sharp=clamp(abs(dX)*simGain*4.0, 0.0, 1.0);
  lit*= 1.0 + (crestGain-1.0)*sharp;

  lit=pow(clamp(lit/max(0.02,litRange),0.0,1.0), litGamma);
  vLit=floorLit+(1.0-floorLit)*lit;

  // ---- the light ----
  // How much of the beam this vertex catches. The cone is angular around the
  // lamp, so the lit patch spreads with distance the way a real beam does
  // instead of staying a fixed width on screen.
  // The lamp is a screen point now, not a fraction: with the headland on it rides
  // the top of the tower, so the glare path converges on the light you can see.
  float ang=atan(p0.x-lampP.x, max(1.0,p0.y-lampP.y));
  float d=abs(ang-beamPhase);
  float edge=beamWidth*max(0.001,beamSoft);
  float cone=1.0-smoothstep(beamWidth-edge, beamWidth+edge, d);

  // Masthead guard. A moving bright wedge under body copy is the one thing here
  // that actually hurts readability, so the cone is held back inside the box and
  // feathered out over a margin -- a hard cutoff would read as a rectangle.
  if(guard>0.0 && guardBox.z>guardBox.x){
    float fx=90.0, fy=70.0;
    float sx = p0.x<guardBox.x ? (guardBox.x-p0.x)/fx
             : p0.x>guardBox.z ? (p0.x-guardBox.z)/fx : 0.0;
    float sy = p0.y>guardBox.w ? (p0.y-guardBox.w)/fy : 0.0;
    float away=min(1.0, max(sx,sy));
    cone*= away+(1.0-away)*(1.0-guard);
  }
  // A crest tilted toward the lamp throws light back; a trough does not. This is
  // the specular term, and it is why lit water reads as wet rather than painted.
  float facing=clamp(-dY*simGain*6.0, 0.0, 1.0);
  vWarm=beam*beamOn*cone*(0.35+beamLift*facing)*near;

  // Near lines are drawn wider so they read as closer. This multiplies the base
  // width, so the two compound: at width 1 and DPR 2 a foreground line is already
  // 2*(0.5+1.5)=4 device px, which is what clogs the near field.
  float w=lineW*(0.5+near*widthNear)*0.5;
  // Divide by how horizontal the segment is, so a tilted stroke is drawn wider
  // along its own normal and lands the same thickness on screen. Clamped: at
  // dead vertical this diverges, and a fully compensated near-vertical segment
  // would be a blob rather than a line.
  w/=max(0.45,horiz);
  w+=glowW;
  // w is in CSS px, because p0/res are. The rasteriser works in device px, so the
  // edge fade has to be measured there or it spans dpr pixels instead of one --
  // which is exactly what a hard, unantialiased edge looks like at dpr 2.
  // Carry the across-line position and the half width so the fragment stage can
  // fade the edges. MSAA does not help here: it antialiases where triangles meet,
  // and a line's long edges are the silhouette of a single quad, so without this
  // every line has hard stair-stepped sides. Canvas stroke() did this for free.
  // A line thinner than one device pixel cannot be drawn thinner -- it can only
  // be drawn fainter. Below that floor the line is held at a pixel and the lost
  // width is carried into alpha, which is what keeps far lines continuous
  // instead of breaking into a dashed shimmer as they thin.
  //
  // The floor is a FULL device pixel of half-width, not half of one. A quad one
  // pixel wide overall still falls between two pixel centres wherever it sits at
  // a fraction, and the row drops out there -- which is the stippling, not
  // aliasing. Widening the line and paying for it in alpha keeps the row solid.
  float wMin=1.0/dpr;
  float hw=max(w, wMin);
  vCov=min(1.0, w/wMin);

  // The QUAD is one device pixel wider on each side than the line it draws. The
  // coverage ramp needs to fall to zero OUTSIDE the line's true edge, and it can
  // only do that on pixels the rasteriser actually shades -- a quad cut exactly
  // at the edge leaves the ramp nowhere to go, so the outermost shaded pixel
  // still lands at full-ish alpha and the stair-step survives however wide the
  // fade is. Padding costs a sliver of fill and is what makes the edge analytic
  // rather than merely soft.
  float pad=1.0/dpr;
  float hq=hw+pad;
  // vEdge is carried in DEVICE PIXELS from the centreline, not as a -1..1 corner.
  // The old form measured the fade against vHalf interpolated between the two
  // ends of the segment, and the steepness compensation above can double the
  // width at one end only -- so on a tilted segment the falloff was scaled by a
  // width that did not match the edge being drawn.
  vEdge=a.z*hq*dpr;
  vHalf=hw*dpr;                        // device px, for the fragment stage
  vec2 p=p0+nrm*a.z*hq;
  gl_Position=vec4(p.x/res.x*2.0-1.0, 1.0-p.y/res.y*2.0, 0., 1.);
}`;

const FS_LINE=`
precision highp float;
varying float vNear;
varying float vLit;
varying float vWarm;
varying float vEdge;
varying float vHalf;
varying float vCov;
uniform float dimFar, bright, beamWarm, beamSat, alphaMul;
void main(){
  float a=(dimFar+(1.0-dimFar)*vNear)*bright*vLit;

  // Analytic edge coverage. vEdge is the distance from the centreline in device
  // pixels and vHalf is where the line's true edge is, so the transition is
  // centred ON the edge and spans one pixel -- half inside, half out into the
  // quad's padding. That is what a pixel's actual coverage does as the edge
  // sweeps across it.
  //
  // The previous form ramped from the edge INWARD, which dimmed the line's own
  // body while leaving the boundary pixel at full alpha: soft and still stepped,
  // the worst of both. smoothstep rather than a linear ramp because the linear
  // one leaves visible corners in the gradient where it clamps.
  float cov=1.0-smoothstep(vHalf-0.5, vHalf+0.5, abs(vEdge));
  a*=cov*vCov;

  vec3 cool=vec3(0.56,0.71,0.85);
  // Amber, desaturated toward warm-white by beamSat. Full-saturation amber on
  // water reads as a sunset; the lamp wants to look like a light, not a colour.
  vec3 amber=mix(vec3(1.0,0.96,0.90), vec3(0.93,0.77,0.59), beamSat);
  float w=clamp(vWarm*beamWarm,0.0,1.0);
  vec3 col=mix(cool, amber, w);

  // The beam adds light rather than only recolouring: lit water is brighter than
  // unlit water, which is the whole point of a lighthouse.
  a*=1.0+vWarm*1.6;

  a*=alphaMul;
  gl_FragColor=vec4(col*a, a);
}`;

// Flat shaded geometry: the headland, the tower, the lantern, the halo. Position
// in CSS px, colour per vertex. One program covers all four because the only thing
// they need is "fill this triangle with this colour" -- the rim gradient and the
// halo falloff are vertex colours interpolated across the fan.
const VS_SOLID=`
attribute vec2 p;
attribute vec4 c;
uniform vec2 res;
varying vec4 vc;
void main(){
  vc=c;
  gl_Position=vec4(p.x/res.x*2.0-1.0, 1.0-p.y/res.y*2.0, 0., 1.);
}`;

const FS_SOLID=`
precision mediump float;
varying vec4 vc;
uniform float mul;
void main(){ gl_FragColor=vec4(vc.rgb*vc.a*mul, vc.a*mul); }`;

const pSim=prog(VS_QUAD,FS_SIM);
const pLine=prog(VS_LINE,FS_LINE);
const pSolid=prog(VS_SOLID,FS_SOLID);

// ------------------------------------------------------------- sim state ---
const GW=P.simW, GH=P.simH;

function mkTex(){
  const t=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,GW,GH,0,gl.RGBA,gl.FLOAT,null);
  // NEAREST: the sim reads its own neighbours at exactly +/-1 texel, and LINEAR
  // would return interpolated values -- a low-pass applied every single step.
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  // CLAMP on both axes; x wrapping is done with fract() in the shader. See the
  // NPOT note in FS_SIM -- REPEAT here makes the texture incomplete and it reads
  // as solid black with no error reported.
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return t;
}
let texA=mkTex(), texB=mkTex();
const fbo=gl.createFramebuffer();

gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texA,0);
if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)
  throw new Error('Float textures are not renderable on this GPU. The sim writes '+
    'to a float framebuffer each step; without it the water cannot run.');
gl.bindFramebuffer(gl.FRAMEBUFFER,null);

// Clear both to zero -- flat calm at t=0.
for(const t of [texA,texB]){
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  gl.viewport(0,0,GW,GH); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
}
gl.bindFramebuffer(gl.FRAMEBUFFER,null);

const QUAD=gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER,QUAD);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);

function simStep(){
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texB,0);
  gl.viewport(0,0,GW,GH);
  gl.useProgram(pSim); gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texA);
  const U=n=>gl.getUniformLocation(pSim,n);
  gl.uniform1i(U('src'),0);
  gl.uniform2f(U('texel'),1/GW,1/GH);
  gl.uniform1f(U('stiff'),Math.min(1.95,Math.max(0,P.stiff)));
  gl.uniform1f(U('damp'),1-Math.max(0,P.damp)*0.02);
  gl.uniform1f(U('visc'),Math.max(0,P.visc)*0.25);
  gl.uniform1f(U('brkAt'),Math.max(0,P.breakAt));
  gl.uniform1f(U('brkRate'),Math.max(0,P.breakRate));
  gl.uniform1f(U('skirtT'),Math.max(1,P.hzSkirt)/GH);
  gl.uniform1f(U('skirtB'),Math.max(1,P.skirt)/GH);
  gl.bindBuffer(gl.ARRAY_BUFFER,QUAD);
  const l=gl.getAttribLocation(pSim,'p');
  gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  const t=texA; texA=texB; texB=t;          // ping-pong
}

// ------------------------------------------------------------ gusts (CPU) ---
// Kept on the CPU deliberately: ~34 stamps a second over a ~35x35 footprint is
// negligible work, and it needs the random draws and branching that the tuned
// two-train forcing in water.js depends on. Each gust is read back, stamped, and
// uploaded -- the readback is the cost, so gusts are batched into one per frame.
let gustSeed=12345, gustAcc=0;
function grnd(){
  gustSeed^=gustSeed<<13; gustSeed>>>=0;
  gustSeed^=gustSeed>>17;
  gustSeed^=gustSeed<<5;  gustSeed>>>=0;
  return gustSeed/4294967296;
}

const GBUF=new Float32Array(GW*GH*4);
let gustDirty=false;

function readSim(){
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texA,0);
  gl.readPixels(0,0,GW,GH,gl.RGBA,gl.FLOAT,GBUF);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
function writeSim(){
  gl.bindTexture(gl.TEXTURE_2D,texA);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,GW,GH,0,gl.RGBA,gl.FLOAT,GBUF);
}

// water.js simGust(), unchanged in substance: two swell trains, elongated along
// the crest, launched already moving downwind.
// Slow weather. Two incommensurate sines rather than one: a single sine is a
// metronome and the eye finds the period within a couple of cycles, whereas two
// that never line up read as weather that happens to be doing something. Cheap
// enough that there is no reason to reach for real noise.
let wxT=0;
function weatherAt(){
  const w=P.weather;
  // Centred on 1, so 'weather' only sets the depth of the swing and the mean
  // wind strength stays whatever the wind slider says.
  const a=Math.sin(wxT*TAU*P.weatherRate);
  const b=Math.sin(wxT*TAU*P.weatherRate*0.37+1.7);
  const gustMul=1+w*(a*0.65+b*0.35);
  // Heading wanders on its own, slower clock: wind shifts direction over minutes,
  // not with each gust, and tying it to the strength cycle would make the two
  // move together in a way real wind does not.
  const veer=P.veer*Math.sin(wxT*TAU*P.veerRate+0.9);
  return {gustMul:Math.max(0,gustMul), veer};
}

function gust(){
  const w=GW, hh=GH, B=GBUF;
  const WX=weatherAt();
  // Lulls thin the field out. Without this the gust RATE is constant even when
  // strength dips, so a calm spell still gets the same dense stipple of tiny
  // gusts and reads as uniform texture rather than as calm.
  if(P.lull>0 && grnd() < P.lull*(1-Math.min(1,WX.gustMul))) { return; }
  const second = grnd() < P.swell2;
  const base = second ? P.windDir + P.swell2Ang : P.windDir;
  const th = base + WX.veer + (grnd()-0.5)*2*P.windSpread;
  const cx=grnd()*w|0;
  const cy=(P.hzSkirt|0)+1+grnd()*Math.max(1,P.fetch)|0;
  const gs = P.gustSize * (second ? P.swell2Len : 1);
  const fp = P.gustSize;
  const along =Math.max(3,fp*0.9);
  const across=Math.max(3,fp*2.2*(second?P.swell2Crest:1));
  // Per-gust jitter on top of the slow cycle. Uniform gusts give a field with one
  // characteristic wave height; varying them is what produces the occasional
  // larger set among smaller ones.
  const jit=1+(grnd()-0.5)*2*P.gustVary;
  const ph=grnd()*TAU;
  const str=P.wind*0.10*(second?P.swell2Amp:1)*WX.gustMul*Math.max(0,jit);
  const kk=2*Math.PI/Math.max(2,gs*0.9);
  const ct=Math.cos(th), st=Math.sin(th);
  const R=Math.ceil(Math.max(along,across));
  for(let dy=-R;dy<=R;dy++){
    const y=cy+dy; if(y<1||y>=hh-1) continue;
    for(let dx=-R;dx<=R;dx++){
      const u  =  dx*ct + dy*st;
      const vv = -dx*st + dy*ct;
      const d=Math.hypot(u/along, vv/across);
      if(d>=1) continue;
      const x=((cx+dx)%w+w)%w;
      const env=str*(0.5+0.5*Math.cos(d*Math.PI));
      const i=(y*w+x)*4;
      // Velocity set in quadrature with height (v = -c dh/du): the pair
      // reinforces downwind and cancels upwind, so the gust launches ONE way
      // instead of collapsing and radiating back toward the horizon.
      B[i]  +=Math.sin(u*kk+ph)*env;
      B[i+1]-=Math.cos(u*kk+ph)*env*kk*P.gustDir;
    }
  }
  gustDirty=true;
}

// Runaway backstop. The CFL clamp keeps the scheme stable, but a big enough wind
// on a small enough grid can pump energy in faster than the skirts remove it,
// and an unbounded field renders as a white screen. Checked rarely -- every
// frame would cost more than the sim -- and scaled back rather than cleared, so
// the surface sags instead of blinking out.
let simTick=0;
function backstop(){
  if((++simTick)%30) return;
  readSim();
  let e=0, n=0;
  for(let i=0;i<GW*GH;i+=7){ const v=GBUF[i*4]; e+=v*v; n++; }
  const rms=Math.sqrt(e/n);
  if(!isFinite(rms) || rms>3){
    const f=isFinite(rms)?3/rms:0;
    for(let i=0;i<GW*GH;i++){ GBUF[i*4]*=f; GBUF[i*4+1]*=f; }
    writeSim();
  }
}

// ------------------------------------------------------------- line mesh ---
let LBUF=gl.createBuffer(), LCOUNT=0, M=0;
function buildLines(){
  M=Math.ceil((W+80)/P.ptStep)+1;
  // Sliders hand back floats; the mesh loops need whole rows.
  const N=Math.max(1,Math.round(P.lines)), segs=(M-1)*N;
  const arr=new Float32Array(segs*6*3);
  let k=0;
  for(let i=0;i<N;i++) for(let j=0;j<M-1;j++){
    // Two triangles per segment: (j,-1) (j,+1) (j+1,-1) / (j+1,-1) (j,+1) (j+1,+1)
    arr[k++]=i;arr[k++]=j;  arr[k++]=-1;
    arr[k++]=i;arr[k++]=j;  arr[k++]= 1;
    arr[k++]=i;arr[k++]=j+1;arr[k++]=-1;
    arr[k++]=i;arr[k++]=j+1;arr[k++]=-1;
    arr[k++]=i;arr[k++]=j;  arr[k++]= 1;
    arr[k++]=i;arr[k++]=j+1;arr[k++]= 1;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,LBUF);
  gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);
  LCOUNT=segs*6;
}

// ------------------------------------------------------------ lighthouse ---
// Where the lamp and the rock sit this frame. Recomputed on fit() rather than per
// frame: nothing here moves unless the window does.
const CLIFF={on:0, x:0, top:0, base:0, lampX:0, lampY:0, tw:0};

// Deterministic jitter, so the rock is steady frame to frame. A fresh
// Math.random() per vertex would make the silhouette boil.
function rk(i){ const v=Math.sin(i*12.9898+P.seed*3.71)*43758.5453; return v-Math.floor(v); }

// The seaward outline of the headland, in CSS px, left to right. Shared by the
// fill and the rim so they cannot drift apart.
function cliffEdge(){
  const x0=CLIFF.x, top=CLIFF.top, base=CLIFF.base, span=W-x0, rough=P.cliffRough;
  const pts=[];
  // Face: a steep scarp, not a dome. Nearly vertical for most of the rise so the
  // top arrives as a defined shoulder -- that break is what reads as a mesa. A
  // gentler curve here rounds it into a hill.
  const FN=9;
  for(let i=0;i<=FN;i++){
    const u=i/FN;
    // Batter: the face leans back as it rises, jittered along its whole length
    // rather than only near the top, so it reads as broken rock not a cut edge.
    const x=x0+span*(0.16*u)+span*0.030*rough*(rk(i)-0.5);
    const y=base+(top-base)*Math.pow(u,0.40)+(base-top)*0.055*rough*(rk(i+40)-0.5);
    pts.push(x,y);
  }
  // Mesa top: flat, tilting very slightly inland, with small breaks only.
  const TN=6;
  for(let i=0;i<=TN;i++){
    const u=i/TN;
    const x=x0+span*(0.16+0.84*u);
    const y=top-(base-top)*0.03*u+(base-top)*0.022*rough*rk(i+90);
    pts.push(x,y);
  }
  pts.push(W, top-(base-top)*0.03);
  return pts;
}

let SBUF=gl.createBuffer(), SCOUNT=0, SOLID_OPAQUE=0;
// The sky is a background, so it draws before the water rather than with the
// rock. Its own buffer, rebuilt with everything else on fit().
let SKYBUF=gl.createBuffer(), SKYCOUNT=0;
let SARR=new Float32Array(0);
// Vertices whose colour changes with the sweep, so the frame can rewrite just
// those alphas instead of rebuilding the whole buffer.
let RIM_AT=[], GLASS_AT=[], HALO_AT=[];

function push(A,k,x,y,r,g,b,a){ A[k]=x;A[k+1]=y;A[k+2]=r;A[k+3]=g;A[k+4]=b;A[k+5]=a; return k+6; }
function tri(A,k,ax,ay,bx,by,cx,cy,col){
  k=push(A,k,ax,ay,col[0],col[1],col[2],col[3]);
  k=push(A,k,bx,by,col[0],col[1],col[2],col[3]);
  return push(A,k,cx,cy,col[0],col[1],col[2],col[3]);
}
function quad(A,k,x,y,w,h,col){
  k=tri(A,k,x,y,x+w,y,x,y+h,col);
  return tri(A,k,x+w,y,x+w,y+h,x,y+h,col);
}

function buildCliff(){
  CLIFF.on = P.cliff>0 && P.cliffH>0;
  const hz=horizonY();
  if(!CLIFF.on){
    // Open water: the lamp floats just above the horizon at lampX.
    CLIFF.lampX=W*P.lampX; CLIFF.lampY=hz-2;
  }
  if(CLIFF.on){
    CLIFF.x=W*P.cliffX;
    CLIFF.base=hz+H*0.012;
    CLIFF.top=hz-H*P.cliffH;
    CLIFF.lampX=CLIFF.x+(W-CLIFF.x)*P.lampPos;
    CLIFF.lampY=CLIFF.top-H*P.towerH;
    CLIFF.tw=Math.max(3,W*P.towerW);
  }

  const HN=22;                       // halo fan segments
  const cap=(120+HN+8)*3*6;   // rock fan + rim + tower + foot haze + halo
  if(SARR.length<cap) SARR=new Float32Array(cap);
  const A=SARR; let k=0;
  RIM_AT=[]; GLASS_AT=[]; HALO_AT=[]; SOLID_OPAQUE=0;

  // The buffer is laid out in two blocks. The opaque one -- rock, tower, lantern
  // cap -- draws with blending off so it occludes the water; the additive one --
  // rim, lit glass, halo -- draws after it with the same blend the water uses.
  // One buffer, two draw ranges, so the split costs nothing.
  if(CLIFF.on){
    const e=cliffEdge(), base=CLIFF.base, top=CLIFF.top;
    // Rock value ramps with height: palest at the waterline where distance haze
    // sits, darkest at the mesa top. That gradient is most of what makes it read
    // as a solid body rather than a flat cutout.
    const L=P.rockLift;
    const rockAt=(y)=>{
      const u=Math.min(1,Math.max(0,(y-top)/Math.max(1,base-top)));  // 0 top, 1 base
      const h=1+P.rockHaze*u;
      return [0.020*L*h, 0.031*L*h, 0.051*L*h, 1];
    };
    // Fan the outline against the bottom-right corner. The silhouette is a simple
    // polygon anchored on the base line, so a fan from (W,base) covers it without
    // needing a triangulator. Per-vertex colour, so the ramp interpolates.
    for(let i=0;i<e.length/2-1;i++){
      const c0=rockAt(base), c1=rockAt(e[i*2+1]), c2=rockAt(e[i*2+3]);
      k=push(A,k, W,base, c0[0],c0[1],c0[2],1);
      k=push(A,k, e[i*2],e[i*2+1], c1[0],c1[1],c1[2],1);
      k=push(A,k, e[i*2+2],e[i*2+3], c2[0],c2[1],c2[2],1);
    }
    // Close the mesa top across to the right edge.
    const cb=rockAt(base), ct=rockAt(top);
    k=push(A,k, W,base, cb[0],cb[1],cb[2],1);
    k=push(A,k, e[e.length-2],e[e.length-1], ct[0],ct[1],ct[2],1);
    k=push(A,k, W,top-(base-top)*0.03, ct[0],ct[1],ct[2],1);

    // ---- opaque block ends here; the tower is opaque too, so it comes first ----
    const tw0=CLIFF.tw, tx0=CLIFF.lampX, ty0=CLIFF.lampY;
    // The shaft runs well down the face rather than stopping just below the mesa
    // line. A tower whose base sits near the top of the rock has its widest,
    // lowest part against the palest stone -- measured 101 against 110, which is
    // no edge at all, and the base dissolves into the headland.
    const tb0=top+(base-top)*0.42;
    // Lighter than the rock behind it: a painted tower against dark stone is the
    // whole silhouette, and matching the rock loses it into the mesa. The gain is
    // above the rock's own waterline haze so the separation holds all the way
    // down the shaft, not just against the sky.
    const TOWER=[0.031*P.rockLift*2.5, 0.047*P.rockLift*2.5, 0.071*P.rockLift*2.4, 1];
    k=tri(A,k, tx0-tw0*0.72,tb0, tx0-tw0*0.46,ty0+tw0*0.5, tx0+tw0*0.46,ty0+tw0*0.5, TOWER);
    k=tri(A,k, tx0-tw0*0.72,tb0, tx0+tw0*0.46,ty0+tw0*0.5, tx0+tw0*0.72,tb0, TOWER);
    const CAP=[0.020*P.rockLift*1.5, 0.031*P.rockLift*1.5, 0.051*P.rockLift*1.5, 1];
    // Gallery deck: a thin lip proud of the shaft, at the base of the lantern.
    // This is the widest part of the head, which is what stops the outline
    // reading as a chess piece -- a box narrowing to a point is a mitre.
    const gy=ty0-tw0*0.34;
    k=quad(A,k, tx0-tw0*0.82, gy, tw0*1.64, tw0*0.13, CAP);
    // Lantern room: the glazed box, narrower than the deck it stands on.
    k=quad(A,k, tx0-tw0*0.56, ty0-tw0*0.30, tw0*1.12, tw0*0.80, CAP);
    // Cap: a shallow dome, not a spire. Three flat steps approximate the curve
    // closely enough at this size and stay one draw call.
    k=quad(A,k, tx0-tw0*0.62, ty0-tw0*0.44, tw0*1.24, tw0*0.14, CAP);
    k=quad(A,k, tx0-tw0*0.48, ty0-tw0*0.56, tw0*0.96, tw0*0.12, CAP);
    k=quad(A,k, tx0-tw0*0.28, ty0-tw0*0.65, tw0*0.56, tw0*0.09, CAP);
    // Finial: a short mast, the one vertical the shape is allowed.
    k=quad(A,k, tx0-tw0*0.06, ty0-tw0*0.82, tw0*0.12, tw0*0.17, CAP);
  }
  SOLID_OPAQUE=k/6;

  if(CLIFF.on){
    const e=cliffEdge(), base=CLIFF.base, top=CLIFF.top;
    // Lit rim on the seaward edge: a wedge hugging the outline, bright at the
    // face and falling to nothing inland. Vertex alpha does the falloff.
    const RC=[0.925,0.769,0.588];
    const inset=(W-CLIFF.x)*0.5;
    for(let i=0;i<e.length/2-1;i++){
      const x0=e[i*2], y0=e[i*2+1], x1=e[i*2+2], y1=e[i*2+3];
      RIM_AT.push(k/6, k/6+1, k/6+3);   // the three on the lit edge
      k=push(A,k,x0,y0,RC[0],RC[1],RC[2],1);
      k=push(A,k,x1,y1,RC[0],RC[1],RC[2],1);
      k=push(A,k,x0+inset,y0,RC[0],RC[1],RC[2],0);
      k=push(A,k,x1,y1,RC[0],RC[1],RC[2],1);
      k=push(A,k,x1+inset,y1,RC[0],RC[1],RC[2],0);
      k=push(A,k,x0+inset,y0,RC[0],RC[1],RC[2],0);
    }

    // Waterline haze: a short band hugging the base of the cliff, fading upward.
    // Additive, so it lifts the foot of the rock away from the sea behind it.
    if(P.footHaze>0){
      const fb=CLIFF.base, fh=Math.max(4,(CLIFF.base-CLIFF.top)*0.42);
      const HC=[0.62,0.72,0.85];
      k=push(A,k, CLIFF.x,fb,      HC[0],HC[1],HC[2],P.footHaze);
      k=push(A,k, W,fb,            HC[0],HC[1],HC[2],P.footHaze);
      k=push(A,k, CLIFF.x,fb-fh,   HC[0],HC[1],HC[2],0);
      k=push(A,k, W,fb,            HC[0],HC[1],HC[2],P.footHaze);
      k=push(A,k, W,fb-fh,         HC[0],HC[1],HC[2],0);
      k=push(A,k, CLIFF.x,fb-fh,   HC[0],HC[1],HC[2],0);
    }

    // The lit glass, so the source reads as a point on the structure.
    const tw=CLIFF.tw, tx=CLIFF.lampX, ty=CLIFF.lampY;
    GLASS_AT.push(k/6,k/6+1,k/6+2,k/6+3,k/6+4,k/6+5);
    k=quad(A,k, tx-tw*0.38, ty-tw*0.22, tw*0.76, tw*0.62, [1,0.871,0.659,1]);
  }

  // Halo around the lamp. Only a bloom at the source -- see the note on `haze`.
  if(P.beam>0 && P.haze>0){
    const rr=Math.max(8,W*0.075*P.haze);
    const cx=CLIFF.lampX, cy=CLIFF.lampY;
    for(let i=0;i<HN;i++){
      const a0=i/HN*TAU, a1=(i+1)/HN*TAU;
      HALO_AT.push(k/6);
      k=push(A,k,cx,cy,0.94,0.66,0.30,0.34*P.haze);
      k=push(A,k,cx+Math.cos(a0)*rr,cy+Math.sin(a0)*rr,0.94,0.66,0.30,0);
      k=push(A,k,cx+Math.cos(a1)*rr,cy+Math.sin(a1)*rr,0.94,0.66,0.30,0);
    }
  }

  SCOUNT=k/6;
  gl.bindBuffer(gl.ARRAY_BUFFER,SBUF);
  gl.bufferData(gl.ARRAY_BUFFER,SARR.subarray(0,k),gl.DYNAMIC_DRAW);

  // Sky: a vertical ramp, lighter at the horizon than at the top, so the rock
  // has the most contrast exactly where its outline is.
  if(P.sky>0){
    const g=P.sky;
    const hi=[0.031*(1+g*0.45),0.047*(1+g*0.45),0.078*(1+g*0.45),1];
    const lo=[0.031*(1+g*1.5), 0.055*(1+g*1.5), 0.086*(1+g*1.5), 1];
    const S=new Float32Array(6*6); let j=0;
    j=push(S,j,0,0,hi[0],hi[1],hi[2],1);
    j=push(S,j,W,0,hi[0],hi[1],hi[2],1);
    j=push(S,j,0,hz,lo[0],lo[1],lo[2],1);
    j=push(S,j,W,0,hi[0],hi[1],hi[2],1);
    j=push(S,j,W,hz,lo[0],lo[1],lo[2],1);
    j=push(S,j,0,hz,lo[0],lo[1],lo[2],1);
    gl.bindBuffer(gl.ARRAY_BUFFER,SKYBUF);
    gl.bufferData(gl.ARRAY_BUFFER,S,gl.STATIC_DRAW);
    SKYCOUNT=6;
  } else SKYCOUNT=0;
}

function drawSky(){
  if(!SKYCOUNT) return;
  gl.useProgram(pSolid);
  gl.uniform2f(gl.getUniformLocation(pSolid,'res'),W,H);
  gl.uniform1f(gl.getUniformLocation(pSolid,'mul'),1);
  gl.bindBuffer(gl.ARRAY_BUFFER,SKYBUF);
  const pa=gl.getAttribLocation(pSolid,'p'), ca=gl.getAttribLocation(pSolid,'c');
  gl.enableVertexAttribArray(pa); gl.enableVertexAttribArray(ca);
  gl.vertexAttribPointer(pa,2,gl.FLOAT,false,24,0);
  gl.vertexAttribPointer(ca,4,gl.FLOAT,false,24,8);
  gl.disable(gl.BLEND);
  gl.drawArrays(gl.TRIANGLES,0,SKYCOUNT);
  gl.disableVertexAttribArray(ca);
}

// The sweep-dependent alphas, rewritten per frame. Cheaper than rebuilding the
// silhouette, and it keeps the jitter stable while the light moves.
function tintCliff(){
  if(!SCOUNT) return;
  const A=SARR, lit=BEAM.on;
  // The beam is dark for 8-20s between passes, so a rim that only lights during a
  // sweep leaves the headland unlit almost all the time. rimBase is the floor.
  const ri=P.rim*(P.rimBase+(1.0-P.rimBase)*lit);
  for(const v of RIM_AT) A[v*6+5]=ri;
  // A lighthouse lamp is lit even when the beam is pointed away from you -- the
  // glass still shows. Idle value is high enough to be a visible point.
  const lg=0.55+0.45*lit;
  for(const v of GLASS_AT) A[v*6+5]=lg;
  const pulse=P.hazeBase+(1.0-P.hazeBase)*lit;
  for(const v of HALO_AT) A[v*6+5]=0.34*P.haze*pulse;
  gl.bindBuffer(gl.ARRAY_BUFFER,SBUF);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,SARR.subarray(0,SCOUNT*6));
}

function drawCliff(){
  if(!SCOUNT) return;
  gl.useProgram(pSolid);
  const U=n=>gl.getUniformLocation(pSolid,n);
  gl.uniform2f(U('res'),W,H);
  gl.uniform1f(U('mul'),1);
  gl.bindBuffer(gl.ARRAY_BUFFER,SBUF);
  const pa=gl.getAttribLocation(pSolid,'p'), ca=gl.getAttribLocation(pSolid,'c');
  gl.enableVertexAttribArray(pa); gl.enableVertexAttribArray(ca);
  gl.vertexAttribPointer(pa,2,gl.FLOAT,false,24,0);
  gl.vertexAttribPointer(ca,4,gl.FLOAT,false,24,8);
  // Opaque: blending off, so the rock actually hides the water behind it.
  if(SOLID_OPAQUE>0){
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES,0,SOLID_OPAQUE);
    gl.enable(gl.BLEND);
  }
  // Additive: rim, glass, halo -- same blend the water uses.
  if(SCOUNT>SOLID_OPAQUE)
    gl.drawArrays(gl.TRIANGLES,SOLID_OPAQUE,SCOUNT-SOLID_OPAQUE);
  gl.disableVertexAttribArray(ca);
}

// ------------------------------------------------------------------ beam ---
// The lamp sweeps, pauses in the dark, and occasionally sweeps twice. All three
// intervals are randomised: a fixed gap is still a metronome, just a sparser
// one, and a predictable beat behind body copy pulls the eye off the text.
const BEAM={phase:0, on:0, until:0, left:0, next:3};
const GUARD={on:0, x0:0, y0:0, x1:0, y1:0};
function readGuard(){
  if(P.beamGuard<=0){ GUARD.on=0; return; }
  // .copy in the lab file, .masthead on the live page -- whichever copy block the
  // beam has to stay out from behind.
  const ce=document.querySelector('.copy, .masthead');
  if(!ce){ GUARD.on=0; return; }
  const r=ce.getBoundingClientRect(), c=cv.getBoundingClientRect();
  GUARD.on=1;
  GUARD.x0=r.left-c.left; GUARD.y0=r.top-c.top;
  GUARD.x1=r.right-c.left; GUARD.y1=r.bottom-c.top;
}
let beamT=0;
// Its own RNG stream. Sharing grnd() with the gusts would mean the beam's timing
// draws shift the wave field, so changing a beam setting would silently change
// the water -- and any A/B of the two would be measuring both at once.
let bSeed=987654321;
function brnd(){
  bSeed^=bSeed<<13; bSeed>>>=0;
  bSeed^=bSeed>>17;
  bSeed^=bSeed<<5;  bSeed>>>=0;
  return bSeed/4294967296;
}
function beamStep(dt){
  beamT+=dt;
  const span=Math.max(.15,P.beamSweep);
  if(BEAM.left>0){
    // Mid-sweep. elapsed runs 0..span across one crossing.
    const el=span-(BEAM.until-beamT);
    const k=Math.min(1,Math.max(0,el/span));
    // Swings through a bit more than the visible arc so the beam enters and
    // leaves rather than appearing already on screen. Always the same way
    // round: the optic is on a turntable and only ever turns one direction, so
    // a beam that came back the way it went would read as a searchlight being
    // aimed. What looks like a pause between passes is the arc pointing inland.
    BEAM.phase=-1.4+2.8*k;
    // Fade in and out across the pass, so it does not switch on hard.
    BEAM.on=Math.sin(Math.PI*k);
    if(beamT>=BEAM.until){
      BEAM.left--;
      if(BEAM.left>0){ BEAM.until=beamT+span; }
      else{
        BEAM.on=0;
        const lo=Math.max(0,P.beamGapMin), hi=Math.max(lo,P.beamGapMax);
        BEAM.next=beamT+lo+brnd()*(hi-lo);
      }
    }
    return;
  }
  // Dark between sweeps.
  BEAM.on=0;
  if(beamT>=BEAM.next){
    BEAM.left=(P.beamDouble>0 && brnd()<1/P.beamDouble)?2:1;
    BEAM.until=beamT+span;
  }
}

// ----------------------------------------------------------------- frame ---
let last=performance.now(), fps=60, acc=0, paused=false;

function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  // Floor the interval, not just guard division: a backgrounded tab resumes with
  // a near-zero or negative gap, and 1/1e-4 = 10000 poisons the smoothed average
  // for minutes afterwards. 1ms is below any real frame, so it never clips.
  if(dt>0.0005) fps+=((1/dt)-fps)*0.08;

  if(!paused){
    // Weather runs on the SIM clock, not wall time, so slowing the sim slows the
    // weather with it -- otherwise dropping sim speed would leave the wind
    // cycling at the same rate against water that no longer responds to it.
    wxT+=dt*P.speed*60/60;
    // The beam runs on WALL time, not sim time: it is a machine on a headland,
    // not part of the water, so slowing the sea should not slow its rotation.
    beamStep(dt);
    readGuard();

    // Gusts first: stamp into the CPU buffer, upload once, then step. Batching
    // the frame's gusts into a single readback/upload pair keeps the round trip
    // to one per frame rather than one per gust.
    gustAcc+=dt*P.gustRate;
    if(gustAcc>=1){
      readSim();
      while(gustAcc>=1){ gust(); gustAcc-=1; }
      if(gustDirty){ writeSim(); gustDirty=false; }
    }

    // Fixed timestep, decoupled from the display rate: the wave equation is only
    // stable for a given step size, so a slow frame runs more steps rather than
    // a bigger one.
    acc+=dt*P.speed*60;
    let steps=0;
    while(acc>=1 && steps<4){ simStep(); acc-=1; steps++; }
    backstop();
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.viewport(0,0,cv.width,cv.height);
  gl.clearColor(0.027,0.039,0.063,1);          // flat ground, no sky gradient
  gl.clear(gl.COLOR_BUFFER_BIT);

  drawSky();

  gl.useProgram(pLine);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE);   // additive, like 'lighter'
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texA);
  const U=n=>gl.getUniformLocation(pLine,n);
  gl.uniform1i(U('sim'),0);
  gl.uniform2f(U('res'),W,H);
  gl.uniform1f(U('N'),Math.max(1,Math.round(P.lines))); gl.uniform1f(U('M'),M);
  gl.uniform1f(U('step'),P.ptStep);
  gl.uniform1f(U('hz'),horizonY());
  gl.uniform1f(U('persp'),P.persp);
  gl.uniform1f(U('amp'),P.amp);   gl.uniform1f(U('ampNear'),P.ampNear);
  gl.uniform1f(U('ampFar'),P.ampFar);
  gl.uniform1f(U('simGain'),P.simGain);
  gl.uniform1f(U('simH'),GH);
  gl.uniform1f(U('fetch'),P.fetch);
  gl.uniform1f(U('skirt'),P.skirt);
  // Width is a CSS-px quantity: the shader positions vertices in CSS px, and the
  // dpr conversion now happens in the AA math where it belongs.
  gl.uniform1f(U('lineW'),P.width);
  gl.uniform1f(U('dpr'),DPR);
  gl.uniform1f(U('widthNear'),P.widthNear);
  gl.uniform1f(U('dimFar'),P.dimFar);
  gl.uniform1f(U('bright'),P.bright);
  gl.uniform1f(U('slopeLit'),P.slopeLit);
  gl.uniform1f(U('litRange'),P.litRange);
  gl.uniform1f(U('litGamma'),Math.max(.05,P.litGamma));
  gl.uniform1f(U('floorLit'),P.floor);
  gl.uniform1f(U('crestGain'),P.crest);
  gl.uniform1f(U('beam'),P.beam);
  gl.uniform2f(U('lampP'),CLIFF.lampX,CLIFF.lampY);
  gl.uniform1f(U('guard'),GUARD.on?P.beamGuard:0);
  gl.uniform4f(U('guardBox'),GUARD.x0,GUARD.y0,GUARD.x1,GUARD.y1);
  gl.uniform1f(U('beamWidth'),P.beamWidth);
  gl.uniform1f(U('beamSoft'),P.beamSoft);
  gl.uniform1f(U('beamLift'),P.beamLift);
  gl.uniform1f(U('beamPhase'),BEAM.phase);
  gl.uniform1f(U('beamOn'),BEAM.on);
  gl.uniform1f(U('beamWarm'),P.beamWarm);
  gl.uniform1f(U('beamSat'),P.beamSat);

  gl.bindBuffer(gl.ARRAY_BUFFER,LBUF);
  const la=gl.getAttribLocation(pLine,'a');
  gl.enableVertexAttribArray(la);
  gl.vertexAttribPointer(la,3,gl.FLOAT,false,0,0);

  // Glow first, underneath: the same geometry widened and drawn faint. Additive
  // blending means the core pass then sits on top of its own halo. On Canvas this
  // was the single most expensive thing in the frame -- it doubled every stroke --
  // and here it is one extra draw call of the same buffer.
  if(P.glow>0 && P.glowAmt>0){
    gl.uniform1f(U('glowW'),P.glow);   // CSS px, same space as lineW
    gl.uniform1f(U('alphaMul'),P.glowAmt);
    gl.drawArrays(gl.TRIANGLES,0,LCOUNT);
  }
  gl.uniform1f(U('glowW'),0);
  gl.uniform1f(U('alphaMul'),1);
  gl.drawArrays(gl.TRIANGLES,0,LCOUNT);
  gl.disableVertexAttribArray(la);

  // Headland last. It occludes the water by painting over it, which is why the
  // rock fill runs with blending OFF: the water composites additively, so a
  // translucent silhouette would have the lines glowing straight through it.
  // The rim and halo want the additive path, so they are split out.
  tintCliff();
  drawCliff();


  requestAnimationFrame(tick);
}

// The panel is a prototyping tool, not part of the page. water-panel.js reaches
// in through these and nothing else, so it stays loadable from any page that
// runs the renderer.
WATER.P=P; WATER.DEF=FILE_DEF; WATER.fit=fit;
WATER.buildLines=buildLines; WATER.buildCliff=buildCliff;

// Three clicks on the lantern open the tuning panel. Nothing links to it -- the
// lamp is the only part of the scene small and deliberate enough that hitting it
// three times running cannot happen by accident.
let taps=0, tapAt=0;
// Listening on the document, not the canvas: the masthead's paragraphs are
// full-width blocks that reach over the headland, so a click on the lantern
// lands on .intro and never reaches the canvas underneath.
addEventListener('click',e=>{
  if(!CLIFF.on) return;
  const t=e.target;
  if(t&&t.closest&&t.closest('a,button,input,label,select,textarea')) return;
  const r=cv.getBoundingClientRect();
  // W/H and CLIFF are in CSS pixels -- the backing store is dpr times larger,
  // but that scaling lives in the projection, not here. The rect is CSS pixels
  // too, so the click needs no conversion beyond the canvas origin.
  const x=e.clientX-r.left, y=e.clientY-r.top;
  const rad=Math.max(34,CLIFF.tw*4.0);
  if(Math.hypot(x-CLIFF.lampX,y-CLIFF.lampY)>rad){ taps=0; return; }
  const now=performance.now();
  taps = now-tapAt<900 ? taps+1 : 1;
  tapAt=now;
  if(taps<3) return;
  taps=0;
  if(document.getElementById('wpanel')) return;
  const s=document.createElement('script');
  s.src='water-panel.js';
  document.head.appendChild(s);
});

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

// Run the sim forward before the first paint, so the hero opens on moving water
// instead of the flat lines it starts from. This is the same loop frame() runs,
// minus the drawing: gusts stamp into the CPU buffer, one upload per simulated
// frame, then the wave step. At 340x210 a step is a cheap fragment pass, so a
// couple of seconds of blocking work buys the ~25s of settling the surface needs
// to look like weather rather than a disturbance that just started.
//
// The readback in readSim() is the expensive part -- it stalls the pipeline --
// which is why gusts are batched per simulated frame here exactly as they are
// per real frame in the loop, rather than uploading once per gust.
function warmup(simSeconds){
  const frames=Math.round(simSeconds*60);
  // Gusts are batched across BATCH frames rather than applied every frame. Each
  // batch costs one readback, and a readback stalls the pipeline -- doing it at
  // the live cadence meant ~850 stalls and 3.6s of frozen page. The water does
  // not care when in the window a gust landed, only that it landed, so stamping
  // a window's worth at once gives the same sea for a fraction of the cost.
  const BATCH=30;
  let ga=0, pending=0;
  for(let f=0;f<frames;f++){
    wxT+=P.speed;
    ga+=(1/60)*P.gustRate;
    while(ga>=1){ pending++; ga-=1; }
    if(pending && (f%BATCH===BATCH-1 || f===frames-1)){
      readSim();
      while(pending>0){ gust(); pending--; }
      writeSim();
    }
    simStep();
  }
  // One backstop at the end rather than every 30 steps: it exists to catch the
  // sim diverging over minutes of running, and its own readback is the cost.
  simTick=29; backstop();
}

addEventListener('resize',fit);
fit();
// The sim grid is a fixed size and outlives resize, so this runs once. Reduced
// motion draws a single frame and stops, and a still frame of flat lines is the
// wrong picture of the page -- so it gets the warm surface too.
warmup(P.warmup);
// One frame either way, so the hero is never blank -- then the gate decides.
requestAnimationFrame(RM.matches?frame:tick);
RM.addEventListener('change',()=>{ if(!RM.matches) requestAnimationFrame(tick); });

})();
