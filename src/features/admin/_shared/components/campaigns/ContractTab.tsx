'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  uploadContractAction,
  addSignerAction,
  removeSignerAction,
  requestSignaturesAction,
} from '@/app/admin/(dashboard)/campanas/contract-actions';
import type { ContractWithSigners, SignerRole } from '@/types';
import type { ContractTemplate } from '@/lib/queries/contractTemplates';
import { ContractGenerator } from './ContractGenerator';
import type { CampaignWithRelations } from '@/lib/queries/campaigns';

type Props = {
  readonly campaignId: number;
  readonly contract:   ContractWithSigners | null;
  readonly isAdmin:    boolean;
  readonly templates:  readonly ContractTemplate[];
  readonly campaign:   CampaignWithRelations;
  readonly contractVars: Record<string, string>;
};

const I  = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[13px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const LB = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
const BP = 'px-4 py-2 rounded-lg text-sm font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors';
const BG = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  draft:              { label: 'Borrador',           cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_signature:  { label: 'Pendiente firma',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  signed:             { label: 'Firmado',            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:           { label: 'Rechazado',          cls: 'bg-red-50 text-red-700 border-red-200' },
};

const SIGNER_STATUS_CFG: Record<string, { label: string; cls: string; icon: string }> = {
  pending:  { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: '⏳' },
  signed:   { label: 'Firmado',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✓' },
  rejected: { label: 'Rechazado', cls: 'bg-red-50 text-red-700 border-red-200',             icon: '✕' },
};
const SIGNER_FALLBACK = { label: 'Desconocido', cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: '?' };

const ROLE_LABELS: Record<SignerRole, string> = {
  brand:      'Marca',
  influencer: 'Influencer',
  agency:     'Agencia',
};

export function ContractTab({ campaignId, contract, isAdmin, templates, campaign, contractVars }: Props): React.ReactElement {
  const [showGenerator, setShowGenerator] = useState(false);
  const [uploadState, uploadAction, uploadPending]   = useActionState(uploadContractAction, {});
  const [signerState, signerAction, signerPending]   = useActionState(addSignerAction, {});
  const [showUpload,  setShowUpload]  = useState(!contract);
  const [showSigner,  setShowSigner]  = useState(false);
  const [isPending,   startTransition] = useTransition();

  const statusCfg = contract ? (STATUS_CFG[contract.status] ?? STATUS_CFG.draft) : null;

  function handleRequestSignatures(): void {
    if (!contract) return;
    if (!confirm(`Esto enviará emails a ${contract.signers.filter((s) => s.status === 'pending').length} firmante(s) pendientes. ¿Continuar?`)) return;
    startTransition(async () => { await requestSignaturesAction(contract.id, campaignId); });
  }

  function handleRemoveSigner(signerId: number): void {
    startTransition(async () => { await removeSignerAction(signerId, campaignId); });
  }

  if (uploadState.success && uploadPending === false && showUpload) setShowUpload(false);
  if (signerState.success && signerPending === false && showSigner) setShowSigner(false);

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Generador automático ── */}
      {showGenerator ? (
        <ContractGenerator
          campaign={campaign}
          templates={templates}
          vars={contractVars}
          onDone={() => setShowGenerator(false)}
        />
      ) : (
        <div className="flex items-center gap-3">
          {templates.length > 0 && (
            <button type="button" onClick={() => setShowGenerator(true)}
              className={`${BP} flex items-center gap-2`}>
              ✨ Generar contrato desde plantilla
            </button>
          )}
          <span className="text-[11px] text-sp-admin-muted">o súbelo manualmente abajo</span>
        </div>
      )}

      {!showGenerator && <>
      {/* Estado del contrato */}
      {contract && statusCfg && (
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3 border-b border-sp-admin-border/60 bg-sp-admin-hover/30 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Contrato</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {contract.fileUrl && (
                <a href={contract.fileUrl} target="_blank" rel="noreferrer" className={BG}>
                  Ver PDF →
                </a>
              )}
              <button type="button" onClick={() => setShowUpload((v) => !v)} className={BG}>
                {contract.fileUrl ? 'Reemplazar PDF' : 'Subir PDF'}
              </button>
            </div>
          </div>
          <div className="px-5 py-3 text-[12px] text-sp-admin-muted space-y-1">
            {contract.fileName && <p>Archivo: <span className="font-medium text-sp-admin-text">{contract.fileName}</span></p>}
            {contract.sentAt   && <p>Enviado: {new Date(contract.sentAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
            {contract.signedAt && <p className="text-emerald-600 font-semibold">✓ Firmado: {new Date(contract.signedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
            {contract.notes    && <p className="italic">{contract.notes}</p>}
          </div>
        </div>
      )}

      {/* Formulario upload */}
      {(showUpload || !contract) && (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 space-y-4">
          <p className="text-[11px] font-bold text-sp-admin-text">{contract ? 'Reemplazar contrato' : 'Subir contrato'}</p>
          <form action={uploadAction} className="space-y-3">
            <input type="hidden" name="campaignId" value={campaignId} />
            <div>
              <label className={LB}>Archivo PDF * (máx 20 MB)</label>
              <input name="file" type="file" accept="application/pdf" required
                className={`${I} file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-hover file:px-3 file:py-1 file:text-xs file:font-semibold file:text-sp-admin-text`} />
            </div>
            <div>
              <label className={LB}>Notas internas</label>
              <textarea name="notes" rows={2} className={I} placeholder="Versión, observaciones…" />
            </div>
            {uploadState.error && <p className="text-xs text-red-400">{uploadState.error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={uploadPending} className={BP}>
                {uploadPending ? 'Subiendo…' : 'Subir contrato'}
              </button>
              {contract && (
                <button type="button" onClick={() => setShowUpload(false)} className={BG}>Cancelar</button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Firmantes */}
      {contract && (
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3 border-b border-sp-admin-border/60 bg-sp-admin-hover/30 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
              Firmantes ({contract.signers.length})
            </p>
            <button type="button" onClick={() => setShowSigner((v) => !v)} className={BG}>
              + Añadir firmante
            </button>
          </div>

          {/* Formulario nuevo firmante */}
          {showSigner && (
            <div className="px-5 py-4 border-b border-sp-admin-border/40 bg-sp-admin-hover/10">
              <form action={signerAction} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="campaignId" value={campaignId} />
                <div>
                  <label className={LB}>Nombre *</label>
                  <input name="name" required className={I} placeholder="Nombre" />
                </div>
                <div>
                  <label className={LB}>Email *</label>
                  <input name="email" type="email" required className={I} placeholder="email@..." />
                </div>
                <div>
                  <label className={LB}>Rol</label>
                  <select name="role" className={I}>
                    <option value="brand">Marca</option>
                    <option value="influencer">Influencer</option>
                    <option value="agency">Agencia</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={signerPending} className={BP}>
                    {signerPending ? '…' : 'Añadir'}
                  </button>
                  <button type="button" onClick={() => setShowSigner(false)} className={BG}>×</button>
                </div>
                {signerState.error && <p className="col-span-4 text-xs text-red-400">{signerState.error}</p>}
              </form>
            </div>
          )}

          {/* Lista firmantes */}
          {contract.signers.length === 0 ? (
            <p className="px-5 py-6 text-[12px] text-sp-admin-muted text-center">
              Sin firmantes. Añade al menos uno para poder enviar la solicitud de firma.
            </p>
          ) : (
            <div className="divide-y divide-sp-admin-border/40">
              {contract.signers.map((s) => {
                const sCfg = SIGNER_STATUS_CFG[s.status] ?? SIGNER_FALLBACK;
                return (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-3 group/srow">
                    <span className="text-base leading-none">{sCfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-sp-admin-text truncate">{s.name}</p>
                      <p className="text-[10px] text-sp-admin-muted">{s.email} · {ROLE_LABELS[s.role as SignerRole]}</p>
                      {s.signedAt && (
                        <p className="text-[10px] text-emerald-600">
                          Firmado {new Date(s.signedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {s.ipAddress ? ` · IP ${s.ipAddress}` : ''}
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${sCfg.cls}`}>
                      {sCfg.label}
                    </span>
                    {s.status === 'pending' && (
                      <button type="button" onClick={() => handleRemoveSigner(s.id)} disabled={isPending}
                        className="opacity-0 group-hover/srow:opacity-100 px-2 py-1 rounded text-[10px] font-semibold text-red-400 hover:bg-red-50 transition-all">
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CTA enviar */}
      {contract && contract.fileUrl && contract.signers.length > 0 && contract.status !== 'signed' && (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[13px] font-bold text-sp-admin-text">Solicitar firmas</p>
              <p className="text-[11px] text-sp-admin-muted mt-0.5">
                Se enviará un email a cada firmante pendiente con un link único para firmar.
              </p>
            </div>
            <button type="button" onClick={handleRequestSignatures} disabled={isPending}
              className={`${BP} shrink-0`}>
              {isPending ? 'Enviando…' : '✉ Enviar solicitud de firma'}
            </button>
          </div>
          {contract.status === 'pending_signature' && (
            <p className="text-[10px] text-amber-600 mt-3">
              ⏳ Solicitud enviada — esperando respuesta de {contract.signers.filter((s) => s.status === 'pending').length} firmante(s)
            </p>
          )}
        </div>
      )}

      {/* Estado vacío sin contrato */}
      {!contract && !showUpload && (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
          <p className="text-2xl mb-2">📄</p>
          <p className="text-sm font-semibold text-sp-admin-text">Sin contrato todavía</p>
          <p className="text-[11px] text-sp-admin-muted mt-1 mb-4">Genera uno desde una plantilla o súbelo manualmente.</p>
          <button type="button" onClick={() => setShowUpload(true)} className={BP}>
            + Subir contrato manualmente
          </button>
        </div>
      )}
      </>}
    </div>
  );
}
