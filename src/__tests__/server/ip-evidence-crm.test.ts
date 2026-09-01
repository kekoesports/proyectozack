import fs from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Expediente IP del CRM', () => {
  it('está integrado dentro de Zack y no como navegación principal adicional', () => {
    const assistantPage = source('src/app/admin/(dashboard)/asistente/page.tsx');
    const nav = source('src/lib/admin-nav.ts');
    expect(assistantPage).toContain('href="/admin/asistente/ip"');
    expect(nav).not.toContain("key: 'ip-evidence'");
  });

  it('protege lectura y escritura con permisos específicos', () => {
    const page = source('src/app/admin/(dashboard)/asistente/ip/page.tsx');
    const actions = source('src/app/admin/(dashboard)/asistente/ip/actions.ts');
    expect(page).toContain("requirePermission('ip_evidence', 'read')");
    expect(actions).toContain("requirePermission('ip_evidence', 'write')");
  });

  it('el ledger solo expone alta, deriva la clasificación y conserva snapshots', () => {
    const queries = source('src/lib/queries/ipEvidence.ts');
    expect(queries).toContain('provisionalAssessmentForCategory');
    expect(queries).toContain('ownerEntitySnapshot: project.ownerEntity');
    expect(queries).toContain('payingEntitySnapshot: project.payingEntity');
    expect(queries).toContain("createHash('sha256')");
    expect(queries).not.toMatch(/export async function (update|delete)IpWorkLog/);
    const migration = source('drizzle/0140_ip_evidence_ledger.sql');
    expect(migration).toContain('ip_work_logs_append_only');
    expect(migration).toContain('BEFORE UPDATE OR DELETE');
  });

  it('no permite cargar hoy una sociedad chipriota inexistente', () => {
    const schema = source('src/db/schema/ipEvidence.ts');
    expect(schema).toContain("'elevatex_agency_pa_sl'");
    expect(schema).toContain("'playmaker_media_llc'");
    expect(schema).toContain("'founder_personal'");
    expect(schema).not.toMatch(/['"]cyprus[^'"]*['"]/i);
    const page = source('src/app/admin/(dashboard)/asistente/ip/page.tsx');
    expect(page).toContain('Por determinar / revisión legal');
  });

  it('crea un baseline prudente sin horas ni titularidad inventadas', () => {
    const migration = source('drizzle/0142_outgoing_blindfold.sql');
    expect(migration).toContain("'SP-PRE-001'");
    expect(migration).toContain("'SocialPro CRM — baseline PRE-CYPRUS'");
    expect(migration).toMatch(/'SP-PRE-001'[\s\S]*NULL,[\s\r\n\t]+NULL,[\s\r\n\t]+false/);
    expect(migration).not.toMatch(/INSERT INTO "ip_work_logs"/);
  });

  it('mantiene la evidencia automática separada del libro de horas', () => {
    const schema = source('src/db/schema/ipEvidence.ts');
    const service = source('src/lib/services/ipEvidenceGithubSync.ts');
    const migration = source('drizzle/0142_outgoing_blindfold.sql');
    expect(schema).toContain("'ip_evidence_events'");
    expect(schema).toContain("evidenceEventId: integer('evidence_event_id')");
    expect(service).toContain('onConflictDoNothing');
    expect(service).not.toMatch(/minutes|provisionalAssessment/);
    expect(migration).toContain('ip_evidence_events_append_only');
  });

  it('programa la sincronización en Vercel y en el scheduler del VPS', () => {
    const vercel = source('vercel.json');
    const vps = source('infra/crm/scheduler/crontab');
    const route = source('src/app/api/cron/sync-ip-evidence/route.ts');
    expect(vercel).toContain('"path": "/api/cron/sync-ip-evidence"');
    expect(vps).toContain('/api/cron/sync-ip-evidence');
    expect(route).toContain('assertCronAuth(request)');
  });
});
