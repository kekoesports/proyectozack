'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_ACTION_TYPES,
  CAMPAIGN_ACTION_LABELS,
  CAMPAIGN_PAYMENT_METHODS,
  computeCampaignDerived,
} from '@/lib/schemas/campaign';
import {
  createCampaignAction,
  updateCampaignAction,
  archiveCampaignAction,
} from '@/app/admin/(dashboard)/campanas/actions';
import { CampaignSplitPanel } from '@/features/admin/campaigns/components/CampaignSplitPanel';

import type { CampaignRow, CrmBrandContact } from '@/types';
import type { CampaignSplit } from '@/lib/queries/campaignSplits';

// ── Shared types ───────────────────────────────────────────────────────────────

export type BrandOption = { readonly id: number; readonly name: string };
export type TalentOption = { readonly id: number; readonly name: string };
export type StaffOption = { readonly id: string; readonly name: string };

type FormStatus = 'idle' | 'saving' | 'archiving' | 'ok' | 'error';

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatters = {
  EUR: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
} as const;

const PAYMENT_METHOD_LABELS: Record<(typeof CAMPAIGN_PAYMENT_METHODS)[number], string> = {
  banco: 'Banco',
  crypto: 'Crypto',
  banco_agencia: 'Banco agencia',
  banco_stark: 'Banco Stark',
  crypto_agencia: 'Crypto agencia',
  crypto_zack: 'Crypto Zack',
  otro: 'Otro',
};

// ── Field components ───────────────────────────────────────────────────────────

function Field({
  label,
  children,
  hint,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly hint?: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-sp-admin-muted uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint !== undefined && (
        <span className="text-[11px] text-sp-admin-muted">{hint}</span>
      )}
    </div>
  );
}

const inputCls =
  'rounded-md border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:ring-1 focus:ring-sp-admin-accent w-full';

const selectCls =
  'rounded-md border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-admin-accent w-full';

// ── CampaignForm — the body of the drawer ─────────────────────────────────────

export type CampaignFormProps = {
  readonly campaign: CampaignRow | null;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly staffUsers: readonly StaffOption[];
  readonly contactsByBrand: Readonly<Record<number, readonly CrmBrandContact[]>>;
  readonly isManager: boolean;
  readonly splits: readonly CampaignSplit[];
  readonly rate?: number;
};

