'use client';

import { useState, type ReactNode } from 'react';

type Tab = {
  readonly key: string;
  readonly label: string;
  readonly content: ReactNode;
};

/**
 * Componente genérico de tabs controlado por estado local, usado en el detalle de una marca del CRM.
 *
 * @kind client
 * @feature admin/brands
 * @route /admin/brands
 */
export function BrandsTabs({ tabs, defaultKey }: { readonly tabs: readonly Tab[]; readonly defaultKey: string }): React.ReactElement {
  const [active, setActive] = useState(defaultKey);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-sp-admin-border mb-6">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`px-5 py-3 text-sm font-semibold transition-colors cursor-pointer relative ${
                isActive ? 'text-sp-admin-text' : 'text-sp-admin-muted hover:text-sp-admin-text'
              }`}
            >
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sp-admin-accent" />}
            </button>
          );
        })}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
}
