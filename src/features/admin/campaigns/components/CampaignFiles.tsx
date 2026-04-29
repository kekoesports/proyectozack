'use client';

import { useState } from 'react';

import { EmptyState } from '@/features/admin/_shared/components/EmptyState';

import { FileRow, UploadForm } from './CampaignFiles.parts';

import type { FileRecord } from '@/types';

// ── Main component ─────────────────────────────────────────────────────────────

type Props = {
  readonly files: readonly FileRecord[];
  readonly campaignId: number;
  readonly isManager: boolean;
};

/**
 * Sección del detalle de campaña que lista, sube y elimina archivos asociados (contratos, briefs, assets).
 *
 * @kind client
 * @feature admin/campaigns
 * @route /admin/campanas/[id]
 */
export function CampaignFiles({ files, campaignId, isManager }: Props): React.ReactElement {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sp-admin-text text-sm">
          Archivos{' '}
          {files.length > 0 && (
            <span className="text-sp-admin-muted font-normal">({files.length})</span>
          )}
        </h2>
        {!showUpload && (
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="rounded-md bg-sp-admin-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            + Subir archivo
          </button>
        )}
      </div>

      {/* Upload form */}
      {showUpload && (
        <UploadForm
          campaignId={campaignId}
          onDone={() => setShowUpload(false)}
        />
      )}

      {/* File list */}
      {files.length === 0 && !showUpload ? (
        <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card">
          <EmptyState
            title="Sin archivos"
            description="Sube contratos, briefings, recibos o capturas relacionadas con esta campaña."
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            }
          />
        </div>
      ) : files.length > 0 ? (
        <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card px-5">
          {files.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              campaignId={campaignId}
              canDelete={!isManager}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
