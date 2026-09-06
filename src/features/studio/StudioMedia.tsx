import Image from 'next/image';
import type { InferSelectModel } from 'drizzle-orm';
import type { studioAssets } from '@/db/schema/studio';

export type StudioMediaAsset = Pick<
  InferSelectModel<typeof studioAssets>,
  'id' | 'name' | 'contentType' | 'size'
>;

export function StudioMedia({ asset }: { asset: StudioMediaAsset }) {
  const src = `/api/studio/assets/${asset.id}`;
  return (
    <figure className="studio-media">
      {asset.contentType === 'video/mp4' ? (
        <video
          controls
          playsInline
          preload="metadata"
          aria-label={asset.name}
          src={src}
        />
      ) : asset.contentType.startsWith('image/') ? (
        <Image
          unoptimized
          src={src}
          alt={asset.name}
          width={720}
          height={960}
        />
      ) : (
        <audio controls preload="metadata" aria-label={asset.name} src={src} />
      )}
      <figcaption>
        <strong>{asset.name}</strong>
        <a href={`${src}?download=1`} download={asset.name}>
          Descargar · {(asset.size / 1024 / 1024).toFixed(1)} MB
        </a>
      </figcaption>
    </figure>
  );
}
