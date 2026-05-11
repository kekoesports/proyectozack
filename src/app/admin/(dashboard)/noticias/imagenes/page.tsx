import { requireAnyRole } from '@/lib/auth-guard';
import { listNewsImages, type NewsImage } from '@/lib/news/images';
import { UploadForm } from './UploadForm';
import { ImageCard } from './ImageCard';

export const dynamic = 'force-dynamic';

export default async function NewsImagesPage(): Promise<React.ReactElement> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  let images: NewsImage[] = [];
  let listError: string | null = null;
  try {
    images = await listNewsImages();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    listError = msg.includes('private store')
      ? 'El Blob store actual es privado. Para subir covers públicas, crea un Blob store nuevo público en Vercel Dashboard → Storage → New Store → Public, y setea BLOB_READ_WRITE_TOKEN_NEWS con el token resultante.'
      : msg;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-xl font-bold text-sp-admin-text mb-1">Imágenes de noticias</h1>
        <p className="text-xs text-sp-admin-muted">
          Media library compartida para covers de <code className="text-sp-admin-accent">/news/&lt;slug&gt;</code>. Sube una vez, referencia desde cualquier noticia.
        </p>
      </header>

      <UploadForm />

      {listError && (
        <div className="text-xs px-4 py-3 rounded border border-amber-500/30 bg-amber-500/[0.05] text-amber-300">
          <p className="font-semibold mb-1">Storage no listo</p>
          <p>{listError}</p>
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-sp-admin-text">
            Subidas <span className="text-sp-admin-muted font-normal">({images.length})</span>
          </h2>
          {images.length > 0 && (
            <p className="text-[10px] text-sp-admin-muted">Click &ldquo;Copiar URL&rdquo; → pegar en script `insert-*.ts` o admin form</p>
          )}
        </div>

        {images.length === 0 && !listError ? (
          <div className="text-center py-12 border border-dashed border-sp-admin-border rounded-lg">
            <p className="text-sm text-sp-admin-muted">Sin imágenes todavía. Sube la primera arriba.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((img) => (
              <ImageCard key={img.pathname} image={img} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
