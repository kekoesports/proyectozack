'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { openStudioWorkspace } from '@/app/studio/workspace-actions';

export function StudioWorkspaceButton({ talentId, name }: { talentId: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    setBusy(true); setError('');
    try {
      const result = await openStudioWorkspace(talentId);
      if (!result.ok) { setError(result.error); return; }
      router.push('/studio'); router.refresh();
    } catch { setError('No se pudo abrir el espacio.'); }
    finally { setBusy(false); }
  }
  return <div><button className="studio-secondary" type="button" disabled={busy} aria-label={`Abrir Studio de ${name}`} onClick={() => { void open(); }}>
    {busy ? 'Abriendo…' : 'Abrir Studio'}</button>{error && <p role="alert" className="studio-error">{error}</p>}</div>;
}
