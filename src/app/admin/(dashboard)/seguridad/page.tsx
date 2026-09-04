import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { requireAnyRole } from '@/lib/auth-guard';
import { TwoFactorSetup } from './TwoFactorSetup';

export const metadata = { title: 'Seguridad' };

const CRM_ROLES = [
  'admin',
  'admin_limited_tasks',
  'manager',
  'staff',
  'editor',
  'finance',
  'analyst',
  'ops',
  'talent_manager',
] as const;

type SearchParams = {
  readonly required?: string;
  readonly reason?: string;
};

export default async function SecurityPage(props: {
  readonly searchParams: Promise<SearchParams>;
}): Promise<React.ReactElement> {
  await requireAnyRole(CRM_ROLES, '/admin/login');
  const currentSession = await auth.api.getSession({ headers: await headers() });
  if (!currentSession) redirect('/admin/login');

  const searchParams = await props.searchParams;
  const bankAccessRequired = searchParams.required === 'bancos';
  const freshLoginRequired = searchParams.reason === 'fresh_login_required';
  const twoFactorEnabled =
    (currentSession.user as { twoFactorEnabled?: boolean }).twoFactorEnabled === true;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Seguridad de la cuenta</h1>
        <p className="text-sm text-sp-admin-muted mt-1">
          Protege el CRM y los datos financieros con un segundo factor independiente de tu contraseña.
        </p>
      </div>

      {bankAccessRequired && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          {freshLoginRequired
            ? 'Para modificar datos bancarios necesitas una sesión reciente. Cierra sesión, vuelve a entrar y completa el segundo factor.'
            : 'El módulo bancario permanece bloqueado hasta que actives la verificación en dos pasos.'}
        </div>
      )}

      <TwoFactorSetup
        email={currentSession.user.email}
        initiallyEnabled={twoFactorEnabled}
      />

      <div className="rounded-xl border border-sp-border bg-sp-admin-card p-5">
        <h2 className="font-semibold">Protección financiera aplicada</h2>
        <ul className="mt-3 space-y-2 text-sm text-sp-admin-muted">
          <li>• El acceso a extractos y conciliación exige 2FA.</li>
          <li>• Importar, aprobar o modificar exige además haber iniciado sesión hace menos de una hora.</li>
          <li>• Los números de cuenta se almacenan enmascarados y no existe conexión bancaria automática activa.</li>
        </ul>
      </div>
    </div>
  );
}
