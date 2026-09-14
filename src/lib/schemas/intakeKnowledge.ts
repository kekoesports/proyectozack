import { z } from 'zod';

export const IntakeKnowledgeTopic = z.enum([
  'agency', 'creator_services', 'brand_services', 'youtube', 'main_fit', 'tiktok_fit',
  'other_profiles', 'metrics', 'onboarding', 'markets', 'team', 'contact', 'portfolio',
  'conditions', 'privacy', 'brand_brief', 'compliance',
]);
export type IntakeKnowledgeTopic = z.infer<typeof IntakeKnowledgeTopic>;
