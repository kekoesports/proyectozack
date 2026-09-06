'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewStudioExport } from '@/app/admin/(dashboard)/studio/actions';
export function StudioExportReview({ id }: { id: string }) {
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function review(decision: 'approved' | 'changes_requested') {
    startTransition(async () => {
      try { const result = await reviewStudioExport({ id, decision, comment }); setMessage(result.error); router.refresh(); }
      catch { setMessage('No se pudo guardar.'); }
    });
  }
  return <div><p>Revisa cara, voz, sincronía, textos, transiciones y derechos. Aprobar este MP4 no publica nada.</p>
    <label htmlFor={`review-${id}`}>Comentario de revisión</label><textarea id={`review-${id}`} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={3} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: 12 }} />
    <div className="studio-project-toolbar"><button className="studio-btn secondary" disabled={pending || comment.trim().length < 3} onClick={() => review('changes_requested')}>Solicitar cambios</button><button className="studio-btn" disabled={pending || comment.trim().length < 3} onClick={() => review('approved')}>Aprobar versión vista</button></div><p role="status">{message}</p>
  </div>;
}
