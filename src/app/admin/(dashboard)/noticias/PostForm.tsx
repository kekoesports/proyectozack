'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

type Post = {
  id?: number;
  slug?: string;
  title?: string;
  excerpt?: string;
  bodyMd?: string;
  author?: string;
  status?: 'draft' | 'published';
  vertical?: 'blog' | 'news';
  coverUrl?: string | null;
  ogImageUrl?: string | null;
  publishedAt?: Date | null;
  sortOrder?: number;
  tags?: string[];
  talentSlugs?: string[] | null;
};

type Props = {
  post?: Post;
  action: (formData: FormData) => Promise<{ ok: false; error: string; fieldErrors?: Record<string, string[]> } | { ok: true }>;
  submitLabel: string;
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

function formatDatetimeLocal(date: Date | null | undefined) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostForm({ post, action, submitLabel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState('');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [title, setTitle] = useState(post?.title ?? '');
  const [preview, setPreview] = useState(false);
  const [body, setBody] = useState(post?.bodyMd ?? '');

  function handleTitleBlur() {
    if (!post?.id && slug === '') setSlug(slugify(title));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGlobalError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setGlobalError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    });
  }

  const fieldError = (name: string) =>
    errors[name]?.length ? (
      <p className="text-xs text-red-400 mt-1">{errors[name][0]}</p>
    ) : null;

  const inputCls = (name: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm bg-sp-admin-bg text-sp-admin-text outline-none transition-colors focus:border-sp-orange/60 ${
      errors[name] ? 'border-red-500/60' : 'border-sp-admin-border'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {post?.id && <input type="hidden" name="id" value={post.id} />}

      {globalError && (
        <div className="rounded-lg bg-red-900/20 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {globalError}
        </div>
      )}

      {/* Título + slug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">Título *</label>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className={inputCls('title')}
            placeholder="Título de la noticia"
            required
          />
          {fieldError('title')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">Slug *</label>
          <input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            className={`${inputCls('slug')} font-mono text-xs`}
            placeholder="mi-noticia-slug"
            required
          />
          {fieldError('slug')}
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">Excerpt *</label>
        <textarea
          name="excerpt"
          defaultValue={post?.excerpt ?? ''}
          rows={2}
          className={inputCls('excerpt')}
          placeholder="Resumen corto de la noticia (máx. 500 caracteres)"
          required
        />
        {fieldError('excerpt')}
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Body (Markdown) *</label>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="text-xs text-sp-admin-accent hover:underline"
          >
            {preview ? 'Editar' : 'Preview'}
          </button>
        </div>
        {preview ? (
          <div className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-4 py-3 min-h-[300px] prose prose-invert prose-sm max-w-none overflow-auto">
            <pre className="whitespace-pre-wrap text-xs text-sp-admin-muted">{body || '(vacío)'}</pre>
          </div>
        ) : (
          <textarea
            name="bodyMd"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            className={`${inputCls('bodyMd')} font-mono text-xs resize-y`}
            placeholder="# Título&#10;&#10;Escribe aquí el cuerpo en Markdown..."
            required
          />
        )}
        {!preview && <input type="hidden" name="bodyMd" value={body} />}
        {fieldError('bodyMd')}
      </div>

      {/* Cover + OG image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">Cover URL</label>
          <input
            name="coverUrl"
            type="url"
            defaultValue={post?.coverUrl ?? ''}
            className={inputCls('coverUrl')}
            placeholder="https://..."
          />
          {fieldError('coverUrl')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">OG Image URL</label>
          <input
            name="ogImageUrl"
            type="url"
            defaultValue={post?.ogImageUrl ?? ''}
            className={inputCls('ogImageUrl')}
            placeholder="https://... (1200×630 recomendado)"
          />
          {fieldError('ogImageUrl')}
        </div>
      </div>

      {/* Status + publicación + sortOrder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">Estado *</label>
          <select name="status" defaultValue={post?.status ?? 'draft'} className={inputCls('status')}>
            <option value="draft">Borrador</option>
            <option value="published">Publicada</option>
          </select>
          {fieldError('status')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">
            Fecha publicación
            <span className="ml-1 font-normal text-sp-admin-muted/60">(futura = programada)</span>
          </label>
          <input
            name="publishedAt"
            type="datetime-local"
            defaultValue={formatDatetimeLocal(post?.publishedAt)}
            className={inputCls('publishedAt')}
          />
          {fieldError('publishedAt')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">Orden (sortOrder)</label>
          <input
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={post?.sortOrder ?? 0}
            className={inputCls('sortOrder')}
          />
          {fieldError('sortOrder')}
        </div>
      </div>

      {/* Autor + vertical */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">Autor</label>
          <input
            name="author"
            defaultValue={post?.author ?? 'SocialPro'}
            className={inputCls('author')}
            placeholder="SocialPro"
          />
          {fieldError('author')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">Vertical</label>
          <select name="vertical" defaultValue={post?.vertical ?? 'news'} className={inputCls('vertical')}>
            <option value="news">News</option>
            <option value="blog">Blog</option>
          </select>
          {fieldError('vertical')}
        </div>
      </div>

      {/* Tags + talentSlugs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">
            Tags <span className="font-normal text-sp-admin-muted/60">(separados por coma)</span>
          </label>
          <input
            name="tags"
            defaultValue={(post?.tags ?? []).join(', ')}
            className={inputCls('tags')}
            placeholder="cs2, competitivo, roster"
          />
          {fieldError('tags')}
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1.5">
            Talent slugs <span className="font-normal text-sp-admin-muted/60">(separados por coma)</span>
          </label>
          <input
            name="talentSlugs"
            defaultValue={(post?.talentSlugs ?? []).join(', ')}
            className={inputCls('talentSlugs')}
            placeholder="naow, furia"
          />
          {fieldError('talentSlugs')}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Guardando...' : submitLabel}
        </button>
        <Link href="/admin/noticias" className="text-sm text-sp-admin-muted hover:text-sp-admin-text transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
