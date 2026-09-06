import { requireCreator } from "@/lib/studio/access";
import { StudioShell } from "@/features/studio/StudioShell";
import { StudioAssetUpload } from "@/features/studio/StudioAssetUpload";
import { StudioMedia } from "@/features/studio/StudioMedia";
export default async function LibraryPage() {
  const { member, repository } = await requireCreator();
  const assets = await repository.assets();
  return (
    <StudioShell name={member.name} active="/studio/library">
      <p className="studio-eyebrow">TUS RECURSOS</p>
      <h1 className="studio-page-title">Todo empieza aquí.</h1>
      <p className="studio-lead">
        Clips, fotos y audio que puedes usar. Privados y bajo tu control.
      </p>
      <StudioAssetUpload />
      <div className="studio-media-grid">
        {assets.length ? (
          assets.map((asset) => <StudioMedia key={asset.id} asset={asset} />)
        ) : (
          <p>Aún no has añadido materiales.</p>
        )}
      </div>
    </StudioShell>
  );
}
