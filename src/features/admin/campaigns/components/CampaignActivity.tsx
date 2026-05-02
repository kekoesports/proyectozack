'use client';

import { useMemo } from 'react';
import { CAMPAIGN_STATUS_LABELS } from '@/lib/schemas/campaign';

import type { CampaignWithRelations } from '@/lib/queries/campaigns';
import type { DeliverableWithComments } from '@/lib/queries/deliverables';
import type { ContractWithSigners, FileRecord, Invoice } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type TimelineEvent = {
  readonly id:     string;
  readonly date:   Date;
  readonly icon:   React.ReactNode;
  readonly label:  string;
  readonly desc:   string;
  readonly accent: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  pending_submission: 'Pendiente de entrega',
  submitted:          'Entregado por talento',
  internal_review:    'En revisión interna',
  brand_review:       'En revisión de marca',
  approved:           'Aprobado',
  revision_requested: 'Cambios solicitados',
  rejected:           'Rechazado',
};

const FILE_TYPE_LABELS: Record<string, string> = {
  invoice:   'Factura',
  statement: 'Extracto',
  contract:  'Contrato',
  briefing:  'Briefing',
  geo_stats: 'GEO Stats',
  screenshot: 'Captura',
  receipt:   'Recibo',
  other:     'Archivo',
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconCreate(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="6" cy="6" r="4"/><path d="M6 4v4M4 6h4"/>
    </svg>
  );
}
function IconStatus(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 6h8M8 3l3 3-3 3"/>
    </svg>
  );
}
function IconFile(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M7 1H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4L7 1Z"/><path d="M7 1v3h3"/>
    </svg>
  );
}
function IconDeliverable(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1" y="1" width="10" height="10" rx="1.5"/><path d="M4 6l2 2 4-4"/>
    </svg>
  );
}
function IconMoney(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="6" cy="6" r="4"/><path d="M6 3.5v5M4.5 7.5h2a1 1 0 0 0 0-2h-1a1 1 0 0 1 0-2h2"/>
    </svg>
  );
}
function IconContract(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M7 1H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4L7 1Z"/><path d="M7 1v3h3M4 7l1 1 2-2"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  readonly campaign:             CampaignWithRelations;
  readonly campaignDeliverables: readonly DeliverableWithComments[];
  readonly campaignFiles:        readonly FileRecord[];
  readonly campaignInvoices:     readonly Invoice[];
  readonly contract:             ContractWithSigners | null;
};

export function CampaignActivity({
  campaign, campaignDeliverables, campaignFiles, campaignInvoices, contract,
}: Props): React.ReactElement {

  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [];

    // Trato creado
    list.push({
      id:     'created',
      date:   campaign.createdAt,
      icon:   <IconCreate />,
      label:  'Trato creado',
      desc:   campaign.responsibleUser
        ? `Responsable: ${campaign.responsibleUser.name}`
        : `Estado inicial: ${CAMPAIGN_STATUS_LABELS[campaign.status]}`,
      accent: '#f5632a',
    });

    // Archivos subidos
    for (const f of campaignFiles) {
      list.push({
        id:     `file-${f.id}`,
        date:   new Date(f.createdAt),
        icon:   <IconFile />,
        label:  `Archivo subido: ${f.name}`,
        desc:   FILE_TYPE_LABELS[f.type] ?? 'Archivo',
        accent: '#5b9bd5',
      });
    }

    // Deliverables
    for (const d of campaignDeliverables) {
      list.push({
        id:     `deliv-${d.id}`,
        date:   new Date(d.createdAt),
        icon:   <IconDeliverable />,
        label:  `Deliverable añadido: ${d.title}`,
        desc:   DELIVERABLE_STATUS_LABELS[d.status] ?? d.status,
        accent: d.status === 'approved' ? '#16a34a' : d.status === 'rejected' ? '#ef4444' : '#8b3aad',
      });
      if (d.approvedAt) {
        list.push({
          id:     `deliv-approved-${d.id}`,
          date:   new Date(d.approvedAt),
          icon:   <IconDeliverable />,
          label:  `Deliverable aprobado: ${d.title}`,
          desc:   'Aprobado por la marca',
          accent: '#16a34a',
        });
      }
    }

    // Movimientos de facturación
    for (const inv of campaignInvoices) {
      list.push({
        id:     `inv-${inv.id}`,
        date:   new Date(inv.issueDate),
        icon:   <IconMoney />,
        label:  inv.kind === 'income'
          ? `Ingreso registrado: ${inv.concept}`
          : `Gasto registrado: ${inv.concept}`,
        desc:   `${EUR.format(Number(inv.totalAmount))} · ${inv.status}`,
        accent: inv.kind === 'income' ? '#16a34a' : '#f59e0b',
      });
    }

    // Contrato
    if (contract) {
      list.push({
        id:     'contract',
        date:   new Date(contract.createdAt),
        icon:   <IconContract />,
        label:  'Contrato generado',
        desc:   contract.status === 'signed'
          ? `Firmado${contract.signedAt ? ` el ${fmtDate(contract.signedAt)}` : ''}`
          : `Estado: ${contract.status === 'pending_signature' ? 'Pendiente de firma' : contract.status}`,
        accent: contract.status === 'signed' ? '#16a34a' : '#8b3aad',
      });
    }

    // Estado actual si hay actualizaciones
    if (campaign.updatedAt > campaign.createdAt) {
      list.push({
        id:     'status',
        date:   campaign.updatedAt,
        icon:   <IconStatus />,
        label:  `Estado: ${CAMPAIGN_STATUS_LABELS[campaign.status]}`,
        desc:   'Última actualización del trato',
        accent: '#72728a',
      });
    }

    // Ordenar por fecha descendente
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [campaign, campaignDeliverables, campaignFiles, campaignInvoices, contract]);

  return (
    <div className="space-y-4">

      {/* Timeline */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
        <div className="px-5 py-3 border-b border-sp-admin-border/60 bg-sp-admin-hover/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">
            Actividad — {events.length} {events.length === 1 ? 'evento' : 'eventos'}
          </p>
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-sp-admin-muted">Sin actividad registrada</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="relative">
              {/* Línea vertical */}
              <div className="absolute left-[15px] top-3 bottom-3 w-px bg-sp-admin-border/60" aria-hidden />

              <div className="space-y-4">
                {events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-4 relative">
                    {/* Dot */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white z-10 ring-2 ring-sp-admin-bg"
                      style={{ background: ev.accent }}
                    >
                      {ev.icon}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 ${i < events.length - 1 ? 'pb-1' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-sp-admin-text leading-tight truncate">
                          {ev.label}
                        </p>
                        <p className="text-[10px] text-sp-admin-muted shrink-0 tabular-nums">
                          {fmtDate(ev.date)}
                        </p>
                      </div>
                      <p className="text-[11px] text-sp-admin-muted mt-0.5">{ev.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notas internas */}
      {campaign.notes ? (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-2">Notas internas</p>
          <p className="text-[13px] text-sp-admin-muted leading-relaxed whitespace-pre-wrap">{campaign.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
