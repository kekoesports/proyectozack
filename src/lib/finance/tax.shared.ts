/**
 * FV.3 — el IVA y las retenciones del periodo (lógica pura, sin DB).
 *
 * Dos cosas que la pantalla tenía que dejar de esconder:
 *
 *   · Cuánto de lo que entra y sale **no es vuestro**. Con exportación el IVA
 *     repercutido es 0 y el soportado se acumula: el saldo sale a favor y es
 *     dinero que Hacienda devuelve o compensa, no un gasto.
 *   · Cuánto se ha retenido a terceros, que es lo que se ingresa por el 111.
 *
 * Ojo con la retención: **no reduce el gasto**. En una factura de proveedor
 * baja lo que transfieres, y en una nómina ni eso — el gasto es el devengado
 * bruto. En ambos casos es dinero de un tercero que la empresa adelanta a
 * Hacienda, así que va en su propio bloque y nunca restando del resultado.
 */

export type TaxPeriodSummary = {
  readonly from: string;
  readonly to: string;
  /** IVA cobrado a clientes. Con exportación, 0. */
  readonly ivaRepercutido: number;
  /** IVA pagado a proveedores. */
  readonly ivaSoportado: number;
  /** repercutido − soportado. Negativo = a vuestro favor. */
  readonly saldoIva: number;
  /** Retenciones practicadas a terceros — lo que se ingresa por el modelo 111. */
  readonly retencionesPracticadas: number;
  /** Movimientos de gasto con IVA a 0 — puede ser correcto (ISP, exento) o un dato sin desglosar. */
  readonly gastosSinIva: number;
  /** Total de movimientos de gasto del periodo, para dar contexto al anterior. */
  readonly gastosTotales: number;
};

export type SaldoIvaSigno = 'a-favor' | 'a-ingresar' | 'neutro';

/** Qué significa el saldo, sin que el usuario tenga que interpretar un signo. */
export function signoSaldoIva(saldo: number): SaldoIvaSigno {
  if (saldo < -0.005) return 'a-favor';
  if (saldo > 0.005) return 'a-ingresar';
  return 'neutro';
}

/** Etiqueta lista para pantalla. El importe siempre se muestra en positivo. */
export function etiquetaSaldoIva(saldo: number): { readonly texto: string; readonly importe: number } {
  const signo = signoSaldoIva(saldo);
  if (signo === 'a-favor') {
    return { texto: 'A vuestro favor — a compensar o devolver', importe: Math.abs(saldo) };
  }
  if (signo === 'a-ingresar') {
    return { texto: 'A ingresar a Hacienda', importe: saldo };
  }
  return { texto: 'Sin saldo', importe: 0 };
}

/**
 * Cuántos gastos sin IVA hay que mirar. No todos son un error: las compras con
 * inversión del sujeto pasivo (OpenAI, Google, Anthropic…) llevan IVA 0 con
 * razón. Por eso se devuelve la proporción y no una alarma.
 */
export function proporcionSinIva(sinIva: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((sinIva / total) * 1000) / 10;
}
