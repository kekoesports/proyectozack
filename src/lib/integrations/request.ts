import { type ZodError, type ZodType } from 'zod';

export async function parseJsonWithSchema<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ success: true; data: T } | { success: false; message: string }> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return { success: false, message: 'Request body must be valid JSON' };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) };
  return { success: true, data: parsed.data };
}

export function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request';
}
