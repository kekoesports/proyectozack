import {
  normalizeGoogleDriveFolderId,
  updateTalentBusinessSchema,
} from '@/lib/schemas/talentBusiness';

describe('carpeta Drive del talento', () => {
  it('acepta un ID puro', () => {
    expect(normalizeGoogleDriveFolderId('1AbCdEfGhIjKlMnOpQrStUvWxYz_123')).toBe(
      '1AbCdEfGhIjKlMnOpQrStUvWxYz_123',
    );
  });

  it('extrae el ID de una URL de Drive', () => {
    expect(
      normalizeGoogleDriveFolderId(
        'https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz_123?usp=sharing',
      ),
    ).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz_123');
  });

  it('rechaza URLs y textos que no identifican una carpeta', () => {
    const parsed = updateTalentBusinessSchema.safeParse({
      talentId: 12,
      googleDriveFolderId: 'https://example.com/no-es-drive',
    });
    expect(parsed.success).toBe(false);
  });

  it('permite borrar una carpeta configurada', () => {
    const parsed = updateTalentBusinessSchema.parse({
      talentId: 12,
      googleDriveFolderId: '',
    });
    expect(parsed.googleDriveFolderId).toBeNull();
  });
});