export function CampaignForm({
  campaign,
  onClose,
  onSuccess,
  brands,
  talents,
  staffUsers,
  contactsByBrand,
  isManager,
  splits,
  rate,
}: CampaignFormProps): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Controlled for real-time commission calculation
  const [amountBrand, setAmountBrand] = useState(
    campaign ? String(campaign.amountBrand ?? '0') : '0',
  );
  const [amountTalent, setAmountTalent] = useState(
    campaign ? String(campaign.amountTalent ?? '0') : '0',
  );
  const [currency, setCurrency] = useState<'EUR' | 'USD'>(
    campaign?.currency === 'USD' ? 'USD' : 'EUR',
  );
  const [selectedBrandId, setSelectedBrandId] = useState(
    campaign ? String(campaign.brandId) : '',
  );

  const derived = computeCampaignDerived({
    amountBrand: Number(amountBrand) || 0,
    amountTalent: Number(amountTalent) || 0,
  });

  const contacts = selectedBrandId
    ? (contactsByBrand[Number(selectedBrandId)] ?? [])
    : [];

  const isEditing = campaign !== null;
  const isBusy = status === 'saving' || status === 'archiving';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setStatus('saving');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);

    const result = isEditing
      ? await updateCampaignAction(fd)
      : await createCampaignAction(fd);

    if (result.success) {
      setStatus('ok');
      startTransition(() => {
        router.refresh();
      });
      onSuccess();
    } else {
      setStatus('error');
      setErrorMsg(result.error);
    }
  }

  async function handleArchive(): Promise<void> {
    if (!campaign) return;
    setStatus('archiving');
    setErrorMsg('');

    const result = await archiveCampaignAction(campaign.id);

    if (result.success) {
      setStatus('ok');
      startTransition(() => {
        router.refresh();
      });
      onSuccess();
    } else {
      setStatus('error');
      setErrorMsg(result.error);
    }
  }

  return (
    <form
      id="campaign-drawer-form"
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-4"
    >
      {/* Hidden id for update */}
      {isEditing && <input type="hidden" name="id" value={campaign.id} />}

      {/* Nombre */}
      <Field label="Nombre *">
        <input
          type="text"
          name="name"
          required
          defaultValue={campaign?.name ?? ''}
          placeholder="Nombre de la campaña"
          className={inputCls}
        />
      </Field>

      {/* Marca */}
      <Field label="Marca *">
        <select
          name="brandId"
          required
          value={selectedBrandId}
          onChange={(e) => setSelectedBrandId(e.target.value)}
          className={selectCls}
        >
          <option value="">Seleccionar marca…</option>
          {brands.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      {/* Influencer */}
      <Field label="Influencer *">
        <select
          name="talentId"
          required
          defaultValue={campaign ? String(campaign.talentId) : ''}
          className={selectCls}
        >
          <option value="">Seleccionar influencer…</option>
          {talents.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      {/* Contacto de marca */}
      {contacts.length > 0 && (
        <Field label="Contacto de marca">
          <select
            name="brandContactId"
            defaultValue={
              campaign?.brandContactId ? String(campaign.brandContactId) : ''
            }
            className={selectCls}
          >
            <option value="">Sin contacto</option>
            {contacts.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
                {c.email ? ` (${c.email})` : ''}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Tipo de acción */}
      <Field label="Tipo de acción *">
        <select
          name="actionType"
          required
          defaultValue={campaign?.actionType ?? ''}
          className={selectCls}
        >
          <option value="">Seleccionar tipo…</option>
          {CAMPAIGN_ACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {CAMPAIGN_ACTION_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>

      {/* Estado */}
      <Field label="Estado">
        <select
          name="status"
          defaultValue={campaign?.status ?? 'propuesta'}
          className={selectCls}
        >
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CAMPAIGN_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      {/* Cobro / Pago talento */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cobro marca">
          <select
            name="cobroConfirmado"
            defaultValue={campaign?.cobroConfirmado ? '1' : '0'}
            className={selectCls}
          >
            <option value="0">Sin cobrar</option>
            <option value="1">Cobrado ✓</option>
          </select>
        </Field>
        <Field label="Pago talento">
          <select
            name="pagoTalentConfirmado"
            defaultValue={campaign?.pagoTalentConfirmado ? '1' : '0'}
            className={selectCls}
          >
            <option value="0">Sin pagar</option>
            <option value="1">Pagado ✓</option>
          </select>
        </Field>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha inicio">
          <input
            type="date"
            name="startDate"
            defaultValue={campaign?.startDate ?? ''}
            className={inputCls}
          />
        </Field>
        <Field label="Fecha fin">
          <input
            type="date"
            name="endDate"
            defaultValue={campaign?.endDate ?? ''}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Fecha entrega">
        <input
          type="date"
          name="deliveryDeadline"
          defaultValue={campaign?.deliveryDeadline ?? ''}
          className={inputCls}
        />
      </Field>

      {/* URLs */}
      <Field label="URL briefing">
        <input
          type="url"
          name="briefingUrl"
          defaultValue={campaign?.briefingUrl ?? ''}
          placeholder="https://…"
          className={inputCls}
        />
      </Field>

      <Field label="URL contenido">
        <input
          type="url"
          name="contentUrl"
          defaultValue={campaign?.contentUrl ?? ''}
          placeholder="https://…"
          className={inputCls}
        />
      </Field>

      {/* Moneda + importes */}
      <input type="hidden" name="currency" value={currency} />
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-medium text-sp-admin-muted uppercase tracking-wider shrink-0">
          Moneda
        </span>
        <div className="flex rounded-md overflow-hidden border border-sp-admin-border">
          {(['EUR', 'USD'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                currency === c
                  ? 'bg-sp-admin-accent text-white'
                  : 'bg-sp-admin-bg text-sp-admin-muted hover:text-sp-admin-text'
              }`}
            >
              {c === 'EUR' ? '€ EUR' : '$ USD'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Presupuesto marca (${currency === 'EUR' ? '€' : '$'})`}>
          <input
            type="number"
            name="amountBrand"
            min="0"
            step="0.01"
            value={amountBrand}
            onChange={(e) => setAmountBrand(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={`Presupuesto talento (${currency === 'EUR' ? '€' : '$'})`}>
          <input
            type="number"
            name="amountTalent"
            min="0"
            step="0.01"
            value={amountTalent}
            onChange={(e) => setAmountTalent(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Comisión calculada en tiempo real */}
      <div className="rounded-md bg-sp-admin-bg border border-sp-admin-border px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-sp-admin-muted">Comisión calculada</span>
        <div className="text-right">
          <span className="text-sm font-semibold text-sp-admin-text">
            {formatters[currency].format(derived.commissionAmount)}
          </span>
          <span className="ml-2 text-xs text-sp-admin-muted">
            ({derived.commissionPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Valor en especie — separado en talento y comunidad */}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Skins / giveaways talento (€)"
          hint="Valor en especie para el creador directamente"
        >
          <input
            type="number"
            name="amountInKindTalent"
            min="0"
            step="1"
            defaultValue={campaign?.amountInKindTalent ?? ''}
            placeholder="0"
            className={inputCls}
          />
        </Field>
        <Field
          label="Sorteos comunidad (€)"
          hint="Valor destinado a sorteos para la audiencia"
        >
          <input
            type="number"
            name="amountInKindCommunity"
            min="0"
            step="1"
            defaultValue={campaign?.amountInKindCommunity ?? ''}
            placeholder="0"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Métodos de pago */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pago marca">
          <select
            name="brandPaymentMethod"
            defaultValue={campaign?.brandPaymentMethod ?? ''}
            className={selectCls}
          >
            <option value="">Sin especificar</option>
            {CAMPAIGN_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pago talento">
          <select
            name="talentPaymentMethod"
            defaultValue={campaign?.talentPaymentMethod ?? ''}
            className={selectCls}
          >
            <option value="">Sin especificar</option>
            {CAMPAIGN_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Responsable */}
      <Field label="Responsable">
        <select
          name="responsibleUserId"
          defaultValue={campaign?.responsibleUserId ?? ''}
          className={selectCls}
        >
          <option value="">Sin asignar</option>
          {staffUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>

      {/* Asignado a */}
      <Field label="Asignado a">
        <select
          name="assignedToUserId"
          defaultValue={campaign?.assignedToUserId ?? ''}
          className={selectCls}
        >
          <option value="">Sin asignar</option>
          {staffUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>

      {/* Estimates — coste interno estimado y margen previsto */}
      <div className="border-t border-sp-admin-border/50 pt-3">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-3">
          Estimaciones internas
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Coste estimado agencia (€)" hint="Horas + gastos internos previstos">
            <input
              type="number"
              name="estimatedCostAgency"
              min="0"
              step="10"
              defaultValue={campaign?.estimatedCostAgency ?? ''}
              placeholder="0"
              className={inputCls}
            />
          </Field>
          <Field label="Margen previsto (%)" hint="Comisión estimada sobre el deal">
            <input
              type="number"
              name="estimatedMarginPct"
              min="0"
              max="100"
              step="0.5"
              defaultValue={campaign?.estimatedMarginPct ?? ''}
              placeholder="20"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Notas */}
      <Field label="Notas">
        <textarea
          name="notes"
          rows={3}
          defaultValue={campaign?.notes ?? ''}
          placeholder="Notas internas…"
          className={`${inputCls} resize-none`}
        />
      </Field>

      {/* Reparto socios — solo al editar un trato existente */}
      {isEditing && (
        <div className="border-t border-sp-admin-border/50 pt-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
            Reparto socios
          </p>
          <CampaignSplitPanel
            campaignId={campaign.id}
            splits={splits}
            amountBrand={Number(amountBrand) || 0}
            amountTalent={Number(amountTalent) || 0}
            currency={currency}
            {...(rate !== undefined && { rate })}
          />
        </div>
      )}

      {/* Footer actions (inside form so submit button works) */}
      <div className="flex items-center gap-3 pt-2 border-t border-sp-admin-border">
        {/* Archivar — oculto para manager o al crear */}
        {isEditing && !isManager && (
          <button
            type="button"
            onClick={() => void handleArchive()}
            disabled={isBusy}
            className="rounded-md border border-sp-admin-border px-3 py-2 text-xs text-sp-admin-muted hover:text-red-500 hover:border-red-500 transition-colors disabled:opacity-50"
          >
            {status === 'archiving' ? 'Archivando…' : 'Archivar'}
          </button>
        )}

        <div className="flex-1" />

        {status === 'error' && (
          <span className="text-xs text-red-500 truncate max-w-[200px]">{errorMsg}</span>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="rounded-md border border-sp-admin-border px-4 py-2 text-sm text-sp-admin-muted hover:text-sp-admin-text transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isBusy}
          className="rounded-md bg-sp-admin-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
