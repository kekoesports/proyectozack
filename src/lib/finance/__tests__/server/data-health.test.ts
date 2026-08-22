/**
 * FV.7 — clasificación de los chequeos de salud del dato.
 *
 * Lo que se protege aquí es una distinción que se pierde con facilidad: un
 * chequeo que **no se puede evaluar** no es un chequeo limpio. Los dos se
 * pintan sin filas y significan lo contrario.
 */

import {
  ordenarChequeos,
  resumirSalud,
  type Chequeo,
} from '@/lib/finance/dataHealth.shared';

function chequeo(overrides: Partial<Chequeo> = {}): Chequeo {
  return {
    id: 'x',
    titulo: 'Un chequeo',
    explicacion: 'Mira algo.',
    severidad: 'cuentas',
    estado: 'limpio',
    filas: [],
    totalFilas: 0,
    importe: null,
    ...overrides,
  };
}

const conHallazgos = (importe: number, over: Partial<Chequeo> = {}): Chequeo =>
  chequeo({
    estado: 'con-hallazgos',
    importe,
    totalFilas: 1,
    filas: [{ id: 1, etiqueta: 'fila', detalle: null, importe }],
    ...over,
  });

describe('resumirSalud', () => {
  it('no confunde un chequeo limpio con uno que no se ha podido evaluar', () => {
    const r = resumirSalud([
      chequeo({ id: 'a', estado: 'limpio' }),
      chequeo({ id: 'b', estado: 'no-evaluable', porQueNoEvaluable: 'no hay extractos' }),
    ]);
    expect(r.limpios).toBe(1);
    expect(r.noEvaluables).toBe(1);
    expect(r.conHallazgos).toBe(0);
  });

  it('el dinero en juego solo cuenta lo que descuadra cuentas', () => {
    const r = resumirSalud([
      conHallazgos(15171.07, { id: 'pagos-sin-ficha', severidad: 'cuentas' }),
      conHallazgos(59432.78, { id: 'sin-metodo', severidad: 'higiene' }),
    ]);
    expect(r.importeEnJuego).toBe(15171.07);
  });

  it('lo esperado tampoco entra: si entrara, la cifra no bajaría nunca', () => {
    // Los pagos a creadores de LATAM van en cripto y no se facturan. Es una
    // decisión de negocio, no un descuido.
    const r = resumirSalud([
      conHallazgos(1000, { id: 'real', severidad: 'cuentas' }),
      conHallazgos(7648.72, { id: 'latam', severidad: 'esperado' }),
    ]);
    expect(r.importeEnJuego).toBe(1000);
    expect(r.conHallazgos).toBe(2);
  });

  it('sin hallazgos, el dinero en juego es cero y no null', () => {
    expect(resumirSalud([chequeo()]).importeEnJuego).toBe(0);
  });
});

describe('ordenarChequeos', () => {
  it('lo que tiene hallazgos va antes que lo limpio, aunque sea menos grave', () => {
    const orden = ordenarChequeos([
      chequeo({ id: 'limpio-grave', severidad: 'cuentas', estado: 'limpio' }),
      conHallazgos(10, { id: 'sucio-leve', severidad: 'higiene' }),
    ]).map((c) => c.id);
    expect(orden[0]).toBe('sucio-leve');
  });

  it('entre los que tienen hallazgos, primero lo que descuadra cuentas', () => {
    const orden = ordenarChequeos([
      conHallazgos(59432, { id: 'higiene-caro', severidad: 'higiene' }),
      conHallazgos(15171, { id: 'cuentas-barato', severidad: 'cuentas' }),
    ]).map((c) => c.id);
    // El importe no manda sobre la severidad: 59.432 € de higiene no descuadran
    // nada y 15.171 € sin ficha fiscal sí.
    expect(orden).toEqual(['cuentas-barato', 'higiene-caro']);
  });

  it('lo esperado queda el último de los que tienen hallazgos', () => {
    const orden = ordenarChequeos([
      conHallazgos(99999, { id: 'esperado', severidad: 'esperado' }),
      conHallazgos(1, { id: 'higiene', severidad: 'higiene' }),
      conHallazgos(1, { id: 'cuentas', severidad: 'cuentas' }),
    ]).map((c) => c.id);
    expect(orden).toEqual(['cuentas', 'higiene', 'esperado']);
  });

  it('dentro de la misma severidad, lo más caro arriba', () => {
    const orden = ordenarChequeos([
      conHallazgos(100, { id: 'barato' }),
      conHallazgos(5000, { id: 'caro' }),
    ]).map((c) => c.id);
    expect(orden).toEqual(['caro', 'barato']);
  });

  it('no muta el array que recibe', () => {
    const entrada = [conHallazgos(1, { id: 'a' }), conHallazgos(2, { id: 'b' })];
    const copia = [...entrada];
    ordenarChequeos(entrada);
    expect(entrada).toEqual(copia);
  });
});
