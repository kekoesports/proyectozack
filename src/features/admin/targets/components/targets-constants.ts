/**
 * Constantes y tipos compartidos por la feature admin/targets:
 * status (pendiente/contactado/finalizado/descartado), platforms (IG/YT/TW/Kick),
 * sort fields y paletas de color asociadas para tabs y badges.
 *
 * @feature admin/targets
 */
export type SortField = 'username' | 'followers' | 'status' | 'createdAt';
export type SortDir = 'asc' | 'desc';
export type SortState = { field: SortField; dir: SortDir };
export type StatusValue = 'pendiente' | 'contactado' | 'finalizado' | 'descartado';
export type StatusFilter = 'todos' | StatusValue;
export type PlatformValue = 'instagram' | 'youtube' | 'twitch' | 'kick';

export const PLATFORMS: readonly PlatformValue[] = ['instagram', 'youtube', 'twitch', 'kick'] as const;

export const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  youtube: '#FF0000',
  twitch: '#9146FF',
  kick: '#53FC18',
};

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube:   'YouTube',
  twitch:    'Twitch',
  kick:      'Kick',
};

export const STATUS_COLORS: Record<StatusValue, string> = {
  pendiente: 'bg-amber-900/30 text-amber-400',
  contactado: 'bg-blue-900/30 text-blue-400',
  finalizado: 'bg-emerald-900/30 text-emerald-400',
  descartado: 'bg-sp-admin-bg text-sp-admin-muted/60',
};

export const STATUS_TEXT_COLORS: Record<StatusValue, string> = {
  pendiente: 'text-amber-400',
  contactado: 'text-blue-400',
  finalizado: 'text-emerald-400',
  descartado: 'text-sp-admin-muted/60',
};

export const STATUS_LABELS: Record<StatusValue, string> = {
  pendiente: 'Pendiente',
  contactado: 'Contactado',
  finalizado: 'Finalizado',
  descartado: 'Descartado',
};

export const STATUS_TAB_COLORS: Record<StatusFilter, string> = {
  todos: 'text-sp-admin-text border-sp-admin-accent',
  pendiente: 'text-amber-400 border-amber-400',
  contactado: 'text-blue-400 border-blue-400',
  finalizado: 'text-emerald-400 border-emerald-400',
  descartado: 'text-sp-admin-muted/70 border-sp-admin-muted/40',
};

export const STATUS_VALUES: readonly StatusValue[] = ['pendiente', 'contactado', 'finalizado', 'descartado'] as const;
export const STATUS_FILTERS: readonly StatusFilter[] = ['todos', 'pendiente', 'contactado', 'finalizado', 'descartado'] as const;
