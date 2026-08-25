/**
 * Regression locks — CRM admin QA sprint 2 (2026-08-10):
 * talents visibility/IDOR, R05 permission nav, R08 task mutations.
 */
// better-auth ships pure ESM; mock before module graph loads it
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  hasPermission,
  PERMISSIONS,
} from '@/lib/permissions';
import {
  canAccessNavItem,
  navForRole,
  quickActionsForRole,
  ADMIN_NAV_CATALOGUE,
} from '@/lib/admin-nav';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('sprint2 — hasPermission + nav R05', () => {
  it('finance sees facturacion but not talentos nav', () => {
    const { primary, more } = navForRole('finance');
    const hrefs = [...primary, ...more].map((i) => i.href);
    expect(hrefs).toContain('/admin/facturacion');
    expect(hrefs).toContain('/admin/finanzas/resumen');
    expect(hrefs).not.toContain('/admin/talents');
    expect(hrefs).not.toContain('/admin/tareas');
  });

  it('editor sees noticias but not facturacion', () => {
    const { primary, more } = navForRole('editor');
    const hrefs = [...primary, ...more].map((i) => i.href);
    expect(hrefs).toContain('/admin/noticias');
    expect(hrefs).not.toContain('/admin/facturacion');
    expect(hrefs).not.toContain('/admin/finanzas/resumen');
  });

  it('analyst sees analytics but not tratos', () => {
    const { primary, more } = navForRole('analyst');
    const hrefs = [...primary, ...more].map((i) => i.href);
    expect(hrefs).toContain('/admin/analytics');
    expect(hrefs).not.toContain('/admin/campanas');
    expect(hrefs).not.toContain('/admin/facturacion');
  });

  it('staff gets mi-semana first and no facturacion', () => {
    const { primary, more } = navForRole('staff');
    expect(primary[0]?.href).toBe('/admin/mi-semana');
    const hrefs = [...primary, ...more].map((i) => i.href);
    expect(hrefs).not.toContain('/admin/facturacion');
    expect(hrefs).not.toContain('/admin');
    expect(hrefs).toContain('/admin/brands');
    expect(hrefs).toContain('/admin/campanas');
  });

  it('admin keeps only daily work in primary navigation', () => {
    const { primary, more } = navForRole('admin');
    expect(primary.map((i) => i.href)).toEqual([
      '/admin',
      '/admin/campanas',
      '/admin/tareas',
      '/admin/talents',
      '/admin/finanzas/resumen',
    ]);
    expect(more.map((i) => i.href)).toEqual(expect.arrayContaining([
      '/admin/brands',
      '/admin/automation-drafts',
      '/admin/leads',
      '/admin/facturacion',
      '/admin/equipo',
    ]));
  });

  it('quick actions hide facturacion for staff', () => {
    const staff = quickActionsForRole('staff').map((a) => a.href);
    expect(staff).not.toContain('/admin/facturacion');
    expect(staff).toContain('/admin/tareas');
    expect(quickActionsForRole('finance').map((a) => a.href)).toContain('/admin/facturacion');
  });

  it('canAccessNavItem respects module map for every catalogue entry', () => {
    for (const item of ADMIN_NAV_CATALOGUE) {
      if (item.roles) {
        expect(canAccessNavItem(item.roles[0], item)).toBe(true);
        expect(canAccessNavItem('brand' as never, item)).toBe(false);
      } else if (item.module) {
        const allowed = PERMISSIONS[item.module].read ?? [];
        if (allowed[0]) expect(canAccessNavItem(allowed[0], item)).toBe(true);
        // brand role never in CRM modules
        expect(canAccessNavItem('brand' as never, item)).toBe(false);
      }
    }
  });

  it('layout uses navForRole not binary staff/admin arrays', () => {
    const src = read('src/app/admin/(dashboard)/layout.tsx');
    expect(src).toMatch(/navForRole/);
    expect(src).not.toMatch(/ADMIN_PRIMARY_NAV|STAFF_PRIMARY_NAV/);
  });
});

