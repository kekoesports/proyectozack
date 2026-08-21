/**
 * FV.7 — salud del dato financiero (tipos y clasificación, sin DB).
 *
 * La idea que ordena el módulo: **un chequeo que no se puede evaluar tiene que
 * decirlo**, no devolver cero. "0 facturas descuadradas" y "no puedo saber si
 * hay facturas descuadradas" se leen igual en un panel y significan lo
 * contrario. Por eso cada chequeo tiene tres desenlaces y no dos.
 *
 * El otro principio: un hallazgo esperado no es un problema. Los pagos a
 * creadores de LATAM se hacen en cripto y no se facturan — es una decisión de
 * negocio, no un descuido — así que el chequeo que los encuentra lo explica en
 * vez de pintarlos en rojo cada mes.
 */

export type EstadoChequeo =
  /** Se ha podido comprobar y no hay nada que mirar. */
  | 'limpio'
  /** Hay filas que revisar. */
  | 'con-hallazgos'
  /** Falta el dato de partida: el resultado no significa nada. */
  | 'no-evaluable';

export type SeveridadChequeo =
  /** Descuadra las cuentas o impide justificar algo ante Hacienda. */
  | 'cuentas'
  /** Ensucia el dato pero no mueve ninguna cifra. */
  | 'higiene'
  /** Se espera que salga: hay una razón de negocio detrás. */
  | 'esperado';

export type FilaChequeo = {
  readonly id: number;
  readonly etiqueta: string;
  readonly detalle: string | null;
  readonly importe: number | null;
};

export type Chequeo = {
  readonly id: string;
  readonly titulo: string;
  /** Qué mira y por qué importa. Se enseña siempre, también en verde. */
  readonly explicacion: string;
  readonly severidad: SeveridadChequeo;
  readonly estado: EstadoChequeo;
  /**
   * Una muestra, no el conjunto: los chequeos de higiene devuelven cientos de
   * filas y listarlas todas no ayuda a nadie. El recuento real es `totalFilas`.
   */
  readonly filas: readonly FilaChequeo[];
  /** Cuántas filas encontró el chequeo, más allá de las que se listan. */
  readonly totalFilas: number;
  readonly importe: number | null;
  /** Presente solo en `no-evaluable`: qué falta para poder mirarlo. */
  readonly porQueNoEvaluable?: string;
  /** Qué hacer con los hallazgos. Vacío en los `esperado`. */
  readonly queHacer?: string;
};

/** Orden de lectura: lo que descuadra cuentas primero, lo esperado al final. */
const PESO: Readonly<Record<SeveridadChequeo, number>> = {
  cuentas: 0,
  higiene: 1,
  esperado: 2,
};

/**
 * Ordena los chequeos como se leen: primero lo que pide acción y descuadra,
 * después la higiene, y al final lo que sale por diseño. Dentro de cada grupo,
 * lo caro arriba; los limpios y los no evaluables, después de los que tienen
 * hallazgos.
 */
export function ordenarChequeos(chequeos: readonly Chequeo[]): readonly Chequeo[] {
  return [...chequeos].sort((a, b) => {
    const conA = a.estado === 'con-hallazgos' ? 0 : 1;
    const conB = b.estado === 'con-hallazgos' ? 0 : 1;
    if (conA !== conB) return conA - conB;
    if (PESO[a.severidad] !== PESO[b.severidad]) return PESO[a.severidad] - PESO[b.severidad];
    return (b.importe ?? 0) - (a.importe ?? 0);
  });
}

export type ResumenSalud = {
  readonly total: number;
  readonly limpios: number;
  readonly conHallazgos: number;
  readonly noEvaluables: number;
  /**
   * Suma de lo que descuadra cuentas — solo severidad `cuentas`.
   *
   * La higiene queda fuera: que a 110 movimientos les falte el método de pago
   * ensucia el dato, pero no pone 59.432 € en riesgo, y meterlos en el titular
   * convierte la cifra en un número grande que no significa nada.
   */
  readonly importeEnJuego: number;
};

/**
 * El titular del panel.
 *
 * `importeEnJuego` cuenta solo lo que descuadra cuentas. Los pagos en cripto de
 * LATAM son esperados y la higiene no mueve cifras: meterlos ahí haría que el
 * número nunca bajara, y una alarma que siempre suena deja de ser una alarma.
 */
export function resumirSalud(chequeos: readonly Chequeo[]): ResumenSalud {
  let limpios = 0;
  let conHallazgos = 0;
  let noEvaluables = 0;
  let importeEnJuego = 0;

  for (const c of chequeos) {
    if (c.estado === 'limpio') limpios += 1;
    else if (c.estado === 'no-evaluable') noEvaluables += 1;
    else {
      conHallazgos += 1;
      if (c.severidad === 'cuentas') importeEnJuego += c.importe ?? 0;
    }
  }

  return {
    total: chequeos.length,
    limpios,
    conHallazgos,
    noEvaluables,
    importeEnJuego: Math.round(importeEnJuego * 100) / 100,
  };
}
