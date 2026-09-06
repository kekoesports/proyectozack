import type { StudioBoard, StudioScene } from '@/lib/schemas/studio-production';
import { motionDesign } from './motion-catalog';
import { collectionDocument, type MotionResources } from './motion-collection-document';
import { motionDimensions } from './motion-dimensions';

export { motionDimensions } from './motion-dimensions';
const escapeHTML = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

/** Trusted templates only. Text is escaped, never interpolated into JS/CSS/URLs. */
export function studioMotionDocument(scene: StudioScene, board: Pick<StudioBoard, 'format' | 'palette'>,
  fonts: MotionResources, preview = false) {
  if (!scene.motion) throw new Error('motion_required');
  if (!['statement-v1', 'steps-v1', 'contact-v1'].includes(scene.motion)) return collectionDocument(scene, board, fonts, preview);
  const design = motionDesign(scene.motion);
  const [width, height] = motionDimensions[board.format];
  const portrait = height > width;
  const pad = Math.round(Math.min(width, height) * .085);
  const dark = board.palette === 'dark';
  const steps = scene.body.split('\n').map((s) => s.trim()).filter(Boolean);
  if (scene.motion === 'steps-v1' && steps.length > 3) throw new Error('motion_max_three_steps');
  const details = scene.motion === 'steps-v1'
    ? `<div class="steps">${steps.map((s, i) => `<div class="step reveal" data-delay="${.38 + i * .2}"><b>${String(i + 1).padStart(2, '0')}</b><span>${escapeHTML(s)}</span></div>`).join('')}</div>`
    : `<div class="${scene.motion === 'contact-v1' ? 'contact' : 'description'} reveal" data-delay=".35">${escapeHTML(scene.body)}</div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=${width}">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'self'; style-src 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<style>
@font-face{font-family:Display;src:url('${fonts.display}')}@font-face{font-family:Body;src:url('${fonts.body}')}
*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${dark ? '#101016' : '#f5f3ef'};color:${dark ? '#faf8f5' : '#17171c'};font-family:Body,sans-serif}
#socialpro-motion{width:100%;height:100%;position:relative;overflow:hidden}
.rail{position:absolute;left:${pad}px;right:${pad}px;top:10%;display:flex;justify-content:space-between;gap:20px;font-size:15px;letter-spacing:2px;font-weight:700}
.rail span{opacity:.65;font-size:12px;letter-spacing:1px}
.content{position:absolute;left:${pad}px;right:${pad}px;top:${portrait ? '26%' : '23%'};height:${portrait ? '54%' : '59%'};display:flex;flex-direction:column;justify-content:center;gap:${portrait ? 28 : 18}px}.content>*{flex-shrink:0}
.eyebrow{font-size:13px;letter-spacing:2.6px;font-weight:700;color:${dark ? '#ffab85' : '#96375b'}}
h1{font-family:Display,sans-serif;font-weight:800;font-size:${portrait ? 96 : 78}px;line-height:.96;text-transform:uppercase;margin:0;overflow-wrap:anywhere;letter-spacing:-1.2px;position:relative;z-index:1}
.description{font-size:28px;line-height:1.45;max-width:880px;white-space:pre-wrap;overflow-wrap:anywhere}
.signature{height:6px;width:120px;flex-shrink:0;transform-origin:left;background:linear-gradient(110deg,#f5632a,#e03070,#8b3aad,#5b9bd5)}
.steps{display:grid;gap:${portrait ? 14 : 10}px}.step{display:flex;align-items:center;gap:24px;border:1px solid ${dark ? '#ffffff24' : '#17171c20'};background:${dark ? '#1b1b24' : '#fff'};border-radius:16px;padding:${portrait ? 22 : 12}px 24px;min-height:${portrait ? 84 : 52}px}
.step b{font-family:Display;font-size:36px;line-height:1;color:${dark ? '#ffac88' : '#a53755'}}.step span{font-size:25px;line-height:1.25;overflow-wrap:anywhere}
.contact{border-radius:16px;background:${dark ? '#faf8f5' : '#17171c'};color:${dark ? '#17171c' : '#faf8f5'};font-size:29px;line-height:1.3;padding:26px 30px;box-shadow:inset 5px 0 #e03070;overflow-wrap:anywhere;white-space:pre-wrap}
.rule{position:absolute;left:${pad}px;right:${pad}px;bottom:13%;height:1px;background:currentColor;opacity:.16}
.footer{position:absolute;left:${pad}px;bottom:9%;font-size:12px;letter-spacing:2px;opacity:.6}
.orbit{position:absolute;width:${width * .76}px;height:${width * .76}px;right:-40%;top:14%;border:1px solid ${dark ? '#ffffff12' : '#17171c0d'};border-radius:50%;pointer-events:none}
</style></head><body><main id="socialpro-motion" data-composition-id="socialpro-motion" data-start="0" data-duration="${scene.duration}" data-width="${width}" data-height="${height}">
<div class="orbit"></div><div class="rail"><strong>SOCIALPRO<span> / STUDIO</span></strong><span>PEOPLE / STORIES / WORK</span></div>
<div class="content"><div class="eyebrow reveal" data-delay="0">${design.label}</div><h1 class="reveal" data-delay=".12">${escapeHTML(scene.title)}</h1><div class="signature"></div>${details}</div><div class="rule"></div><div class="footer">GAMING. PERSONAS. IDEAS.</div>
</main><script>
const duration=${scene.duration};const clamp=v=>Math.max(0,Math.min(1,v));const ease=v=>1-Math.pow(1-clamp(v),3);
let time=0;let paused=true;const elements=[...document.querySelectorAll('.reveal')];
function fit(){const box=document.querySelector('.content');const title=box.querySelector('h1');let n=0;const natural=()=>[...box.children].reduce((sum,e)=>sum+e.getBoundingClientRect().height,0)+(box.children.length-1)*parseFloat(getComputedStyle(box).gap);while(natural()>box.clientHeight&&n++<70){const size=parseFloat(getComputedStyle(title).fontSize);const gap=parseFloat(getComputedStyle(box).gap);if(size>40.1)title.style.fontSize=Math.max(40,size*.94)+'px';else if(gap>12.1)box.style.gap=Math.max(12,gap*.94)+'px';else for(const e of box.querySelectorAll('.description,.step span,.contact'))e.style.fontSize=Math.max(20,parseFloat(getComputedStyle(e).fontSize)*.96)+'px';}window.__studioLayoutFits=natural()<=box.clientHeight+1;}
function seek(t){time=Math.max(0,Math.min(duration,Number(t)||0));const end=clamp((duration-time)/.22);for(const e of elements){const p=ease((time-Number(e.dataset.delay))/.65);e.style.opacity=p*end;e.style.transform='translateY('+((1-p)*36)+'px)';}document.querySelector('.signature').style.transform='scaleX('+ease(time/.8)+')';document.querySelector('.orbit').style.transform='translateY('+Math.sin(time*.65)*14+'px)';return timeline;}
const timeline={duration:()=>duration,totalDuration:()=>duration,time:t=>t===undefined?time:seek(t),totalTime:t=>t===undefined?time:seek(t),seek,pause:()=>{paused=true;return timeline},play:()=>{paused=false;return timeline},paused:()=>paused,timeScale:()=>1,getChildren:()=>[],eventCallback:()=>timeline};
window.__timelines={'socialpro-motion':timeline};window.renderFrame=seek;document.fonts.ready.then(()=>{fit();seek(time)});seek(0);
${preview ? `let origin;function tick(now){if(origin===undefined)origin=now;seek(((now-origin)/1000)%(duration+.7));requestAnimationFrame(tick)}if(!matchMedia('(prefers-reduced-motion: reduce)').matches)requestAnimationFrame(tick);else seek(Math.min(1.5,duration/2));` : ''}
</script></body></html>`;
}
