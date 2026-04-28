// Mock data para el dashboard del CRM.
// Los datos marcados con [MOCK] deben conectarse al backend cuando existan las queries.
// Los datos marcados con [REAL] ya están conectados a datos reales.

// ── Pipeline evolution [MOCK] ─────────────────────────────────────────

export type PipelinePoint = { date: string; value: number };

export const MOCK_PIPELINE_7D: PipelinePoint[] = [
  { date: '22 Abr', value: 15200 },
  { date: '23 Abr', value: 15800 },
  { date: '24 Abr', value: 16100 },
  { date: '25 Abr', value: 15600 },
  { date: '26 Abr', value: 17200 },
  { date: '27 Abr', value: 17800 },
  { date: '28 Abr', value: 18400 },
];

export const MOCK_PIPELINE_30D: PipelinePoint[] = [
  { date: '29 Mar', value: 9800 },
  { date: '5 Abr',  value: 11200 },
  { date: '12 Abr', value: 12800 },
  { date: '19 Abr', value: 14500 },
  { date: '22 Abr', value: 15200 },
  { date: '25 Abr', value: 17200 },
  { date: '28 Abr', value: 18400 },
];

export const MOCK_PIPELINE_90D: PipelinePoint[] = [
  { date: 'Feb',     value: 4200 },
  { date: '1 Mar',   value: 6800 },
  { date: '15 Mar',  value: 8200 },
  { date: '1 Abr',   value: 9800 },
  { date: '15 Abr',  value: 14500 },
  { date: '28 Abr',  value: 18400 },
];

export const MOCK_PIPELINE_TOTAL = 18_400;
export const MOCK_PIPELINE_TREND = 24; // % positivo

// ── Activity feed [MOCK] ──────────────────────────────────────────────

export type ActivityIcon = 'brand' | 'lead' | 'deal' | 'task' | 'invoice' | 'talent';

export type ActivityItem = {
  readonly id: number;
  readonly icon: ActivityIcon;
  readonly text: string;
  readonly entity: string;
  readonly time: Date;
};

const now = Date.now();

export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 1, icon: 'brand',   text: 'Nueva marca añadida',             entity: 'Winamax ES',       time: new Date(now - 2 * 3600_000) },
  { id: 2, icon: 'lead',    text: 'Lead actualizado a negociación',  entity: 'JD Sports',        time: new Date(now - 5 * 3600_000) },
  { id: 3, icon: 'deal',    text: 'Deal ganado',                     entity: 'New Balance',      time: new Date(now - 24 * 3600_000) },
  { id: 4, icon: 'task',    text: 'Tarea completada',                entity: 'Follow-up Pringles', time: new Date(now - 2 * 86_400_000) },
  { id: 5, icon: 'invoice', text: 'Factura emitida',                 entity: 'SocialPro Agency', time: new Date(now - 3 * 86_400_000) },
];

// ── Insights [MOCK + generados dinámicamente en page.tsx] ─────────────

export type InsightType = 'danger' | 'warning' | 'success';

export type InsightItem = {
  readonly id: number;
  readonly type: InsightType;
  readonly text: string;
  readonly action?: string;
  readonly actionHref?: string;
};

export const MOCK_INSIGHTS: InsightItem[] = [
  {
    id: 1,
    type: 'danger',
    text: 'Tienes 3 deals sin actividad en los últimos 7 días',
    action: 'Revisar marcas',
    actionHref: '/admin/brands',
  },
  {
    id: 2,
    type: 'warning',
    text: 'Has recibido 1 lead esta semana. Media: 4 leads',
    action: 'Activar prospección',
    actionHref: '/admin/brands',
  },
  {
    id: 3,
    type: 'success',
    text: 'Tu tasa de cierre este mes es del 40%',
  },
];

// ── KPI mock values [MOCK] ────────────────────────────────────────────

export const MOCK_DEALS_WON = { value: 0, trend: 0 };
