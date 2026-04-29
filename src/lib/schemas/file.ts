export const FILE_TYPES = [
  'invoice',
  'statement',
  'contract',
  'briefing',
  'geo_stats',
  'screenshot',
  'receipt',
  'other',
] as const;

export const FILE_RELATED_TYPES = [
  'brand',
  'talent',
  'campaign',
  'invoice',
  'followup',
  'task',
] as const;

export type FileType = (typeof FILE_TYPES)[number];
export type FileRelatedType = (typeof FILE_RELATED_TYPES)[number];
