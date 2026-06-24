import Image from 'next/image';
import { CategoryThumbnail } from './CategoryThumbnail';
import type { BlogCategory } from '@/lib/utils/blog';

type Variant = 'card' | 'featured' | 'hero';

type Props = {
  readonly coverUrl: string | null;
  readonly category: BlogCategory;
  readonly slug: string;
  readonly title: string;
  readonly brand?: string;
  readonly variant?: Variant;
  readonly priority?: boolean;
  readonly sizes?: string;
};

/**
 * BlogCover — sistema editorial unificado para covers del blog.
 *
 * Tres niveles de imagen:
 *  1. coverUrl real → <Image> con overlay cinematográfico
 *  2. fallback editorial → CategoryThumbnail con paleta premium por categoría
 *  3. (futuro) coverUrl generado por IA — misma interfaz, solo se actualiza la BD
 *
 * Variants:
 *  - card     → grid del listado (4:3, overlay denso, optimizado para escaneo)
 *  - featured → card destacada (anchura mayor, overlay desde la izquierda)
 *  - hero     → portada del post individual (sin recorte, overlay a fondo)
 *
 * @kind server  (Image y CategoryThumbnail son SSR-compatibles)
 */
export function BlogCover({
  coverUrl,
  category,
  slug,
  title,
  brand,
  variant = 'card',
  priority = false,
  sizes,
}: Props) {
  const overlayClass =
    variant === 'hero'
      ? 'bg-gradient-to-t from-sp-black/95 via-sp-black/30 to-transparent'
      : variant === 'featured'
      ? 'bg-gradient-to-r from-sp-black/85 via-sp-black/20 to-transparent'
      : 'bg-gradient-to-t from-black/[0.94] via-black/45 to-black/10';

  const defaultSizes =
    variant === 'hero'
      ? '100vw'
      : variant === 'featured'
      ? '(max-width: 768px) 100vw, 40vw'
      : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  return (
    <>
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={title}
          fill
          priority={priority}
          sizes={sizes ?? defaultSizes}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <CategoryThumbnail
          category={category}
          slug={slug}
          title={title}
          variant={variant}
          {...(brand ? { brand } : {})}
        />
      )}
      <div className={`absolute inset-0 ${overlayClass}`} aria-hidden />
    </>
  );
}
