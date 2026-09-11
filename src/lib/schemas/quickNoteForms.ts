import { z } from 'zod';
import { CivilDate, NoteMode } from './quickNote';
import { CRM_TASK_PRIORITIES, CRM_TASK_STATUSES } from './task';
const body = z.string().trim().min(1, 'Escribe una nota.').max(4000);
const date = z.union([z.literal(''), CivilDate]);
const reminder = z.union([
  z.literal(''),
  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
]);
export const QuickNoteDraft = z.object({ body, mode: NoteMode });
export const QuickNoteEdit = z.object({
  body,
  userIds: z.array(z.string()).max(20),
});
export const TaskProposalForm = z.object({
  title: z.string().trim().min(1).max(200),
  assigneeId: z.string().min(1),
  priority: z.enum(CRM_TASK_PRIORITIES),
  confirmDisclosure: z.boolean(),
  start: date,
  due: date,
  reminder,
});
export const DirectTaskForm = z.object({
  title: z.string().trim().min(1).max(200),
  startDate: date,
  dueDate: date,
  reminder,
  priority: z.enum(CRM_TASK_PRIORITIES),
  status: z.enum(CRM_TASK_STATUSES),
});
export const NoticeTimeForm = z.object({ until: z.string().min(1) });
export const NoticeHoursForm = z
  .object({
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    weekdaysOnly: z.boolean(),
  })
  .refine((v) => v.startHour < v.endHour, {
    path: ['endHour'],
    message: 'La hora final debe ser posterior.',
  });
export type TaskProposalFields = z.infer<typeof TaskProposalForm>;
export type DirectTaskFields = z.infer<typeof DirectTaskForm>;
