import Link from 'next/link';
import { requireAnyRole } from '@/lib/auth-guard';
import { createPostAction } from '../actions';
import { PostForm } from '../PostForm';

export default async function NewNoticiaPage() {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/noticias" className="text-sp-admin-muted hover:text-sp-admin-text transition-colors text-sm">
          ← Noticias
        </Link>
        <span className="text-sp-admin-border">/</span>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Nueva noticia</h1>
      </div>

      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6">
        <PostForm action={createPostAction} submitLabel="Crear noticia" />
      </div>
    </div>
  );
}
