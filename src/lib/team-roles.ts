/**
 * Roles que representan miembros internos del equipo.
 * Importable sin arrastrar dependencias de auth o env — seguro en tests unitarios.
 */
export const ASSIGNABLE_TEAM_ROLES = ['admin', 'admin_limited_tasks', 'manager', 'staff'] as const;

export function isAssignableTeamUser(role: string | null | undefined): boolean {
  return (ASSIGNABLE_TEAM_ROLES as readonly string[]).includes(role ?? '');
}
