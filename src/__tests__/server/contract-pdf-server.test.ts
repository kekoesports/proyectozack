jest.mock('server-only', () => ({}));

import { generateContractPdf } from '@/lib/pdf/generateContractPdf';

describe('generateContractPdf', () => {
  it('genera un PDF válido sin DOM ni APIs de navegador', async () => {
    const pdf = await generateContractPdf({
      templateName: 'Contrato general',
      content: 'CONTRATO DE PRUEBA\n\n1. OBJETO\nContenido del contrato.',
      metadata: [
        { label: 'Trato', value: 'Marca - Creador' },
        { label: 'Importe', value: '1.000 EUR' },
      ],
      generatedAt: new Date('2026-08-22T00:00:00Z'),
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.byteLength).toBeGreaterThan(1_000);
    expect(pdf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });
});
