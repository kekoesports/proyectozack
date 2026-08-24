import { z } from 'zod';

const Metric = z.number().finite().nonnegative();

export const SearchConsoleAutomationSnapshot = z
  .object({
    property: z.literal('https://socialpro.es/'),
    collectedAt: z.string().datetime({ offset: true }),
    snapshotId: z.string().min(1).max(120).regex(/^[a-zA-Z0-9._:-]+$/).optional(),
    period: z
      .object({
        startDate: z.string().date(),
        endDate: z.string().date(),
      })
      .strict(),
    coverage: z
      .object({
        indexed: z.number().int().nonnegative(),
        notIndexed: z.number().int().nonnegative(),
        source: z.enum(['search-console-ui', 'collector']),
      })
      .strict()
      .optional(),
    performance: z
      .object({
        clicks: Metric,
        impressions: Metric,
        ctr: Metric.max(1),
        averagePosition: Metric,
      })
      .strict()
      .optional(),
    sitemaps: z
      .array(
        z
          .object({
            path: z.string().min(1).max(500),
            submittedUrls: z.number().int().nonnegative().optional(),
            indexedUrls: z.number().int().nonnegative().optional(),
            errors: z.number().int().nonnegative().optional(),
            warnings: z.number().int().nonnegative().optional(),
          })
          .strict(),
      )
      .max(20)
      .default([]),
    topQueries: z
      .array(
        z
          .object({
            query: z.string().min(1).max(200),
            clicks: Metric,
            impressions: Metric,
            ctr: Metric.max(1),
            averagePosition: Metric,
          })
          .strict(),
      )
      .max(50)
      .default([]),
    observations: z.array(z.string().min(1).max(300)).max(20).default([]),
  })
  .strict()
  .refine((value) => value.coverage || value.performance || value.sitemaps.length > 0, {
    message: 'El snapshot debe contener cobertura, rendimiento o sitemaps',
  });

export type SearchConsoleAutomationSnapshotInput = z.infer<typeof SearchConsoleAutomationSnapshot>;
