'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Initial {
  from?: string;
  to?: string;
  action?: string;
  outcome?: string;
  userId?: string;
  refType?: string;
  country?: string;
}

interface Props {
  readonly initial: Initial;
  readonly actionOptions: readonly string[];
  readonly outcomeOptions: readonly string[];
}

// Excepción documentada a la Regla 14 (typescript.md): esto es un
// filter form de solo lectura, no un data-entry form. Cada campo es
// independiente (no hay validación cruzada) y el "submit" solo hace
// una navegación con URL params. React Hook Form + Zod resolver
// añadiría ~30 LOC sin beneficio real. La validación fuerte vive en
// `parseAuditSearch` (server-side, Zod) — este cliente solo controla
// UX del picker.

export function AuditoriaFilters({ initial, actionOptions, outcomeOptions }: Props): React.ReactElement {
  const router = useRouter();
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');
  const [action, setAction] = useState(initial.action ?? '');
  const [outcome, setOutcome] = useState(initial.outcome ?? '');
  const [userId, setUserId] = useState(initial.userId ?? '');
  const [refType, setRefType] = useState(initial.refType ?? '');
  const [country, setCountry] = useState(initial.country ?? '');

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (action) params.set('action', action);
    if (outcome) params.set('outcome', outcome);
    if (userId) params.set('userId', userId);
    if (refType) params.set('refType', refType);
    if (country) params.set('country', country);
    const qs = params.toString();
    router.push(qs ? `/admin/giveaways/auditoria?${qs}` : '/admin/giveaways/auditoria');
  }

  function clearAll(): void {
    setFrom(''); setTo(''); setAction(''); setOutcome(''); setUserId(''); setRefType(''); setCountry('');
    router.push('/admin/giveaways/auditoria');
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-white/10 bg-white/5 p-4"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-white/50">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-white/50">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-white/50">Acción</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
          >
            <option value="">— cualquiera —</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-white/50">Outcome</span>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
          >
            <option value="">— cualquiera —</option>
            {outcomeOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-white/50">User ID</span>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
            maxLength={200}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-white/50">Ref type</span>
          <input
            type="text"
            value={refType}
            onChange={(e) => setRefType(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-white/50">País (ISO2)</span>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm uppercase text-white"
            maxLength={2}
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-white/10 px-4 py-1.5 text-sm text-white/70 hover:bg-white/10"
          >
            Limpiar
          </button>
        </div>
      </div>
    </form>
  );
}
