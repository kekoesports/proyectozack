import Link from 'next/link';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { requirePermission } from '@/lib/permissions';

export const metadata = { title: 'Configuración · Panel de gestión' };

const SETTINGS_AREAS = [
  {
    title: 'Integraciones y fuentes',
    description: 'Conexiones de seguimiento, hojas enlazadas y estado de sincronización.',
    href: '/admin/entregables/fuentes',
  },
  {
    title: 'Equipo y permisos',
    description: 'Miembros del workspace, roles y alcance de acceso.',
    href: '/admin/equipo',
  },
  {
    title: 'Seguridad de la cuenta',
    description: 'Doble factor y protección de los módulos sensibles.',
    href: '/admin/seguridad',
  },
  {
    title: 'Agentes y autonomía',
    description: 'Límites operativos, ejecución y controles de los agentes.',
    href: '/admin/agents/settings',
  },
  {
    title: 'Copias de seguridad',
    description: 'Estado de los respaldos y comprobaciones de recuperación.',
    href: '/admin/backups',
  },
  {
    title: 'Configuración financiera',
    description: 'Criterios contables, divisas y parámetros del área financiera.',
    href: '/admin/finanzas/configuracion',
  },
] as const;

export default async function ConfiguracionPage(): Promise<React.ReactElement> {
  await requirePermission('ajustes', 'read');

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Configuración"
        subtitle="Administración del workspace y sus controles operativos"
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_AREAS.map((area) => (
          <Link
            className="group rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 transition-colors hover:border-sp-admin-accent/60 hover:bg-sp-admin-hover"
            href={area.href}
            key={area.href}
          >
            <h2 className="text-sm font-bold text-sp-admin-text group-hover:text-sp-admin-accent">
              {area.title}
            </h2>
            <p className="mt-2 text-xs leading-5 text-sp-admin-muted">{area.description}</p>
            <span className="mt-4 inline-flex text-[11px] font-bold text-sp-admin-accent">
              Abrir configuración →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
