'use client';

import { BrandCatalogManager } from './BrandCatalogManager';
import type { BrandCatalogEntry } from './brand-actions';

type Props = {
  readonly brands: readonly BrandCatalogEntry[];
};

export function BrandsTab({ brands }: Props): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-sp-admin-muted">
          Define las marcas con las que trabajas. Al crear un sorteo o código, selecciona la marca del catálogo y los campos se rellenan automáticamente.
        </p>
      </div>
      <BrandCatalogManager brands={[...brands]} />
    </div>
  );
}
