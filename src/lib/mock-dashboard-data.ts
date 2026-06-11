// Mock data para el dashboard del CRM.
// Los datos marcados con [MOCK] deben conectarse al backend cuando existan las queries.
// Los datos marcados con [REAL] ya están conectados a datos reales.

// ── Pipeline evolution [MOCK] ─────────────────────────────────────────

export type PipelinePoint = { date: string; value: number };

export const MOCK_PIPELINE_7D: PipelinePoint[] = [
  { date: '4 Jun',  value: 15200 },
  { date: '5 Jun',  value: 15800 },
  { date: '6 Jun',  value: 16100 },
  { date: '7 Jun',  value: 15600 },
  { date: '8 Jun',  value: 17200 },
  { date: '9 Jun',  value: 17800 },
  { date: '10 Jun', value: 18400 },
];

export const MOCK_PIPELINE_30D: PipelinePoint[] = [
  { date: '12 May', value: 9800 },
  { date: '19 May', value: 11200 },
  { date: '26 May', value: 12800 },
  { date: '2 Jun',  value: 14500 },
  { date: '5 Jun',  value: 15200 },
  { date: '8 Jun',  value: 17200 },
  { date: '10 Jun', value: 18400 },
];

export const MOCK_PIPELINE_90D: PipelinePoint[] = [
  { date: 'Mar',    value: 4200 },
  { date: '1 Abr',  value: 6800 },
  { date: '15 Abr', value: 8200 },
  { date: '1 May',  value: 9800 },
  { date: '15 May', value: 14500 },
  { date: '10 Jun', value: 18400 },
];

// ── Insights [MOCK — pendiente query real] ───────────────────────────

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
