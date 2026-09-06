import type { StudioScene, StudioBoard } from '@/lib/schemas/studio-production';
import { motionDesign } from './motion-catalog';
import { collectionStyles } from './motion-collection-styles';

const esc = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export type MotionResources = { display: string; body: string; logo?: string };

/** Versioned, offline compositions. Only escaped editorial text enters these trusted templates. */
export function collectionDocument(scene: StudioScene, board: Pick<StudioBoard, 'format' | 'palette'>, resources: MotionResources, preview: boolean) {
  if (!scene.motion || !resources.logo) throw new Error('branded_motion_resources_required');
  const design = motionDesign(scene.motion);
  const variant = scene.motion.split('-')[0] ?? '';
  const width = board.format === '16:9' ? 1280 : 720;
  const height = board.format === '9:16' ? 1280 : 720;
  const lines = scene.body.split('\n').map((line) => line.trim()).filter(Boolean);
  const row = (line: string, index: number, marker: string) => `<div class="item reveal" data-delay="${.4 + index * .22}"><b class="marker">${marker}</b><span>${esc(line)}</span></div>`;
  const contents: Record<string, () => string> = {
    steps: () => `<div class="steps">${lines.map((line, i) => row(line, i, `0${i + 1}`)).join('')}</div>`,
    compare: () => `<div class="compare">${lines.map((line, i) => row(line, i, i === 0 ? 'A' : 'B')).join('')}</div>`,
    checklist: () => `<div class="checklist">${lines.map((line, i) => row(line, i, '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 16l6 6L26 9"/></svg>')).join('')}</div>`,
    quiz: () => `<div class="quiz">${lines.map((line, i) => row(line, i, ['A', 'B', 'C'][i] ?? '')).join('')}</div>`,
    live: () => `<div class="live"><div class="waves" aria-hidden="true">${'<i></i>'.repeat(9)}</div>${lines.map((line, i) => row(line, i, '—')).join('')}</div>`,
    timeline: () => `<div class="timeline"><i class="connector"></i>${lines.map((line, i) => row(line, i, `0${i + 1}`)).join('')}</div>`,
    contact: () => `<div class="contact reveal" data-delay=".45"><span>${esc(scene.body)}</span><b aria-hidden="true">↗</b></div>`,
  };
  const details = contents[variant]?.() ?? `<div class="description reveal" data-delay=".4">${esc(scene.body)}</div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=${width}">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'self'; style-src 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<style>@font-face{font-family:Display;src:url('${resources.display}')}@font-face{font-family:Body;src:url('${resources.body}')}${collectionStyles(width, height, board.palette === 'dark')}</style></head>
<body><main id="socialpro-motion" class="design-${variant}" data-composition-id="socialpro-motion" data-start="0" data-duration="${scene.duration}" data-width="${width}" data-height="${height}">
<div class="art" aria-hidden="true"><i></i><i></i><i></i></div>
<div class="rail"><img src="${resources.logo}" alt="SocialPro"/><span>CREATOR STUDIO</span></div>
<div class="content"><div class="eyebrow reveal" data-delay="0">${design.label}</div><h1 class="reveal" data-delay=".12">${esc(scene.title)}</h1>${details}</div>
<div class="rule"></div><footer>SOCIALPRO <span>PEOPLE / STORIES / WORK</span></footer></main>
<script>
const duration=${scene.duration};let time=0,paused=true;const clamp=v=>Math.max(0,Math.min(1,v));const ease=v=>1-Math.pow(1-clamp(v),3);
const box=document.querySelector('.content');const elements=[...document.querySelectorAll('.reveal')];
function fit(){let scale=1;const measure=()=>Math.max(box.scrollHeight,[...box.children].reduce((n,e)=>n+e.offsetHeight,0)+(box.children.length-1)*parseFloat(getComputedStyle(box).gap));while(measure()>box.clientHeight+1&&scale>.56){scale-=.015;box.style.setProperty('--fit',scale);}window.__studioLayoutFits=measure()<=box.clientHeight+1;}
function seek(t){time=Math.max(0,Math.min(duration,Number(t)||0));for(const [i,e] of elements.entries()){const p=ease((time-Number(e.dataset.delay))/.7);e.style.opacity=p*clamp((duration-time)/.2);let x=0,y=(1-p)*32,rotate=0;if(e.closest('.compare')&&!e.matches('h1'))x=(1-p)*(i%2?70:-70);if(e.closest('.steps'))rotate=(1-p)*-3;e.style.transform='translate('+x+'px,'+y+'px) rotate('+rotate+'deg)';const path=e.querySelector('path');if(path)path.style.strokeDashoffset=42*(1-p);}document.querySelector('.art').style.transform='rotate('+Math.sin(time*.4)*3+'deg) translateY('+Math.sin(time*.6)*12+'px)';const line=document.querySelector('.connector');if(line)line.style.transform='scaleY('+ease((time-.3)/1.3)+')';document.querySelectorAll('.waves i').forEach((e,i)=>e.style.transform='scaleY('+(0.35+Math.abs(Math.sin(time*2+i*.8))*.65)+')');return timeline;}
const timeline={duration:()=>duration,totalDuration:()=>duration,time:t=>t===undefined?time:seek(t),totalTime:t=>t===undefined?time:seek(t),seek,pause:()=>{paused=true;return timeline},play:()=>{paused=false;return timeline},paused:()=>paused,timeScale:()=>1,getChildren:()=>[],eventCallback:()=>timeline};
window.__timelines={'socialpro-motion':timeline};window.renderFrame=seek;document.fonts.ready.then(()=>{fit();seek(time)});seek(0);
${preview ? `let origin;function tick(now){if(origin===undefined)origin=now;seek(((now-origin)/1000)%(duration+.7));requestAnimationFrame(tick)}if(!matchMedia('(prefers-reduced-motion: reduce)').matches)requestAnimationFrame(tick);else seek(Math.min(1.5,duration/2));` : ''}
</script></body></html>`;
}
