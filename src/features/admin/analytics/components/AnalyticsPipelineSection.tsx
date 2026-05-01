'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CampaignWithRelations } from '@/types';
import type { CampaignStatus } from '@/lib/schemas/campaign';

// ── Types & helpers ───────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
}

function daysLeft(endDate: string | null): { days: number; label: string; color: string } | null {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)  return { days: diff, label: `${Math.abs(diff)}d vencido`, color: '#ef4444' };
  if (diff === 0) return { days: 0,   label: 'Hoy',                        color: '#f59e0b' };
  if (diff <= 7)  return { days: diff, label: `${diff}d`,                  color: '#f59e0b' };
  return             { days: diff,     label: `${diff}d`,                  color: '#72728a' };
}

// ── Pipeline status config ────────────────────────────────────────────

type PipelineStage = {
  readonly status:  CampaignStatus;
  readonly label:   string;
  readonly color:   string;
  readonly isActive: boolean;
};

const PIPELINE_STAGES: PipelineStage[] = [
  { status: 'propuesta',      label: 'Propuesta',    color: '#8b3aad', isActive: false },
  { status: 'negociacion',    label: 'Negociación',  color: '#f5632a', isActive: false },
  { status: 'aprobada',       label: 'Aprobada',     color: '#5b9bd5', isActive: false },
  { status: 'activa',         label: 'Activo',       color: '#16a34a', isActive: true  },
  { status: 'pendiente_pago', label: 'Pdte. cobro',  color: '#f59e0b', isActive: false },
  { status: 'completada',     label: 'Completado',   color: '#72728a', isActive: false },
  { status: 'pagada',         label: 'Pagado',       color: '#059669', isActive: false },
  { status: 'cancelada',      label: 'Cancelado',    color: '#9ca3af', isActive: false },
];

// ── Props ─────────────────────────────────────────────────────────────

type Props = { readonly campaigns: readonly CampaignWithRelations[] };

// ── Component ─────────────────────────────────────────────────────────

export function AnalyticsPipelineSection({ campaigns }: Props): React.ReactElement {
  const [selectedStatus, setSelectedStatus] = useState<CampaignStatus | 'all'>('all');

  // Conteos por estado
  const counts = useMemo(() => {
    const map = new Map<CampaignStatus, { count: number; value: number }>();
    for (const stage of PIPELINE_STAGES) map.set(stage.status, { count: 0, value: 0 });
    for (const c of campaigns) {
      const entry = map.get(c.status);
      if (entry) {
        entry.count++;
        entry.value += Number(c.amountBrand ?? 0);
      }
    }
    return map;
  }, [campaigns]);

  // Filtro por estado seleccionado
  const filtered = useMemo(() => {
    if (selectedStatus === 'all') return [...campaigns];
    return campaigns.filter((c) => c.status === selectedStatus);
  }, [campaigns, selectedStatus]);

  const totalValue = campaigns
    .filter((c) => !['cancelada', 'pagada'].includes(c.status))
    .reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
        <p className="text-[13px] text-sp-admin-muted">Sin tratos para el período seleccionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Cards de estado (pipeline) ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const data   = counts.get(stage.status) ?? { count: 0, value: 0 };
          const active = selectedStatus === stage.status;
          return (
            <button
              key={stage.status}
              type="button"
              onClick={() => setSelectedStatus(active ? 'all' : stage.status)}
              className={`rounded-lg bg-sp-admin-card border overflow-hidden text-left hover:shadow-sm transition-all ${
                active ? 'border-current shadow-sm' : 'border-sp-admin-border'
              }`}
              style={active ? { borderColor: stage.color } : undefined}
            >
              <div className="h-[2px]" style={{ background: stage.color }}/>
              <div className="px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted truncate">{stage.label}</p>
                <p className="text-[18px] font-black mt-0.5" style={{ color: stage.color }}>{data.count}</p>
                {data.value > 0 && (
                  <p className="text-[9px] text-sp-admin-muted tabular-nums mt-0.5">{EUR.format(data.value)}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Total pipeline activo */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-sp-admin-muted">
          {filtered.length} {filtered.length === 1 ? 'trato' : 'tratos'}
          {selectedStatus !== 'all' && ` en ${PIPELINE_STAGES.find((s) => s.status === selectedStatus)?.label}`}
        </span>
        <span className="text-sp-admin-muted">
          Valor pipeline activo: <strong className="text-sp-admin-text tabular-nums">{EUR.format(totalValue)}</strong>
        </span>
      </div>

      {/* ── Tabla de tratos ─────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-hover/30">
                {['Trato', 'Marca', 'Talento', 'Estado', 'Valor', 'Fecha fin', 'Próx. venc.'].map((h) => (
                  <th key={h}
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-sp-admin-muted whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 20).map((c) => {
                const stage = PIPELINE_STAGES.find((s) => s.status === c.status);
                const dl    = daysLeft(c.endDate);
                return (
                  <tr key={c.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Link href={`/admin/campanas/${c.id}`}
                        className="text-[12px] font-semibold text-sp-admin-accent hover:underline truncate block max-w-[160px]"
                        title={c.name}>
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-sp-admin-text whitespace-nowrap">
                      {c.brandName ? (
                        <Link href={`/admin/brands/${c.brandId}`} className="hover:text-sp-admin-accent transition-colors">
                          {c.brandName}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-sp-admin-muted whitespace-nowrap">
                      {c.talentName ? (
                        <Link href={`/admin/talents/${c.talentId}`} className="hover:text-sp-admin-accent transition-colors">
                          {c.talentName}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {stage && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: `${stage.color}15`, color: stage.color }}>
                          {stage.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] font-semibold tabular-nums text-sp-admin-text whitespace-nowrap">
                      {Number(c.amountBrand ?? 0) > 0 ? EUR.format(Number(c.amountBrand)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-sp-admin-muted whitespace-nowrap">
                      {fmtDate(c.endDate)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {dl ? (
                        <span className="text-[11px] font-semibold tabular-nums" style={{ color: dl.color }}>
                          {dl.label}
                        </span>
                      ) : (
                        <span className="text-[11px] text-sp-admin-muted/40 italic">Sin fecha</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 20 && (
            <div className="px-4 py-2.5 border-t border-sp-admin-border/50 text-[11px] text-sp-admin-muted">
              Mostrando 20 de {filtered.length} tratos
            </div>
          )}
        </div>
      )}
    </div>
  );
}
