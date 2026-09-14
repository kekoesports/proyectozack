import { z } from 'zod';

const Count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER / 4);
export const GeminiUsageSchema = z.object({
  promptTokenCount: Count,
  candidatesTokenCount: Count.optional(),
  thoughtsTokenCount: Count.optional(),
  totalTokenCount: Count.optional(),
  cachedContentTokenCount: Count.optional(),
}).refine(value => (value.cachedContentTokenCount ?? 0) <= value.promptTokenCount)
  .refine(value => value.totalTokenCount === undefined || value.totalTokenCount >= value.promptTokenCount);

/** Gemini bills generated reasoning as output; a missing count is not observed zero. */
export function geminiBillableUsage(raw: unknown): {
  readonly inputTokens: number; readonly outputTokens: number; readonly cachedInputTokens: number | null;
} | null {
  const parsed = GeminiUsageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const value = parsed.data;
  if (value.candidatesTokenCount === undefined && value.totalTokenCount === undefined) return null;
  return {
    inputTokens: value.promptTokenCount,
    outputTokens: Math.max(
      (value.candidatesTokenCount ?? 0) + (value.thoughtsTokenCount ?? 0),
      value.totalTokenCount === undefined ? 0 : value.totalTokenCount - value.promptTokenCount,
    ),
    cachedInputTokens: value.cachedContentTokenCount ?? null,
  };
}
