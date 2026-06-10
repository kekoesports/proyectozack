'use client';

import { useState, useTransition } from 'react';

type Props = {
  talent: { id: number; name: string; slug: string; archivedAt: Date | null };
  activeCampaignCount: number;
  activeCodeCount: number;
  activeGiveawayCount: number;
  archiveAction: () => Promise<void>;
  restoreAction: () => Promise<void>;
};

export function ArchiveTalentDialog({
  talent,
  activeCampaignCount,
  activeCodeCount,
  activeGiveawayCount,
  archiveAction,
  restoreAction,
}: Props) {
  const [step, setStep] = useState<'idle' | 'step1' | 'step2'>('idle');
  const [confirmText, setConfirmText] = useState('');
  const [isPending, startTransition] = useTransition();

  const isArchived = Boolean(talent.archivedAt);
  const confirmTarget = talent.slug.toLowerCase();
  const canConfirm = confirmText.trim().toLowerCase() === confirmTarget;

  function handleArchive() {
    startTransition(async () => {
      await archiveAction();
      setStep('idle');
      setConfirmText('');
    });
  }

  function handleRestore() {
    startTransition(async () => {
      await restoreAction();
    });
  }

  if (isArchived) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400/70 mb-1">
          Talento archivado
        </p>
        <p className="text-sm text-white/50 mb-4">
          Este talento está archivado. No aparece en el sitio público ni en el roster del CRM.
        </p>
        <button
          onClick={handleRestore}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-sm font-bold transition-colors disabled:opacity-50"
        >
          {isPending ? 'Restaurando…' : 'Restaurar talento'}
        </button>
      </div>
    );
  }

  if (step === 'idle') {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400/70 mb-1">
          Zona de peligro
        </p>
        <p className="text-sm text-white/50 mb-4">
          Archivar un talento lo oculta del sitio público, del roster y de secciones live. Sus datos se conservan y puede restaurarse.
        </p>
        <button
          onClick={() => setStep('step1')}
          className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-colors"
        >
          Archivar talento…
        </button>
      </div>
    );
  }

  if (step === 'step1') {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 space-y-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400 mb-2">
            Confirmar archivo
          </p>
          <p className="text-sm text-white/70 mb-2">
            El talento <span className="font-bold text-white">{talent.name}</span> dejará de aparecer en:
          </p>
          <ul className="text-sm text-white/50 list-disc list-inside space-y-0.5 mb-3">
            <li>El sitio público (<code>/talentos/{talent.slug}</code> → 404)</li>
            <li>El roster de /talentos</li>
            <li>Las secciones live y fallback grid</li>
            <li>Los hubs de sorteos y códigos</li>
          </ul>
          {(activeCampaignCount > 0 || activeCodeCount > 0 || activeGiveawayCount > 0) && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-400 mb-1">
                Atención — actividad activa
              </p>
              <ul className="text-sm text-amber-300/70 space-y-0.5">
                {activeCampaignCount > 0 && <li>· {activeCampaignCount} campaña{activeCampaignCount !== 1 ? 's' : ''} activa{activeCampaignCount !== 1 ? 's' : ''}</li>}
                {activeCodeCount > 0 && <li>· {activeCodeCount} código{activeCodeCount !== 1 ? 's' : ''} activo{activeCodeCount !== 1 ? 's' : ''}</li>}
                {activeGiveawayCount > 0 && <li>· {activeGiveawayCount} sorteo{activeGiveawayCount !== 1 ? 's' : ''} activo{activeGiveawayCount !== 1 ? 's' : ''}</li>}
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStep('step2')}
            className="px-4 py-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-300 text-sm font-bold transition-colors"
          >
            Continuar →
          </button>
          <button
            onClick={() => setStep('idle')}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-5 space-y-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400 mb-2">
          Confirmación final
        </p>
        <p className="text-sm text-white/70 mb-3">
          Escribe el slug del talento para confirmar: <code className="text-red-300 bg-red-500/10 px-1 rounded">{talent.slug}</code>
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={talent.slug}
          autoFocus
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 focus:bg-white/10"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleArchive}
          disabled={!canConfirm || isPending}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Archivando…' : 'Archivar definitivamente'}
        </button>
        <button
          onClick={() => { setStep('idle'); setConfirmText(''); }}
          className="px-4 py-2 rounded-lg border border-white/10 text-white/40 text-sm hover:text-white/60 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
