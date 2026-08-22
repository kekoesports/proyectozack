import { classifyTaskForRollover } from '@/lib/task-rollover-policy';
import { isOpenTaskStatus } from '@/lib/schemas/task';
import { sanitizeTaskSchema } from '@/lib/schemas/task-sanitation';

describe('classifyTaskForRollover', () => {
  it.each([
    {
      name: 'recurring open → close',
      task: { recurrenceTemplateId: 3, status: 'pendiente' },
      want: 'close_recurring',
    },
    {
      name: 'one-off in progress → drag',
      task: { recurrenceTemplateId: null, status: 'en_progreso' },
      want: 'drag_one_off',
    },
    {
      name: 'completed recurring stays put',
      task: { recurrenceTemplateId: 3, status: 'completada' },
      want: null,
    },
    {
      name: 'omitted one-off stays put',
      task: { recurrenceTemplateId: null, status: 'omitida' },
      want: null,
    },
  ])('$name', ({ task, want }) => {
    expect(classifyTaskForRollover(task)).toBe(want);
  });
});

describe('isOpenTaskStatus', () => {
  it.each([
    ['pendiente', true],
    ['en_progreso', true],
    ['completada', false],
    ['omitida', false],
    ['no_realizada', false],
    ['archivada', false],
  ] as const)('%s → %s', (status, expected) => {
    expect(isOpenTaskStatus(status)).toBe(expected);
  });
});

describe('sanitizeTaskSchema', () => {
  it('rejects reschedule without dueDate', () => {
    const parsed = sanitizeTaskSchema.safeParse({ taskId: '1', action: 'reschedule' });
    expect(parsed.success).toBe(false);
  });

  it.each(['keep', 'complete', 'omit', 'archive'] as const)('accepts %s without date', (action) => {
    const parsed = sanitizeTaskSchema.safeParse({ taskId: 9, action });
    expect(parsed.success).toBe(true);
  });

  it('accepts reschedule with date', () => {
    const parsed = sanitizeTaskSchema.safeParse({
      taskId: 9,
      action: 'reschedule',
      dueDate: '2026-08-28',
      note: 'next week',
    });
    expect(parsed.success).toBe(true);
  });
});
