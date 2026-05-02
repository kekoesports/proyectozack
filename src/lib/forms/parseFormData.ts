import { z } from 'zod';

export type ParseFormDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string[]> };

/**
 * Wrapper sobre Zod safeParse para FormData.
 *
 * Contrato: scalar-only. Usa `Object.fromEntries(formData)` (last-wins en
 * campos duplicados). Para campos array (e.g. checkbox múltiple), el caller
 * debe usar `formData.getAll(name)` y componer el plain object antes de
 * llamar a `Schema.safeParse` directamente — esta utility intencionadamente
 * no introspecta el schema.
 *
 * Uso típico en un Server Action:
 *
 *   const result = parseFormData(formData, MySchema);
 *   if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };
 *   // result.data está tipado como z.infer<typeof MySchema>
 */
export function parseFormData<T extends z.ZodTypeAny>(
  formData: FormData,
  schema: T,
): ParseFormDataResult<z.infer<T>> {
  const obj = Object.fromEntries(formData);
  const result = schema.safeParse(obj);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form';
    const list = fieldErrors[key];
    if (list) list.push(issue.message);
    else fieldErrors[key] = [issue.message];
  }
  return { ok: false, fieldErrors };
}
