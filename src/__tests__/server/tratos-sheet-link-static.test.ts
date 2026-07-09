/**
 * Tests estáticos PR2 — tratos sheet link tracking.
 *
 * Cubre:
 *   - UI en drawer: input trackingSheetUrl, botón Abrir plantilla, botón Sincronizar.
 *   - Botón "Generar plantilla de seguimiento" (stub PR1) reemplazado o quitado.
 *   - Progreso X/Y siempre visible por fila con id (currentCount / targetCount).
 *   - Constante de plantilla maestra existe con URL correcta.
 *   - Server action `syncCampaignSheetAction` requiere `campanas.write`.
 *   - Action nunca throws (siempre devuelve `{ ok, ... }`).
 *   - Sin imports de OAuth, Service Account, googleapis, drive, xlsx.
 *   - No hay cron nuevo para tracking sheet.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

// ── Plantilla maestra constante ────────────────────────────────────────

describe('TRACKING_TEMPLATE_URL — constante TypeScript', () => {
  const src = read('src/lib/constants/tracking-template.ts');

  it('exporta constante', () => {
    expect(src).toMatch(/export const TRACKING_TEMPLATE_URL/);
  });

  it('URL correcta (plantilla Jolu - KD)', () => {
    expect(src).toContain('1TAT7kpcFBhb-MfED-P5QQ72Z7EyndCRMKNKAZ-Bd07k');
  });

  it('es Google Sheets URL', () => {
    expect(src).toMatch(/https:\/\/docs\.google\.com\/spreadsheets\//);
  });
});

// ── DeliverablesEditor: UI de seguimiento ──────────────────────────────

describe('DeliverablesEditor — sección Seguimiento (PR2)', () => {
  const REL = 'src/features/admin/campaigns/components/DeliverablesEditor.tsx';
  const src = read(REL);

  it('importa TRACKING_TEMPLATE_URL desde constants', () => {
    expect(src).toMatch(/from ['"]@\/lib\/constants\/tracking-template['"]/);
  });

  it('importa syncCampaignSheetAction', () => {
    expect(src).toMatch(/syncCampaignSheetAction/);
  });

  it('renderiza input name="trackingSheetUrl"', () => {
    expect(src).toMatch(/name="trackingSheetUrl"/);
  });

  it('placeholder del input es la URL de Google Sheets', () => {
    expect(src).toMatch(/https:\/\/docs\.google\.com\/spreadsheets\/d\/\.\.\./);
  });

  it('botón "Abrir plantilla de referencia" es un <a> con target=_blank', () => {
    expect(src).toMatch(/Abrir plantilla de referencia/);
    expect(src).toMatch(/target="_blank"/);
    expect(src).toMatch(/rel="noopener noreferrer"/);
    expect(src).toMatch(/href=\{TRACKING_TEMPLATE_URL\}/);
  });

  it('botón "Sincronizar ahora" existe con data-testid', () => {
    expect(src).toMatch(/Sincronizar ahora/);
    expect(src).toMatch(/data-testid="sync-now-btn"/);
  });

  it('botón sincronizar disabled si no hay campaignId', () => {
    // canSync depende de !!campaignId
    expect(src).toMatch(/canSync\s*=[\s\S]{0,150}campaignId/);
  });

  it('progreso X/Y visible por fila con id', () => {
    expect(src).toMatch(/Completados:/);
    expect(src).toMatch(/deliverable-progress/);
    // Usa currentCount + targetCount
    expect(src).toMatch(/currentCount/);
  });

  it('el input NO llama a Google API directamente desde el cliente', () => {
    expect(src).not.toMatch(/sheets\.googleapis\.com/);
    expect(src).not.toMatch(/fetch\(['"]https:\/\/sheets/);
  });

  it('YA NO renderiza el botón disabled de PR1 "Generar plantilla de seguimiento"', () => {
    // El botón PR1 disabled se sustituye por el nuevo botón "Sincronizar ahora" + link a plantilla.
    expect(src).not.toMatch(/data-testid="generate-sheet-template-btn"/);
  });
});

// ── Server action: permisos + retorno seguro ──────────────────────────

describe('syncCampaignSheetAction — permisos y contrato', () => {
  const REL = 'src/app/admin/(dashboard)/campanas/actions.ts';
  const src = read(REL);

  it('la action existe y es async', () => {
    expect(src).toMatch(/export async function syncCampaignSheetAction/);
  });

  it("requiere permiso 'campanas', 'write'", () => {
    // Debe aparecer requirePermission('campanas', 'write') en la action del sync
    const idx = src.indexOf('export async function syncCampaignSheetAction');
    expect(idx).toBeGreaterThan(-1);
    const actionBlock = src.substring(idx, idx + 2000);
    expect(actionBlock).toMatch(/requirePermission\(['"]campanas['"],\s*['"]write['"]\)/);
  });

  it('está envuelta en try/catch — nunca lanza', () => {
    const idx = src.indexOf('export async function syncCampaignSheetAction');
    const actionBlock = src.substring(idx, idx + 2000);
    expect(actionBlock).toMatch(/try\s*\{/);
    expect(actionBlock).toMatch(/catch\s*\(/);
    expect(actionBlock).toMatch(/return\s*\{\s*ok:\s*false/);
  });

  it('valida campaignId como entero positivo', () => {
    const idx = src.indexOf('export async function syncCampaignSheetAction');
    const actionBlock = src.substring(idx, idx + 2000);
    expect(actionBlock).toMatch(/Number\.isInteger\(campaignId\)/);
  });
});

// ── Query sync: comportamientos clave ─────────────────────────────────

describe('syncCampaignSheet — comportamientos brief PR2', () => {
  const REL = 'src/lib/queries/campaign-sheet-sync.ts';
  const src = read(REL);

  it('es server-only', () => {
    expect(src).toMatch(/['"]server-only['"]/);
  });

  it('NO crea trackers nuevos (no db.insert en el path del sync)', () => {
    // El sync solo UPDATE — jamás insert de dealDeliverableTrackers.
    const syncIdx = src.indexOf('export async function syncCampaignSheet');
    const block = src.substring(syncIdx, syncIdx + 5000);
    expect(block).not.toMatch(/db\.insert\(/);
  });

  it('mantiene currentCount de trackers sin bloque (notFoundTypes NO resetea)', () => {
    // Verificamos que solo hace UPDATE cuando hay match en countsByType,
    // no cuando NO hay match. La palabra "reset" no aparece.
    const syncIdx = src.indexOf('export async function syncCampaignSheet');
    const block = src.substring(syncIdx, syncIdx + 5000);
    // Los notFoundTypes solo se cuentan, no se actualizan
    expect(block).toMatch(/notFoundTypes/);
    // No hay UPDATE con currentCount=0
    expect(block).not.toMatch(/currentCount:\s*0/);
  });

  it('errores 403 devuelven mensaje humano-readable sobre compartir', () => {
    expect(src).toMatch(/cualquiera con el enlace/i);
  });

  it('errores 429 devuelven mensaje sobre rate limit', () => {
    expect(src).toMatch(/limitado el ritmo/i);
  });

  it('persiste tracking_sync_error en fallo (never throw)', () => {
    expect(src).toMatch(/trackingSyncError/);
    expect(src).toMatch(/persistError/);
  });

  it('limita el UPDATE a trackers del campaign — WHERE campaign_id', () => {
    expect(src).toMatch(/campaignId,\s*campaignId\)/);
  });

  it('solo sincroniza trackers no cancelled', () => {
    expect(src).toMatch(/ne\(dealDeliverableTrackers\.status,\s*['"]cancelled['"]\)/);
  });
});

// ── Regla dura: no OAuth / no Service Account / no cron / no XLSX ─────

describe('PR2 — sin OAuth, sin Service Account, sin XLSX, sin cron', () => {
  const files = [
    'src/features/admin/campaigns/components/DeliverablesEditor.tsx',
    'src/app/admin/(dashboard)/campanas/actions.ts',
    'src/lib/queries/campaign-sheet-sync.ts',
    'src/lib/constants/tracking-template.ts',
  ];

  it.each(files)('%s no importa googleapis / OAuth / drive / xlsx', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/from ['"]googleapis['"]/);
    expect(src).not.toMatch(/from ['"]@googleapis\//);
    expect(src).not.toMatch(/from ['"]google-auth-library['"]/);
    expect(src).not.toMatch(/from ['"]google-spreadsheet['"]/);
    expect(src).not.toMatch(/OAuth2Client/);
    expect(src).not.toMatch(/ServiceAccount/i);
    expect(src).not.toMatch(/service_account/i);
    expect(src).not.toMatch(/drive\.google\.com/i);
    expect(src).not.toMatch(/from ['"]xlsx['"]/);
    expect(src).not.toMatch(/from ['"]exceljs['"]/);
  });

  it('no se registra cron nuevo para sync automático', () => {
    // Los cron viven en src/app/api/cron/. Ninguno debería mencionar
    // campaign-sheet-sync o syncCampaignSheet.
    const cronDir = path.join(ROOT, 'src/app/api/cron');
    if (!fs.existsSync(cronDir)) return;
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) out.push(...walk(full));
        else out.push(full);
      }
      return out;
    }
    for (const file of walk(cronDir)) {
      const src = fs.readFileSync(file, 'utf-8');
      expect(src).not.toMatch(/syncCampaignSheet\b/);
      expect(src).not.toMatch(/campaign-sheet-sync/);
    }
  });
});
