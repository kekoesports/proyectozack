'use client';

import { CodesTable } from './CodesTable';
import type { CreatorCodeWithTalent, GiveawayWithTalent } from '@/types';
import type { BrandCatalogEntry } from './brand-actions';

type Props = {
  readonly codes:    readonly CreatorCodeWithTalent[];
  readonly talents:  readonly Pick<GiveawayWithTalent['talent'], 'id' | 'name' | 'slug'>[];
  readonly brands:   readonly BrandCatalogEntry[];
  readonly onNewCode: () => void;
};

export function CodesTab({ codes, talents, brands, onNewCode }: Props): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onNewCode}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Nuevo código
        </button>
      </div>
      <CodesTable
        codes={codes}
        talents={talents.map((t) => ({ id: t.id, name: t.name }))}
        brandCatalog={brands}
      />
    </div>
  );
}
