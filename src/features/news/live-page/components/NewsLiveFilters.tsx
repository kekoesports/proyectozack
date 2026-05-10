'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  COUNTRY_FILTER_OPTIONS,
  SCENE_ROLE_FILTER_OPTIONS,
  countryFlag,
  countryLabel,
  sceneRoleLabel,
  type SceneRole,
} from '@/lib/utils/news-roles';

type Props = {
  readonly counts: {
    total: number;
    byCountry: Partial<Record<string, number>>;
    byRole: Partial<Record<SceneRole, number>>;
  };
};

export function NewsLiveFilters({ counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const activeCountry = params.get('country');
  const activeRole = params.get('role');

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const href = `${pathname}${next.toString() ? `?${next.toString()}` : ''}`;
    startTransition(() => router.replace(href, { scroll: false }));
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${isPending ? 'opacity-70' : ''}`}>
      <FilterGroup label="País">
        <FilterChip
          label="Todos"
          count={counts.total}
          active={!activeCountry}
          onClick={() => setParam('country', null)}
        />
        {COUNTRY_FILTER_OPTIONS.map((code) => {
          const c = counts.byCountry[code] ?? 0;
          if (c === 0) return null;
          return (
            <FilterChip
              key={code}
              label={countryLabel(code) ?? code}
              icon={countryFlag(code)}
              count={c}
              active={activeCountry === code}
              onClick={() => setParam('country', activeCountry === code ? null : code)}
            />
          );
        })}
      </FilterGroup>

      <span aria-hidden className="hidden md:block w-px h-5 bg-white/10 mx-1" />

      <FilterGroup label="Rol">
        <FilterChip
          label="Todos"
          count={counts.total}
          active={!activeRole}
          onClick={() => setParam('role', null)}
        />
        {SCENE_ROLE_FILTER_OPTIONS.map((role) => {
          const c = counts.byRole[role] ?? 0;
          if (c === 0) return null;
          return (
            <FilterChip
              key={role}
              label={sceneRoleLabel(role)}
              count={c}
              active={activeRole === role}
              onClick={() => setParam('role', activeRole === role ? null : role)}
            />
          );
        })}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mr-1">
        {label}
      </span>
      {children}
    </div>
  );
}

type ChipProps = {
  readonly label: string;
  readonly icon?: string | null;
  readonly count: number;
  readonly active: boolean;
  readonly onClick: () => void;
};

function FilterChip({ label, icon, count, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
        active
          ? 'bg-white text-sp-black border border-white'
          : 'border border-white/10 text-white/65 hover:text-white hover:border-white/25 bg-white/[0.02]'
      }`}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {label}
      <span className={`ml-0.5 tabular-nums ${active ? 'text-sp-black/55' : 'text-white/35'}`}>
        {count}
      </span>
    </button>
  );
}
