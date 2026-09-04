import * as fs from 'fs';
import * as path from 'path';
import { buildKeydropDiscordPayloads } from '@/lib/discord/keydropDailyReport';
import type { KeydropDailyCreatorReport } from '@/lib/queries/keydropDailyReport';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function report(overrides: Partial<KeydropDailyCreatorReport> = {}): KeydropDailyCreatorReport {
  return {
    slug: 'eruby',
    displayName: 'ERUBY',
    profileUrl: 'https://socialpro.es/talentos/eruby',
    status: 'ok',
    activeGiveawayCount: 1,
    accumulatedParticipants: 125,
    giveaways: [{
      id: 'giveaway-1',
      title: 'Knife semanal',
      participantCount: 125,
      depositRequired: 10,
      depositCurrency: 'USD',
      externalUrl: 'https://keydrop.com/es/giveaways/user/giveaway-1?code=ERUBY',
    }],
    ...overrides,
  };
}

describe('informe diario KeyDrop para Discord', () => {
  it('muestra el dato por sorteo y aclara que el total no son usuarios únicos', () => {
    const [payload] = buildKeydropDiscordPayloads([report()], new Date('2026-09-04T07:15:00.000Z'));
    expect(payload?.embeds[0]?.description).toContain('125 depositantes');
    expect(payload?.embeds[0]?.footer.text).toContain('no son usuarios únicos');
    expect(payload?.allowed_mentions.parse).toEqual([]);
  });

  it('no genera menciones de Discord con texto procedente del provider', () => {
    const [payload] = buildKeydropDiscordPayloads([
      report({ displayName: '@everyone', giveaways: [{ ...report().giveaways[0]!, title: '@here *premio*' }] }),
    ], new Date('2026-09-04T07:15:00.000Z'));
    expect(payload?.embeds[0]?.title).toContain('@\u200beveryone');
    expect(payload?.embeds[0]?.description).toContain('@\u200bhere \\*premio\\*');
  });

  it('divide los creadores en mensajes con margen bajo el límite total de Discord', () => {
    const reports = Array.from({ length: 11 }, (_, index) => report({ slug: `creator-${index}` }));
    const payloads = buildKeydropDiscordPayloads(reports, new Date('2026-09-04T07:15:00.000Z'));
    expect(payloads).toHaveLength(4);
    expect(payloads[0]?.embeds).toHaveLength(3);
    expect(payloads[3]?.embeds).toHaveLength(2);
    expect(JSON.stringify(payloads[0]).length).toBeLessThan(6_000);
  });

  it('recorta el detalle de sorteos antes del límite de descripción de Discord', () => {
    const giveaways = Array.from({ length: 20 }, (_, index) => ({
      ...report().giveaways[0]!,
      id: `giveaway-${index}`,
      title: `${'Premio '.repeat(30)}${index}`,
    }));
    const [payload] = buildKeydropDiscordPayloads([
      report({ activeGiveawayCount: giveaways.length, giveaways }),
    ], new Date('2026-09-04T07:15:00.000Z'));
    expect(payload?.embeds[0]?.description.length).toBeLessThanOrEqual(1_500);
    expect(payload?.embeds[0]?.description).toContain('sorteos más en el perfil');
  });
});

describe('integración del cron y del perfil público', () => {
  const route = read('src/app/api/cron/keydrop-daily-report/route.ts');
  const profile = read('src/app/talentos/[slug]/page.tsx');
  const profileGiveaways = read('src/features/giveaways/components/TalentGiveawaysContent.tsx');
  const envSource = read('src/lib/env.ts');
  const vercel = JSON.parse(read('vercel.json')) as { readonly crons: readonly { readonly path: string; readonly schedule: string }[] };
  const crontab = read('infra/crm/scheduler/crontab');

  it('protege el cron con CRON_SECRET antes de consultar o enviar', () => {
    expect(route).toMatch(/const authError = assertCronAuth\(request\);\s*if \(authError\) return authError;/);
  });

  it('programa el mismo informe diario en Vercel y VPS', () => {
    expect(vercel.crons).toContainEqual({ path: '/api/cron/keydrop-daily-report', schedule: '15 7 * * *' });
    expect(crontab).toMatch(/^15 7 \* \* \*.*\/api\/cron\/keydrop-daily-report/m);
  });

  it('mantiene el webhook server-only y restringido al endpoint oficial de Discord', () => {
    const clientBlock = /client:\s*\{[\s\S]*?\},/.exec(envSource)?.[0] ?? '';
    expect(envSource).toMatch(/KEYDROP_DAILY_DISCORD_WEBHOOK_URL:\s*z\.string\(\)\.url\(\)[\s\S]{0,100}\.startsWith\('https:\/\/discord\.com\/api\/webhooks\/'\)/);
    expect(clientBlock).not.toContain('KEYDROP_DAILY_DISCORD_WEBHOOK_URL');
  });

  it('reutiliza externalGiveaways en /talentos/[slug] y pinta participantCount', () => {
    expect(profile).toMatch(/getExternalGiveawaysForCreator\(talent\.slug\)/);
    expect(profile).toMatch(/<TalentGiveawaysContent/);
    expect(profileGiveaways).toMatch(/giveaway\.participantCount\.toLocaleString\('es-ES'\)/);
    expect(profileGiveaways).toMatch(/PartnerExternalNotice/);
  });
});
