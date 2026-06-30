import { and, asc, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, lte, ne, notLike, or, sql } from 'drizzle-orm';

import { campaigns, crmBrands, crmTasks, invoices, talents, user } from '@/db/schema';
import { crmTaskTemplates } from '@/db/schema/crmTaskTemplates';
import { db } from '@/lib/db';
import { ASSIGNABLE_TEAM_ROLES, isAssignableTeamUser } from '@/lib/team-roles';
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
  // Solo admin ve todas las tareas del equipo.
  // Manager y staff ven únicamente sus propias tareas.
  if (!session || session.role === 'admin') return undefined;
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
  const filters = [
    eq(crmTasks.weekLabel, weekLabel),
    notLike(crmTasks.title, 'E2E %'),
    notLike(crmTasks.title, 'E2E%'),
    notLike(crmTasks.title, 'Test Task%'),
  ];
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
        notLike(crmTasks.title, 'E2E %'),
        notLike(crmTasks.title, 'E2E%'),
        notLike(crmTasks.title, 'Test Task%'),
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
    .where(inArray(user.role, [...ASSIGNABLE_TEAM_ROLES]))
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
 * Crea una tarea en el CRM.
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
 * Patch parcial de una tarea.
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
 * Atajo para marcar una tarea como completada.
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
  return row.role === 'admin' || row.role === 'manager' || row.role === 'staff' || row.role === 'admin_limited_tasks';
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

