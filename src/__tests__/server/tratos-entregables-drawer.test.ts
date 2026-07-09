/**
 * Tests estáticos del drawer/formulario de Tratos tras PR
 * `tratos-entregables-editables`.
 *
 * Cubre:
 *   1. El drawer NO renderiza inputs con name briefingUrl/contentUrl/
 *      estimatedCostAgency/estimatedMarginPct (ocultos, columnas DB conservadas).
 *   2. SummaryCard NO renderiza los links briefingUrl/contentUrl.
 *   3. El drawer incluye el nuevo bloque DeliverablesEditor.
 *   4. DeliverablesEditor tiene botón "Generar plantilla" disabled con tooltip.
 *   5. DeliverablesEditor serializa a un hidden input `deliverables_json`.
 *   6. Ningún archivo del feature llama a Google APIs.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

const DRAWER_PARTS = path.join(ROOT, 'src/features/admin/campaigns/components/CampaignDrawer.parts.tsx');
const SUMMARY_CARD = path.join(ROOT, 'src/features/admin/campaigns/components/CampaignSummaryCard.tsx');
const EDITOR       = path.join(ROOT, 'src/features/admin/campaigns/components/DeliverablesEditor.tsx');
const ACTIONS      = path.join(ROOT, 'src/app/admin/(dashboard)/campanas/actions.ts');
const SYNC         = path.join(ROOT, 'src/lib/queries/campaign-deliverables-sync.ts');

function read(p: string): string {
  return fs.readFileSync(p, 'utf-8');
}

describe('drawer sin campos ocultos', () => {
  const src = read(DRAWER_PARTS);

  it('NO renderiza input name="briefingUrl"', () => {
    expect(src).not.toMatch(/name=["']briefingUrl["']/);
  });

  it('NO renderiza input name="contentUrl"', () => {
    expect(src).not.toMatch(/name=["']contentUrl["']/);
  });

  it('NO renderiza input name="estimatedCostAgency"', () => {
    expect(src).not.toMatch(/name=["']estimatedCostAgency["']/);
  });

  it('NO renderiza input name="estimatedMarginPct"', () => {
    expect(src).not.toMatch(/name=["']estimatedMarginPct["']/);
  });

  it('NO renderiza label "Estimaciones internas" ni "URL briefing" ni "URL contenido"', () => {
    // El label del bloque "Estimaciones internas" se retiró junto con los inputs.
    // Puede aparecer en comentarios explicando por qué se ocultó; buscamos texto
    // renderizable (dentro de un JSX text node o de un label).
    expect(src).not.toMatch(/>[^<]*Estimaciones internas[^<]*</);
    expect(src).not.toMatch(/label="URL briefing"/);
    expect(src).not.toMatch(/label="URL contenido"/);
  });

  it('SÍ incluye <DeliverablesEditor', () => {
    expect(src).toMatch(/<DeliverablesEditor\s/);
  });
});

describe('SummaryCard sin links de briefing/contenido', () => {
  const src = read(SUMMARY_CARD);

  it('NO renderiza label "Briefing" ni link "Ver briefing"', () => {
    expect(src).not.toMatch(/label="Briefing"/);
    expect(src).not.toMatch(/Ver briefing/);
  });

  it('NO renderiza label "Contenido" ni link "Ver contenido"', () => {
    expect(src).not.toMatch(/label="Contenido"/);
    expect(src).not.toMatch(/Ver contenido/);
  });

  it('NO renderiza campaign.briefingUrl ni campaign.contentUrl en JSX', () => {
    // Los accesos siguen existiendo en queries; aquí verificamos que no se
    // renderiza contenido en el componente.
    expect(src).not.toMatch(/href=\{campaign\.briefingUrl/);
    expect(src).not.toMatch(/href=\{campaign\.contentUrl/);
  });
});

describe('DeliverablesEditor', () => {
  const src = read(EDITOR);

  it('renderiza el hidden input name="deliverables_json"', () => {
    expect(src).toMatch(/name=["']deliverables_json["']/);
  });

  it('permite añadir filas (botón "Añadir entregable")', () => {
    expect(src).toMatch(/Añadir entregable/);
  });

  it('permite eliminar filas (botón "Quitar")', () => {
    expect(src).toMatch(/aria-label=["']Eliminar entregable["']/);
  });

  it('el botón "Generar plantilla de seguimiento" está disabled con tooltip', () => {
    expect(src).toMatch(/Generar plantilla de seguimiento/);
    // Debe estar disabled y tener un title explicativo.
    expect(src).toMatch(/disabled/);
    expect(src).toMatch(/Próximamente[\s\S]{0,60}PR2/);
  });

  it('NO llama a Google APIs ni menciona GOOGLE_SHEETS/drive/oauth', () => {
    expect(src).not.toMatch(/GOOGLE_SHEETS_API_KEY/);
    expect(src).not.toMatch(/google\.sheets/i);
    expect(src).not.toMatch(/oauth/i);
    expect(src).not.toMatch(/drive\.google/i);
    expect(src).not.toMatch(/spreadsheets\.google/i);
  });

  it('usa el enum de tipos existente (importa de @/lib/schemas/deliverable)', () => {
    expect(src).toMatch(/from\s+['"]@\/lib\/schemas\/deliverable['"]/);
    expect(src).toMatch(/DELIVERABLE_TYPES/);
    expect(src).toMatch(/DELIVERABLE_TYPE_LABELS/);
  });
});

describe('Server action integra deliverables_json', () => {
  const src = read(ACTIONS);

  it('importa parseDeliverablesJson', () => {
    expect(src).toMatch(/parseDeliverablesJson/);
  });

  it('importa syncCampaignDeliverables', () => {
    expect(src).toMatch(/syncCampaignDeliverables/);
  });

  it('createCampaignAction sincroniza trackers cuando llegan filas', () => {
    // Buscamos la llamada dentro de la función create.
    const createBlock = src.match(/createCampaignAction[\s\S]+?^\}/m)?.[0] ?? '';
    expect(createBlock).toMatch(/parseDeliverablesJson\(formData\.get\('deliverables_json'\)\)/);
    expect(createBlock).toMatch(/syncCampaignDeliverables\(campaign\.id/);
  });

  it('updateCampaignAction sincroniza trackers cuando llegan filas', () => {
    const updateBlock = src.match(/updateCampaignAction[\s\S]+?^\}/m)?.[0] ?? '';
    expect(updateBlock).toMatch(/parseDeliverablesJson\(formData\.get\('deliverables_json'\)\)/);
    expect(updateBlock).toMatch(/syncCampaignDeliverables\(id/);
  });
});

describe('sync util — soft-delete y sin borrado destructivo', () => {
  const src = read(SYNC);

  it('marca como cancelled los trackers que ya no aparecen (soft-delete)', () => {
    expect(src).toMatch(/status:\s*['"]cancelled['"]/);
  });

  it('NO ejecuta db.delete', () => {
    expect(src).not.toMatch(/\bdb\.delete\s*\(/);
  });

  it('trackingSourceType siempre "manual" al insertar desde el drawer', () => {
    expect(src).toMatch(/trackingSourceType:\s*['"]manual['"]/);
  });
});

describe('no hay llamadas a Google APIs en el feature', () => {
  const files = [DRAWER_PARTS, EDITOR, ACTIONS, SYNC];
  it('ninguno importa @/lib/integrations/google-sheets o drive-auth', () => {
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/integrations\/google-sheets/);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/backup\/drive-auth/);
    }
  });
});
