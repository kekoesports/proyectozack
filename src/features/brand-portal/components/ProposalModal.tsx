'use client';

import { useState, useEffect, useRef } from 'react';

type ProposalModalProps = {
  talentId: number;
  talentName: string;
  onClose: () => void;
}

/**
 * Modal para que una marca envíe una propuesta a un talent.
 *
 * @kind client
 * @feature brand-portal
 * @route /marcas/talentos/[slug]
 * @example
 * ```tsx
 * <ProposalModal talentId={talent.id} talentName={talent.name} onClose={close} />
 * ```
 */
export function ProposalModal({ talentId, talentName, onClose }: ProposalModalProps) {
  const [form, setForm] = useState({
    campaignType: '',
    budgetRange: '',
    timeline: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/marcas/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talentId,
          campaignType: form.campaignType,
          budgetRange: form.budgetRange,
          timeline: form.timeline,
          message: form.message,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onCloseRef.current(), 1500);
      } else {
        const data = await (res.json() as Promise<{ error?: string }>).catch((): { error?: string } => ({}));
        setError(data.error ?? 'Error al enviar propuesta');
      }
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  };

  const selectClass = 'w-full rounded-xl border border-sp-border px-4 py-3 text-sm outline-none focus:border-sp-orange transition-colors bg-white';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Propuesta para ${talentName}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-black uppercase text-sp-dark">Enviar propuesta</h2>
            <p className="text-sm text-sp-muted">Para {talentName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-sp-off flex items-center justify-center text-sp-muted hover:text-sp-dark" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="font-display text-2xl font-black gradient-text mb-2">Propuesta enviada!</div>
            <p className="text-sm text-sp-muted">Te contactaremos pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-sp-dark mb-1.5">Tipo de campana</label>
              <select value={form.campaignType} onChange={(e) => setForm({ ...form, campaignType: e.target.value })} required className={selectClass}>
                <option value="">Seleccionar...</option>
                {['Streaming', 'YouTube', 'Social', 'Evento', 'Otro'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-sp-dark mb-1.5">Presupuesto</label>
              <select value={form.budgetRange} onChange={(e) => setForm({ ...form, budgetRange: e.target.value })} required className={selectClass}>
                <option value="">Seleccionar...</option>
                {['<5K', '5-10K', '10-25K', '25K+', 'A definir'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-sp-dark mb-1.5">Timeline</label>
              <select value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} required className={selectClass}>
                <option value="">Seleccionar...</option>
                {['1 semana', '2 semanas', '1 mes', '2+ meses', 'Flexible'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-sp-dark mb-1.5">Mensaje</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                className={selectClass}
                placeholder="Describe tu campana, objetivos y que buscas en el talento..."
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full font-bold text-white text-sm bg-sp-grad disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar propuesta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
