'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface CreatorOption {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  sub: string;
}

interface Props {
  creators: CreatorOption[];
  activeSlug: string;
}

export function CreatorDropdown({ creators, activeSlug }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = useRef<HTMLDivElement>(null);
  const active = creators.find((c) => c.slug === activeSlug) ?? creators[0];

  // Cierre por click fuera. Único useEffect y para una interacción imperativa real.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('creador', slug);
    setOpen(false);
    router.push(`/sorteos/plataforma?${params.toString()}`, { scroll: false });
  }

  if (!active) return null;

  return (
    <div ref={ref} className={`gp-dd${open ? ' open' : ''}`}>
      <button type="button" className="gp-dd-btn" onClick={() => setOpen((v) => !v)}>
        <span aria-hidden>{active.emoji}</span> Creador: <span>{active.name}</span> ▾
      </button>
      <div className="gp-dd-menu" role="menu">
        {creators.map((c) => (
          <button
            type="button"
            key={c.slug}
            role="menuitem"
            className={`gp-dd-item${c.slug === activeSlug ? ' on' : ''}`}
            style={{ ['--c' as string]: c.color }}
            onClick={() => select(c.slug)}
          >
            <span className="em">{c.emoji}</span>
            <span>
              <b>{c.name}</b>
              <span>{c.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
