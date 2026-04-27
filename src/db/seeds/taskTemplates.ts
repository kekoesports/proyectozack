import type { NewCrmTaskTemplate } from '@/types';

export const SEED_TASK_TEMPLATES: readonly Omit<
  NewCrmTaskTemplate,
  'id' | 'createdAt' | 'updatedAt'
>[] = [
  { title: 'Revisar conversaciones de Telegram', category: 'comunicacion', recurrence: 'weekly', defaultPriority: 'media', active: true },
  { title: 'Revisar documentos con los tratos', category: 'documentos', recurrence: 'weekly', defaultPriority: 'alta', active: true },
  { title: 'Revisar si debo algo al CM', category: 'comunicacion', recurrence: 'weekly', defaultPriority: 'media', active: true },
  { title: 'Revisar tratos pendientes', category: 'tratos', recurrence: 'weekly', defaultPriority: 'alta', active: true },
  { title: 'Revisar documentos pendientes', category: 'documentos', recurrence: 'weekly', defaultPriority: 'media', active: true },
  { title: 'Revisar DMs de Twitter', category: 'comunicacion', recurrence: 'weekly', defaultPriority: 'media', active: true },
  { title: 'Revisar DMs de Instagram', category: 'comunicacion', recurrence: 'weekly', defaultPriority: 'media', active: true },
  { title: 'Revisar si debo algo a gestoría', category: 'finanzas', recurrence: 'weekly', defaultPriority: 'alta', active: true },
  { title: 'Revisar correos', category: 'comunicacion', recurrence: 'daily', defaultPriority: 'alta', active: true },
  { title: 'Enviar emails pendientes', category: 'comunicacion', recurrence: 'weekly', defaultPriority: 'media', active: true },
  { title: 'Revisar nuevos perfiles de casino', category: 'descubrimiento', recurrence: 'weekly', defaultPriority: 'baja', active: true },
  { title: 'Revisar nuevos perfiles de CS2', category: 'descubrimiento', recurrence: 'weekly', defaultPriority: 'baja', active: true },
  { title: 'Revisar SullyGnome', category: 'descubrimiento', recurrence: 'weekly', defaultPriority: 'baja', active: true },
  { title: 'Revisar YouTube', category: 'descubrimiento', recurrence: 'weekly', defaultPriority: 'baja', active: true },
  { title: 'Revisar Kick', category: 'descubrimiento', recurrence: 'weekly', defaultPriority: 'baja', active: true },
  { title: 'Revisar Twitch', category: 'descubrimiento', recurrence: 'weekly', defaultPriority: 'baja', active: true },
  { title: 'Revisar quién está en directo', category: 'descubrimiento', recurrence: 'daily', defaultPriority: 'baja', active: true },
  { title: 'Revisar nuevos perfiles potenciales', category: 'descubrimiento', recurrence: 'weekly', defaultPriority: 'media', active: true },
] as const;
