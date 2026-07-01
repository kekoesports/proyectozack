export type ArAgingBucketKey = 'por_vencer' | '0-30' | '31-60' | '61-90' | '+90';

export const AR_AGING_BUCKET_ORDER: readonly ArAgingBucketKey[] = [
  'por_vencer',
  '0-30',
  '31-60',
  '61-90',
  '+90',
] as const;

export const AR_AGING_BUCKET_LABELS: Readonly<Record<ArAgingBucketKey, string>> = {
  por_vencer: 'Por vencer',
  '0-30': '0-30 días',
  '31-60': '31-60 días',
  '61-90': '61-90 días',
  '+90': '+90 días',
} as const;

export type ArAgingSource = 'issued' | 'internal';

export type ArAgingRow = {
  readonly id: number;
  readonly source: ArAgingSource;

  readonly invoiceNumber: string;
  readonly brandName: string | null;
  readonly clientName: string | null;
  readonly entity: string | null;

  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly pendingAmount: number;
  readonly currency: string;

  readonly status: string;

  readonly issueDate: string;
  readonly dueDate: string | null;
  readonly effectiveDueDate: string;
  readonly isEstimatedDueDate: boolean;

  readonly daysOverdue: number;
  readonly bucket: ArAgingBucketKey;

  readonly pdfUrl: string | null;
};

export type ArAgingBucket = {
  readonly key: ArAgingBucketKey;
  readonly amount: number;
  readonly count: number;
  readonly pct: number;
};

export type ArAgingKpis = {
  readonly totalPending: number;
  readonly totalOverdue: number;
  readonly overdueCount: number;
  readonly pendingNotYetDue: number;
  readonly avgDaysOverdue: number | null;
  readonly topDebtorBrand: { readonly name: string; readonly amount: number } | null;
};

export type ArAgingFilters = {
  readonly bucket?: ArAgingBucketKey;
  readonly entity?: string;
  readonly brand?: string;
  readonly source?: ArAgingSource;
};

export type ArAgingData = {
  readonly rows: readonly ArAgingRow[];
  readonly kpis: ArAgingKpis;
  readonly buckets: readonly ArAgingBucket[];
  readonly hasMultipleCurrencies: boolean;
  readonly totalUnfilteredRows: number;
  readonly availableEntities: readonly string[];
  readonly availableBrands: readonly string[];
  readonly appliedFilters: ArAgingFilters;
};
