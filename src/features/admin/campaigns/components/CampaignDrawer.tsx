'use client';

import { EditDrawer } from '@/features/admin/_shared/components/EditDrawer';
import type { CampaignRow, CrmBrandContact } from '@/types';

import { CampaignForm, type BrandOption, type TalentOption, type StaffOption } from './CampaignDrawer.parts';

type Props = {
  readonly campaign: CampaignRow | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly staffUsers: readonly StaffOption[];
  readonly contactsByBrand: Readonly<Record<number, readonly CrmBrandContact[]>>;
  readonly isManager: boolean;
};

/**
 * Drawer lateral con el formulario CRUD de una campaña (presupuesto previsto en EUR para marca/talent, no pagos reales).
 *
 * @kind client
 * @feature admin/campaigns
 */
export function CampaignDrawer({
  campaign,
  isOpen,
  onClose,
  brands,
  talents,
  staffUsers,
  contactsByBrand,
  isManager,
}: Props): React.ReactElement {
  // Use campaign id (or 'new') as key so the form remounts on each open/switch
  const formKey = isOpen ? (campaign ? String(campaign.id) : 'new') : 'closed';

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={campaign !== null ? 'Editar campaña' : 'Nueva campaña'}
    >
      <CampaignForm
        key={formKey}
        campaign={campaign}
        onClose={onClose}
        onSuccess={onClose}
        brands={brands}
        talents={talents}
        staffUsers={staffUsers}
        contactsByBrand={contactsByBrand}
        isManager={isManager}
      />
    </EditDrawer>
  );
}
