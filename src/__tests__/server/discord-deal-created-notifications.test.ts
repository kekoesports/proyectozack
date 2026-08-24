jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { formatDiscordDealCreatedMessage } from '@/lib/queries/automationDiscordDealNotifications';

describe('confirmación de trato creado para Discord', () => {
  it('incluye el resultado exacto del alta, del acceso y de la Sheet', () => {
    const message = formatDiscordDealCreatedMessage({
      dealName: 'The Real Fer x SkinsMonkey',
      documentUrl: 'https://docs.google.com/spreadsheets/d/sheet-id/edit',
      sharedWithInfluencer: true,
    });

    expect(message).toBe([
      '## ✅ TRATO CREADO CORRECTAMENTE',
      '**The Real Fer x SkinsMonkey**',
      '👤 Compartido con el influencer: **SÍ**',
      '📄 **[AQUÍ TIENES EL DOCUMENTO](https://docs.google.com/spreadsheets/d/sheet-id/edit)**',
    ].join('\n'));
  });

  it('informa NO cuando Drive no pudo compartir con el influencer', () => {
    const message = formatDiscordDealCreatedMessage({
      dealName: 'FER x SKINPLACE',
      documentUrl: 'https://docs.google.com/spreadsheets/d/sheet-id/edit',
      sharedWithInfluencer: false,
    });

    expect(message).toContain('Compartido con el influencer: **NO**');
  });

  it('no bloquea el aviso si una aprobación antigua perdió el estado de compartición', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/lib/queries/automationDiscordDealNotifications.ts'),
      'utf8',
    );

    expect(source).not.toContain('isNotNull(automationDealDrafts.sheetShareStatus)');
  });

  it('neutraliza markdown y menciones procedentes del nombre del trato', () => {
    const message = formatDiscordDealCreatedMessage({
      dealName: '@everyone *Oferta*',
      documentUrl: 'https://docs.google.com/spreadsheets/d/sheet-id/edit',
      sharedWithInfluencer: true,
    });

    expect(message).toContain('@\u200beveryone \\*Oferta\\*');
    expect(message).not.toContain('@everyone');
  });
});
