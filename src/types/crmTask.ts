import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { crmTasks, crmTaskTemplates } from '@/db/schema';

export type CrmTaskTemplate = InferSelectModel<typeof crmTaskTemplates>;

export type CrmTask = InferSelectModel<typeof crmTasks>;
export type NewCrmTask = InferInsertModel<typeof crmTasks>;

export type CrmTaskPriority = CrmTask['priority'];
export type CrmTaskStatus = CrmTask['status'];
export type CrmTaskRelatedType = NonNullable<CrmTask['relatedType']>;

export type TeamTasksSummary = {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly role: string | null;
  readonly completed: number;
  readonly pending: number;
  readonly overdue: number;
};
