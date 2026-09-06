import { z } from 'zod';

export const StudioAppHost = z.string().toLowerCase().regex(/^app\.socialpro\.es(?::443)?$/);
