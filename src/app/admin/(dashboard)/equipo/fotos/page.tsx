import { db } from '@/lib/db';
import { teamMembers } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { UploadForm } from '@/features/admin/equipo/components/UploadForm';

export const metadata = { title: 'Equipo | Admin' };

export default async function EquipoAdminPage() {
  const members = await db.select().from(teamMembers).orderBy(asc(teamMembers.sortOrder));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black uppercase text-sp-dark">Fotos del Equipo</h1>
        <p className="text-sm text-sp-muted mt-1">
          Sube o actualiza las fotos del equipo. Se muestran en la sección &ldquo;Nosotros&rdquo; de la web.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {members.map((m) => (
          <UploadForm
            key={m.id}
            member={{
              id: m.id,
              name: m.name,
              role: m.role,
              photoUrl: m.photoUrl ?? null,
              initials: m.initials,
              gradientC1: m.gradientC1,
              gradientC2: m.gradientC2,
            }}
          />
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-sp-border bg-sp-off p-5 text-sm text-sp-muted">
        <p className="font-semibold text-sp-dark mb-1">Instrucciones</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Formatos aceptados: JPG, PNG, WebP</li>
          <li>Tamaño máximo: 5 MB por foto</li>
          <li>Dimensiones recomendadas: 400×400 px (cuadrada)</li>
          <li>La foto se actualiza automáticamente en la web al guardar</li>
        </ul>
      </div>
    </div>
  );
}
