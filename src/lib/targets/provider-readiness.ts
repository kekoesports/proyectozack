import type { CreatorPlatform } from '@/lib/schemas/creator-search-profile';

export type CreatorProviderGate = Readonly<{
  platform: CreatorPlatform;
  ready: boolean;
  code: 'READY' | 'CREDENTIALS_REQUIRED' | 'PROVIDER_APPROVAL_REQUIRED';
  message: string;
}>;

export type CreatorProviderPermission = Readonly<{
  commercialApproved: boolean;
  derivedMetricsApproved: boolean;
  retentionDays: number;
  evidenceRef: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  validUntil: Date | null;
}>;

export function creatorProviderGate(
  platform: CreatorPlatform, hasCredentials: boolean, permission: CreatorProviderPermission | undefined, now: Date,
): CreatorProviderGate {
  if (!hasCredentials) return { platform, ready: false, code: 'CREDENTIALS_REQUIRED',
    message: `${platform}: falta conexión oficial verificada; no se ha utilizado scraping alternativo.` };
  const approved = permission?.commercialApproved === true && permission.derivedMetricsApproved === true
    && permission.retentionDays > 0 && !!permission.evidenceRef?.trim() && !!permission.reviewedBy
    && permission.reviewedAt !== null && permission.reviewedAt <= now
    && (permission.validUntil === null || permission.validUntil > now);
  if (!approved) return { platform, ready: false, code: 'PROVIDER_APPROVAL_REQUIRED',
    message: `${platform}: pendiente verificar autorización para este uso comercial, scoring y conservación; la clave API no acredita ese permiso.` };
  if (permission.evidenceRef?.startsWith('user-attestation:')) return { platform, ready: true, code: 'READY',
    message: `${platform}: autorización declarada por el responsable; soporte documental pendiente. Conexión configurada; su funcionamiento se comprueba en las ejecuciones.` };
  return { platform, ready: true, code: 'READY', message: `${platform}: conexión y autorización registradas.` };
}
