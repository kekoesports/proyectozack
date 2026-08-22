/**
 * La economía de un talento: qué ha cobrado, qué se le ha retenido y si su
 * rentabilidad se puede calcular. Lógica pura, sin DB.
 *
 * El problema que resuelve este módulo no es sumar — es saber **cuándo callar**.
 * De las 96 campañas del CRM, 10 tienen alguna factura enlazada. Un margen
 * calculado sobre una campaña de ocho no es una verdad más pequeña: es un
 * número equivocado. TODOCS2 saldría a −1.060 € teniendo 11.000 € de trato
 * presupuestado, porque lo único que consta es lo que se le pagó.
 *
 * Así que la cobertura viaja siempre junto al margen, y el margen desaparece
 * cuando no hay con qué calcularlo. Es la misma distinción de FV.7 entre
 * "limpio" y "no evaluable", aplicada a una persona.
 */

export type EconomicaTalento = {
  readonly talentId: number;
  /** Lo que se le ha pagado de verdad, en euros. No es el presupuesto. */
  readonly pagado: number;
  /** IRPF retenido y a ingresar en el 111. Nada más lo enseña por persona. */
  readonly retenido: number;
  readonly pagos: number;
  readonly ultimoPago: string | null;
  /** Presupuesto pactado en sus campañas. Previsión, no dinero movido. */
  readonly presupuesto: { readonly marca: number; readonly talento: number };
  /**
   * Cuántas campañas y en qué estado.
   *
   * Es una lista y no un Map porque esto cruza a un componente cliente, y un
   * Map no sobrevive a esa frontera: llega como objeto vacío sin avisar.
   */
  readonly deals: {
    readonly total: number;
    readonly porEstado: readonly { readonly estado: string; readonly n: number }[];
  };
  readonly cobertura: CoberturaFacturas;
  readonly margen: MargenTalento;
};

/** Estados en los que una campaña ya debería tener su dinero facturado. */
export const ESTADOS_CERRADOS = ['pagada', 'completada'] as const;

export type CoberturaFacturas = {
  /** Campañas del talento que tienen al menos una factura enlazada. */
  readonly conFactura: number;
  readonly total: number;
  /** De las cerradas (pagada/completada), cuántas siguen sin factura. */
  readonly cerradasSinFactura: number;
};

export type MargenTalento =
  | {
      readonly estado: 'completo';
      readonly ingreso: number;
      readonly coste: number;
      readonly margen: number;
      readonly margenPct: number | null;
    }
  | {
      readonly estado: 'parcial';
      readonly ingreso: number;
      readonly coste: number;
      readonly margen: number;
      readonly margenPct: number | null;
      /** Sobre cuántas campañas de cuántas se ha calculado. */
      readonly sobre: { readonly conFactura: number; readonly total: number };
    }
  | {
      readonly estado: 'no-evaluable';
      readonly motivo: string;
    };

function redondea(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Decide si el margen de un talento se puede enseñar, y con qué salvedad.
 *
 * Tres desenlaces en vez de dos, igual que los chequeos de salud del dato:
 * un margen que no se puede calcular no es un margen de cero.
 */
export function calcularMargen(input: {
  readonly ingresoFacturado: number;
  readonly costeFacturado: number;
  readonly cobertura: CoberturaFacturas;
}): MargenTalento {
  const { ingresoFacturado, costeFacturado, cobertura } = input;

  if (cobertura.total === 0) {
    return { estado: 'no-evaluable', motivo: 'Todavía no tiene ninguna campaña registrada.' };
  }
  if (cobertura.conFactura === 0) {
    return {
      estado: 'no-evaluable',
      motivo:
        `Ninguna de sus ${cobertura.total} campañas tiene facturas enlazadas, así que no hay ` +
        'ingreso con el que comparar lo que se le ha pagado.',
    };
  }

  const margen = redondea(ingresoFacturado - costeFacturado);
  const margenPct = ingresoFacturado > 0 ? redondea((margen / ingresoFacturado) * 100) : null;
  const base = {
    ingreso: redondea(ingresoFacturado),
    coste: redondea(costeFacturado),
    margen,
    margenPct,
  };

  if (cobertura.conFactura === cobertura.total) return { estado: 'completo', ...base };
  return {
    estado: 'parcial',
    ...base,
    sobre: { conFactura: cobertura.conFactura, total: cobertura.total },
  };
}

/**
 * Frase corta que acompaña siempre al margen.
 *
 * Se enseña también cuando la cobertura es completa: que hoy cuadre no es
 * motivo para esconder sobre qué se ha calculado.
 */
export function etiquetaCobertura(c: CoberturaFacturas): string {
  if (c.total === 0) return 'sin campañas';
  if (c.conFactura === c.total) {
    return `las ${c.total} campañas tienen sus facturas`;
  }
  return `${c.conFactura} de ${c.total} campañas con facturas`;
}
