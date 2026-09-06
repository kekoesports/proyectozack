'use client';

import { useRef } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import Link from 'next/link';

/** Pointer-only enhancement; the link and content work without motion or JS. */
export function StudioDepthCard() {
  const card = useRef<HTMLAnchorElement>(null);
  return <div className="studio-depth-stage"><Link href="/studio/templates" className="studio-depth-card" ref={card} onPointerMove={(event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    card.current?.style.setProperty('--tilt-x', `${-(event.clientY - box.top - box.height / 2) / box.height * 8}deg`);
    card.current?.style.setProperty('--tilt-y', `${(event.clientX - box.left - box.width / 2) / box.width * 8}deg`);
  }} onPointerLeave={() => { card.current?.style.setProperty('--tilt-x', '0deg'); card.current?.style.setProperty('--tilt-y', '0deg'); }}>
    <span className="studio-eyebrow">MOTION COLLECTION / 01</span><div className="studio-depth-symbol" aria-hidden="true"><Play size={40} fill="currentColor" /></div><strong>TU IDEA.<br />EN MOVIMIENTO.</strong><span className="studio-depth-timeline" aria-hidden="true"><i /><i /><i /></span><footer>Plantillas hechas para tu historia <ArrowUpRight size={17} /></footer>
  </Link></div>;
}
