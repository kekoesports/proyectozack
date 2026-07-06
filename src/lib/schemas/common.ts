import { z } from 'zod';

/** ID numérico positivo con coerción (FormData strings → number). */
export const IdSchema = z.coerce.number().int().positive();

/** ID estricto sin coerción — para args bound de Server Actions (ya son number). */
export const StrictIdSchema = z.number().int().positive();

/** Boolean estricto — para args bound de Server Actions. */
export const StrictBooleanSchema = z.boolean();

/**
 * Boolean parseado desde FormData/URLSearchParams.
 *
 * `z.coerce.boolean()` NO sirve aquí — usa `Boolean(v)`, que trata cualquier
 * string no vacío como `true` (incluido `"0"`, `"false"`). Este preprocesador
 * mapea los valores canónicos que emiten los `<select>` y `<input type="checkbox">`
 * del proyecto:
 *
 *   - true:  `true`, `"1"`, `"true"`, `"on"`
 *   - false: `false`, `"0"`, `"false"`, `""`, ausencia (default en caller)
 *
 * Cualquier otro valor deja pasar al `z.boolean()` interno, que lanza error.
 */
export const FormBooleanSchema = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    if (v === '1' || v === 'true' || v === 'on') return true;
    if (v === '0' || v === 'false' || v === '') return false;
  }
  return v;
}, z.boolean());
