import fs from 'fs';
import path from 'path';
import { LedgerReportSchema, type LedgerReport } from '@/features/libro-mayor/parser/types';

/**
 * Carga el fixture JSON sintético — pensado para la vista y para tests.
 * El fixture está en el mismo directorio (`sample-ledger.json`).
 *
 * NUNCA lee el LM real. Este loader solo apunta al fixture del repo.
 */
export function loadSampleLedger(): LedgerReport {
  const filePath = path.join(process.cwd(), 'src/features/libro-mayor/__fixtures__/sample-ledger.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw) as unknown;
  const parsed = LedgerReportSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('libro-mayor:fixture-invalid:' + parsed.error.issues.map((i) => i.path.join('.')).join(','));
  }
  return parsed.data;
}
