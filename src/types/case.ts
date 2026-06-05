import type { InferSelectModel } from 'drizzle-orm';
import type { caseStudies, caseBody, caseTags, caseCreators } from '@/db/schema';

export type CaseStudy = InferSelectModel<typeof caseStudies>;
export type CaseBodyRow = InferSelectModel<typeof caseBody>;
export type CaseTag = InferSelectModel<typeof caseTags>;
export type CaseCreator = InferSelectModel<typeof caseCreators>;

export type CaseCreatorWithSlug = CaseCreator & {
  talentSlug: string | null;
  talentPhotoUrl: string | null;
  talentGradientC1: string | null;
  talentGradientC2: string | null;
  talentInitials: string | null;
};

export type CaseStudyWithRelations = CaseStudy & {
  body: CaseBodyRow[];
  tags: CaseTag[];
  creators: CaseCreatorWithSlug[];
};
