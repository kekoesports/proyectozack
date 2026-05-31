'use client';

import { useState } from 'react';
import type { GiveawayWithTalent, CreatorCodeWithTalent } from '@/types';
import type { CrmBrandPickerEntry } from '@/lib/queries/crmBrands';
import { EditGiveawayModal } from '@/app/admin/(dashboard)/giveaways/EditGiveawayModal';
import { EditCodeModal } from '@/app/admin/(dashboard)/giveaways/EditCodeModal';
import { CreateGiveawayForm } from '@/app/admin/(dashboard)/giveaways/CreateGiveawayForm';
import { CreateCodeForm } from '@/app/admin/(dashboard)/giveaways/CreateCodeForm';

type TalentRef = { readonly id: number; readonly name: string; readonly slug: string };

type Props = {
  readonly giveaways: readonly GiveawayWithTalent[];
  readonly codes: readonly CreatorCodeWithTalent[];
  readonly talent: TalentRef;
  readonly brandCatalog: readonly CrmBrandPickerEntry[];
};

const BADGE_LABELS: Record<string, string> = {
  TOP: '🔥 TOP',
  RECOMENDADO: '⭐ Rec.',
  MEJOR_BONUS: '💎 Bonus',
  NUEVO: '✨ Nuevo',
  MAS_USADO: '🚀 Más usado',
  EXCLUSIVO: '👑 Excl.',
};

function isGiveawayActive(g: GiveawayWithTalent): boolean {
  return !g.endsAt || new Date(g.endsAt) > new Date();
}

function CreateModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-sp-admin-card border border-sp-admin-border shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-sp-admin-border bg-sp-admin-card z-10">
          <div>
            <h2 className="font-display text-lg font-bold uppercase text-sp-admin-text">{title}</h2>
            <p className="text-xs text-sp-admin-muted mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sp-admin-hover text-sp-admin-muted hover:text-sp-admin-text transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function TalentGiveawaysSection({ giveaways, codes, talent, brandCatalog }: Props): React.ReactElement {
  const [activeTab, setActiveTab]           = useState<'giveaways' | 'codes'>('giveaways');
  const [editingCode, setEditingCode]       = useState<CreatorCodeWithTalent | null>(null);
  const [showCreateGiveaway, setShowCreateGiveaway] = useState(false);
  const [showCreateCode, setShowCreateCode] = useState(false);

  const talents = [{ id: talent.id, name: talent.name, slug: talent.slug }];

  return (
    <section className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Sorteos &amp; Códigos</h2>
          <div className="flex items-center gap-1">
            {(['giveaways', 'codes'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-sp-admin-accent text-white'
                    : 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover'
                }`}
              >
                {tab === 'giveaways' ? `Giveaways (${giveaways.length})` : `Códigos (${codes.length})`}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => (activeTab === 'giveaways' ? setShowCreateGiveaway(true) : setShowCreateCode(true))}
          className="text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity"
        >
          + Nuevo {activeTab === 'giveaways' ? 'giveaway' : 'código'}
        </button>
      </div>

      {/* Giveaways tab */}
      {activeTab === 'giveaways' && (
        giveaways.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-sp-admin-muted">Sin sorteos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-hover/30">
                  {['Imagen', 'Título', 'Marca', 'Valor', 'Estado', 'Dest.', 'Fin', ''].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {giveaways.map((g) => {
                  const active = isGiveawayActive(g);
                  return (
                    <tr key={g.id} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                      <td className="px-4 py-2.5">
                        {g.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.imageUrl} alt={g.title} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-sp-admin-hover flex items-center justify-center text-[10px] text-sp-admin-muted">?</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] font-medium text-sp-admin-text max-w-[200px] truncate">{g.title}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {g.brandLogo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={g.brandLogo} alt={g.brandName} className="w-5 h-5 rounded object-contain" />
                          )}
                          <span className="text-[11px] text-sp-admin-muted">{g.brandName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-sp-admin-text font-semibold tabular-nums">{g.value ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {active ? 'Activo' : 'Finalizado'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {g.isFeatured && <span className="text-amber-500">★</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-sp-admin-muted whitespace-nowrap">
                        {g.endsAt ? new Date(g.endsAt).toLocaleDateString('es-ES') : '∞'}
                      </td>
                      <td className="px-4 py-2.5">
                        <EditGiveawayModal giveaway={g} brandCatalog={brandCatalog} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Códigos tab */}
      {activeTab === 'codes' && (
        codes.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-sp-admin-muted">Sin códigos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-hover/30">
                  {['Código', 'Marca', 'Categoría', 'Badge', 'Dest.', 'CTA', ''].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[12px] font-bold text-sp-admin-accent">{c.code}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {c.brandLogo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.brandLogo} alt={c.brandName} className="w-5 h-5 rounded object-contain" />
                        )}
                        <span className="text-[11px] text-sp-admin-muted">{c.brandName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-sp-admin-muted capitalize">{c.category ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[11px]">{c.badge ? (BADGE_LABELS[c.badge] ?? c.badge) : '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {c.isFeatured && <span className="text-amber-500">★</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={c.ctaUrl ?? c.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-sp-admin-accent hover:underline max-w-[140px] truncate block"
                      >
                        {c.ctaText ?? 'Ver'}
                      </a>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setEditingCode(c)}
                        className="text-sp-admin-accent hover:opacity-80 text-xs font-bold transition-opacity"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal editar código */}
      {editingCode && (
        <EditCodeModal
          code={editingCode}
          talents={talents}
          brandCatalog={brandCatalog}
          onClose={() => setEditingCode(null)}
        />
      )}

      {/* Modal crear giveaway */}
      {showCreateGiveaway && (
        <CreateModal
          title="Nuevo Giveaway"
          subtitle={talent.name}
          onClose={() => setShowCreateGiveaway(false)}
        >
          <CreateGiveawayForm talents={talents} defaultTalentId={talent.id} />
        </CreateModal>
      )}

      {/* Modal crear código */}
      {showCreateCode && (
        <CreateModal
          title="Nuevo Código"
          subtitle={talent.name}
          onClose={() => setShowCreateCode(false)}
        >
          <CreateCodeForm talents={talents} brandCatalog={brandCatalog} defaultTalentId={talent.id} />
        </CreateModal>
      )}
    </section>
  );
}
