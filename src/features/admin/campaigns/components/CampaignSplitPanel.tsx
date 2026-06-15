'use client';

import { useState, useTransition } from 'react';
import { upsertSplitsAction } from '@/app/admin/(dashboard)/campanas/campaign-actions';
import { SPLIT_PARTIES } from '@/db/schema/campaignSplits';
import type { CampaignSplit } from '@/lib/queries/campaignSplits';
import { fmtCurrency, toEUR, USD_EUR_RATE } from '@/lib/currency';

const PARTY_LABELS: Record<string, string> = {
  pablo:    'Pablo',
  alfonso:  'Alfonso',
  giuliano: 'Giuliano',
  stark:    'Stark',
};

type Props = {
  readonly campaignId:   number;
  readonly splits:       readonly CampaignSplit[];
  readonly amountBrand:  number;
  readonly amountTalent: number;
  readonly currency:     string;
  readonly rate?:        number;
};

export function CampaignSplitPanel({ campaignId, splits, amountBrand, amountTalent, currency, rate = USD_EUR_RATE }: Props) {
  const margin = toEUR(amountBrand - amountTalent, currency, rate);

  const [pcts, setPcts] = useState<Record<string, string>>(() =>
    Object.fromEntries(splits.map((s) => [s.party, s.percentage > 0 ? String(s.percentage) : '']))
  );
  const [error,   setError]   = useState<string | null>(null);
  const [saved,   setSaved]   = useState(false);
  const [pending, startTr]    = useTransition();

  const total = SPLIT_PARTIES.reduce((s, p) => s + (Number(pcts[p]) || 0), 0);
  const isValid = total === 0 || total === 100;

  function handleChange(party: string, val: string) {
    setSaved(false);
    setError(null);
    setPcts((prev) => ({ ...prev, [party]: val }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) { setError(`La suma debe ser 100% (ahora: ${total}%)`); return; }
    const fd = new FormData(e.currentTarget);
    startTr(async () => {
      const res = await upsertSplitsAction(campaignId, fd);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-sp-admin-text">Reparto de margen</h3>
          <p className="text-[11px] text-sp-admin-muted mt-0.5">
            Base: <span className="font-semibold text-sp-admin-text">{fmtCurrency(margin)} margen</span>
            {' '}({fmtCurrency(amountBrand, currency)} marca − {fmtCurrency(amountTalent, currency)} talento)
          </p>
        </div>
        {total === 100 && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            ✓ 100%
          </span>
        )}
        {total > 0 && total !== 100 && (
          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
            {total}% — falta {100 - total}%
          </span>
        )}
        {total === 0 && (
          <span className="text-[10px] text-sp-admin-muted bg-sp-admin-hover rounded-full px-2 py-0.5">
            Sin reparto
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SPLIT_PARTIES.map((party) => {
            const owed = margin * (Number(pcts[party]) || 0) / 100;
            return (
              <div key={party} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">
                  {PARTY_LABELS[party]}
                </label>
                <div className="relative">
                  <input
                    name={party}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={pcts[party] ?? ''}
                    onChange={(e) => handleChange(party, e.target.value)}
                    placeholder="0"
                    className="w-full h-9 rounded-lg border border-sp-admin-border bg-white px-3 pr-7 text-[13px] font-semibold text-sp-admin-text outline-none focus:border-sp-admin-accent/50 tabular-nums"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-sp-admin-muted">%</span>
                </div>
                {Number(pcts[party]) > 0 && margin > 0 && (
                  <p className="text-[10px] font-semibold text-emerald-700 tabular-nums">
                    {fmtCurrency(owed)} €
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-[11px] text-red-600 font-medium">{error}</p>
        )}
        {saved && (
          <p className="text-[11px] text-emerald-600 font-semibold">✓ Reparto guardado</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending || !isValid || total === 0}
            className="h-8 px-4 rounded-lg text-[12px] font-semibold bg-sp-admin-accent text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {pending ? 'Guardando…' : 'Guardar reparto'}
          </button>
          {total === 0 && (
            <button
              type="button"
              onClick={() => {
                const eq = '25';
                setPcts({ pablo: eq, alfonso: eq, giuliano: eq, stark: eq });
                setSaved(false);
              }}
              className="h-8 px-3 rounded-lg text-[11px] font-medium text-sp-admin-muted border border-sp-admin-border hover:border-sp-admin-accent hover:text-sp-admin-accent transition-colors"
            >
              Repartir a partes iguales
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
