import fs from 'node:fs';
import path from 'node:path';

describe('cierres bancarios: cobros canónicos', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/queries/bankReconciliation.ts'),
    'utf8',
  );

  it('calcula cobrado mensual desde invoice_payments y la fecha real del pago', () => {
    expect(source).toContain('gte(invoicePayments.paymentDate, startDate)');
    expect(source).toContain('lt(invoicePayments.paymentDate, endDate)');
    expect(source).toContain('current.collected += Number(row.collected)');
  });

  it('no convierte el estado cobrada en dinero conciliado', () => {
    expect(source).not.toContain("if (row.status === 'cobrada') current.collected +=");
  });

  it('incluye las facturas emitidas sin pago en salud del dato', () => {
    const healthSource = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/finance/dataHealth.ts'),
      'utf8',
    );
    expect(healthSource).toContain('emitidasCobradasSinPago');
    expect(healthSource).toContain('invoicePayments.issuedInvoiceId');
  });
});
