import type { InferSelectModel } from 'drizzle-orm';
import type { pressTargets } from '@/db/schema';

export type PressTarget = InferSelectModel<typeof pressTargets>;

export type PressTargetCategory = PressTarget['category'];
export type PressTargetOutreachStatus = PressTarget['outreachStatus'];
