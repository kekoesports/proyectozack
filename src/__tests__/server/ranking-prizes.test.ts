/**
 * Regla Fase 1 PR4 del audit del 2026-07-10: siempre debe haber al menos
 * el mes actual (julio 2026) configurado en MONTHLY_PRIZES para que la
 * UI del ranking no muestre "Premios de {mes} próximamente" en
 * producción. Estos tests bloquean regresiones sobre la config y
 * verifican el shape del helper.
 */

import {
  MONTHLY_PRIZES,
  currentMonthKey,
  getCurrentMonthPrizes,
  getCurrentPrizeForPosition,
  monthNameEs,
  type RankingPrize,
} from '@/features/giveaway-platform/constants/prizes';

describe('MONTHLY_PRIZES — invariantes del config', () => {
  it('contiene al menos el mes de julio 2026 (mes actual del audit)', () => {
    expect(MONTHLY_PRIZES['2026-07']).toBeDefined();
    expect(MONTHLY_PRIZES['2026-07']?.prizes.length).toBeGreaterThanOrEqual(1);
  });

  it('cada mes configurado tiene 3 premios como máximo, posiciones únicas 1/2/3', () => {
    for (const [monthKey, config] of Object.entries(MONTHLY_PRIZES)) {
      expect(config.prizes.length).toBeGreaterThanOrEqual(1);
      expect(config.prizes.length).toBeLessThanOrEqual(3);

      const positions = config.prizes.map((p) => p.position);
      const unique = new Set(positions);
      expect(unique.size).toBe(positions.length);
      for (const p of positions) {
        expect([1, 2, 3]).toContain(p);
      }
      // Nota informativa para el reviewer.
      expect(monthKey).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('los títulos y descripciones son strings no vacíos', () => {
    for (const config of Object.values(MONTHLY_PRIZES)) {
      for (const prize of config.prizes) {
        expect(prize.title.trim().length).toBeGreaterThan(0);
        if (prize.description !== undefined) {
          expect(prize.description.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('el tipo RankingPrize acepta imageUrl opcional sin romper', () => {
    // Regresión: si alguien cambia el shape del type, este test falla en compile.
    const withImg: RankingPrize = {
      position: 1,
      title: 'Test',
      imageUrl: '/images/prizes/test.png',
    };
    const withoutImg: RankingPrize = { position: 2, title: 'Test' };
    expect(withImg.imageUrl).toBe('/images/prizes/test.png');
    expect(withoutImg.imageUrl).toBeUndefined();
  });
});

describe('helpers de mes', () => {
  it('currentMonthKey devuelve formato YYYY-MM', () => {
    expect(currentMonthKey()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('monthNameEs traduce YYYY-MM al nombre en español', () => {
    expect(monthNameEs('2026-07')).toBe('julio 2026');
    expect(monthNameEs('2026-08')).toBe('agosto 2026');
    expect(monthNameEs('2026-01')).toBe('enero 2026');
    expect(monthNameEs('2026-12')).toBe('diciembre 2026');
  });

  it('monthNameEs devuelve el key crudo si el mes es inválido', () => {
    expect(monthNameEs('2026-13')).toBe('2026-13');
    expect(monthNameEs('malformed')).toBe('malformed');
  });
});

describe('getCurrentPrizeForPosition', () => {
  // Estos tests dependen de `currentMonthKey()` que mira Date.now(). Los
  // asserts son sobre lo que devuelve la lookup del mes actual — si el
  // mes actual está configurado, devolvemos un premio real; si no,
  // devolvemos null. En ambos casos el shape es correcto.
  it('devuelve null si la posición no está en el config del mes actual', () => {
    const config = getCurrentMonthPrizes();
    // La posición 4 no existe nunca (la interfaz sólo admite 1|2|3).
    // Verificamos que el helper degrada elegantemente.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getCurrentPrizeForPosition(4 as any)).toBeNull();
    if (config === null) {
      // Si no hay config del mes actual → todos los slots devuelven null.
      expect(getCurrentPrizeForPosition(1)).toBeNull();
      expect(getCurrentPrizeForPosition(2)).toBeNull();
      expect(getCurrentPrizeForPosition(3)).toBeNull();
    }
  });

  it('devuelve un premio válido para la posición 1 si el mes actual está configurado', () => {
    const config = getCurrentMonthPrizes();
    if (config === null) return; // rama cubierta arriba
    const p1 = getCurrentPrizeForPosition(1);
    expect(p1).not.toBeNull();
    expect(p1?.position).toBe(1);
    expect(p1?.title.trim().length).toBeGreaterThan(0);
  });
});
