import { z } from 'zod';

/** Explicit operator rollout boundary; never derive it from the latest run or the clock. */
export const creatorDiscoveryRolloutAtSchema = z.iso.datetime({ offset: true });
