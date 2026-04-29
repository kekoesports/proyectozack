import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { brandBriefs } from '@/db/schema';

export type BrandBrief    = InferSelectModel<typeof brandBriefs>;
export type NewBrandBrief = InferInsertModel<typeof brandBriefs>;

export type BrandBriefStatus = 'pending_review' | 'approved' | 'archived';

export type BrandBriefWithUser = BrandBrief & {
  readonly createdByName:  string | null;
  readonly reviewedByName: string | null;
};
