'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface CreatorOption {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  sub: string;
  photoUrl: string | null;
}

interface Props {
  creators: CreatorOption[];
  activeSlug: string;
}

function CreatorAvatar({ creator, size }: { creator: CreatorOption; size: number }) {
  if (creator.photoUrl) {
    return (
      <Image
        src={creator.photoUrl}
        alt={creator.name}
        width={size}
        height={size}
        className="gp-dd-avatar"
        unoptimized={creator.photoUrl.startsWith('/api/')}
      />
    );
  }
  return (
    <span className="gp-dd-avatar gp-dd-avatar-emoji" aria-hidden style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}>
      {creator.emoji}
    </span>
  );
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
        <CreatorAvatar creator={active} size={22} /> Creador: <span>{active.name}</span> ▾
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
            <CreatorAvatar creator={c} size={30} />
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
