import { redirect } from 'next/navigation';

/**
 * Legacy redirect: `/sorteos/plataforma/perfil` → `/sorteos/perfil`.
 * Mantiene enlaces externos e internos (UserPill) que aún apunten al
 * path antiguo hasta que se actualicen todos.
 */
export default function LegacyPerfilRedirect() {
  redirect('/sorteos/perfil');
}
