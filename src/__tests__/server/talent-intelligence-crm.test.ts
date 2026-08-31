import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (file: string): string => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('inteligencia de talentos', () => {
  const migration = read('drizzle/0139_talent_intelligence.sql');
  const page = read('src/app/admin/(dashboard)/talents/page.tsx');
  const cron = read('src/app/api/cron/snapshot-metrics/route.ts');
  const query = read('src/lib/queries/talentIntelligence.ts');
  const dashboard = read('src/features/admin/talents/components/TalentIntelligenceDashboard.tsx');

  it('crea snapshots de canal, rendimiento de contenido y recupera el histórico existente', () => {
    expect(migration).toMatch(/CREATE TABLE "talent_channel_snapshots"/);
    expect(migration).toMatch(/CREATE TABLE "talent_content_performance"/);
    expect(migration).toMatch(/FROM "talent_metric_snapshots" history/);
    expect(migration).toMatch(/ON CONFLICT \("social_id", "snapshot_date"\) DO NOTHING/);
  });

  it('sustituye la importación de talentos por Estadísticas', () => {
    expect(page).toMatch(/label:\s+'Estadísticas'/);
    expect(page).toMatch(/TalentIntelligenceDashboard/);
    expect(page).not.toMatch(/label:\s+'Importar Excel\/CSV'/);
    expect(page).not.toMatch(/TalentDataTools/);
  });

  it('sincroniza canales y contenido desde fuentes oficiales con cron autenticado', () => {
    expect(cron).toMatch(/assertCronAuth\(req\)/);
    expect(cron).toMatch(/getChannelRecentContent/);
    expect(cron).toMatch(/upsertTalentChannelSnapshot/);
    expect(cron).toMatch(/upsertTalentContentPerformance/);
    expect(cron).toMatch(/maxDuration = 300/);
    expect(cron).toMatch(/Promise\.allSettled/);
  });

  it('calcula contenido y meses por canal, no mezclando redes del mismo talento', () => {
    expect(query).toMatch(/selectDistinctOn\(\[talentContentPerformance\.socialId\]/);
    expect(query).toMatch(/coalesce\(sum\(/);
    expect(query).toMatch(/inArray\(talentContentPerformance\.talentId, talentIds\)/);
    expect(query).toMatch(/bestViewsMonth/);
  });

  it('separa los rankings por red y ofrece 30, 60, 90 y 120 días', () => {
    expect(dashboard).toMatch(/TALENT_GROWTH_PERIODS/);
    expect(dashboard).toMatch(/Filtrar estadísticas por red social/);
    expect(dashboard).toMatch(/Ranking por canal/);
    expect(dashboard).toMatch(/Fuera del ranking/);
  });
});

describe('creadores target legibles', () => {
  const row = read('src/features/admin/targets/components/TargetsSpreadsheet.row.tsx');
  const nextConfig = read('next.config.ts');

  it('permite el CDN real de avatares YouTube y mantiene fallback de plataforma', () => {
    expect(nextConfig).toMatch(/hostname: 'yt3\.ggpht\.com'/);
    expect(row).toMatch(/onError=\{\(\) => setImageFailed\(true\)\}/);
    expect(row).toMatch(/platformMonogram/);
  });

  it('muestra nombre humano y no presenta 0\/100 como auditoría real', () => {
    expect(row).toMatch(/displayName = target\.fullName/);
    expect(row).toMatch(/Pendiente de auditoría/);
    expect(row).toMatch(/hasQualification = target\.fitScore > 0/);
  });
});

describe('Zack Operaciones como centro de mando', () => {
  const route = read('src/app/api/admin/ai-assistant/dispatch/route.ts');
  const chat = read('src/features/admin/ai-assistant/components/ChatClient.tsx');
  const tools = read('src/lib/services/ai-assistant/tools/index.ts');

  it('protege el despacho con RBAC, pertenencia del hilo e idempotencia', () => {
    expect(route).toMatch(/requirePermission\('agents', 'write'/);
    expect(route).toMatch(/getThread\(threadId, session\.user\.id\)/);
    expect(route).toMatch(/idempotencyKey: `zack-chat:/);
    expect(route).toMatch(/triggerType: 'chat'/);
  });

  it('exige revisar y confirmar y ofrece los cuatro comandos operativos', () => {
    for (const command of ['/crm', '/tratos', '/growth', '/seo']) expect(chat).toContain(command);
    expect(chat).toMatch(/Revisar orden/);
    expect(chat).toMatch(/Confirmar y ejecutar/);
    expect(chat).toMatch(/acciones externas seguirán requiriendo aprobación humana/i);
  });

  it('puede consultar rendimiento real de talentos', () => {
    expect(tools).toContain('getTalentPerformanceSummary');
  });
});
