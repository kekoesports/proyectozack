'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Check, MessageCircle, Sparkles } from 'lucide-react';
import { sendStudioMessage, applyStudioProposal } from '@/app/studio/production-actions';
import { StudioAssistantProposal } from '@/lib/schemas/studio-production';
import type { createProductionRepository } from '@/lib/studio/production-repository';

type Turn = Awaited<ReturnType<ReturnType<typeof createProductionRepository>['turns']>>[number];
export function StudioChat({ projectId, revision, turns, aiReady }: {
  projectId: string; revision: number; turns: Omit<Turn, 'createdAt'>[]; aiReady: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'editorial' | 'ai'>('editorial');
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const send = (text: string) => {
    if (pending || text.trim().length < 3) return;
    setNotice('');
    startTransition(async () => {
      try {
        const result = await sendStudioMessage({ id: crypto.randomUUID(), projectId, revision, prompt: text, mode });
        if (!result.ok) setNotice(result.error); else setPrompt('');
        router.refresh();
      } catch { setNotice('No se pudo confirmar. Actualiza el historial antes de repetir.'); }
    });
  };
  return <aside className="studio-chat" aria-label="Asistente de contenido">
    <header><span className="studio-icon-tile"><Sparkles size={20} /></span><div><h2>Tu mesa creativa</h2><p>Contexto SocialPro · historial por pieza</p></div></header>
    <div className="studio-chat-mode"><button aria-pressed={mode === 'editorial'} onClick={() => setMode('editorial')}>Editorial · sin créditos</button>
      <button aria-pressed={mode === 'ai'} disabled={!aiReady} onClick={() => setMode('ai')}>Chat IA{!aiReady && ' · sin conectar'}</button></div>
    <p className="studio-chat-disclosure">{mode === 'ai' ? 'Redacción con IA. Cada envío usa el proveedor de texto; nunca activa vídeo ni publicación.' : 'Ayudas editoriales basadas en reglas. No es una conversación con un modelo de IA.'}</p>
    <div className="studio-chat-history" aria-live="polite">
      {!turns.length && <div className="studio-chat-welcome"><MessageCircle size={28} /><h3>Empecemos por una buena idea.</h3><p>Trabaja el gancho, el ritmo y el montaje antes de generar nuevos clips.</p></div>}
      {turns.toReversed().map((turn) => {
        const parsed = StudioAssistantProposal.safeParse(turn.proposal);
        const proposal = parsed.success ? parsed.data : null;
        return <article className="studio-chat-turn" key={turn.id}>
          <p className="studio-chat-user">{turn.prompt}</p>
          <div className="studio-chat-answer"><small>{turn.engine === 'editorial-rules-v1' ? 'AYUDA EDITORIAL' : 'PROPUESTA IA'} · GUION V{turn.projectRevision + 1}</small>
            <p>{turn.response ?? 'Solicitud guardada. Actualiza para comprobar si ha terminado; no la reenvíes.'}</p>
            {proposal?.script && <pre>{proposal.script}</pre>}
            {proposal?.cta && <blockquote>{proposal.cta}</blockquote>}
            {!!proposal?.checks.length && <details><summary>Controles antes de producir</summary><ul>{proposal.checks.map((c) => <li key={c}>{c}</li>)}</ul></details>}
            {proposal && (proposal.script !== null || proposal.cta !== null) && <button className="studio-btn secondary" disabled={pending || revision !== turn.projectRevision} onClick={() => startTransition(async () => {
              try { const result = await applyStudioProposal(projectId, turn.id); setNotice(result.ok ? 'Propuesta aplicada en una nueva versión.' : result.error); router.refresh(); }
              catch { setNotice('No se pudo aplicar. Tu guion guardado sigue disponible.'); }
            })}><Check size={15} />{revision === turn.projectRevision ? 'Aplicar propuesta al guion' : 'Propuesta de otra versión'}</button>}
          </div>
        </article>;
      })}
    </div>
    <div className="studio-chat-suggestions">{['Revisa la duración', 'Organiza las escenas', 'Propón un cierre'].map((text) => <button key={text} disabled={pending} onClick={() => send(text)}>{text}</button>)}</div>
    <form className="studio-chat-compose" onSubmit={(e) => { e.preventDefault(); send(prompt); }}>
      <label className="sr-only" htmlFor="studio-chat-message">Mensaje al asistente</label>
      <textarea id="studio-chat-message" placeholder={mode === 'ai' ? 'Quiero un Reel educativo sobre…' : 'Revisa el ritmo o ayúdame con las escenas…'} value={prompt} maxLength={2000} onChange={(e) => setPrompt(e.target.value)} rows={3} />
      <button type="submit" disabled={pending || prompt.trim().length < 3} aria-label="Enviar mensaje"><ArrowUp size={20} /></button>
    </form>
    <p role="status" className="studio-muted">{pending ? 'Guardando respuesta…' : notice || 'Nada se aplica ni publica sin que lo revises.'}</p>
  </aside>;
}
