import { z } from 'zod';

export const SheetsRetryAfterHeader = z.string().trim().min(1).max(128);

export const SheetsOAuthToken = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().optional(),
});

const SheetProperties = z.object({
  sheetId: z.number().optional(),
  title: z.string().optional(),
  index: z.number().optional(),
});

export const SheetsMetadata = z.object({
  properties: z.object({ title: z.string().optional() }).optional(),
  sheets: z.array(z.object({ properties: SheetProperties.optional() })).optional(),
});

const SheetCell = z.object({
  formattedValue: z.string().optional(),
  effectiveValue: z.object({
    stringValue: z.string().optional(),
    numberValue: z.number().optional(),
    boolValue: z.boolean().optional(),
  }).optional(),
  hyperlink: z.string().optional(),
  textFormatRuns: z.array(z.object({
    format: z.object({ link: z.object({ uri: z.string().optional() }).optional() }).optional(),
  })).optional(),
});
export type SheetCellData = z.infer<typeof SheetCell>;

export const SheetsGrid = z.object({
  sheets: z.array(z.object({
    data: z.array(z.object({
      startRow: z.number().int().nonnegative().optional(),
      startColumn: z.number().int().nonnegative().optional(),
      rowData: z.array(z.object({ values: z.array(SheetCell).optional() })).optional(),
    })).optional(),
  })).optional(),
});
