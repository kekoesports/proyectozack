'server-only';

import { sql, type SQL } from 'drizzle-orm';
import { invoices } from '@/db/schema';

/**
 * FV.4 (segunda mitad) — importes de factura expresados en euros.
 *
 * `total_amount`, `net_amount` y `vat_amount` están en la moneda de la factura.
 * Sumarlos a pelo trata 1.590 $ como 1.590 €, y en 2026 hay doce gastos en
 * dólares: el gasto salía inflado en 647,34 € y el beneficio, peor de lo que es.
 *
 * FV.4 arregló los ingresos y dejó fuera todo lo demás. Estas expresiones son
 * lo que faltaba, pensadas para ir **dentro de un SUM**, no para mostrar el
 * importe de una factura suelta: ahí se quiere la cifra en su moneda, tal como
 * la emitió el proveedor.
 *
 * Son seguras de aplicar en bloque: en las filas en euros `eur_equivalent` es
 * NULL y `fx_rate` también, así que ambas devuelven exactamente el valor que ya
 * devolvían. Solo cambia lo que estaba mal.
 */

/** Total de la factura en euros. */
export const totalEurSql: SQL = sql`COALESCE(${invoices.eurEquivalent}, ${invoices.totalAmount})`;

/**
 * Base imponible en euros.
 *
 * No hay columna equivalente a `eur_equivalent` para la base, así que se aplica
 * el mismo tipo de cambio que se fijó para el total. Es el tipo del BCE del día
 * de la operación, ya guardado — no se consulta nada al vuelo.
 */
export const netEurSql: SQL = sql`CASE WHEN ${invoices.fxRate} IS NOT NULL THEN ${invoices.netAmount} * ${invoices.fxRate} ELSE ${invoices.netAmount} END`;

/** Cuota de IVA en euros, por el mismo camino que la base. */
export const vatEurSql: SQL = sql`CASE WHEN ${invoices.fxRate} IS NOT NULL THEN ${invoices.vatAmount} * ${invoices.fxRate} ELSE ${invoices.vatAmount} END`;

/** Retención en euros. */
export const withholdingEurSql: SQL = sql`CASE WHEN ${invoices.fxRate} IS NOT NULL THEN ${invoices.withholdingAmount} * ${invoices.fxRate} ELSE ${invoices.withholdingAmount} END`;
