import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import type { crmTaskTemplates } from '@/db/schema';

export type CrmTaskTemplate = InferSelectModel<typeof crmTaskTemplates>;
export type NewCrmTaskTemplate = InferInsertModel<typeof crmTaskTemplates>;
export type CrmTaskRecurrence = CrmTaskTemplate['recurrence'];
