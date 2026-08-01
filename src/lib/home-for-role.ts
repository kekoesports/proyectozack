/**
 * Pure post-auth home paths by role.
 * Safe to import from client components (no server-only deps).
 * Keep in sync with page.tsx routes under src/app/admin/**.
 */

export type HomeRole =
  | 'admin'
  | 'manager'
  | 'staff'
  | 'brand'
  | 'editor'
  | 'finance'
  | 'analyst'
  | 'ops'
  | 'talent_manager'
  | 'admin_limited_tasks';

/**
 * Safe post-auth home for each role. Paths must exist under `src/app/admin/**`
 * (or brand portal). Broken paths send users to 404 after a permission bounce.
 */
export function homeForRole(role: HomeRole | string | null | undefined): string | null {
  if (role === 'admin')                return '/admin';
  if (role === 'manager')              return '/admin';
  if (role === 'admin_limited_tasks')  return '/admin';
  if (role === 'staff')                return '/admin/mi-semana';
  if (role === 'brand')                return '/marcas';
  if (role === 'editor')               return '/admin/noticias';
  if (role === 'finance')              return '/admin/facturacion';
  if (role === 'analyst')              return '/admin/analytics';
  if (role === 'ops')                  return '/admin/tareas';
  if (role === 'talent_manager')       return '/admin/talents';
  return null;
}
