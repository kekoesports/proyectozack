import { isOpenTaskStatus } from '@/lib/schemas/task';

export type RolloverKind = 'close_recurring' | 'drag_one_off';

export type RolloverTaskInput = {
  readonly recurrenceTemplateId: number | null;
  readonly status: string;
};

export function classifyTaskForRollover(task: RolloverTaskInput): RolloverKind | null {
  if (!isOpenTaskStatus(task.status)) return null;
  return task.recurrenceTemplateId != null ? 'close_recurring' : 'drag_one_off';
}

export const SANITATION_ACTIONS = [
  'keep',
  'complete',
  'omit',
  'reschedule',
  'archive',
] as const;

export type SanitationAction = (typeof SANITATION_ACTIONS)[number];
