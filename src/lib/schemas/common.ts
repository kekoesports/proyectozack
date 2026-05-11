import { z } from 'zod';

/** ID numérico positivo con coerción (FormData strings → number). */
export const IdSchema = z.coerce.number().int().positive();

/** ID estricto sin coerción — para args bound de Server Actions (ya son number). */
export const StrictIdSchema = z.number().int().positive();

/** Boolean estricto — para args bound de Server Actions. */
export const StrictBooleanSchema = z.boolean();
