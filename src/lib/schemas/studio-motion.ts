import { z } from 'zod';

export const StudioMotionId = z.enum([
  'statement-v1', 'steps-v1', 'contact-v1',
  'statement-v2', 'steps-v2', 'contact-v2', 'compare-v1', 'checklist-v1',
  'metric-v1', 'quiz-v1', 'live-v1', 'timeline-v1', 'quote-v1',
]);
export type StudioMotionId = z.infer<typeof StudioMotionId>;

export function motionLineLimit(id: StudioMotionId | undefined) {
  if (id === 'compare-v1') return 2;
  return id && ['steps-v1', 'steps-v2', 'checklist-v1', 'quiz-v1', 'live-v1', 'timeline-v1'].includes(id) ? 3 : 0;
}

export const StudioTemplatePreviewInput = z.object({
  motion: StudioMotionId,
  format: z.enum(['9:16', '1:1', '16:9']),
  palette: z.enum(['light', 'dark']),
});
