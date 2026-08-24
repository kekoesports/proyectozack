import { AutomationDealCreate } from '@/lib/schemas/automationDeal';

export type AutomationDealValidationIssue = {
  readonly path: string;
  readonly label: string;
  readonly message: string;
};

const FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'Nombre del trato',
  brand: 'Marca',
  'brand.id': 'ID de la marca',
  'brand.name': 'Nombre de la marca',
  talent: 'Creador',
  'talent.id': 'ID del creador',
  'talent.name': 'Nombre del creador',
  'talent.handle': 'Usuario del creador',
  'talent.platform': 'Plataforma del creador',
  'talent.country': 'País del creador',
  status: 'Estado',
  startDate: 'Fecha de inicio',
  endDate: 'Fecha de finalización',
  durationMonths: 'Duración en meses',
  deliveryDeadline: 'Fecha límite de entrega',
  currency: 'Moneda',
  amountBrand: 'Importe de la marca',
  amountTalent: 'Pago al creador',
  amountInKindTalent: 'Producto o crédito para el creador',
  amountInKindCommunity: 'Producto o crédito para la comunidad',
  deliverables: 'Entregables',
  trackingSheetUrl: 'Google Sheet de seguimiento',
};

function formatIssuePath(path: readonly PropertyKey[]): string {
  return path.length > 0 ? path.map(String).join('.') : 'proposedDeal';
}

function issueLabel(path: string): string {
  const exact = FIELD_LABELS[path];
  if (exact) return exact;

  const parts = path.split('.');
  if (parts[0] === 'deliverables' && parts[1] && /^\d+$/.test(parts[1])) {
    const row = Number(parts[1]) + 1;
    const field = parts[2] === 'type'
      ? 'Tipo'
      : parts[2] === 'targetCount'
        ? 'Cantidad'
        : 'Notas';
    return `Entregable ${row} · ${field}`;
  }

  return FIELD_LABELS[parts[0] ?? ''] ?? path;
}

function issueMessage(path: string, message: string): string {
  if (path === 'endDate' || path === 'startDate' || path === 'deliveryDeadline') {
    if (/date|fecha|ISO/i.test(message)) {
      return 'Introduce una fecha real en formato AAAA-MM-DD.';
    }
  }
  if (path === 'deliverables' && /too small|>=1|at least/i.test(message)) {
    return 'Añade al menos un entregable.';
  }
  if (/invalid input|expected|too small|>=1/i.test(message)) {
    return 'Este dato es obligatorio o no tiene un valor válido.';
  }
  return message.endsWith('.') ? message : `${message}.`;
}

export function getAutomationDealValidationIssues(
  proposedDeal: unknown,
): readonly AutomationDealValidationIssue[] {
  const parsed = AutomationDealCreate.safeParse(proposedDeal);
  if (parsed.success) return [];

  const seen = new Set<string>();
  return parsed.error.issues.flatMap((issue) => {
    const path = formatIssuePath(issue.path);
    if (seen.has(path)) return [];
    seen.add(path);
    return [{ path, label: issueLabel(path), message: issueMessage(path, issue.message) }];
  });
}

export function getAutomationDealMissingFields(proposedDeal: unknown): readonly string[] {
  return getAutomationDealValidationIssues(proposedDeal).map((issue) => issue.path);
}
