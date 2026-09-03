'use client';

import { useEffect, useRef } from 'react';
import styles from '../kekopilot-motion.module.css';

type PinUpdate = {
  readonly progress: number;
  readonly rows: ReadonlyArray<HTMLElement>;
  readonly stage: HTMLElement | null;
  readonly track: HTMLElement | null;
  readonly travel: number;
  readonly type: string | undefined;
};

export function KekoPilotMotion() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-kp-root]');
    if (!root) return;

    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseQuery = window.matchMedia('(pointer: coarse)');
    const compactQuery = window.matchMedia('(max-width: 900px)');
    const header = root.querySelector<HTMLElement>('[data-kp-header]');
    const pinWraps = Array.from(root.querySelectorAll<HTMLElement>('[data-kp-pin-wrap]'));
    const reveals = Array.from(root.querySelectorAll<HTMLElement>('[data-kp-reveal]'));
    const cursor = cursorRef.current;

    if (reducedQuery.matches) {
      root.dataset.kpMotion = 'reduced';
      reveals.forEach((element) => { element.dataset.visible = ''; });
      pinWraps.forEach((wrap) => {
        wrap.querySelectorAll<HTMLElement>('[data-kp-arch-row]').forEach((row) => { row.dataset.active = ''; });
      });
      return;
    }

    root.dataset.kpMotion = 'enhanced';

    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.target instanceof HTMLElement) entry.target.dataset.visible = '';
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    reveals.forEach((element) => revealObserver.observe(element));

    const navLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-kp-nav-link]'));
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-kp-section]'));
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (!visible) return;
      const sectionId = visible.target.id;
      for (const link of navLinks) {
        if (link.hash === `#${sectionId}`) link.dataset.current = '';
        else delete link.dataset.current;
      }
    }, { rootMargin: '-38% 0px -54% 0px', threshold: 0 });
    sections.forEach((section) => sectionObserver.observe(section));

    let animationFrame = 0;
    const updateNarrative = () => {
      animationFrame = 0;
      if (header) {
        if (window.scrollY > 32) header.dataset.scrolled = '';
        else delete header.dataset.scrolled;
      }

      const compact = compactQuery.matches;
      const viewportHeight = window.innerHeight;
      const updates: PinUpdate[] = pinWraps.map((wrap) => {
        const rect = wrap.getBoundingClientRect();
        const stage = wrap.querySelector<HTMLElement>('[data-kp-pin-stage]');
        const track = wrap.querySelector<HTMLElement>('[data-kp-flow-track]');
        const rows = Array.from(wrap.querySelectorAll<HTMLElement>('[data-kp-arch-row]'));
        const span = Math.max(1, rect.height - viewportHeight);
        const progress = compact ? 1 : Math.min(1, Math.max(0, -rect.top / span));
        const travel = track?.parentElement ? Math.max(0, track.scrollWidth - track.parentElement.clientWidth) : 0;
        return { progress, rows, stage, track, travel, type: wrap.dataset.kpPinWrap };
      });

      for (const update of updates) {
        update.stage?.style.setProperty('--kp-progress', update.progress.toFixed(4));
        if (update.type === 'architecture') {
          const activeThrough = Math.max(0, Math.floor(update.progress * update.rows.length * 1.08));
          update.rows.forEach((row, index) => {
            if (compact || index <= activeThrough) row.dataset.active = '';
            else delete row.dataset.active;
          });
        }
        if (update.track) {
          if (compact) update.track.style.removeProperty('transform');
          else update.track.style.transform = `translate3d(${-update.travel * update.progress}px, 0, 0)`;
        }
      }
    };

    const scheduleNarrative = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateNarrative);
    };

    window.addEventListener('scroll', scheduleNarrative, { passive: true });
    window.addEventListener('resize', scheduleNarrative, { passive: true });
    scheduleNarrative();

    let pointerFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let magnetic: HTMLElement | null = null;

    const paintPointer = () => {
      pointerFrame = 0;
      cursor?.style.setProperty('transform', `translate3d(${pointerX}px, ${pointerY}px, 0)`);
      if (!magnetic) return;
      const rect = magnetic.getBoundingClientRect();
      const x = (pointerX - rect.left - rect.width / 2) * 0.08;
      const y = (pointerY - rect.top - rect.height / 2) * 0.08;
      magnetic.style.setProperty('--kp-magnetic-x', `${x.toFixed(2)}px`);
      magnetic.style.setProperty('--kp-magnetic-y', `${y.toFixed(2)}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (cursor) cursor.dataset.visible = '';
      const candidate = event.target instanceof Element ? event.target.closest('[data-kp-magnetic]') : null;
      if (magnetic && magnetic !== candidate) {
        magnetic.style.removeProperty('--kp-magnetic-x');
        magnetic.style.removeProperty('--kp-magnetic-y');
      }
      magnetic = candidate instanceof HTMLElement ? candidate : null;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(paintPointer);
    };

    const onPointerOver = (event: PointerEvent) => {
      const interactive = event.target instanceof Element && event.target.closest('[data-kp-cursor], a, button, summary');
      if (cursor && interactive) cursor.dataset.active = '';
      else if (cursor) delete cursor.dataset.active;
    };

    const onPointerLeave = () => {
      if (cursor) delete cursor.dataset.visible;
    };

    if (!coarseQuery.matches && cursor) {
      root.dataset.kpCursor = 'on';
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerover', onPointerOver, { passive: true });
      document.addEventListener('mouseleave', onPointerLeave);
    }

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
      window.removeEventListener('scroll', scheduleNarrative);
      window.removeEventListener('resize', scheduleNarrative);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('mouseleave', onPointerLeave);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    };
  }, []);

  return <div aria-hidden="true" className={styles.cursor} ref={cursorRef} />;
}
