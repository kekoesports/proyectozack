import { pgEnum } from 'drizzle-orm/pg-core';

import { CRM_TASK_PRIORITIES, CRM_TASK_STATUSES } from '@/lib/schemas/task';
import { CRM_TASK_RECURRENCES } from '@/lib/schemas/taskTemplate';

export const crmTaskPriorityEnum = pgEnum('crm_task_priority', CRM_TASK_PRIORITIES);
export const crmTaskStatusEnum = pgEnum('crm_task_status', CRM_TASK_STATUSES);
export const crmTaskRecurrenceEnum = pgEnum('crm_task_recurrence', CRM_TASK_RECURRENCES);
