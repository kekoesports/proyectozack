import { z } from 'zod';

export const NoteActor = z.object({
  userId: z.string().min(1),
  role: z.enum([
    'admin',
    'admin_limited_tasks',
    'manager',
    'staff',
    'ops',
    'editor',
    'talent_manager',
    'finance',
    'analyst',
    'brand',
  ]),
});
export type NoteActor = z.infer<typeof NoteActor>;
export const NoteRelation = z
  .object({
    type: z.enum(['brand', 'talent', 'campaign']),
    id: z.number().int().positive(),
  })
  .strict();
export const NoteMode = z.enum(['auto', 'note', 'task']);
export const SaveQuickNote = z
  .object({
    id: z.uuid(),
    body: z.string().trim().min(1, 'Escribe una nota.').max(4000),
    mode: NoteMode.default('auto'),
    relation: NoteRelation.nullable().default(null),
  })
  .strict();
export type SaveQuickNote = z.infer<typeof SaveQuickNote>;
export const EditQuickNote = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    body: z.string().trim().min(1).max(4000),
  })
  .strict();
export const NoteIdentity = z.object({ id: z.uuid() }).strict();
export const NoteSharing = z
  .object({ id: z.uuid(), userIds: z.array(z.string().min(1)).max(20) })
  .strict();
export const NoteList = z
  .object({
    view: z.enum(['mine', 'shared']).default('mine'),
    filter: z.enum(['all', 'notes', 'tasks']).default('all'),
    search: z.string().trim().max(200).default(''),
    archived: z.boolean().default(false),
  })
  .strict();
export const CivilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const date = new Date(s + 'T12:00:00Z');
    return (
      Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s
    );
  }, 'Fecha inválida');
export const TaskFromNote = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    title: z.string().trim().min(1).max(200),
    assigneeId: z.string().min(1),
    priority: z.enum(['alta', 'media', 'baja']).default('media'),
    startDate: CivilDate.nullable().default(null),
    dueDate: CivilDate.nullable().default(null),
    remindAt: z.iso.datetime({ offset: true }).nullable().default(null),
    confirmDisclosure: z.boolean().default(false),
  })
  .strict();
export type TaskFromNote = z.infer<typeof TaskFromNote>;
export const NoteSuggestion = z
  .object({
    kind: z.enum(['action', 'information', 'confirm']),
    title: z.string().max(200),
    assigneeId: z.string(),
    assigneeName: z.string(),
    startDate: CivilDate.nullable(),
    dueDate: CivilDate.nullable(),
    remindAt: z.iso.datetime({ offset: true }).nullable(),
    reason: z.string(),
  })
  .strict();
export type NoteSuggestion = z.infer<typeof NoteSuggestion>;
export const NoticePoll = z.object({ tabId: z.uuid() }).strict();
export const NoticeChange = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(200),
    action: z.enum(['presented', 'read', 'snooze']),
    tabId: z.uuid(),
    until: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();
export const NoticeSettings = z
  .object({
    timezone: z.literal('Europe/Madrid').default('Europe/Madrid'),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    weekdaysOnly: z.boolean(),
  })
  .strict()
  .refine((v) => v.startHour < v.endHour, 'La hora final debe ser posterior.');
