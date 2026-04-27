import { and, asc, desc, eq, getTableColumns, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';

import { campaigns, crmBrands, crmTaskTemplates, crmTasks, invoices, talents, user } from '@/db/schema';
import { db } from '@/lib/db';
import { toLocalIsoDate } from '@/lib/utils/date';
import { getIsoWeekLabel } from '@/lib/utils/week';

import type { Role } from '@/lib/auth-guard';
import type {
  CrmTask,
  CrmTaskStatus,
  CrmTaskTemplate,
  NewCrmTask,
  TeamTasksSummary,
} from '@/types';

type TaskSession = {
  readonly userId: string;
  readonly role: Role;
};

type UpdatableFields = Pick<
  CrmTask,
  | 'title'
  | 'description'
  | 'dueDate'
  | 'priority'
  | 'status'
  | 'category'
  | 'ownerId'
  | 'assignedToUserId'
  | 'createdByUserId'
  | 'recurrenceTemplateId'
  | 'relatedType'
  | 'relatedId'
>;

const PRIORITY_ORDER = sql`CASE ${crmTasks.priority}
  WHEN 'alta' THEN 0
  WHEN 'media' THEN 1
  WHEN 'baja' THEN 2
END`;

function todayMadridIso(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function toIsoDate(date: Date): string {
  // Use LOCAL Y/M/D — `toISOString()` would shift to UTC and rebobinate
  // a day in any tz east of UTC (Madrid GMT+1).
  return toLocalIsoDate(date);
}

function endOfWeekIso(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  utc.setUTCDate(utc.getUTCDate() + daysUntilSunday);
  return toIsoDate(utc);
}

function endOfMonthIso(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return toIsoDate(utc);
}

function visibilityCondition(session?: TaskSession) {
  if (!session || session.role === 'admin' || session.role === 'manager') return undefined;
  return or(
    eq(crmTasks.assignedToUserId, session.userId),
    eq(crmTasks.createdByUserId, session.userId),
    eq(crmTasks.ownerId, session.userId),
  );
}

/**
 * Lista las tareas del CRM de una semana ISO (`weekLabel`), enriquecidas con `recurrence`
 * de su template. Aplica filtro de visibilidad si el rol lo requiere (staff).
 * Orden: prioridad alta→baja, dueDate ASC, createdAt DESC.
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns array readonly (puede ser vacío). Nunca null.
 */
export async function getTasksForWeek(
  weekLabel: string,
  options?: { readonly session?: TaskSession },
): Promise<readonly CrmTask[]> {
  const filters = [eq(crmTasks.weekLabel, weekLabel)];
  const visible = visibilityCondition(options?.session);
  if (visible !== undefined) filters.push(visible);

  return db
    .select({
      ...getTableColumns(crmTasks),
      recurrence: crmTaskTemplates.recurrence,
    })
    .from(crmTasks)
    .leftJoin(crmTaskTemplates, eq(crmTaskTemplates.id, crmTasks.recurrenceTemplateId))
    .where(and(...filters))
    .orderBy(asc(PRIORITY_ORDER), asc(crmTasks.dueDate), desc(crmTasks.createdAt));
}

/**
 * Lista las tareas asignadas o cuya owner sea `ownerId` para una semana ISO.
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns array readonly (puede ser vacío). Nunca null.
 */
export async function getMyTasks(ownerId: string, weekLabel: string): Promise<readonly CrmTask[]> {
  return db
    .select({
      ...getTableColumns(crmTasks),
      recurrence: crmTaskTemplates.recurrence,
    })
    .from(crmTasks)
    .leftJoin(crmTaskTemplates, eq(crmTaskTemplates.id, crmTasks.recurrenceTemplateId))
    .where(
      and(
        eq(crmTasks.weekLabel, weekLabel),
        or(eq(crmTasks.assignedToUserId, ownerId), eq(crmTasks.ownerId, ownerId)),
      ),
    )
    .orderBy(asc(PRIORITY_ORDER), asc(crmTasks.dueDate), desc(crmTasks.createdAt));
}

/**
 * Resumen por usuario interno (admin/manager/staff) para una semana: completadas,
 * pendientes y vencidas (overdue). Comparación de overdue en fecha civil de Madrid.
 *
 * @cache none
 * @visibility admin
 * @returns array readonly con un row por usuario interno (incluso si no tiene tareas).
 */
export async function getTeamTasksSummary(weekLabel: string): Promise<readonly TeamTasksSummary[]> {
  // Today in Madrid-civil date for the overdue comparison — due_date is a DATE.
  const todayMadrid = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      completed: sql<number>`COALESCE(SUM(CASE WHEN ${crmTasks.weekLabel} = ${weekLabel} AND ${crmTasks.status} = 'completada' THEN 1 ELSE 0 END), 0)::int`,
      pending: sql<number>`COALESCE(SUM(CASE WHEN ${crmTasks.weekLabel} = ${weekLabel} AND ${crmTasks.status} IN ('pendiente','en_progreso') THEN 1 ELSE 0 END), 0)::int`,
      overdue: sql<number>`COALESCE(SUM(CASE WHEN ${crmTasks.weekLabel} = ${weekLabel} AND ${crmTasks.status} IN ('pendiente','en_progreso') AND ${crmTasks.dueDate} IS NOT NULL AND ${crmTasks.dueDate} < ${todayMadrid}::date THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(user)
    .leftJoin(crmTasks, eq(crmTasks.ownerId, user.id))
    .where(inArray(user.role, ['admin', 'manager', 'staff']))
    .groupBy(user.id, user.name, user.email, user.role)
    .orderBy(asc(user.name));

  return rows;
}

/**
 * Lista las categorías de tareas usadas alguna vez, ordenadas por frecuencia descendente.
 * Útil para autocompletado en el formulario de creación.
 *
 * @cache none
 * @visibility admin
 * @returns array readonly de strings (puede ser vacío).
 */
export async function getUsedCategories(): Promise<readonly string[]> {
  const rows = await db
    .select({
      category: crmTasks.category,
      uses: sql<number>`count(*)::int`,
    })
    .from(crmTasks)
    .groupBy(crmTasks.category)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => r.category);
}

/**
 * Crea una tarea en el CRM. Los campos derivados (`completedAt`, `rolledOver`, `rolledFromWeek`)
 * los gestiona el sistema, por eso se excluyen del input.
 *
 * @cache none
 * @visibility admin
 * @returns la fila insertada. Lanza si la inserción falla.
 */
export async function createTask(
  input: Omit<NewCrmTask, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'rolledOver' | 'rolledFromWeek'>,
): Promise<CrmTask> {
  const [row] = await db.insert(crmTasks).values(input).returning();
  if (!row) throw new Error('Failed to insert crm task');
  return row;
}

/**
 * Patch parcial de una tarea. Si el patch fija `status='completada'`, stamp `completedAt=NOW()`
 * (preservando si ya existe). Si cambia el status a otro valor, resetea `completedAt=null`.
 *
 * @cache none
 * @visibility admin
 * @returns la fila actualizada o `null` si no existe.
 */
export async function updateTask(
  id: number,
  patch: Partial<UpdatableFields>,
): Promise<CrmTask | null> {
  const completedAtPatch =
    patch.status === 'completada'
      ? { completedAt: sql`COALESCE(${crmTasks.completedAt}, NOW())` }
      : patch.status !== undefined
        ? { completedAt: null }
        : {};

  const [row] = await db
    .update(crmTasks)
    .set({ ...patch, ...completedAtPatch, updatedAt: new Date() })
    .where(eq(crmTasks.id, id))
    .returning();
  return row ?? null;
}

/**
 * Atajo para marcar una tarea como completada. Stamp `status='completada'` y `completedAt=now`.
 *
 * @cache none
 * @visibility admin
 * @returns la fila actualizada o `null` si no existe.
 */
export async function completeTask(id: number): Promise<CrmTask | null> {
  const [row] = await db
    .update(crmTasks)
    .set({ status: 'completada', completedAt: new Date(), updatedAt: new Date() })
    .where(eq(crmTasks.id, id))
    .returning();
  return row ?? null;
}

/**
 * Comprueba si un usuario puede ser asignado a una tarea (rol admin/manager/staff).
 *
 * @cache none
 * @visibility admin
 * @returns `true` si el usuario es interno y puede recibir tareas.
 */
export async function isAssignableTaskUser(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) return false;
  return row.role === 'admin' || row.role === 'manager' || row.role === 'staff';
}

/**
 * Alias de `isAssignableTaskUser`. Mantiene una API legacy para call-sites antiguos.
 *
 * @cache none
 * @visibility admin
 * @returns `true` si el usuario es admin/manager/staff.
 */
export async function isStaffUser(userId: string): Promise<boolean> {
  return isAssignableTaskUser(userId);
}

/**
 * Borra una tarea por id (hard delete).
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function deleteTask(id: number): Promise<void> {
  await db.delete(crmTasks).where(eq(crmTasks.id, id));
}

/**
 * Moves every pending/in_progress task from `fromWeek` into `toWeek`, stamping
 * `rolled_over=true` and `rolled_from_week=fromWeek`. Idempotent across the
 * same week pair: a second run has no rows to match.
 */
export async function rollOverPendingTasks(
  fromWeek: string,
  toWeek: string,
): Promise<{ readonly rolled: number }> {
  const rolled = await db
    .update(crmTasks)
    .set({
      weekLabel: toWeek,
      rolledOver: true,
      rolledFromWeek: fromWeek,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmTasks.weekLabel, fromWeek),
        inArray(crmTasks.status, ['pendiente', 'en_progreso'] as const satisfies readonly CrmTaskStatus[]),
      ),
    )
    .returning({ id: crmTasks.id });

  return { rolled: rolled.length };
}

export type RelatedOptionList = {
  readonly brand: ReadonlyArray<{ readonly id: number; readonly label: string }>;
  readonly talent: ReadonlyArray<{ readonly id: number; readonly label: string }>;
  readonly campaign: ReadonlyArray<{ readonly id: number; readonly label: string }>;
  readonly invoice: ReadonlyArray<{ readonly id: number; readonly label: string }>;
  readonly general: ReadonlyArray<{ readonly id: number; readonly label: string }>;
};

/**
 * Devuelve listas de opciones (brand/talent/campaign/invoice) para el selector de
 * relacionado en el form de crear/editar tarea. Invoice limit 200 por rendimiento.
 *
 * @cache none
 * @visibility admin
 * @returns objeto con 5 keys (`brand`, `talent`, `campaign`, `invoice`, `general`),
 *   cada una array de `{ id, label }`. `general` siempre vacío (placeholder).
 */
export async function getTaskRelatedOptions(): Promise<RelatedOptionList> {
  const [brandRows, talentRows, invoiceRows, campaignRows] = await Promise.all([
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    db
      .select({ id: invoices.id, number: invoices.number, concept: invoices.concept })
      .from(invoices)
      .orderBy(desc(invoices.issueDate))
      .limit(200),
    db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        brandName: crmBrands.name,
        talentName: talents.name,
      })
      .from(campaigns)
      .innerJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
      .innerJoin(talents, eq(talents.id, campaigns.talentId))
      .where(isNull(campaigns.archivedAt))
      .orderBy(desc(campaigns.createdAt)),
  ]);

  return {
    brand: brandRows.map((r) => ({ id: r.id, label: r.name })),
    talent: talentRows.map((r) => ({ id: r.id, label: r.name })),
    campaign: campaignRows.map((r) => ({
      id: r.id,
      label: r.brandName && r.talentName ? `${r.brandName} × ${r.talentName}` : r.name,
    })),
    invoice: invoiceRows.map((r) => ({ id: r.id, label: r.number ? `${r.number} — ${r.concept}` : r.concept })),
    general: [],
  };
}

export type RelatedLabel = {
  readonly type: 'brand' | 'talent' | 'campaign' | 'invoice';
  readonly id: number;
  readonly label: string;
};

/**
 * Para una lista de tareas, resuelve los labels humanos de sus `relatedType:relatedId` en una
 * sola pasada (4 queries IN). Útil para listas con badges contextuales.
 *
 * @cache none
 * @visibility admin
 * @returns map readonly `"<type>:<id>" -> { type, id, label }`. Solo contiene entries resueltos.
 */
export async function resolveRelatedLabels(
  tasks: readonly CrmTask[],
): Promise<ReadonlyMap<string, RelatedLabel>> {
  const brandIds = new Set<number>();
  const talentIds = new Set<number>();
  const campaignIds = new Set<number>();
  const invoiceIds = new Set<number>();
  for (const t of tasks) {
    if (t.relatedType === 'brand' && t.relatedId) brandIds.add(t.relatedId);
    else if (t.relatedType === 'talent' && t.relatedId) talentIds.add(t.relatedId);
    else if (t.relatedType === 'campaign' && t.relatedId) campaignIds.add(t.relatedId);
    else if (t.relatedType === 'invoice' && t.relatedId) invoiceIds.add(t.relatedId);
  }

  const map = new Map<string, RelatedLabel>();

  if (brandIds.size > 0) {
    const rows = await db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).where(inArray(crmBrands.id, [...brandIds]));
    for (const r of rows) map.set(`brand:${r.id}`, { type: 'brand', id: r.id, label: r.name });
  }
  if (talentIds.size > 0) {
    const rows = await db.select({ id: talents.id, name: talents.name }).from(talents).where(inArray(talents.id, [...talentIds]));
    for (const r of rows) map.set(`talent:${r.id}`, { type: 'talent', id: r.id, label: r.name });
  }
  if (campaignIds.size > 0) {
    const rows = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        brandName: crmBrands.name,
        talentName: talents.name,
      })
      .from(campaigns)
      .innerJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
      .innerJoin(talents, eq(talents.id, campaigns.talentId))
      .where(inArray(campaigns.id, [...campaignIds]));
    for (const r of rows) {
      map.set(`campaign:${r.id}`, {
        type: 'campaign',
        id: r.id,
        label: r.brandName && r.talentName ? `${r.brandName} × ${r.talentName}` : r.name,
      });
    }
  }
  if (invoiceIds.size > 0) {
    const rows = await db.select({
      id: invoices.id,
      number: invoices.number,
      concept: invoices.concept,
    }).from(invoices).where(inArray(invoices.id, [...invoiceIds]));
    for (const r of rows) map.set(`invoice:${r.id}`, { type: 'invoice', id: r.id, label: r.number ? `${r.number} — ${r.concept}` : r.concept });
  }

  return map;
}

/**
 * Cuenta cuántas tareas del usuario fueron arrastradas (rolled over) desde una semana anterior.
 * Útil para mostrar un badge de "deuda" semanal en el dashboard.
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns número (0 si no hay).
 */
export async function getRolledOverCount(ownerId: string, weekLabel: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmTasks)
    .where(
      and(
        eq(crmTasks.ownerId, ownerId),
        eq(crmTasks.weekLabel, weekLabel),
        eq(crmTasks.rolledOver, true),
      ),
    );
  return row?.count ?? 0;
}

export type UrgentTask = {
  readonly id: number;
  readonly title: string;
  readonly priority: string;
  readonly dueDate: Date | null;
  readonly ownerName: string | null;
};

/**
 * Lista tareas urgentes (no completadas y con dueDate ≤ hoy Madrid) para el banner del CRM.
 * Aplica filtro de visibilidad si el rol lo requiere (staff).
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns array readonly capped a `limit` (default 5). `dueDate` se rehidrata como `Date | null`.
 */
export async function getUrgentTasks({
  session,
  limit = 5,
}: {
  readonly session?: TaskSession;
  readonly limit?: number;
} = {}): Promise<readonly UrgentTask[]> {
  const filters = [ne(crmTasks.status, 'completada'), lte(crmTasks.dueDate, todayMadridIso())];
  const visible = visibilityCondition(session);
  if (visible !== undefined) filters.push(visible);

  const rows = await db
    .select({
      id: crmTasks.id,
      title: crmTasks.title,
      priority: crmTasks.priority,
      dueDate: crmTasks.dueDate,
      ownerName: user.name,
    })
    .from(crmTasks)
    .leftJoin(user, eq(user.id, crmTasks.ownerId))
    .where(and(...filters))
    .orderBy(asc(PRIORITY_ORDER), asc(crmTasks.dueDate))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
    dueDate: r.dueDate !== null ? new Date(r.dueDate) : null,
    ownerName: r.ownerName ?? null,
  }));
}

/**
 * Lista las instancias generadas de una plantilla recurrente para una semana concreta.
 * Útil para evitar duplicados cuando se re-ejecuta la generación.
 *
 * @cache none
 * @visibility admin
 * @returns array readonly (puede ser vacío). Nunca null.
 */
export async function getTasksByTemplateForWeek(
  templateId: number,
  weekLabel: string,
): Promise<readonly CrmTask[]> {
  return db
    .select()
    .from(crmTasks)
    .where(and(eq(crmTasks.recurrenceTemplateId, templateId), eq(crmTasks.weekLabel, weekLabel)))
    .orderBy(asc(crmTasks.createdAt));
}

type RecurringTargetUser = {
  readonly id: string;
  readonly role: string | null;
};

/**
 * Helper puro (sin DB): a partir de plantillas activas, usuarios internos y la fecha actual,
 * construye las filas a insertar para la semana. `daily`→hoy, `weekly`→fin de semana,
 * `monthly`→solo el día 1 con dueDate fin de mes.
 *
 * @cache none
 * @visibility admin
 * @returns array readonly de `NewCrmTask` listo para insertar.
 */
export function buildRecurringTaskInstances({
  templates,
  users,
  fallbackCreatorUserId,
  today,
  weekLabel,
}: {
  readonly templates: readonly CrmTaskTemplate[];
  readonly users: readonly RecurringTargetUser[];
  readonly fallbackCreatorUserId: string | null;
  readonly today: Date;
  readonly weekLabel: string;
}): readonly NewCrmTask[] {
  const internalUsers = users.filter(
    (u) => u.role === 'admin' || u.role === 'manager' || u.role === 'staff',
  );
  const todayIso = toIsoDate(today);
  const isFirstDayOfMonth = todayIso.endsWith('-01');
  const rows: NewCrmTask[] = [];

  for (const template of templates) {
    if (!template.active) continue;

    let dueDate: string;
    if (template.recurrence === 'daily') {
      dueDate = todayIso;
    } else if (template.recurrence === 'weekly') {
      dueDate = endOfWeekIso(today);
    } else {
      if (!isFirstDayOfMonth) continue;
      dueDate = endOfMonthIso(today);
    }

    const targetIds = template.defaultAssigneeUserId
      ? [template.defaultAssigneeUserId]
      : internalUsers.map((u) => u.id);

    for (const assignedToUserId of targetIds) {
      const createdByUserId = template.defaultAssigneeUserId ?? fallbackCreatorUserId ?? assignedToUserId;
      rows.push({
        title: template.title,
        description: template.description,
        ownerId: assignedToUserId,
        assignedToUserId,
        createdByUserId,
        recurrenceTemplateId: template.id,
        dueDate,
        priority: template.defaultPriority,
        status: 'pendiente',
        category: template.category,
        weekLabel,
        rolledOver: false,
        rolledFromWeek: null,
        relatedType: null,
        relatedId: null,
      });
    }
  }

  return rows;
}

/**
 * Job de regeneración: lee plantillas activas + usuarios internos, construye las instancias
 * con `buildRecurringTaskInstances` y las inserta con `onConflictDoNothing` (idempotente
 * dentro de la misma semana). Útil para cron diario.
 *
 * @cache none
 * @visibility admin
 * @returns `{ generated }` con el número de filas realmente insertadas.
 */
export async function regenerateRecurringTasks({
  today = new Date(),
  weekLabel,
}: {
  readonly today?: Date;
  readonly weekLabel?: string;
} = {}): Promise<{ readonly generated: number }> {
  const currentWeek = weekLabel ?? getIsoWeekLabel(today);
  const templates = await db
    .select()
    .from(crmTaskTemplates)
    .where(eq(crmTaskTemplates.active, true))
    .orderBy(asc(crmTaskTemplates.id));

  const users = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(inArray(user.role, ['admin', 'manager', 'staff']))
    .orderBy(asc(user.name));

  const fallbackCreatorUserId = users.find((u) => u.role === 'admin')?.id ?? null;
  const rows = buildRecurringTaskInstances({
    templates,
    users,
    fallbackCreatorUserId,
    today,
    weekLabel: currentWeek,
  });

  if (rows.length === 0) return { generated: 0 };

  const inserted = await db
    .insert(crmTasks)
    .values([...rows])
    .onConflictDoNothing()
    .returning({ id: crmTasks.id });

  return { generated: inserted.length };
}
