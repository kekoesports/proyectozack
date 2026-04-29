'use client';

import { useState } from 'react';
import { ProposalModal } from '@/features/brand-portal/components/ProposalModal';

type Props = {
  talentId: number;
  talentName: string;
}

/**
 * Cliente de la ficha de talent en el portal de marcas: gestiona apertura del modal de propuesta.
 *
 * @kind client
 * @feature brand-portal
 * @route /marcas/talentos/[slug]
 * @example
 * ```tsx
 * <BrandTalentFichaClient talentId={talent.id} talentName={talent.name} />
 * ```
 */
export function BrandTalentFichaClient({ talentId, talentName }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-8 py-3 rounded-full font-bold text-white text-sm bg-sp-grad hover:opacity-90 transition-opacity"
      >
        Enviar propuesta
      </button>
      {showModal && (
        <ProposalModal talentId={talentId} talentName={talentName} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
