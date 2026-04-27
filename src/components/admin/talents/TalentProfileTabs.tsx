'use client';

import { useState } from 'react';
import { TalentStatsByPlatform } from '@/components/admin/talents/TalentStatsByPlatform';
import { TalentGeoFiles } from '@/components/admin/talents/TalentGeoFiles';
import { TalentBusinessForm } from '@/components/admin/talents/TalentBusinessForm';
import { TalentCampaignsTab } from '@/components/admin/talents/TalentCampaignsTab';
import type { TalentFullProfile } from '@/lib/queries/talents';
import type { CampaignTalentSummary } from '@/lib/queries/campaigns';
import type { TalentMetricSnapshot, FileRecord } from '@/types';

type Tab = 'overview' | 'stats' | 'geo' | 'negocio' | 'campanas';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'stats', label: 'Stats' },
  { id: 'geo', label: 'GEO' },
  { id: 'negocio', label: 'Negocio' },
  { id: 'campanas', label: 'Campañas' },
];

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  yt: 'YouTube',
  tw: 'Twitch',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  available: 'bg-blue-500/20 text-blue-400',
  inactive: 'bg-sp-admin-muted/20 text-sp-admin-muted',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  available: 'Disponible',
  inactive: 'Inactivo',
};

type Props = {
  readonly talent: TalentFullProfile;
  readonly snapshotsByPlatform: Record<string, TalentMetricSnapshot[]>;
  readonly geoFiles: FileRecord[];
  readonly isManager: boolean;
  readonly campaignSummary: CampaignTalentSummary;
};

export function TalentProfileTabs({ talent, snapshotsByPlatform, geoFiles, isManager, campaignSummary }: Props): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-sp-admin-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-sp-admin-accent text-sp-admin-accent'
                : 'border-transparent text-sp-admin-muted hover:text-sp-admin-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Basic info card */}
          <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
            <h2 className="font-bold text-sp-admin-text text-sm mb-4">Información general</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Slug" value={talent.slug} />
              <InfoRow label="Rol" value={talent.role} />
              <InfoRow label="Juego / Nicho" value={talent.game} />
              <InfoRow label="Plataforma principal" value={PLATFORM_LABELS[talent.platform] ?? talent.platform} />
              <InfoRow
                label="Estado"
                value={
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[talent.status] ?? ''}`}>
                    {STATUS_LABELS[talent.status] ?? talent.status}
                  </span>
                }
              />
              <InfoRow label="Visibilidad" value={talent.visibility === 'public' ? 'Pública' : 'Interna'} />
              {talent.creatorCountry && (
                <InfoRow label="País del creador" value={talent.creatorCountry.toUpperCase()} />
              )}
              {talent.audienceLanguage && (
                <InfoRow label="Idioma audiencia" value={talent.audienceLanguage} />
              )}
              {talent.audienceStatus && (
                <InfoRow label="Estado audiencia" value={talent.audienceStatus} />
              )}
              {talent.lastStatsUpdateAt && (
                <InfoRow
                  label="Última actualización stats"
                  value={new Date(talent.lastStatsUpdateAt).toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                />
              )}
            </div>
          </section>

          {/* Bio */}
          <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
            <h2 className="font-bold text-sp-admin-text text-sm mb-3">Bio</h2>
            <p className="text-sm text-sp-admin-muted leading-relaxed">{talent.bio}</p>
          </section>

          {/* Socials */}
          {talent.socials.length > 0 && (
            <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
              <h2 className="font-bold text-sp-admin-text text-sm mb-4">Redes sociales</h2>
              <div className="space-y-3">
                {talent.socials.map((social) => (
                  <div key={social.id} className="flex items-center justify-between py-2 border-b border-sp-admin-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: social.hexColor }}
                      />
                      <div>
                        <p className="text-sm font-medium text-sp-admin-text">
                          {PLATFORM_LABELS[social.platform] ?? social.platform}
                        </p>
                        <p className="text-xs text-sp-admin-muted">{social.handle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-sp-admin-text">{social.followersDisplay}</p>
                      {social.avgViewers && (
                        <p className="text-xs text-sp-admin-muted">{social.avgViewers.toLocaleString('es-ES')} avg viewers</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {talent.tags.length > 0 && (
            <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
              <h2 className="font-bold text-sp-admin-text text-sm mb-3">Etiquetas</h2>
              <div className="flex flex-wrap gap-2">
                {talent.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sp-admin-border/50 text-sp-admin-muted"
                  >
                    {tag.tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Verticals */}
          {talent.verticals.length > 0 && (
            <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
              <h2 className="font-bold text-sp-admin-text text-sm mb-3">Verticales de negocio</h2>
              <div className="flex flex-wrap gap-2">
                {talent.verticals.map((v) => (
                  <span
                    key={v}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sp-admin-accent/10 text-sp-admin-accent border border-sp-admin-accent/20"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <TalentStatsByPlatform
          talentId={talent.id}
          snapshotsByPlatform={snapshotsByPlatform}
        />
      )}

      {activeTab === 'geo' && (
        <TalentGeoFiles
          talentId={talent.id}
          geoFiles={geoFiles}
          socials={talent.socials}
          isManager={isManager}
        />
      )}

      {activeTab === 'negocio' && (
        <TalentBusinessForm
          talentId={talent.id}
          business={talent.business ?? null}
          verticals={talent.verticals}
        />
      )}

      {activeTab === 'campanas' && (
        <TalentCampaignsTab
          talentId={talent.id}
          campaigns={campaignSummary.campaigns}
          summary={campaignSummary}
        />
      )}
    </div>
  );
}

type InfoRowProps = {
  readonly label: string;
  readonly value: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps): React.ReactElement {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-0.5">{label}</p>
      <div className="text-sm text-sp-admin-text">{value}</div>
    </div>
  );
}
