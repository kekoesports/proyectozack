import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brandCampaigns, talentProposals } from '@/db/schema';
import type { BrandCampaignWithRelations, TalentProposalWithTalent } from '@/types';

/**
 * Lista las campañas asociadas a un usuario marca del portal de marcas.
 *
 * @cache none
 * @visibility admin
 * @scope brand
 * @returns array (puede ser vacío). Nunca null. Incluye relaciones `talent` y `caseStudy`.
 */
export async function getBrandCampaigns(brandUserId: string): Promise<BrandCampaignWithRelations[]> {
  const rows = await db.query.brandCampaigns.findMany({
    where: eq(brandCampaigns.brandUserId, brandUserId),
    with: {
      talent: true,
      caseStudy: true,
    },
    orderBy: [desc(brandCampaigns.createdAt)],
  });
  return rows as BrandCampaignWithRelations[];
}

/**
 * Lista las propuestas de talents emitidas a un usuario marca del portal.
 *
 * @cache none
 * @visibility admin
 * @scope brand
 * @returns array (puede ser vacío). Nunca null. Incluye la relación `talent`.
 */
export async function getBrandProposals(brandUserId: string): Promise<TalentProposalWithTalent[]> {
  const rows = await db.query.talentProposals.findMany({
    where: eq(talentProposals.brandUserId, brandUserId),
    with: {
      talent: true,
    },
    orderBy: [desc(talentProposals.createdAt)],
  });
  return rows as TalentProposalWithTalent[];
}

/**
 * Lista las campañas de un talent específico para una marca concreta del portal.
 *
 * @cache none
 * @visibility admin
 * @scope brand
 * @returns array (puede ser vacío). Nunca null. Incluye `talent` y `caseStudy`.
 */
export async function getTalentCampaignsForBrand(
  brandUserId: string,
  talentId: number,
): Promise<BrandCampaignWithRelations[]> {
  const rows = await db.query.brandCampaigns.findMany({
    where: and(
      eq(brandCampaigns.brandUserId, brandUserId),
      eq(brandCampaigns.talentId, talentId),
    ),
    with: {
      talent: true,
      caseStudy: true,
    },
    orderBy: [desc(brandCampaigns.createdAt)],
  });
  return rows as BrandCampaignWithRelations[];
}
