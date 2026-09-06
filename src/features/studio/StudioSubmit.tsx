'use client';
import { useStudioWorkspace } from './StudioWorkspaceContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitStudioProject } from '@/app/studio/actions';
export function StudioSubmit({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const workspace = useStudioWorkspace();
  const router = useRouter();
  return (
    <div>
      <button
        className="studio-secondary"
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setError('');
            try {
              const result = await submitStudioProject({ id, revision }, workspace);
              if (!result.ok) setError(result.error);
              else router.refresh();
            } catch {
              setError('No se pudo enviar a revisión.');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? 'Enviando…' : 'Pedir revisión del guion'}
      </button>
      <p role="alert" className="studio-error">
        {error}
      </p>
    </div>
  );
}
