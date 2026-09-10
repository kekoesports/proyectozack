'use client';

import { useEffect, useRef, useState } from 'react';

export function useAgencyVideoVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  // WHY: subscribe to viewport, tab visibility and the browser motion preference.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    const update = () => {
      setVisible(inView && !document.hidden);
      setReducedMotion(motion.matches);
    };
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      inView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.45);
      update();
    }, { threshold: [0, 0.45] });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      motion.removeEventListener('change', update);
    };
  }, []);

  return { ref, visible, reducedMotion };
}
