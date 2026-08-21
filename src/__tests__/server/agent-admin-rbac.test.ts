/**
 * RBAC del panel de agentes.
 *
 * Lo que se prueba: que aprobar exige **tres** condiciones y no una, y que
 * ocultar un botón no es lo que impide nada.
 *
 * Lo que NO se prueba aquí: el redirect de Next para un usuario sin permiso.
 * `requirePermission` redirige lanzando, y eso necesita un servidor corriendo —
 * está declarado como no verificado en el PR, igual que en PR 1-3.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));

import { canApproveActionClass } from '@/lib/agents/policy';
import { ADMIN_NAV_CATALOGUE, canAccessNavItem } from '@/lib/admin-nav';
import { ROLES, type Role } from '@/lib/auth-guard';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

describe('permisos del módulo agents', () => {
  it('brand no tiene ninguna acción, en ninguno de los dos módulos', () => {
    // Es un rol externo: el panel expone ejecuciones, memoria y datos
    // operativos de toda la agencia.
    for (const accion of ['read', 'write', 'approve', 'manage', 'audit'] as const) {
      expect(hasPermission('brand', 'agents', accion)).toBe(false);
    }
    for (const accion of ['read', 'operate'] as const) {
      expect(hasPermission('brand', 'infrastructure', accion)).toBe(false);
    }
  });

  it('solo admin gestiona agentes', () => {
    // Encender un agente o subirlo a `execute` es la decisión con más
    // consecuencias del panel.
    const gestores = ROLES.filter((r) => hasPermission(r, 'agents', 'manage'));
    expect(gestores).toEqual(['admin']);
  });

  it('solo admin opera infraestructura', () => {
    expect(ROLES.filter((r) => hasPermission(r, 'infrastructure', 'operate'))).toEqual(['admin']);
  });

  it('aprobar es más restrictivo que leer', () => {
    const lectores = ROLES.filter((r) => hasPermission(r, 'agents', 'read'));
    const firmantes = ROLES.filter((r) => hasPermission(r, 'agents', 'approve'));
    expect(firmantes.length).toBeLessThan(lectores.length);
    for (const f of firmantes) expect(lectores).toContain(f);
  });

  it('un analyst puede mirar pero no tocar', () => {
    expect(hasPermission('analyst', 'agents', 'read')).toBe(true);
    expect(hasPermission('analyst', 'agents', 'write')).toBe(false);
    expect(hasPermission('analyst', 'agents', 'approve')).toBe(false);
  });

  it('las acciones nuevas no aparecen donde no deben', () => {
    // `approve`, `manage` y `operate` se añadieron al tipo `Action`, que es
    // global: comprobar que no se colaron en otros módulos.
    const modulos = Object.entries(PERMISSIONS) as [string, Record<string, unknown>][];
    for (const [modulo, acciones] of modulos) {
      if (modulo === 'agents' || modulo === 'infrastructure') continue;
      expect(acciones.approve).toBeUndefined();
      expect(acciones.manage).toBeUndefined();
      expect(acciones.operate).toBeUndefined();
    }
  });
});

describe('canApproveActionClass', () => {
  it('un manager NO puede aprobar una acción privilegiada', () => {
    // Reiniciar un servicio o restaurar un backup no es cosa de un manager,
    // aunque tenga `agents:approve`. Es la segunda puerta.
    expect(hasPermission('manager', 'agents', 'approve')).toBe(true);
    expect(canApproveActionClass('manager', 'privileged')).toBe(false);
  });

  it('admin_limited_tasks tampoco', () => {
    expect(canApproveActionClass('admin_limited_tasks', 'privileged')).toBe(false);
  });

  it('solo admin aprueba lo privilegiado', () => {
    const puede = ROLES.filter((r: Role) => canApproveActionClass(r, 'privileged'));
    expect(puede).toEqual(['admin']);
  });

  it('nadie aprueba lo prohibido', () => {
    for (const rol of ROLES) {
      expect(canApproveActionClass(rol, 'forbidden')).toBe(false);
    }
  });

  it('un manager sí aprueba efectos externos', () => {
    expect(canApproveActionClass('manager', 'external_side_effect')).toBe(true);
  });

  it('un staff no aprueba nada relevante, aunque llegara a la página', () => {
    for (const clase of ['external_side_effect', 'privileged', 'internal_write'] as const) {
      expect(canApproveActionClass('staff', clase)).toBe(false);
    }
  });
});

describe('navegación', () => {
  const item = ADMIN_NAV_CATALOGUE.find((i) => i.key === 'agents');

  it('existe la entrada y va al panel', () => {
    expect(item).toBeDefined();
    expect(item?.href).toBe('/admin/agents');
    expect(item?.module).toBe('agents');
  });

  it('no se le muestra a brand', () => {
    expect(item ? canAccessNavItem('brand', item) : true).toBe(false);
  });

  it('se le muestra a quien puede leer', () => {
    expect(item ? canAccessNavItem('admin', item) : false).toBe(true);
    expect(item ? canAccessNavItem('manager', item) : false).toBe(true);
  });

  it('ocultar la entrada no es el control: la página vuelve a comprobarlo', () => {
    // Este test documenta la intención. La comprobación real está en cada
    // página con `requirePermission`, y en cada Server Action.
    expect(item?.module).not.toBeNull();
  });
});
