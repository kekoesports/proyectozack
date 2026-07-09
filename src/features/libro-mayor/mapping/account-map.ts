/**
 * Mapping inicial cuentas PGC → entidad del CRM real de SocialPro.
 *
 * Se resuelve por prefijo (3 dígitos). Estático — cualquier cambio requiere
 * PR revisable. NO se resuelve por match parcial fuera de este mapa.
 *
 * `critical: true` marca cuentas que disparan alertas o que son de foco en
 * la vista de resumen.
 *
 * `crmEntity` refleja la ARQUITECTURA REAL del CRM: no existen tablas
 * separadas `expenses` ni `payrolls` — todo son `invoices` con
 * `kind: 'income'|'expense'` y `expenseSubtype`. Los bancos viven en
 * `bank_transactions` (módulo conciliación bancaria).
 *
 * `crmExpenseSubtype` (opcional) apunta al `expenseSubtypeEnum` real cuando
 * aplica. Permite que PR3 (conciliación) filtre `invoices` directamente por
 * subtype sin reescribir el mapping.
 *
 * `categorias` son labels amigables en español para renderizar en UI.
 */

export type CrmEntity =
  | 'invoice_income'        // invoices.kind='income'
  | 'invoice_expense'       // invoices.kind='expense'
  | 'invoice_payroll'       // invoices.kind='expense' with expenseSubtype='nomina_socio'
  | 'bank_transaction'      // tabla bankTransactions
  | 'internal';             // sin contrapartida CRM (patrimonio, IVA, HP, 555…)

export type AccountMapping = {
  readonly prefix: string;
  readonly category: string;
  readonly crmEntity: CrmEntity;
  readonly crmExpenseSubtype?: string;   // subtype dentro de invoices para PR3
  readonly critical: boolean;
  readonly riskNote: string | null;
};

export const ACCOUNT_MAP: readonly AccountMapping[] = [
  // ── Grupo 1 · Financiación básica ─────────────────────────────────────────
  { prefix: '100', category: 'Capital social',                       crmEntity: 'internal',           critical: false, riskNote: null },
  { prefix: '120', category: 'Resultados ejercicios anteriores',     crmEntity: 'internal',           critical: false, riskNote: null },

  // ── Grupo 2 · Activo no corriente ─────────────────────────────────────────
  { prefix: '217', category: 'Equipos IT (inmovilizado material)',   crmEntity: 'invoice_expense',    critical: false, riskNote: null },
  { prefix: '281', category: 'Amortización acumulada',               crmEntity: 'internal',           critical: false, riskNote: 'Contra-cuenta de 217' },

  // ── Grupo 4 · Acreedores/deudores comerciales ─────────────────────────────
  { prefix: '410', category: 'Proveedores (cuentas a pagar)',        crmEntity: 'invoice_expense',    critical: true,  riskNote: 'Cruce con invoices.kind=expense en CRM' },
  { prefix: '430', category: 'Clientes (cuentas a cobrar)',          crmEntity: 'invoice_income',     critical: true,  riskNote: 'Cruce con billing_clients + issued_invoices' },
  { prefix: '465', category: 'Remuneraciones pendientes de pago',    crmEntity: 'invoice_payroll',    crmExpenseSubtype: 'nomina_socio', critical: true,  riskNote: 'Nóminas devengadas no pagadas — cruce invoices status pendiente' },
  { prefix: '470', category: 'HP deudora (IVA / retenciones)',       crmEntity: 'internal',           critical: false, riskNote: null },
  { prefix: '472', category: 'IVA soportado',                        crmEntity: 'internal',           critical: false, riskNote: 'Cruce con IVA de invoices.kind=expense' },
  { prefix: '475', category: 'HP acreedora (retenciones)',           crmEntity: 'internal',           critical: false, riskNote: 'Modelos 111/115' },
  { prefix: '477', category: 'IVA repercutido',                      crmEntity: 'internal',           critical: false, riskNote: 'Cruce con IVA de invoices.kind=income' },

  // ── Grupo 5 · Cuentas financieras ─────────────────────────────────────────
  { prefix: '523', category: 'Proveedores de inmovilizado c/p',      crmEntity: 'invoice_expense',    critical: false, riskNote: null },
  { prefix: '551', category: 'Cuenta corriente socios / administradores', crmEntity: 'internal',      critical: false, riskNote: 'Operaciones vinculadas' },
  { prefix: '555', category: 'Partidas pendientes de aplicación',    crmEntity: 'internal',           critical: true,  riskNote: 'Movs sin clasificar — cerrar con gestoría' },
  { prefix: '565', category: 'Fianzas c/p',                          crmEntity: 'internal',           critical: false, riskNote: null },
  { prefix: '570', category: 'Caja',                                 crmEntity: 'bank_transaction',   critical: true,  riskNote: 'Efectivo real' },
  { prefix: '572', category: 'Bancos',                               crmEntity: 'bank_transaction',   critical: true,  riskNote: 'Cruce con bank_transactions (conciliación bancaria)' },

  // ── Grupo 6 · Compras y gastos ────────────────────────────────────────────
  { prefix: '623', category: 'Servicios profesionales independientes', crmEntity: 'invoice_expense',  crmExpenseSubtype: 'gestoria',              critical: false, riskNote: null },
  { prefix: '629', category: 'Otros servicios (SaaS, hosting)',      crmEntity: 'invoice_expense',    crmExpenseSubtype: 'suscripcion_software',  critical: false, riskNote: null },
  { prefix: '640', category: 'Sueldos y salarios',                   crmEntity: 'invoice_payroll',    crmExpenseSubtype: 'nomina_socio',          critical: true,  riskNote: 'Cruce con invoices.kind=expense + expenseSubtype=nomina_socio' },
  { prefix: '662', category: 'Intereses de deudas',                  crmEntity: 'invoice_expense',    critical: false, riskNote: null },
  { prefix: '678', category: 'Gastos excepcionales',                 crmEntity: 'invoice_expense',    critical: false, riskNote: null },

  // ── Grupo 7 · Ventas e ingresos ───────────────────────────────────────────
  { prefix: '705', category: 'Ingresos por servicios',               crmEntity: 'invoice_income',     critical: true,  riskNote: 'Cruce con invoices.kind=income status cobrada/pagada' },
  { prefix: '755', category: 'Otros ingresos de gestión',            crmEntity: 'invoice_income',     critical: false, riskNote: null },
  { prefix: '769', category: 'Otros ingresos financieros',           crmEntity: 'internal',           critical: false, riskNote: null },
  { prefix: '778', category: 'Ingresos excepcionales',               crmEntity: 'internal',           critical: false, riskNote: null },
] as const;

/**
 * Grupos PGC (primer dígito de la cuenta) — labels para agrupación visual.
 */
export const PGC_GROUPS = {
  '1': 'Financiación básica',
  '2': 'Activo no corriente',
  '3': 'Existencias',
  '4': 'Acreedores/deudores comerciales',
  '5': 'Cuentas financieras',
  '6': 'Compras y gastos',
  '7': 'Ventas e ingresos',
} as const;

export type PgcGroupCode = keyof typeof PGC_GROUPS;
