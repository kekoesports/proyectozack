import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('modelo Gemini operativo por defecto', () => {
  it.each([
    'src/lib/services/ai-assistant/provider.ts',
    'src/lib/ai/seoBioGenerator.ts',
    'src/lib/parsers/pdfAi.ts',
    'scripts/generate-seo-bios.ts',
  ])('%s no vuelve al modelo retirado', (relativePath) => {
    const source = read(relativePath);
    expect(source).not.toContain("'gemini-2.0-flash'");
    expect(source).toContain("'gemini-3.6-flash'");
  });
});
