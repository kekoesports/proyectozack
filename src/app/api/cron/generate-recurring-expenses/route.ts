import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import {
  getActiveTemplatesForMonth,
  invoiceExistsForMonth,
  createInvoiceForMonth,
} from '@/lib/queries/recurringExpenses';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const monthStr = `${yyyy}-${mm}`;

  try {
    const templates = await getActiveTemplatesForMonth(monthStr);
    const results: { name: string; action: 'created' | 'skipped'; invoiceId?: number }[] = [];

    for (const template of templates) {
      const exists = await invoiceExistsForMonth(template.id, monthStr);
      if (exists) {
        results.push({ name: template.name, action: 'skipped' });
      } else {
        const invoiceId = await createInvoiceForMonth(template, monthStr);
        results.push({ name: template.name, action: 'created', invoiceId });
      }
    }

    const created = results.filter((r) => r.action === 'created').length;
    const skipped = results.filter((r) => r.action === 'skipped').length;

    return NextResponse.json({ success: true, month: monthStr, created, skipped, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate-recurring-expenses] error:', msg);
    return NextResponse.json({ success: false, error: msg, month: monthStr }, { status: 500 });
  }
}
