import { z } from 'zod';

/** ID numérico positivo con coerción (FormData strings → number). */
export const IdSchema = z.coerce.number().int().positive();
