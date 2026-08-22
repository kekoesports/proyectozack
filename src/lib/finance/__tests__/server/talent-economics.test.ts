/**
 * Qué se puede decir del dinero de un talento y qué no.
 *
 * De las 96 campañas del CRM, 10 tienen alguna factura enlazada. La tentación
 * es enseñar el margen igual y que salga lo que salga; el resultado sería que
 * TODOCS2 aparece a −1.060 € teniendo 46.825 € de tratos presupuestados,
 * porque lo único que consta de él es lo que se le pagó.
 */

import {
  calcularMargen,
  etiquetaCobertura,
  type CoberturaFacturas,
} from '@/lib/finance/talentEconomics.shared';

const cobertura = (o: Partial<CoberturaFacturas> = {}): CoberturaFacturas => ({
  conFactura: 2,
  total: 2,
  cerradasSinFactura: 0,
  ...o,
});

describe('calcularMargen', () => {
  it('sin campañas no hay margen, y lo dice', () => {
    const m = calcularMargen({
      ingresoFacturado: 0,
      costeFacturado: 0,
      cobertura: cobertura({ conFactura: 0, total: 0 }),
    });
    expect(m.estado).toBe('no-evaluable');
  });

  it('con campañas pero sin una sola factura, tampoco', () => {
    // El caso de TODOCS2: 8 campañas, 1.060 € pagados, ninguna factura.
    const m = calcularMargen({
      ingresoFacturado: 0,
      costeFacturado: 1060,
      cobertura: cobertura({ conFactura: 0, total: 8 }),
    });
    expect(m.estado).toBe('no-evaluable');
    if (m.estado !== 'no-evaluable') throw new Error('rama imposible');
    expect(m.motivo).toContain('8 campañas');
  });

  it('un coste sin ingreso NO se convierte en margen negativo', () => {
    const m = calcularMargen({
      ingresoFacturado: 0,
      costeFacturado: 1060,
      cobertura: cobertura({ conFactura: 0, total: 8 }),
    });
    // Lo importante: no existe la propiedad `margen`, no es que valga -1060.
    expect(m).not.toHaveProperty('margen');
  });

  it('con todas las campañas facturadas, margen completo', () => {
    const m = calcularMargen({
      ingresoFacturado: 3000,
      costeFacturado: 1200,
      cobertura: cobertura({ conFactura: 2, total: 2 }),
    });
    expect(m.estado).toBe('completo');
    if (m.estado === 'no-evaluable') throw new Error('rama imposible');
    expect(m.margen).toBe(1800);
    expect(m.margenPct).toBe(60);
  });

  it('con solo algunas, el margen viaja con la salvedad', () => {
    // ERUBY: 2.775 € de ingreso, pero sobre 1 de sus 3 campañas.
    const m = calcularMargen({
      ingresoFacturado: 2775,
      costeFacturado: 0,
      cobertura: cobertura({ conFactura: 1, total: 3 }),
    });
    expect(m.estado).toBe('parcial');
    if (m.estado !== 'parcial') throw new Error('rama imposible');
    expect(m.sobre).toEqual({ conFactura: 1, total: 3 });
    expect(m.margen).toBe(2775);
  });

  it('sin ingreso no se calcula un porcentaje: dividir por cero no es 0%', () => {
    const m = calcularMargen({
      ingresoFacturado: 0,
      costeFacturado: 500,
      cobertura: cobertura({ conFactura: 1, total: 1 }),
    });
    if (m.estado === 'no-evaluable') throw new Error('rama imposible');
    expect(m.margenPct).toBeNull();
    expect(m.margen).toBe(-500);
  });

  it('redondea a céntimos', () => {
    const m = calcularMargen({
      ingresoFacturado: 1000.005,
      costeFacturado: 333.333,
      cobertura: cobertura({ conFactura: 1, total: 1 }),
    });
    if (m.estado === 'no-evaluable') throw new Error('rama imposible');
    expect(m.margen).toBe(666.67);
  });
});

describe('etiquetaCobertura', () => {
  it('dice sobre qué se ha calculado incluso cuando está todo cubierto', () => {
    expect(etiquetaCobertura(cobertura({ conFactura: 3, total: 3 }))).toBe(
      'las 3 campañas tienen sus facturas',
    );
  });

  it('y cuando falta, dice cuánto falta', () => {
    expect(etiquetaCobertura(cobertura({ conFactura: 1, total: 8 }))).toBe(
      '1 de 8 campañas con facturas',
    );
  });

  it('sin campañas no inventa una fracción', () => {
    expect(etiquetaCobertura(cobertura({ conFactura: 0, total: 0 }))).toBe('sin campañas');
  });
});
