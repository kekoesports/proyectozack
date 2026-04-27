import { requireRole } from '@/lib/auth-guard';
import { getTalentsByIds } from '@/lib/queries/talents';
import Image from 'next/image';
import { gradientStyle } from '@/lib/utils/gradient';
import Link from 'next/link';
import { EmptyState } from '@/features/brand-portal/components/EmptyState';

type PageProps = {
  searchParams: Promise<{ ids?: string }>;
}

export default async function BrandComparePage({ searchParams }: PageProps) {
  await requireRole('brand', '/marcas/login');
  const params = await searchParams;
  const idStrings = params.ids?.split(',').map(Number).filter(Boolean) ?? [];

  if (idStrings.length < 2) {
    return (
      <div>
        <h1 className="font-display text-4xl font-black uppercase text-sp-dark mb-6">Comparar talentos</h1>
        <EmptyState
          message="Selecciona al menos 2 talentos para comparar."
          actionLabel="Ir al catalogo"
          actionHref="/marcas/talentos"
        />
      </div>
    );
  }

  // Fetch only the selected talents by IDs
  const selected = (await getTalentsByIds(idStrings)).slice(0, 4);

  if (selected.length < 2) {
    return (
      <div>
        <h1 className="font-display text-4xl font-black uppercase text-sp-dark mb-6">Comparar talentos</h1>
        <EmptyState
          message="Algunos talentos ya no estan disponibles."
          actionLabel="Ir al catalogo"
          actionHref="/marcas/talentos"
        />
      </div>
    );
  }

  // Collect all unique stat labels across selected talents
  const allLabels = [...new Set(selected.flatMap((t) => t.stats.map((s) => s.label)))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl font-black uppercase text-sp-dark">
          Comparar talentos ({selected.length})
        </h1>
        <Link href="/marcas/talentos" className="text-sm text-sp-muted hover:text-sp-dark transition-colors">
          Volver al catalogo
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(240px, 1fr))` }}>
          {selected.map((talent) => {
            const grad = gradientStyle(talent.gradientC1, talent.gradientC2);
            return (
              <div key={talent.id} className="rounded-2xl bg-white border border-sp-border overflow-hidden">
                {/* Photo */}
                <div className="relative h-40 overflow-hidden" style={{ background: grad }}>
                  {talent.photoUrl ? (
                    <Image src={talent.photoUrl} alt={talent.name} fill className="object-cover object-top" sizes="25vw" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display text-5xl font-black text-white/80">{talent.initials}</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-display text-xl font-black uppercase text-sp-dark">{talent.name}</h3>
                  <p className="text-xs text-sp-muted mb-4">{talent.role}</p>
                  {/* Stats */}
                  {allLabels.map((label) => {
                    const stat = talent.stats.find((s) => s.label === label);
                    return (
                      <div key={label} className="flex justify-between py-1.5 border-b border-sp-border/50 last:border-0">
                        <span className="text-xs text-sp-muted">{label}</span>
                        <span className="text-xs font-bold text-sp-dark">{stat?.value ?? '—'}</span>
                      </div>
                    );
                  })}
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {talent.tags.map((t) => (
                      <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full bg-sp-off text-sp-muted">
                        {t.tag}
                      </span>
                    ))}
                  </div>
                  {/* CTA */}
                  <Link
                    href={`/marcas/talentos/${talent.slug}`}
                    className="block mt-4 text-center px-4 py-2 rounded-full text-xs font-bold text-white bg-sp-grad hover:opacity-90 transition-opacity"
                  >
                    Ver ficha completa
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
