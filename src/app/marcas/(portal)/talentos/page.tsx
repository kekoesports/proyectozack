import { getTalents } from '@/lib/queries/talents';
import type { TalentFilters } from '@/lib/queries/talents';
import { FilterChips } from '@/features/brand-portal/components/FilterChips';
import { EmptyState } from '@/features/brand-portal/components/EmptyState';
import { BrandTalentCard } from '@/features/brand-portal/components/BrandTalentCard';
import { Suspense } from 'react';

type PageProps = {
  searchParams: Promise<{ platform?: string; tag?: string }>;
}

export default async function BrandTalentCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters: TalentFilters = {};
  if (params.platform === 'twitch' || params.platform === 'youtube') {
    filters.platform = params.platform;
  }
  if (params.tag) {
    filters.tags = [params.tag];
  }

  const talents = await getTalents(filters);

  return (
    <div>
      <h1 className="font-display text-4xl font-black uppercase text-sp-dark mb-6">Talentos</h1>

      {/* Filters */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-sp-muted uppercase tracking-wider">Plataforma</span>
          <Suspense>
            <FilterChips
              paramName="platform"
              options={[
                { label: 'Twitch', value: 'twitch' },
                { label: 'YouTube', value: 'youtube' },
              ]}
            />
          </Suspense>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-sp-muted uppercase tracking-wider">Nicho</span>
          <Suspense>
            <FilterChips
              paramName="tag"
              options={[
                { label: 'CS2', value: 'CS2' },
                { label: 'Valorant', value: 'Valorant' },
                { label: 'LatAm', value: 'LatAm' },
                { label: 'Lifestyle', value: 'Lifestyle' },
              ]}
            />
          </Suspense>
        </div>
      </div>

      {/* Results */}
      <p className="text-sm text-sp-muted mb-4">{talents.length} talentos encontrados</p>

      {talents.length === 0 ? (
        <EmptyState
          message="Ningun talento coincide con tus filtros."
          actionLabel="Limpiar filtros"
          actionHref="/marcas/talentos"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {talents.map((talent) => (
            <BrandTalentCard key={talent.id} talent={talent} />
          ))}
        </div>
      )}
    </div>
  );
}
