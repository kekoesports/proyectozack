import { formatPartnerLeadDigest } from '@/lib/partner-leads/discord';
import { PartnerLeadBatchIntake } from '@/lib/schemas/partnerLead';

const validLead = {
  name: 'Case Partner',
  url: 'https://cases.example.com',
  category: 'case-opening' as const,
  companyName: 'Example Ltd',
  jurisdiction: 'Malta',
  countryCode: 'mt',
  languages: ['en'],
  summary: 'Operador con identidad societaria publicada.',
  creatorFit: 'Programa comercial público para streamers de CS2.',
  contactEmail: 'partners@example.com',
  contactUrl: 'https://cases.example.com/contact',
  commercialProgramUrl: 'https://cases.example.com/partners',
  termsUrl: 'https://cases.example.com/terms',
  licenceUrl: 'https://regulator.example.com/license/123',
  companyEvidence: 'Registro mercantil identificado.',
  licenceEvidence: 'Licencia contrastada con el regulador.',
  spainStatus: 'review-required' as const,
  spainSuitability: 'Requiere revisión jurídica antes de una campaña en España.',
  reliabilityEvidence: [{
    label: 'Registro del regulador',
    url: 'https://regulator.example.com/license/123',
    checkedAt: '2026-09-04T08:00:00+02:00',
  }],
  riskFlags: [],
  riskLevel: 'green' as const,
  recommendation: 'recommended' as const,
  confidence: 84,
  verifiedAt: '2026-09-04T08:00:00+02:00',
};

describe('PartnerLeadBatchIntake', () => {
  it('normaliza el país y acepta un lote verificable', () => {
    const result = PartnerLeadBatchIntake.safeParse({
      batchId: 'cs2-radar-2026-09-04',
      researchedAt: '2026-09-04T09:00:00+02:00',
      reportSummary: 'Un candidato contrastado.',
      leads: [validLead],
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.leads[0]?.countryCode).toBe('MT');
  });

  it('rechaza dos URLs del mismo dominio en el mismo lote', () => {
    const result = PartnerLeadBatchIntake.safeParse({
      batchId: 'cs2-radar-2026-09-04',
      researchedAt: '2026-09-04T09:00:00+02:00',
      reportSummary: 'Duplicado accidental.',
      leads: [validLead, { ...validLead, url: 'https://www.cases.example.com/other' }],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza protocolos que no sean HTTP(S)', () => {
    const result = PartnerLeadBatchIntake.safeParse({
      batchId: 'cs2-radar-2026-09-04',
      researchedAt: '2026-09-04T09:00:00+02:00',
      reportSummary: 'URL inválida.',
      leads: [{ ...validLead, url: 'ftp://cases.example.com' }],
    });

    expect(result.success).toBe(false);
  });
});

describe('formatPartnerLeadDigest', () => {
  it('neutraliza menciones y enlaza el CRM', () => {
    const message = formatPartnerLeadDigest({
      researchedAt: new Date('2026-09-04T07:00:00Z'),
      reportSummary: 'Revisar con @legal antes de contactar.',
      candidates: [{
        name: '@everyone Cases',
        url: 'https://cases.example.com',
        domain: 'cases.example.com',
        creatorFit: 'Buen encaje para streams de CS2.',
        riskLevel: 'amber',
        recommendation: 'watch',
        confidence: 72,
      }],
      newLeadCount: 1,
      updatedLeadCount: 0,
      discardedCount: 0,
      crmUrl: 'https://socialpro.es/admin/partner-leads?batch=cs2-radar-2026-09-04',
    });

    expect(message).toContain('@\u200beveryone');
    expect(message).toContain('@\u200blegal');
    expect(message).toContain('Abrir leads y evidencias en el CRM');
    expect(message.length).toBeLessThanOrEqual(1_900);
  });

  it('notifica también un informe sin candidatos', () => {
    const message = formatPartnerLeadDigest({
      researchedAt: new Date('2026-09-04T07:00:00Z'),
      reportSummary: 'Sin novedades verificables.',
      candidates: [],
      newLeadCount: 0,
      updatedLeadCount: 0,
      discardedCount: 0,
      crmUrl: 'https://socialpro.es/admin/partner-leads',
    });

    expect(message).toContain('no se han encontrado candidatos nuevos');
  });
});
