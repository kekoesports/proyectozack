'use client';

import { useRouter } from 'next/navigation';

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

/** Selector de creador: navega a la URL canónica /sorteos/[slug]. */
export function CreatorSwitcher({ creators, activeSlug }: Props) {
  const router = useRouter();

  function select(slug: string) {
    router.push(`/sorteos/${slug}`, { scroll: false });
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
