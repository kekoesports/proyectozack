'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface CreatorOption {
  id: number;
  slug: string;
  name: string;
  photoUrl: string | null;
}

interface Props {
  creators: CreatorOption[];
  activeSlug: string;
}

/** Selector de creador: cambia ?creador= en la URL, la página server re-renderiza sus sorteos. */
export function CreatorSwitcher({ creators, activeSlug }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('creador', slug);
    router.push(`/sorteos/plataforma?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {creators.map((c) => (
        <button
          key={c.slug}
          onClick={() => select(c.slug)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide transition ${
            c.slug === activeSlug
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {c.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.photoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : null}
          {c.name}
        </button>
      ))}
    </div>
  );
}