describe('sprint2 — tareas R08', () => {
  it('staff has tareas:write (own-task mutations)', () => {
    expect(hasPermission('staff', 'tareas', 'write')).toBe(true);
    expect(hasPermission('staff', 'tareas', 'delete')).toBe(false);
    expect(hasPermission('manager', 'tareas', 'delete')).toBe(true);
  });

  it('task mutations gate on write/delete not read', () => {
    const src = read('src/app/admin/(dashboard)/tareas/actions.ts');
    expect(src).toMatch(/createTaskAction[\s\S]*?requirePermission\(['"]tareas['"],\s*['"]write['"]\)/);
    expect(src).toMatch(/completeTaskAction[\s\S]*?requirePermission\(['"]tareas['"],\s*['"]write['"]\)/);
    expect(src).toMatch(/deleteTaskAction[\s\S]*?requirePermission\(['"]tareas['"],\s*['"]delete['"]\)/);
    // no mutation still on read
    expect(src).not.toMatch(/requirePermission\(['"]tareas['"],\s*['"]read['"]\)/);
  });

  it('template definitions restricted to manager+ops+admin', () => {
    const src = read('src/app/admin/(dashboard)/tareas/actions.ts');
    expect(src).toMatch(/TEMPLATE_MANAGER_ROLES/);
    expect(src).toMatch(/saveTemplateDefinitionAction[\s\S]*?requireAnyRole\(TEMPLATE_MANAGER_ROLES/);
    expect(src).toMatch(/deleteTemplateDefinitionAction[\s\S]*?requirePermission\(['"]tareas['"],\s*['"]delete['"]\)/);
  });

  it('plantillas CRUD path also gates create/update to TEMPLATE_MANAGER_ROLES', () => {
    const actions = read('src/app/admin/(dashboard)/tareas/plantillas/actions.ts');
    expect(actions).toMatch(/TEMPLATE_MANAGER_ROLES/);
    expect(actions).toMatch(/createTaskTemplateAction[\s\S]*?requireAnyRole\(TEMPLATE_MANAGER_ROLES/);
    expect(actions).toMatch(/updateTaskTemplateAction[\s\S]*?requireAnyRole\(TEMPLATE_MANAGER_ROLES/);
    expect(actions).not.toMatch(/createTaskTemplateAction[\s\S]{0,200}requirePermission\(['"]tareas['"],\s*['"]write['"]\)/);
    const page = read('src/app/admin/(dashboard)/tareas/plantillas/page.tsx');
    expect(page).toMatch(/requireAnyRole\(TEMPLATE_MANAGER_ROLES/);
  });

  it('staff/editor/tm cannot create tasks for other owners', () => {
    const src = read('src/app/admin/(dashboard)/tareas/actions.ts');
    expect(src).toMatch(/canAssignTasksToOthers/);
    expect(src).toMatch(/Solo puedes crear tareas propias/);
  });

  it('pages do not call rollOverPendingTasks on GET', () => {
    expect(read('src/app/admin/(dashboard)/tareas/page.tsx')).not.toMatch(/rollOverPendingTasks/);
    expect(read('src/app/admin/(dashboard)/mi-semana/page.tsx')).not.toMatch(/rollOverPendingTasks/);
    expect(read('src/app/api/cron/rollover-tasks/route.ts')).toMatch(/rollOverPendingTasks/);
  });
});

describe('sprint2 — talents visibility + IDOR', () => {
  it('exports assertCanAccessTalent and listVisibleTalentIds', () => {
    const src = read('src/lib/queries/talents.ts');
    expect(src).toMatch(/export async function listVisibleTalentIds/);
    expect(src).toMatch(/export async function assertCanAccessTalent/);
  });

  it('roster and fotos filter by visible talent ids', () => {
    expect(read('src/app/admin/(dashboard)/talents/page.tsx')).toMatch(/listVisibleTalentIds/);
    expect(read('src/app/admin/(dashboard)/talents/fotos/page.tsx')).toMatch(/listVisibleTalentIds/);
  });

  it('edit/seo/negocio/detail use assertCanAccessTalent', () => {
    for (const rel of [
      'src/app/admin/(dashboard)/talents/[id]/page.tsx',
      'src/app/admin/(dashboard)/talents/[id]/edit/page.tsx',
      'src/app/admin/(dashboard)/talents/[id]/seo/page.tsx',
      'src/app/admin/(dashboard)/talents/[id]/negocio/page.tsx',
    ]) {
      expect(read(rel)).toMatch(/assertCanAccessTalent/);
    }
  });

  it('upsertTalentSocials scopes updates by talentId + SocialPlatformSchema', () => {
    const src = read('src/app/admin/(dashboard)/talents/actions.ts');
    expect(src).toMatch(/SocialPlatformSchema\.safeParse/);
    expect(src).toMatch(/eq\(talentSocials\.talentId,\s*talentId\)/);
    expect(src).toMatch(/updateTalentStatsAction[\s\S]*eq\(talentStats\.talentId,\s*talentId\)/);
    expect(src).toMatch(/removeTalentTagAction[\s\S]*eq\(talentTags\.talentId,\s*talentId\)/);
  });

  it('assertCanEditCampaign uses canSeeAll', () => {
    const src = read('src/lib/queries/campaigns.ts');
    expect(src).toMatch(/assertCanEditCampaign[\s\S]*canSeeAll\(session\.role\)/);
  });

  it('global search scopes talents for staff', () => {
    const src = read('src/lib/queries/search.ts');
    expect(src).toMatch(/isStaff\(session\.role\)[\s\S]*campaigns\.talentId|talentId[\s\S]*isStaff/);
    expect(src).toMatch(/responsibleUserId/);
  });
});
