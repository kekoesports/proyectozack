'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { BlocksForm } from './BlocksForm';
import type { PostBlocks } from '@/features/news/components/article-blocks/types';

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
  blocksJson?: unknown;
};

type Props = {
  post?: Post;
  action: (formData: FormData) => Promise<{ ok: false; error: string; fieldErrors?: Record<string, string[]> } | { ok: true }>;
  submitLabel: string;
};

function isImageUrl(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(u.pathname);
  } catch { return false; }
}

function CoverUrlInput({ name, defaultValue, inputCls }: { name: string; defaultValue: string; inputCls: string }) {
  const [val, setVal] = useState(defaultValue);
  const warn = val.length > 10 && !isImageUrl(val);
  return (
    <div>
      <input name={name} type="url" value={val} onChange={e => setVal(e.target.value)} className={inputCls} placeholder="https://...imagen.webp" />
      {warn && (
        <p className="text-[10px] text-amber-500 mt-1">
          ⚠ La URL no parece una imagen (.jpg / .webp / .png). Usa la página &ldquo;Subir imagen&rdquo; para obtener una URL correcta.
        </p>
      )}
      {val && isImageUrl(val) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={val} alt="preview" className="mt-2 h-16 w-auto rounded object-cover border border-sp-admin-border" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
    </div>
  );
}

/**
 * Campo de publicación con tres estados:
 * 1. Ya publicada en el pasado → campo oculto con ISO, muestra fecha como solo lectura
 * 2. Programada en el futuro  → campo visible con aviso + botón "publicar ahora"
 * 3. Sin fecha                → campo vacío, al guardar = NOW()
 */
function PublishAtField({ post, inputCls, fieldError }: {
  readonly post: { publishedAt?: Date | null; status?: string } | undefined;
  readonly inputCls: string;
  readonly fieldError: React.ReactNode;
}) {
  const existing = post?.publishedAt ?? null;
  const isAlreadyPublished = !!(existing && new Date(existing) <= new Date());

  // If already published in the past: preserve exact ISO timestamp as hidden field,
  // show it read-only. This avoids the timezone round-trip bug entirely.
  if (isAlreadyPublished && existing) {
    // Don't send publishedAt at all — server preserves the existing date automatically
    return (
      <div>
        <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">
          Fecha publicación
        </label>
        <p className="text-sm text-sp-admin-muted px-3 py-2 rounded-lg border border-sp-admin-border bg-sp-admin-bg/50">
          ✅ Publicada el {new Date(existing).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    );
  }

  // Otherwise: show editable field (for scheduling or first-time publish)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Fecha publicación</label>
        <span className="text-[10px] text-sp-admin-muted/60">vacío = publicar ahora</span>
      </div>
      <PublishAtInput name="publishedAt" defaultValue={formatDatetimeLocal(existing)} inputCls={inputCls} />
      {fieldError}
    </div>
  );
}

function PublishAtInput({ name, defaultValue, inputCls }: { name: string; defaultValue: string; inputCls: string }) {
  const [val, setVal] = useState(defaultValue);
  const isScheduled = val && new Date(val) > new Date();
  return (
    <div>
      <input
        name={name}
        type="datetime-local"
        value={val}
        onChange={e => setVal(e.target.value)}
        className={inputCls}
      />
      {isScheduled && (
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-amber-500">⏱ Programada — aún no visible en la web</p>
          <button type="button" onClick={() => setVal('')}
            className="text-[10px] text-sp-admin-accent hover:underline font-semibold">
            Publicar ahora (borrar fecha)
          </button>
        </div>
      )}
    </div>
  );
}

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
        {fieldError('bodyMd')}
      </div>

      {/* Cover + OG image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Cover URL</label>
            <a href="/admin/noticias/imagenes" target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-sp-admin-accent hover:opacity-70 transition-opacity">
              Subir imagen ↗
            </a>
          </div>
          <CoverUrlInput name="coverUrl" defaultValue={post?.coverUrl ?? ''} inputCls={inputCls('coverUrl')} />
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
        <PublishAtField post={post ?? undefined} inputCls={inputCls('publishedAt')} fieldError={fieldError('publishedAt')} />
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

      {/* Bloques visuales */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Bloques visuales</p>
          <span className="text-[10px] text-sp-admin-muted/50">(Match, Quote, Embed, Roster — opcionales)</span>
        </div>
        <BlocksForm initial={post?.blocksJson as PostBlocks | null | undefined} />
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
        {/* Ver artículo en web — solo si tiene slug */}
        {slug && (
          <a
            href={`/news/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm text-sp-admin-accent hover:opacity-70 transition-opacity flex items-center gap-1"
          >
            Ver en /news ↗
          </a>
        )}
      </div>
    </form>
  );
}
