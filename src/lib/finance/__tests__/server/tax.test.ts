/**
 * FV.3 — cómo se interpreta el saldo de IVA en pantalla.
 *
 * El signo importa: con exportación el repercutido es 0 y el soportado se
 * acumula, así que el saldo sale negativo y eso es dinero A FAVOR, no una
 * deuda. Enseñar "−1.639,09 €" sin más se lee como pérdida.
 */

import {
  etiquetaSaldoIva,
  proporcionSinIva,
  signoSaldoIva,
} from '@/lib/finance/tax.shared';

describe('signoSaldoIva', () => {
  it('un saldo negativo está a favor de la empresa', () => {
    expect(signoSaldoIva(-1639.09)).toBe('a-favor');
  });

  it('un saldo positivo hay que ingresarlo', () => {
    expect(signoSaldoIva(2100)).toBe('a-ingresar');
  });

  it('el cero no es ninguna de las dos cosas', () => {
    expect(signoSaldoIva(0)).toBe('neutro');
  });

  it('ignora el ruido de redondeo por debajo del céntimo', () => {
    expect(signoSaldoIva(0.004)).toBe('neutro');
    expect(signoSaldoIva(-0.004)).toBe('neutro');
  });
});

describe('etiquetaSaldoIva', () => {
  it('el importe se muestra siempre en positivo, y el texto explica el sentido', () => {
    const favor = etiquetaSaldoIva(-1639.09);
    expect(favor.importe).toBe(1639.09);
    expect(favor.texto).toMatch(/favor/i);

    const ingresar = etiquetaSaldoIva(2100);
    expect(ingresar.importe).toBe(2100);
    expect(ingresar.texto).toMatch(/ingresar/i);
  });

  it('sin saldo no promete nada', () => {
    expect(etiquetaSaldoIva(0)).toEqual({ texto: 'Sin saldo', importe: 0 });
  });
});

describe('proporcionSinIva', () => {
  it('da el porcentaje con un decimal', () => {
    expect(proporcionSinIva(49, 119)).toBe(41.2);
  });

  it('no divide por cero cuando no hay gastos', () => {
    expect(proporcionSinIva(0, 0)).toBe(0);
  });
});
