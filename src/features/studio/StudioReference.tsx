import Link from "next/link";
import { StudioMedia, type StudioMediaAsset } from "./StudioMedia";
import type { StudioProfileDocument } from "@/lib/schemas/studio-profile";

export function StudioReference({
  profile,
  assets,
}: {
  profile: StudioProfileDocument;
  assets: StudioMediaAsset[];
}) {
  // Only use assets returned by the current user's scoped repository.
  const video = assets.find(
    (asset) => asset.id === profile.approvedVideoAssetId,
  );
  return (
    <section className="studio-reference">
      <div className="studio-reference-copy">
        <p className="studio-eyebrow">REFERENCIA APROBADA / MATERIAL PRIVADO</p>
        <h2 className="studio-reference-title">
          Tu identidad.
          <br />
          <em>Tu siguiente vídeo.</em>
        </h2>
        <p>
          {profile.displayName} · {profile.role}
        </p>
        <p>
          Esta es la pieza que aprobaste. La conservamos como referencia, sin
          volver a generar tu cara ni tu voz.
        </p>
        <div className="studio-reference-links">
          <Link className="studio-button" href="/studio/ideas">
            Preparar la siguiente pieza →
          </Link>
          <Link className="studio-secondary" href="/studio/identity">
            Ver mi identidad y permisos
          </Link>
        </div>
        <div className="studio-reference-status">
          <strong>Tu flujo de trabajo</strong>
          <p>
            Biblioteca privada, ayudas editoriales, escenas, montaje, revisión
            y calendario. Empieza por una de las piezas de Ideas y guiones.
          </p>
          <strong>Conexiones y costes, a la vista</strong>
          <p>
            El modo IA necesita proveedor. Las nuevas voces, avatares y métricas
            dependen de sus conexiones: consulta el estado real en Herramientas y costes.
          </p>
        </div>
      </div>
      {video ? (
        <StudioMedia asset={video} />
      ) : (
        <p>No hay un máster disponible en tu biblioteca.</p>
      )}
    </section>
  );
}
