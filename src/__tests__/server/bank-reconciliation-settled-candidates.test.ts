import fs from 'node:fs';
import path from 'node:path';

describe('bank reconciliation candidates for legacy settled invoices', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/queries/bankReconciliationCandidates.ts'),
    'utf8',
  );

  it('keeps settled invoices eligible only while they lack a canonical payment', () => {
    expect(source).toContain("inArray(issuedInvoices.status, ['cobrada', 'pagada'])");
    expect(source).toContain('notExists(');
    expect(source).toContain('invoicePayments.issuedInvoiceId');
  });
});
