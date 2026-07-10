/**
 * Cierra la ventana de concurrencia que quedaba abierta tras la primera
 * versión del guard: dos movimientos bancarios distintos aplicados en
 * paralelo contra la misma factura podían pasar ambos guards y provocar
 * un sobrepago silencioso (la UNIQUE `(bank_transaction_id, factura_id)`
 * sólo protege contra doble aplicación del MISMO movimiento).
 *
 * La opción X — mover la lectura de status+SUM dentro de `db.transaction`
 * con `SELECT ... FOR UPDATE` sobre la fila de la factura — serializa
 * los pagos concurrentes contra la misma factura hasta commit.
 *
 * Tests aquí:
 *   [E] Estructural: verifica que el código fuente usa `.for('update')`
 *       dentro del callback de `db.transaction` en ambas funciones. Es
 *       la garantía honesta cuando no hay un Postgres real disponible en
 *       jest (limitación documentada en la PR).
 *   [C] Comportamiento: verifica que si el guard se ejecuta *después*
 *       del lock ve el `previouslyPaid` actualizado, mientras que sin
 *       lock (fuera de tx) vería el valor obsoleto → sobrepago.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertInvoicePayable,
  PaymentGuardError,
} from '@/lib/services/bank-reconciliation/invoicePaymentGuards';

const SOURCE_PATH = resolve(process.cwd(), 'src/lib/queries/invoicePayments.ts');
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');

// ── [E] Tests estructurales ───────────────────────────────────────────

describe('applyPaymentTo* — SELECT ... FOR UPDATE dentro de la transacción', () => {
  it('applyPaymentToIssuedInvoice contiene db.transaction seguido de .for(\'update\')', () => {
    const idx = SOURCE.indexOf('export async function applyPaymentToIssuedInvoice');
    const end = SOURCE.indexOf('export async function applyPaymentToInternalInvoice');
    expect(idx).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(idx);

    const body = SOURCE.slice(idx, end);
    expect(body).toMatch(/db\.transaction\s*\(/);
    expect(body).toMatch(/\.for\(\s*['"]update['"]\s*\)/);

    const txIdx = body.indexOf('db.transaction');
    const forUpdateIdx = body.search(/\.for\(\s*['"]update['"]\s*\)/);
    expect(forUpdateIdx).toBeGreaterThan(txIdx);
  });

  it('applyPaymentToInternalInvoice contiene db.transaction seguido de .for(\'update\')', () => {
    const idx = SOURCE.indexOf('export async function applyPaymentToInternalInvoice');
    // Corta al siguiente separador de sección o export para acotar el cuerpo.
    const rest = SOURCE.slice(idx);
    const nextExportIdx = rest.slice(1).search(/\nexport /);
    const body = nextExportIdx > 0 ? rest.slice(0, nextExportIdx + 1) : rest;

    expect(body).toMatch(/db\.transaction\s*\(/);
    expect(body).toMatch(/\.for\(\s*['"]update['"]\s*\)/);

    const txIdx = body.indexOf('db.transaction');
    const forUpdateIdx = body.search(/\.for\(\s*['"]update['"]\s*\)/);
    expect(forUpdateIdx).toBeGreaterThan(txIdx);
  });

  it('assertInvoicePayable se llama DESPUÉS del FOR UPDATE dentro del db.transaction callback (issued)', () => {
    // Acotamos al cuerpo de applyPaymentToIssuedInvoice — evita colisión
    // con el `import { assertInvoicePayable }` en la cabecera del archivo.
    const idx = SOURCE.indexOf('export async function applyPaymentToIssuedInvoice');
    const end = SOURCE.indexOf('export async function applyPaymentToInternalInvoice');
    const body = SOURCE.slice(idx, end);

    const forUpdateIdx = body.search(/\.for\(\s*['"]update['"]\s*\)/);
    const assertIdx = body.indexOf('assertInvoicePayable');
    const insertIdx = body.search(/\.insert\(invoicePayments\)/);

    expect(forUpdateIdx).toBeGreaterThan(0);
    expect(assertIdx).toBeGreaterThan(forUpdateIdx);
    expect(insertIdx).toBeGreaterThan(assertIdx);
  });

  it('assertInvoicePayable se llama DESPUÉS del FOR UPDATE dentro del db.transaction callback (internal)', () => {
    const idx = SOURCE.indexOf('export async function applyPaymentToInternalInvoice');
    const rest = SOURCE.slice(idx);
    const nextExportIdx = rest.slice(1).search(/\nexport /);
    const body = nextExportIdx > 0 ? rest.slice(0, nextExportIdx + 1) : rest;

    const forUpdateIdx = body.search(/\.for\(\s*['"]update['"]\s*\)/);
    const assertIdx = body.indexOf('assertInvoicePayable');
    const insertIdx = body.search(/\.insert\(invoicePayments\)/);

    expect(forUpdateIdx).toBeGreaterThan(0);
    expect(assertIdx).toBeGreaterThan(forUpdateIdx);
    expect(insertIdx).toBeGreaterThan(assertIdx);
  });

  it('el SELECT SUM(invoice_payments) vive dentro de la transacción y ANTES del INSERT (issued)', () => {
    const idx = SOURCE.indexOf('export async function applyPaymentToIssuedInvoice');
    const end = SOURCE.indexOf('export async function applyPaymentToInternalInvoice');
    const body = SOURCE.slice(idx, end);

    // `tx.select({ total: sum(invoicePayments.amount) })` — SUM leído tras el lock
    const sumIdx = body.search(/tx\s*\.select\(\s*\{\s*total:\s*sum\(invoicePayments\.amount\)/);
    const insertIdx = body.search(/\.insert\(invoicePayments\)/);
    expect(sumIdx).toBeGreaterThan(0);
    expect(insertIdx).toBeGreaterThan(sumIdx);
  });
});

// ── [C] Test de comportamiento simulando el lock ──────────────────────

describe('assertInvoicePayable — comportamiento post-lock vs sin lock', () => {
  it('sin lock: dos guards concurrentes ven previouslyPaid=0 y ambos pasan → sobrepago silencioso', () => {
    // Simula el flujo PRE-lock (versión antigua): ambas lecturas ven 0
    // porque ninguna ha commiteado su INSERT todavía.
    const totalDue = '1000.00';
    const previouslyPaidSnapshot = '0'; // ambas leen el mismo snapshot

    // T1
    expect(() =>
      assertInvoicePayable({
        status: 'emitida',
        totalDue,
        previouslyPaid: previouslyPaidSnapshot,
        amountToApply: '600.00',
        kind: 'issued',
      }),
    ).not.toThrow();

    // T2 (mismo snapshot)
    expect(() =>
      assertInvoicePayable({
        status: 'emitida',
        totalDue,
        previouslyPaid: previouslyPaidSnapshot,
        amountToApply: '600.00',
        kind: 'issued',
      }),
    ).not.toThrow();

    // Ambos pasan → aplicarían 1200 sobre 1000. Éste es el bug que la
    // opción X cierra moviendo la lectura DESPUÉS de un FOR UPDATE.
  });

  it('con lock: la segunda tx ve previouslyPaid actualizado por el commit de la primera → guard rechaza sobrepago', () => {
    const totalDue = '1000.00';

    // T1 con el lock: lee previouslyPaid=0, guard PASS, commit 600.
    const t1Previously = '0';
    expect(() =>
      assertInvoicePayable({
        status: 'emitida',
        totalDue,
        previouslyPaid: t1Previously,
        amountToApply: '600.00',
        kind: 'issued',
      }),
    ).not.toThrow();

    // T2 espera hasta que T1 libera el lock. Cuando entra, la lectura de
    // SUM ya devuelve 600 (el commit de T1 es visible). El guard rechaza.
    const t2Previously = '600.00';
    let caught: unknown;
    try {
      assertInvoicePayable({
        status: 'emitida',
        totalDue,
        previouslyPaid: t2Previously,
        amountToApply: '600.00',
        kind: 'issued',
      });
    } catch (e) { caught = e; }

    expect(caught).toBeInstanceOf(PaymentGuardError);
    expect((caught as PaymentGuardError).reason).toBe('overpayment');
  });

  it('con lock: guard rechaza también si T1 completó la factura y T2 intenta aplicar más', () => {
    // T1 aplicó 1000 → total 1000 → status pasa a 'cobrada' antes del
    // commit. T2, tras el lock, ve status='cobrada'.
    let caught: unknown;
    try {
      assertInvoicePayable({
        status: 'cobrada',
        totalDue: '1000.00',
        previouslyPaid: '1000.00',
        amountToApply: '100.00',
        kind: 'issued',
      });
    } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(PaymentGuardError);
    expect((caught as PaymentGuardError).reason).toBe('already_completed');
  });
});

// ── Limitación honesta documentada en el archivo ──────────────────────

describe('Limitación de este test suite', () => {
  it('no ejecuta un test concurrente real contra Postgres', () => {
    // Jest corre en Node sin conexión al DB de test. Verificamos:
    //   - Estructuralmente (grep) que el código usa FOR UPDATE.
    //   - Semánticamente (assertInvoicePayable) que el guard rechaza
    //     cuando previouslyPaid refleja el commit anterior.
    // Un test de carrera real requeriría Postgres con dos clientes
    // concurrentes — fuera de scope de esta suite.
    expect(true).toBe(true);
  });
});
