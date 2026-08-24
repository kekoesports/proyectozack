import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { IS_DEV } from '@/lib/auth-guard';
import { requirePermission, type Action } from '@/lib/permissions';
import {
  evaluateFinancialSecurity,
  type FinancialSecurityCode,
} from '@/lib/security/financial-security-policy';

export {
  evaluateFinancialSecurity,
  FINANCIAL_FRESH_SESSION_MS,
  type FinancialSecurityCode,
} from '@/lib/security/financial-security-policy';

export class FinancialSecurityError extends Error {
  constructor(readonly code: FinancialSecurityCode) {
    super(code);
    this.name = 'FinancialSecurityError';
  }
}

export async function requireFinancialSecurity(action: Action) {
  const permissionSession = await requirePermission('bancos', action);
  if (IS_DEV) return permissionSession;

  const currentSession = await auth.api.getSession({ headers: await headers() });
  if (!currentSession || currentSession.user.id !== permissionSession.user.id) {
    throw new FinancialSecurityError('fresh_login_required');
  }

  const code = evaluateFinancialSecurity({
    twoFactorEnabled: (currentSession.user as { twoFactorEnabled?: boolean }).twoFactorEnabled === true,
    action,
    sessionCreatedAt: new Date(currentSession.session.createdAt),
  });
  if (code) throw new FinancialSecurityError(code);

  return permissionSession;
}

export async function requireFinancialPageSecurity(action: Action) {
  try {
    return await requireFinancialSecurity(action);
  } catch (error) {
    if (error instanceof FinancialSecurityError) {
      redirect(`/admin/seguridad?required=bancos&reason=${error.code}`);
    }
    throw error;
  }
}

export function financialSecurityErrorMessage(error: unknown): string | null {
  if (!(error instanceof FinancialSecurityError)) return null;
  if (error.code === 'two_factor_required') {
    return 'Activa la verificación en dos pasos en Seguridad antes de acceder a datos bancarios.';
  }
  return 'Por seguridad, vuelve a iniciar sesión y completa el segundo factor antes de modificar datos bancarios.';
}
