import Link from 'next/link';
import { formatCompact } from '@/lib/format';
import { EmptyState } from '@/components/admin/ui/EmptyState';

import type { TopCreatorByFollowers } from '@/lib/queries/analytics';

type Props = {
  readonly creators: readonly TopCreatorByFollowers[];
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YT',
  twitch: 'TW',
  instagram: 'IG',
  tiktok: 'TK',
  twitter: 'X',
  x: 'X',
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  twitch: '#9146FF',
  instagram: '#E1306C',
  tiktok: '#010101',
  twitter: '#1DA1F2',
  x: '#1DA1F2',
};

function CreatorAvatar({
  name,
  photoUrl,
  gradientC1,
  gradientC2,
  initials,
}: {
  readonly name: string;
  readonly photoUrl: string | null;
  readonly gradientC1: string;
  readonly gradientC2: string;
  readonly initials: string;
}): React.ReactElement {
  if (photoUrl !== null) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ background: `linear-gradient(135deg, ${gradientC1}, ${gradientC2})` }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function RankingTable({ creators }: Props): React.ReactElement {
  if (creators.length === 0) {
    return (
      <EmptyState
        title="Sin datos de ranking"
        description="No hay snapshots de métricas registrados todavía."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm min-w-[560px]">
        <thead>
          <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
            <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted w-8">
              #
            </th>
            <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
              Creador
            </th>
            <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
              Plataformas
            </th>
            <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted text-right">
              Followers totales
            </th>
            <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted text-right w-10">
              Perfil
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sp-admin-border/60">
          {creators.map((creator, i) => (
            <tr
              key={creator.id}
              className="hover:bg-sp-admin-hover transition-colors"
            >
              <td className="px-4 py-3 text-xs text-sp-admin-muted tabular-nums">
                {i + 1}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <CreatorAvatar
                    name={creator.name}
                    photoUrl={creator.photoUrl}
                    gradientC1={creator.gradientC1}
                    gradientC2={creator.gradientC2}
                    initials={creator.initials}
                  />
                  <span className="font-semibold text-[13px] text-sp-admin-text">
                    {creator.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 flex-wrap">
                  {creator.platforms.length === 0 ? (
                    <span className="text-[11px] text-sp-admin-muted/40">—</span>
                  ) : (
                    creator.platforms.map((p) => (
                      <span
                        key={p}
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          color: PLATFORM_COLORS[p] ?? '#888',
                          background: `${PLATFORM_COLORS[p] ?? '#888'}22`,
                        }}
                      >
                        {PLATFORM_LABELS[p] ?? p.toUpperCase()}
                      </span>
                    ))
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-display text-sm font-bold text-sp-admin-text tabular-nums">
                  {creator.totalFollowers > 0 ? formatCompact(creator.totalFollowers) : '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/talents/${creator.id}`}
                  prefetch={false}
                  className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
                >
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
