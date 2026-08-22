/**
 * Canario: nadie suma `invoice_payments.amount` sin decir en qué dirección va.
 *
 * Un pago a un talento y un cobro de una marca son la misma tabla. El KPI
 * "cobrado real del mes" los sumaba juntos, así que cada pago conciliado subía
 * el cobrado — cuanto mejor se conciliara, más mentía la cifra.
 *
 * La dirección sale de la FK: `issued_invoice_id` siempre es cobro,
 * `invoice_id` hereda el `kind` de la factura interna. Cualquier suma sobre
 * esta tabla tiene que mirar una de las dos.
 *
 * Alcance, para no fiarse de más: esto detecta la consulta que **ni siquiera
 * mira** la dirección — que es como estaba el KPI roto, sumando la tabla entera
 * sin unirla con `invoices`. No detecta un filtro parcial o mal escrito; para
 * eso hace falta mirar la consulta. Es un suelo, no un techo.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(process.cwd(), 'src', 'lib', 'queries');

/** Cuántas líneas alrededor se aceptan como "la misma consulta". */
const VENTANA = 22;

/** Señales de que la consulta sí distingue la dirección. */
const SENALES = [
  // La FK de emitida: un pago sobre una factura emitida solo puede ser un cobro.
  'issuedInvoiceId',
  'issued_invoice_id',
  'issuedInvoices',
  // El kind de la factura interna, en sus dos formas: SQL template y Drizzle.
  "kind} = 'income'",
  "kind} = 'expense'",
  "kind = 'income'",
  "kind = 'expense'",
  'eq(invoices.kind,',
];

function ficherosTs(dir: string): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      out.push(...ficherosTs(ruta));
      continue;
    }
    if (nombre.endsWith('.ts') && !nombre.endsWith('.test.ts')) out.push(ruta);
  }
  return out;
}

describe('[FV.2] las sumas de pagos distinguen cobro de pago', () => {
  it('toda SUM sobre invoice_payments.amount filtra por dirección', () => {
    const infracciones: string[] = [];

    for (const ruta of ficherosTs(RAIZ)) {
      const lineas = readFileSync(ruta, 'utf8').split(/\r?\n/);
      lineas.forEach((linea, i) => {
        if (!linea.includes('SUM(${invoicePayments.amount})')) return;

        const desde = Math.max(0, i - VENTANA);
        const hasta = Math.min(lineas.length, i + VENTANA + 1);
        const contexto = lineas.slice(desde, hasta).join('\n');
        if (SENALES.some((s) => contexto.includes(s))) return;

        const rel = ruta.slice(process.cwd().length + 1).replace(/\\/g, '/');
        infracciones.push(`${rel}:${i + 1} — suma pagos sin mirar la dirección`);
      });
    }

    expect(infracciones.join('\n') || 'ninguna').toBe('ninguna');
  });
});
