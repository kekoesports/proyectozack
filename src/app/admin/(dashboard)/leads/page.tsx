import { requirePermission, hasPermission } from '@/lib/permissions';
import { listLeads } from '@/lib/queries/leads';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { LeadsTable } from '@/features/admin/leads/components/LeadsTable';

export const metadata = { title: 'Leads | Admin' };

export default async function AdminLeadsPage(): Promise<React.ReactElement> {
  const session = await requirePermission('leads', 'read');
  const canWrite = hasPermission(session.user.role, 'leads', 'write');

  // Server-first: se trae el listado completo y el cliente filtra en local.
  const [leads, staff] = await Promise.all([listLeads(), getAllStaffUsers()]);

  const nuevos = leads.filter((l) => l.status === 'nuevo').length;
  const sinAsignar = leads.filter((l) => l.assignedToId === null).length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Leads"
        subtitle="Entradas del formulario público de contacto"
        stats={[
          { label: 'total', value: leads.length },
          { label: 'nuevos', value: nuevos, accent: '#5b9bd5' },
          { label: 'sin asignar', value: sinAsignar, accent: '#f5632a' },
        ]}
      />
      <LeadsTable
        leads={leads}
        staff={staff.map((s) => ({ id: s.id, name: s.name }))}
        currentUserId={session.user.id}
        canWrite={canWrite}
      />
    </div>
  );
}
