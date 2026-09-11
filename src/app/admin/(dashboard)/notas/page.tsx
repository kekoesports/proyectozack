import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/permissions';
import { env } from '@/lib/env';
import { NotesWorkspace } from '@/features/admin/quick-notes/NotesWorkspace';
export default async function NotesPage() {
  const session = await requirePermission('tareas', 'write');
  if (!env.QUICK_NOTES_ENABLED) notFound();
  return <NotesWorkspace userId={session.user.id} role={session.user.role} />;
}
