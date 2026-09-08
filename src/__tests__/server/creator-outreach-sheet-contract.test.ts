import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('creator applications outreach columns', () => {
  const source = readFileSync(join(process.cwd(), 'src/lib/integrations/creatorApplicationsSheet.ts'), 'utf8');

  it('preserves the current A:R profile contract and updates only P:R', () => {
    expect(source).toContain("'${SHEET_NAME}'!A5:R");
    expect(source).toContain('[15, 16, 17]');
    expect(source).toContain("'${SHEET_NAME}'!P${row}:R${row}");
    expect(source).not.toContain("'${SHEET_NAME}'!O${row}:Q${row}");
  });

  it('sends a summary to Sheets, never the complete message body', () => {
    expect(source).toContain('application.replySummary');
    expect(source).not.toContain('application.textBody');
  });
});
