// permissions.ts arrastra auth-guard → better-auth (ESM sin transformar en jest).
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { reviewDraftSchema } from '@/lib/schemas/automationDealDraftReview';
import {
  DRAFT_STATUSES,
  isActionable,
  isDraftStatus,
  shortDateTime,
  sourceMeta,
  statusMeta,
  topLevelMissing,
} from '@/features/admin/automation-drafts/components/draftMeta';
import { ADMIN_NAV_CATALOGUE, canAccessNavItem } from '@/lib/admin-nav';

describe('reviewDraftSchema', () => {
  it('acepta un id entero positivo', () => {
    expect(reviewDraftSchema.safeParse({ id: 7 }).success).toBe(true);
  });

  it('rechaza ids no positivos, decimales o ausentes', () => {
    expect(reviewDraftSchema.safeParse({ id: 0 }).success).toBe(false);
    expect(reviewDraftSchema.safeParse({ id: -3 }).success).toBe(false);
    expect(reviewDraftSchema.safeParse({ id: 1.5 }).success).toBe(false);
    expect(reviewDraftSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza un id que llega como string desde un form', () => {
    expect(reviewDraftSchema.safeParse({ id: '7' }).success).toBe(false);
  });
});

describe('draftMeta — estados', () => {
  it('cubre los cuatro estados que escribe la capa de queries', () => {
    expect([...DRAFT_STATUSES]).toEqual([
      'missing_info',
      'pending_review',
      'created',
      'rejected',
    ]);
  });

  it('traduce cada estado conocido a etiqueta y color', () => {
    for (const s of DRAFT_STATUSES) {
      expect(statusMeta(s).label.length).toBeGreaterThan(0);
      expect(statusMeta(s).color).toContain('border-');
    }
  });

  it('degrada con elegancia ante un estado desconocido', () => {
    // `status` es varchar en DB, no enum: un valor nuevo no debe romper la tabla.
    const meta = statusMeta('estado_futuro');
    expect(meta.label).toBe('estado_futuro');
    expect(meta.color).toContain('border-');
  });

  it('isDraftStatus discrimina correctamente', () => {
    expect(isDraftStatus('pending_review')).toBe(true);
    expect(isDraftStatus('estado_futuro')).toBe(false);
  });
});

describe('draftMeta — isActionable', () => {
  it('sólo permite actuar sobre borradores sin resolver', () => {
    expect(isActionable('pending_review')).toBe(true);
    expect(isActionable('missing_info')).toBe(true);
  });

  it('bloquea los ya resueltos', () => {
    expect(isActionable('created')).toBe(false);
    expect(isActionable('rejected')).toBe(false);
  });
});

describe('draftMeta — topLevelMissing', () => {
  it('reduce rutas Zod anidadas a su campo de primer nivel', () => {
    expect(topLevelMissing(['talent.handle', 'talent.platform', 'name'])).toEqual([
      'talent',
      'name',
    ]);
  });

  it('deduplica entradas repetidas', () => {
    expect(topLevelMissing(['deliverables.0.type', 'deliverables.1.type'])).toEqual([
      'deliverables',
    ]);
  });

  it('devuelve lista vacía cuando no falta nada', () => {
    expect(topLevelMissing([])).toEqual([]);
  });
});

describe('draftMeta — formato de fechas', () => {
  it('formatea fecha y hora', () => {
    expect(shortDateTime(new Date('2026-08-20T09:30:00.000Z'))).toBe('2026-08-20 09:30');
  });

  it('acepta string ISO', () => {
    expect(shortDateTime('2026-08-20T09:30:00.000Z')).toBe('2026-08-20 09:30');
  });

  it('devuelve guion ante null o fecha inválida', () => {
    expect(shortDateTime(null)).toBe('—');
    expect(shortDateTime('no-es-fecha')).toBe('—');
  });
});

describe('draftMeta — origen', () => {
  it('etiqueta los orígenes conocidos', () => {
    expect(sourceMeta('discord').label).toBe('Discord');
    expect(sourceMeta('api').label).toBe('API');
  });

  it('usa el valor crudo si el origen es desconocido', () => {
    expect(sourceMeta('telegram').label).toBe('telegram');
  });
});

describe('RBAC de borradores', () => {
  // Los borradores se gobiernan con el módulo 'campanas': aprobar uno crea un trato.
  it('quien puede leer tratos puede ver borradores', () => {
    expect(hasPermission('staff', 'campanas', 'read')).toBe(true);
    expect(hasPermission('manager', 'campanas', 'read')).toBe(true);
  });

  it('analyst no puede aprobar ni rechazar', () => {
    expect(hasPermission('analyst', 'campanas', 'write')).toBe(false);
  });

  it('el módulo campanas define read y write', () => {
    expect(PERMISSIONS.campanas.read.length).toBeGreaterThan(0);
    expect(PERMISSIONS.campanas.write.length).toBeGreaterThan(0);
  });
});

describe('entrada de navegación', () => {
  const item = ADMIN_NAV_CATALOGUE.find((i) => i.key === 'automation-drafts');

  it('está registrada y apunta a la ruta correcta', () => {
    expect(item).toBeDefined();
    expect(item?.href).toBe('/admin/automation-drafts');
    expect(item?.module).toBe('campanas');
  });

  it('se muestra a quien puede leer tratos y se oculta a quien no', () => {
    expect(item && canAccessNavItem('staff', item)).toBe(true);
    expect(item && canAccessNavItem('editor', item)).toBe(false);
    expect(item && canAccessNavItem(null, item)).toBe(false);
  });
});
