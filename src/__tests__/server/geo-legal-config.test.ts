import {
  getGeoLegalConfig,
  shouldRenderPartnerCtaFull,
} from '@/lib/geo-legal-config';
import {
  EXTERNAL_PARTNER_CTAS_ENABLED,
  KEYDROP_EXTERNAL_CTAS_ENABLED,
  SKINS_REWARDS_ENABLED,
  WAGERING_COPY_ALLOWED,
} from '@/lib/feature-flags';

describe('geo-legal-config — gating server-side por país', () => {
  describe('getGeoLegalConfig', () => {
    it('ES es el default más restrictivo', () => {
      const es = getGeoLegalConfig('ES');
      expect(es.country).toBe('ES');
      expect(es.keydropExternalCTAs).toBe(KEYDROP_EXTERNAL_CTAS_ENABLED);
      expect(es.externalPartnerCTAs).toBe(EXTERNAL_PARTNER_CTAS_ENABLED);
      expect(es.wageringCopyAllowed).toBe(WAGERING_COPY_ALLOWED);
      expect(es.requirePartnerExternalNotice).toBe(true);
      expect(es.ageMin).toBe(18);
    });

    it('país desconocido / null / vacío cae al perfil ES (más restrictivo)', () => {
      expect(getGeoLegalConfig(null).country).toBe('ES');
      expect(getGeoLegalConfig(undefined).country).toBe('ES');
      expect(getGeoLegalConfig('').country).toBe('ES');
      expect(getGeoLegalConfig('   ').country).toBe('ES');
    });

    it('normaliza casing', () => {
      expect(getGeoLegalConfig('es').country).toBe('ES');
      expect(getGeoLegalConfig(' es ').country).toBe('ES');
    });

    it('AD y CY hoy comparten configuración restrictiva con ES', () => {
      const ad = getGeoLegalConfig('AD');
      const cy = getGeoLegalConfig('CY');
      expect(ad.keydropExternalCTAs).toBe(KEYDROP_EXTERNAL_CTAS_ENABLED);
      expect(cy.keydropExternalCTAs).toBe(KEYDROP_EXTERNAL_CTAS_ENABLED);
      expect(ad.requirePartnerExternalNotice).toBe(true);
      expect(cy.requirePartnerExternalNotice).toBe(true);
    });

    it('INT (resto de mundo) es menos restrictivo pero aún exige PartnerExternalNotice', () => {
      const us = getGeoLegalConfig('US');
      expect(us.country).toBe('US');
      expect(us.keydropExternalCTAs).toBe(true);
      expect(us.externalPartnerCTAs).toBe(true);
      expect(us.wageringCopyAllowed).toBe(true);
      expect(us.requirePartnerExternalNotice).toBe(true);
    });

    it('skinsRewards refleja el flag global (por defecto true)', () => {
      expect(getGeoLegalConfig('ES').skinsRewards).toBe(SKINS_REWARDS_ENABLED);
      expect(getGeoLegalConfig('US').skinsRewards).toBe(SKINS_REWARDS_ENABLED);
    });
  });

  describe('shouldRenderPartnerCtaFull', () => {
    it('ES bloquea keydrop y partners genéricos por defecto', () => {
      expect(shouldRenderPartnerCtaFull('ES', 'keydrop')).toBe(false);
      expect(shouldRenderPartnerCtaFull('ES', 'generic')).toBe(false);
    });

    it('País no restringido (INT) permite ambos', () => {
      expect(shouldRenderPartnerCtaFull('US', 'keydrop')).toBe(true);
      expect(shouldRenderPartnerCtaFull('US', 'generic')).toBe(true);
    });

    it('País desconocido cae al perfil ES', () => {
      expect(shouldRenderPartnerCtaFull(null, 'keydrop')).toBe(false);
      expect(shouldRenderPartnerCtaFull(undefined, 'generic')).toBe(false);
    });
  });
});
