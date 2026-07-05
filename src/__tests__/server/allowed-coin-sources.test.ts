import {
  ALLOWED_COIN_SOURCES,
  FORBIDDEN_COIN_SOURCES,
  ForbiddenCoinSourceError,
  assertAllowedCoinSource,
  isAllowedCoinSource,
} from '@/lib/rewards/allowed-coin-sources';

describe('allowed-coin-sources — guardrail contra fuentes de puntos apostables', () => {
  describe('ALLOWED_COIN_SOURCES canónica', () => {
    it('contiene exactamente racha, mision, sorteo, tienda, admin', () => {
      expect([...ALLOWED_COIN_SOURCES].sort()).toEqual(
        ['admin', 'mision', 'racha', 'sorteo', 'tienda'].sort(),
      );
    });
  });

  describe('assertAllowedCoinSource', () => {
    it.each(ALLOWED_COIN_SOURCES)('pasa para fuente permitida "%s"', (source) => {
      expect(() => assertAllowedCoinSource(source)).not.toThrow();
    });

    it.each(FORBIDDEN_COIN_SOURCES)('lanza ForbiddenCoinSourceError para "%s"', (source) => {
      expect(() => assertAllowedCoinSource(source)).toThrow(ForbiddenCoinSourceError);
    });

    it('normaliza mayúsculas y espacios', () => {
      expect(() => assertAllowedCoinSource('  Racha  ')).not.toThrow();
      expect(() => assertAllowedCoinSource('MISION')).not.toThrow();
    });

    it('rechaza variantes de "apuesta" en cualquier casing', () => {
      expect(() => assertAllowedCoinSource('APUESTA')).toThrow(ForbiddenCoinSourceError);
      expect(() => assertAllowedCoinSource('Apuesta')).toThrow(ForbiddenCoinSourceError);
      expect(() => assertAllowedCoinSource('apuesta')).toThrow(ForbiddenCoinSourceError);
    });

    it('rechaza cualquier string no listada explícitamente', () => {
      expect(() => assertAllowedCoinSource('anything-else')).toThrow(ForbiddenCoinSourceError);
      expect(() => assertAllowedCoinSource('')).toThrow(ForbiddenCoinSourceError);
    });

    it('el error expone la fuente rechazada', () => {
      try {
        assertAllowedCoinSource('jackpot');
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenCoinSourceError);
        if (e instanceof ForbiddenCoinSourceError) {
          expect(e.source).toBe('jackpot');
        }
      }
    });
  });

  describe('isAllowedCoinSource — variante non-throw', () => {
    it.each(ALLOWED_COIN_SOURCES)('retorna true para "%s"', (source) => {
      expect(isAllowedCoinSource(source)).toBe(true);
    });

    it.each(FORBIDDEN_COIN_SOURCES)('retorna false para "%s"', (source) => {
      expect(isAllowedCoinSource(source)).toBe(false);
    });
  });
});