export async function deleteTasks(ids: readonly number[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(crmTasks).where(inArray(crmTasks.id, [...ids]));
}

/** Obtiene una tarea por ID. Devuelve null si no existe. */
export async function getTaskById(id: number): Promise<CrmTask | null> {
  const [row] = await db
    .select({ ...getTableColumns(crmTasks), recurrence: crmTaskTemplates.recurrence })
    .from(crmTasks)
    .leftJoin(crmTaskTemplates, eq(crmTaskTemplates.id, crmTasks.recurrenceTemplateId))
    .where(eq(crmTasks.id, id))
    .limit(1);
  return row ?? null;
}

/** Obtiene múltiples tareas por IDs en una sola query. */
export async function getTasksByIds(ids: readonly number[]): Promise<CrmTask[]> {
  if (ids.length === 0) return [];
  return db
    .select({ ...getTableColumns(crmTasks), recurrence: crmTaskTemplates.recurrence })
    .from(crmTasks)
    .leftJoin(crmTaskTemplates, eq(crmTaskTemplates.id, crmTasks.recurrenceTemplateId))
    .where(inArray(crmTasks.id, [...ids]));
}

/**
 * Quita el flag de arrastrada de una tarea sin cambiar su status ni borrarla.
 * Si se pasa callerId, solo afecta tareas donde el caller es owner o asignado.
 */
export async function resetRolledOver(id: number, callerId?: string): Promise<void> {
  const ownershipClause = callerId
    ? or(eq(crmTasks.ownerId, callerId), eq(crmTasks.assignedToUserId, callerId))
    : undefined;
  await db
    .update(crmTasks)
    .set({ rolledOver: false, rolledFromWeek: null, updatedAt: new Date() })
    .where(and(eq(crmTasks.id, id), ownershipClause));
}

/**
 * Quita el flag de arrastrada de múltiples tareas a la vez.
 * Si se pasa callerId, solo afecta tareas donde el caller es owner o asignado.
 */
export async function resetRolledOverBulk(ids: readonly number[], callerId?: string): Promise<void> {
  if (ids.length === 0) return;
  const ownershipClause = callerId
    ? or(eq(crmTasks.ownerId, callerId), eq(crmTasks.assignedToUserId, callerId))
    : undefined;
  await db
    .update(crmTasks)
    .set({ rolledOver: false, rolledFromWeek: null, updatedAt: new Date() })
    .where(and(inArray(crmTasks.id, [...ids]), ownershipClause));
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
 * relacionado en el form de crear/editar tarea.
 *
 * @cache none
 * @visibility admin
 * @returns objeto con 5 keys (`brand`, `talent`, `campaign`, `invoice`, `general`).
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
 * sola pasada (4 queries IN).
 *
 * @cache none
 * @visibility admin
 * @returns map readonly `"<type>:<id>" -> { type, id, label }`.
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
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns array readonly capped a `limit` (default 5).
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

type RecurringTargetUser = {
  readonly id: string;
  readonly role: string | null;
};

/**
 * Helper puro (sin DB): a partir de plantillas activas, usuarios internos y la fecha actual,
 * construye las filas a insertar para la semana.
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
  const internalUsers = users.filter((u) => isAssignableTeamUser(u.role));
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
 * y las inserta con `onConflictDoNothing` (idempotente dentro de la misma semana).
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
    .where(inArray(user.role, [...ASSIGNABLE_TEAM_ROLES]))
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

// ── Plantillas semanales (CRUD) ───────────────────────────────────────

export async function getTaskTemplates(): Promise<readonly CrmTaskTemplate[]> {
  const rows = await db
    .select()
    .from(crmTaskTemplates)
    .orderBy(asc(crmTaskTemplates.id));
  return rows;
}

export async function createTaskTemplate(values: {
  title:    string;
  category: string;
  defaultPriority?: 'alta' | 'media' | 'baja';
  priority?: 'alta' | 'media' | 'baja';
}): Promise<CrmTaskTemplate> {
  const { priority, defaultPriority, ...rest } = values;
  const [row] = await db.insert(crmTaskTemplates).values({
    ...rest,
    defaultPriority: defaultPriority ?? priority ?? 'media',
  }).returning();
  if (!row) throw new Error('Failed to insert template');
  return row;
}

export async function updateTaskTemplate(
  id: number,
  patch: Partial<{ title: string; category: string; defaultPriority: 'alta' | 'media' | 'baja'; priority: 'alta' | 'media' | 'baja'; isActive: boolean; active: boolean }>,
): Promise<CrmTaskTemplate | null> {
  const { isActive, priority, ...rest } = patch;
  const setPatch: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (isActive !== undefined) setPatch.active = isActive;
  if (priority !== undefined) setPatch.defaultPriority = priority;
  const [row] = await db
    .update(crmTaskTemplates)
    .set(setPatch)
    .where(eq(crmTaskTemplates.id, id))
    .returning();
  return row ?? null;
}

export async function deleteTaskTemplate(id: number): Promise<void> {
  await db.delete(crmTaskTemplates).where(eq(crmTaskTemplates.id, id));
}

/** Comprueba si ya existe una tarea con ese título exacto en la semana dada. */
export async function taskExistsForWeek(title: string, weekLabel: string): Promise<boolean> {
  const [row] = await db
    .select({ id: crmTasks.id })
    .from(crmTasks)
    .where(and(eq(crmTasks.weekLabel, weekLabel), eq(crmTasks.title, title)))
    .limit(1);
  return row !== undefined;
}

/**
 * Tareas para la vista calendario: tareas con fecha (cualquier semana) + tareas sin fecha de la
 * semana actual. Aplica filtro de visibilidad igual que `getTasksForWeek`.
 *
 * @cache none
 * @visibility admin
 * @scope staff
 */
export async function getTasksForCalendarView(
  weekLabel: string,
  options?: { readonly session?: TaskSession },
): Promise<readonly CrmTask[]> {
  const noTestFilter = and(
    notLike(crmTasks.title, 'E2E %'),
    notLike(crmTasks.title, 'E2E%'),
    notLike(crmTasks.title, 'Test Task%'),
  );

  // Tareas con fecha (cualquier semana) + tareas sin fecha de un rango de ±4 meses
  // para que el calendario muestre tareas de meses futuros aunque no tengan dueDate exacta.
  const now = new Date();
  const pastLabel   = getIsoWeekLabel(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
  const futureLabel = getIsoWeekLabel(new Date(now.getFullYear(), now.getMonth() + 4, now.getDate()));

  const scopeFilter = or(
    isNotNull(crmTasks.dueDate),
    and(
      gte(crmTasks.weekLabel, pastLabel),
      lte(crmTasks.weekLabel, futureLabel),
    ),
  );

  const filters = [noTestFilter, scopeFilter];
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
    .orderBy(asc(crmTasks.dueDate), desc(crmTasks.createdAt));
}
