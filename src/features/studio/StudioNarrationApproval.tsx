'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { authorizeStudioNarration } from '@/app/admin/(dashboard)/studio/actions';
export function StudioNarrationApproval({ id, creditsMilli }: { id: string; creditsMilli: number }) {
  const [pending, startTransition] = useTransition(); const [message, setMessage] = useState(''); const router = useRouter();
  return <div><p>Este botón autoriza una única narración con el texto mostrado y consume saldo de Higgsfield. No compra créditos ni cambia el plan. Cotización válida durante 15 minutos.</p>
    <button className="studio-btn" disabled={pending} onClick={() => startTransition(async () => {
      try { const result = await authorizeStudioNarration({ id, creditsMilli }); setMessage(result.ok ? 'Una generación autorizada. No repitas la solicitud.' : result.error); router.refresh(); }
      catch { setMessage('No se confirmó. Actualiza antes de repetir.'); }
    })}>Autorizar {creditsMilli / 1000} créditos · una narración</button><p role="status">{message}</p></div>;
}
