import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { crmEvents } from '@/db/schema';

export type CrmEvent    = InferSelectModel<typeof crmEvents>;
export type NewCrmEvent = InferInsertModel<typeof crmEvents>;
