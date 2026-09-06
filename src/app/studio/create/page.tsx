import { requireCreator } from '@/lib/studio/access';
import { StudioShell } from '@/features/studio/StudioShell';
import { StudioProjectEditor } from '@/features/studio/StudioProjectEditor';
export default async function CreatePage() {
  const { member } = await requireCreator();
  return (
    <StudioShell name={member.name} active="/studio/create">
      <p className="studio-eyebrow">CONTENT STUDIO</p>
      <h1 className="studio-page-title">Dale forma a tu idea.</h1>
      <p className="studio-lead">
        Empieza por lo que quieres contar. El formato viene después.
      </p>
      <StudioProjectEditor />
    </StudioShell>
  );
}
