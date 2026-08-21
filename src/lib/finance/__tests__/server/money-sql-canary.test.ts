/**
 * Canario: ninguna agregación suma importes de factura sin pasar por euros.
 *
 * `total_amount`, `net_amount` y `vat_amount` están en la moneda de la factura.
 * Doce gastos de 2026 están en dólares, y sumarlos a pelo inflaba el gasto en
 * 647,34 € — el beneficio salía peor de lo que era. FV.4 arregló los ingresos y
 * dejó fuera el resto; esto impide que la mitad arreglada se vuelva a torcer.
 *
 * No mide comportamiento: lee el código. Es deliberado — el error no se ve en
 * los resultados salvo que alguien mire una factura en divisa, y para entonces
 * ya está en la portada del dashboard.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(process.cwd(), 'src', 'lib', 'queries');

/** Columnas cuya suma directa mezcla monedas. */
const COLUMNAS = ['totalAmount', 'netAmount', 'vatAmount', 'withholdingAmount'];

/**
 * Ficheros donde una suma en moneda original es correcta.
 *
 * `invoicePayments.amount` no es una columna de `invoices` y su tabla no guarda
 * contravalor: se excluye entera hasta que alguien aplique un pago en divisa.
 */
const EXENTOS = new Set(['invoicePayments.ts']);

function ficherosTs(dir: string): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      out.push(...ficherosTs(ruta));
      continue;
    }
    if (nombre.endsWith('.ts') && !nombre.endsWith('.test.ts') && !EXENTOS.has(nombre)) {
      out.push(ruta);
    }
  }
  return out;
}

describe('[FV.4] las agregaciones suman en euros, no en la moneda de la factura', () => {
  const ficheros = ficherosTs(RAIZ);

  it('encuentra ficheros que revisar', () => {
    expect(ficheros.length).toBeGreaterThan(10);
  });

  it('ninguna SUM/AVG interpola una columna de importe de `invoices` en crudo', () => {
    const infracciones: string[] = [];

    for (const ruta of ficheros) {
      const lineas = readFileSync(ruta, 'utf8').split(/\r?\n/);
      lineas.forEach((linea, i) => {
        if (!/SUM\(|AVG\(/.test(linea)) return;
        for (const col of COLUMNAS) {
          if (linea.includes('${invoices.' + col + '}')) {
            const rel = ruta.slice(process.cwd().length + 1).replace(/\\/g, '/');
            infracciones.push(`${rel}:${i + 1} — SUM sobre invoices.${col} en crudo`);
          }
        }
      });
    }

    // El mensaje dice qué hacer: los helpers ya existen, no hay que inventar nada.
    expect(infracciones.join('\n') || 'ninguna').toBe('ninguna');
  });
});
