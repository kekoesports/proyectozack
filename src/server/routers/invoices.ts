import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, strictAdminProcedure } from '@/server/trpc';
import { listInvoices } from '@/lib/queries/invoices';
import {
  buildModelo130Csv,
  buildModelo303Csv,
  buildModelo347Csv,
  quarterRange,
  yearRange,
  type Quarter,
} from '@/lib/exports/fiscal';

const MODELOS = ['303', '130', '347'] as const;
type Modelo = (typeof MODELOS)[number];

export const invoicesRouter = router({
  exportCsv: strictAdminProcedure
    .input(
      z.object({
        modelo: z.enum(MODELOS),
        year: z.number().int().min(2000).max(2100),
        quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { modelo, year, quarter } = input;
      const m = modelo as Modelo;
      const needsQuarter = m === '303' || m === '130';

      if (needsQuarter && !quarter) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'quarter requerido para modelo 303 y 130 (1-4)',
        });
      }

      const range =
        needsQuarter && quarter ? quarterRange(year, quarter as Quarter) : yearRange(year);
      const invoices = await listInvoices({ from: range.from, to: range.to });

      let csv: string;
      let filename: string;

      if (m === '303' && quarter) {
        csv = buildModelo303Csv({ invoices, year, quarter: quarter as Quarter });
        filename = `modelo-303-${year}-T${quarter}.csv`;
      } else if (m === '130' && quarter) {
        const ytd = await listInvoices({
          from: `${year}-01-01`,
          to: quarterRange(year, quarter as Quarter).to,
        });
        csv = buildModelo130Csv({ invoices: ytd, year, quarter: quarter as Quarter });
        filename = `modelo-130-${year}-T${quarter}.csv`;
      } else {
        csv = buildModelo347Csv({ invoices, year });
        filename = `modelo-347-${year}.csv`;
      }

      // UTF-8 BOM so Excel opens it with accents intact
      return { csv: '\uFEFF' + csv, filename };
    }),
});
