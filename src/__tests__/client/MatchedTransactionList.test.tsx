import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchedTransactionList } from '@/app/admin/(dashboard)/facturacion/bancos/conciliacion/MatchedTransactionList';
import type { MatchedTransactionRow } from '@/lib/queries/bankReconciliationMatched';

// Server action se resuelve a un objeto {} — no lo invocamos en estos
// smoke tests, sólo verificamos el render de los cinco escenarios que
// el brief pide validar antes de mergear.
jest.mock(
  '@/app/admin/(dashboard)/facturacion/bancos/conciliacion/paymentActions',
  () => ({
    applyPaymentAction: jest.fn(),
  }),
);

function baseRow(overrides: Partial<MatchedTransactionRow> = {}): MatchedTransactionRow {
  return {
    transactionId: 1,
    bookingDate: '2026-07-01',
    amount: '1000.00',
    currency: 'EUR',
    direction: 'income',
    description: 'Transferencia SEPA — Cliente XYZ',
    counterpartyName: 'Cliente XYZ',
    matchType: 'issued_invoice',
    matchedEntityId: 42,
    matchConfidence: 85,
    matchReason: 'Cliente + monto exacto',
    invoiceLabel: 'Factura SP-2026-0042',
    invoiceAmount: '1500.00',
    invoiceStatus: 'emitida',
    invoicePreviouslyPaid: '500.00',
    invoiceKind: 'income',
    paymentApplied: false,
    paymentId: null,
    paymentAmount: null,
    ...overrides,
  };
}

describe('MatchedTransactionList — smoke UI de los cinco escenarios de guards', () => {
  it('[1] factura parcial válida: pinta botón "Aplicar cobro" (no chip bloqueado)', () => {
    render(<MatchedTransactionList rows={[baseRow()]} />);
    // Debe existir un botón interactivo (no un span desactivado)
    expect(screen.getByRole('button', { name: /Aplicar cobro/i })).toBeInTheDocument();
    expect(screen.queryByText(/Factura anulada/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Factura ya cobrada/i)).not.toBeInTheDocument();
  });

  it('[2] factura anulada: botón sustituido por chip "Factura anulada" y sin botón interactivo', () => {
    render(<MatchedTransactionList rows={[baseRow({ invoiceStatus: 'anulada' })]} />);
    expect(screen.getByText('Factura anulada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aplicar cobro/i })).not.toBeInTheDocument();
  });

  it('[3a] factura issued ya cobrada: chip "Factura ya cobrada" y sin botón', () => {
    render(<MatchedTransactionList rows={[baseRow({ invoiceStatus: 'cobrada' })]} />);
    expect(screen.getByText('Factura ya cobrada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aplicar cobro/i })).not.toBeInTheDocument();
  });

  it('[3b] factura internal expense ya pagada: chip "Factura ya pagada" y sin botón', () => {
    render(
      <MatchedTransactionList
        rows={[
          baseRow({
            direction: 'expense',
            matchType: 'internal_invoice',
            invoiceStatus: 'pagada',
            invoiceKind: 'expense',
          }),
        ]}
      />,
    );
    expect(screen.getByText('Factura ya pagada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aplicar pago/i })).not.toBeInTheDocument();
  });

  it('[4] transacción que sobrepasaría el pendiente: al abrir el panel muestra warning y deshabilita submit', async () => {
    const user = userEvent.setup();
    // pendiente = 1500 - 1400 = 100 ; transacción amount = 1000 → sobrepago
    const row = baseRow({
      amount: '1000.00',
      invoiceAmount: '1500.00',
      invoicePreviouslyPaid: '1400.00',
    });
    render(<MatchedTransactionList rows={[row]} />);

    await user.click(screen.getByRole('button', { name: /Aplicar cobro/i }));

    // Warning inline
    expect(
      screen.getByText(
        /El importe a aplicar supera el pendiente de la factura\. Ajusta el importe o rechaza el match\./i,
      ),
    ).toBeInTheDocument();

    // Panel muestra los 5 campos + estado resultante
    expect(screen.getByText('Total factura')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Importe a aplicar')).toBeInTheDocument();
    expect(screen.getByText('Cobrado hasta ahora')).toBeInTheDocument();
    expect(screen.getByText('Resultado estimado')).toBeInTheDocument();

    // Submit del form (el segundo botón con nombre "Aplicar cobro") queda deshabilitado
    const submitButtons = screen.getAllByRole('button', { name: /Aplicar cobro/i });
    // El submit es el que está dentro del <form> — buscamos el que tiene type="submit"
    const submit = submitButtons.find((b) => b.getAttribute('type') === 'submit');
    expect(submit).toBeDefined();
    expect(submit).toBeDisabled();
  });

  it('[5] pago exacto que completa el total: permitido, resultado estimado "cobrada", submit habilitado', async () => {
    const user = userEvent.setup();
    // pendiente = 1500 - 500 = 1000 ; amount = 1000 → completa exacto
    const row = baseRow({
      amount: '1000.00',
      invoiceAmount: '1500.00',
      invoicePreviouslyPaid: '500.00',
    });
    render(<MatchedTransactionList rows={[row]} />);

    await user.click(screen.getByRole('button', { name: /Aplicar cobro/i }));

    // Debe pintar los 5 campos
    expect(screen.getByText('Total factura')).toBeInTheDocument();
    expect(screen.getByText('Cobrado hasta ahora')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Importe a aplicar')).toBeInTheDocument();
    expect(screen.getByText('Resultado estimado')).toBeInTheDocument();

    // Resultado estimado = "cobrada" (aparece como texto exacto en el dd)
    expect(screen.getByText(/^cobrada$/i)).toBeInTheDocument();

    // No hay warning de sobrepago
    expect(
      screen.queryByText(/El importe a aplicar supera el pendiente/i),
    ).not.toBeInTheDocument();

    // Submit del form habilitado
    const submitButtons = screen.getAllByRole('button', { name: /Aplicar cobro/i });
    const submit = submitButtons.find((b) => b.getAttribute('type') === 'submit');
    expect(submit).toBeDefined();
    expect(submit).not.toBeDisabled();
  });

  it('[6 — sanity] empty state cuando no hay filas', () => {
    render(<MatchedTransactionList rows={[]} />);
    expect(screen.getByText(/No hay transacciones conciliadas/i)).toBeInTheDocument();
  });
});
