// Every clip, poster and still a card names is in the repo, and every clip has a poster and the
// second it was taken at. A missing file shows as an empty card only on the live site, where
// nothing reports it.
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const PROJECTS = vm.runInNewContext(fs.readFileSync(root + 'assets/projects.js', 'utf8') + ';PROJECTS');
const bad = [];
for (const p of PROJECTS) {
  const files = [p.video, p.poster, ...(p.slides || []).map((s) => s.src)].filter(Boolean);
  for (const f of files) if (!fs.existsSync(root + f)) bad.push(`${p.name}: ${f} isn't in the repo. Add it, or fix the path in assets/projects.js.`);
  if (p.video && !p.poster) bad.push(`${p.name}: has a video but no poster. Take a still from the clip (ffmpeg -ss <s> -i ${p.video} -frames:v 1 ${p.video.replace('.mp4', '.jpg')}) and set poster and posterAt.`);
  if (p.video && typeof p.posterAt !== 'number') bad.push(`${p.name}: has a video but no posterAt. Set it to the second the poster was taken at; a stopped clip rewinds there.`);
}
if (bad.length) { console.error('✗ clip-files:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ clip-files: every card's clip, poster and stills are in the repo (${PROJECTS.length} cards).`);
