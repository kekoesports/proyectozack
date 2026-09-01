import {
  buildDealInvoiceConcept,
  localizeCountryName,
  localizeKnownInvoiceText,
  normalizeDealInvoiceLineForPdf,
} from '@/lib/invoices/dealInvoiceCopy';

describe('copy comercial de facturas de trato', () => {
  it('crea el concepto en inglés sin marca ni condiciones del deal', () => {
    expect(buildDealInvoiceConcept('Horcus')).toBe('Digital marketing services - Horcus');
  });

  it('corrige las líneas automáticas antiguas al volver a descargar el PDF', () => {
    expect(normalizeDealInvoiceLineForPdf({
      concept: 'Campaña de marketing digital — HORCUS x CSGOSKINS',
      description: '12 streams: 6800 eur + skins + giveaway',
    }, 'en', 'Horcus')).toEqual({
      concept: 'Digital marketing services - Horcus',
      description: null,
    });
  });

  it('conserva solo el resumen saneado de entregables en el PDF inglés', () => {
    expect(normalizeDealInvoiceLineForPdf({
      concept: 'Digital marketing services - Horcus',
      description: 'Campaign deliverables: 12 livestreams.',
    }, 'en', 'Horcus')).toEqual({
      concept: 'Digital marketing services - Horcus',
      description: 'Campaign deliverables: 12 livestreams.',
    });

    expect(normalizeDealInvoiceLineForPdf({
      concept: 'Digital marketing services - Horcus',
      description: 'Campaign deliverables: 12 livestreams, EUR 6,800 + skins.',
    }, 'en', 'Horcus')).toEqual({
      concept: 'Digital marketing services - Horcus',
      description: null,
    });
  });

  it('no altera las líneas manuales ni una descarga española explícita', () => {
    const line = { concept: 'Consultoría específica', description: 'Trabajo aprobado' };
    expect(normalizeDealInvoiceLineForPdf(line, 'en', 'Horcus')).toBe(line);
    expect(normalizeDealInvoiceLineForPdf({
      concept: 'Campaña de marketing digital — HORCUS',
      description: '12 streams',
    }, 'es', 'Horcus')).toEqual({
      concept: 'Campaña de marketing digital — HORCUS',
      description: '12 streams',
    });
  });

  it('traduce el copy automático conocido y el país del emisor', () => {
    expect(localizeKnownInvoiceText(
      'Pago a 30 días desde la fecha de emisión',
      'en',
    )).toBe('Payment due within 30 days of the issue date.');
    expect(localizeCountryName('España', 'en')).toBe('Spain');
  });
});
