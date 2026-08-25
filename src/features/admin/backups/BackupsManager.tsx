'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createManualBackupAction } from '@/app/admin/(dashboard)/backups/backup-actions';
import { getDriveDownloadUrl } from '@/lib/backup/drive-upload';
import type { DriveFile } from '@/lib/backup/drive-upload';
import type { BackupHealthSummary } from '@/lib/queries/backupHealth';

// ── Helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtSize(bytes: string | undefined): string {
  if (!bytes) return '—';
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function getBackupType(name: string): { label: string; color: string } {
  if (name.includes('manual'))  return { label: 'Manual',  color: '#8b3aad' };
  if (name.includes('semanal')) return { label: 'Semanal', color: '#5b9bd5' };
  return                               { label: 'Diario',  color: '#f5632a' };
}

// ── Props ─────────────────────────────────────────────────────────────

type Props = {
  readonly files:         readonly DriveFile[];
  readonly initialError:  string | null;
  readonly isConfigured:  boolean;
  readonly vpsHealth: BackupHealthSummary;
};

// ── Component ─────────────────────────────────────────────────────────

export function BackupsManager({ files: initialFiles, initialError, isConfigured, vpsHealth }: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result,    setResult]       = useState<{ ok?: boolean; msg?: string; file?: DriveFile } | null>(null);

  function handleBackup(): void {
    setResult(null);
    startTransition(async () => {
      const res = await createManualBackupAction();
      if (res.success) {
        setResult({
          ok:  true,
          msg: `✓ Backup creado: ${res.file.name} · ${res.totalRows} registros en ${res.tables} tablas`,
          file: res.file,
        });
        router.refresh();
      } else {
        setResult({ ok: false, msg: res.error });
      }
    });
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-text leading-none">Copias de seguridad</h1>
          <p className="text-[11px] text-sp-admin-muted mt-1">
            Estado real de la copia cifrada del VPS y exportaciones JSON opcionales
          </p>
        </div>
        <button
          type="button"
          onClick={handleBackup}
          disabled={isPending || !isConfigured}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-all active:scale-95"
        >
          {isPending ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M7 1v8M3.5 5.5L7 9l3.5-3.5M1 12h12"/>
            </svg>
          )}
          {isPending ? 'Exportando…' : 'Exportar JSON ahora'}
        </button>
      </div>

      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-5 py-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Copia completa cifrada · VPS → Google Drive</p>
            <p className="mt-1 text-sm font-semibold text-sp-admin-text">Base del CRM, n8n, documentos y configuración recuperable</p>
          </div>
          <BackupStatusBadge status={vpsHealth.status} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusMetric label="Última copia" value={vpsHealth.lastBackupAt ? fmtDate(vpsHealth.lastBackupAt) : 'Sin señal'} />
          <StatusMetric label="Antigüedad" value={vpsHealth.ageHours === null ? 'Desconocida' : `${vpsHealth.ageHours} h`} />
          <StatusMetric label="Frecuencia" value="Cada 6 horas" />
        </div>
        <p className="text-[11px] leading-relaxed text-sp-admin-muted">
          Los nombres y contenidos salen cifrados del VPS. Esta señal la envía Zack Guardian; un archivo JSON manual no sustituye esta copia completa.
        </p>
      </div>

      {/* Banner configuración */}
      {!isConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-amber-500 text-[15px] shrink-0 mt-0.5" aria-hidden>⚠</span>
          <div>
            <p className="text-[12px] font-semibold text-amber-800">Exportación JSON manual no configurada</p>
            <p className="text-[11px] text-amber-700/80 mt-0.5">
              La copia completa cifrada de arriba no depende de esta opción y sigue funcionando. Esta sección solo sirve para generar exportaciones JSON puntuales desde el CRM.
            </p>
          </div>
        </div>
      )}

      {/* Resultado de backup manual */}
      {result && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
          result.ok
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-red-200 bg-red-50'
        }`}>
          <span className={`text-[15px] shrink-0 mt-0.5 ${result.ok ? 'text-emerald-500' : 'text-red-500'}`} aria-hidden>
            {result.ok ? '✓' : '✕'}
          </span>
          <div className="flex-1">
            <p className={`text-[12px] font-semibold ${result.ok ? 'text-emerald-800' : 'text-red-800'}`}>
              {result.msg}
            </p>
            {result.ok && result.file && (
              <div className="flex items-center gap-3 mt-1.5">
                <a href={result.file.webViewLink} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-emerald-700 hover:underline">
                  Ver en Drive →
                </a>
                <a href={getDriveDownloadUrl(result.file.id)} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-emerald-700 hover:underline">
                  Descargar →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error inicial */}
      {initialError && !result && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-red-500 text-[15px] shrink-0 mt-0.5" aria-hidden>✕</span>
          <p className="text-[12px] text-red-800">{initialError}</p>
        </div>
      )}

      {/* Lista de backups */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-bold text-sp-admin-text">
            Exportaciones JSON en Google Drive
            {initialFiles.length > 0 && (
              <span className="ml-1.5 text-[10px] font-normal text-sp-admin-muted">
                ({initialFiles.length} archivos)
              </span>
            )}
          </p>
        </div>

        {initialFiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
            <p className="text-[13px] text-sp-admin-muted">
              {isConfigured
                ? 'No hay exportaciones JSON todavía. Puedes crear una con el botón de arriba.'
                : 'La exportación JSON opcional no está configurada.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-hover/30">
                  {['Archivo', 'Tipo', 'Fecha', 'Tamaño', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-sp-admin-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initialFiles.map((f) => {
                  const { label, color } = getBackupType(f.name);
                  return (
                    <tr key={f.id} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                      <td className="px-4 py-2.5 text-[12px] font-mono text-sp-admin-text max-w-[220px] truncate" title={f.name}>
                        {f.name}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: `${color}15`, color }}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-sp-admin-muted whitespace-nowrap">
                        {fmtDate(f.createdTime)}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-sp-admin-muted tabular-nums">
                        {fmtSize(f.size)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <a href={f.webViewLink} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-sp-admin-accent hover:underline">
                            Ver Drive
                          </a>
                          <a href={getDriveDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:underline">
                            Descargar
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function BackupStatusBadge({ status }: { readonly status: BackupHealthSummary['status'] }): React.ReactElement {
  const styles = {
    healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    failed: 'border-red-200 bg-red-50 text-red-700',
    unknown: 'border-slate-200 bg-slate-50 text-slate-600',
  } as const;
  const labels = { healthy: 'Al día', warning: 'Revisar', failed: 'Fallo', unknown: 'Sin señal' } as const;
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function StatusMetric({ label, value }: { readonly label: string; readonly value: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-sp-admin-border bg-sp-admin-bg/40 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-sp-admin-muted">{label}</p>
      <p className="mt-1 text-xs font-semibold text-sp-admin-text">{value}</p>
    </div>
  );
}
