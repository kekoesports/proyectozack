'use client';

import * as m from 'motion/react-client';

import { BRAND_GRADIENT } from '@/lib/utils/gradient';

type Tab<K extends string> = {
  key: K;
  label: string;
}

type FilterTabsProps<K extends string> = {
  readonly tabs: readonly Tab<K>[];
  readonly active: K;
  readonly onChange: (key: K) => void;
  readonly instanceId: string;
}

/**
 * Tabs de filtro con indicador animado (gradient pill) que se desplaza entre
 * pestañas usando `layoutId`. Genérico sobre la clave de cada tab.
 *
 * @kind client
 * @feature ui
 * @example
 * ```tsx
 * <FilterTabs
 *   instanceId="services-filter"
 *   tabs={[{ key: 'all', label: 'Todos' }, { key: 'igaming', label: 'iGaming' }]}
 *   active={active}
 *   onChange={setActive}
 * />
 * ```
 */
export function FilterTabs<K extends string>({ tabs, active, onChange, instanceId }: FilterTabsProps<K>): React.JSX.Element {
  const layoutId = `${instanceId}-active-tab`;

  return (
    <div className="flex items-center gap-2 justify-center mb-8 flex-wrap">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="relative px-5 py-2 rounded-full text-sm font-semibold"
        >
          {active !== key && (
            <span className="absolute inset-0 rounded-full bg-sp-bg2" />
          )}
          {active === key && (
            <m.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-full"
              style={{ background: BRAND_GRADIENT }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <span className={`relative z-10 ${active === key ? 'text-white' : 'text-sp-muted hover:text-sp-dark'}`}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
