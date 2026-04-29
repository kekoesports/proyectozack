import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmTasks, crmTaskTemplates, crmBrands, talents, invoices, user } from '@/db/schema';
import type { CrmTask, CrmTaskTemplate, NewCrmTask, CrmTaskStatus, TeamTasksSummary } from '@/types';
import { WEEKLY_TEMPLATES } from '@/lib/taskTemplates';

type UpdatableFields = Pick<CrmTask, 'title' | 'description' | 'dueDate' | 'priority' | 'status' | 'category' | 'ownerId' | 'relatedType' | 'relatedId'>;

const PRIORITY_ORDER = sql`CASE ${crmTasks.priority}
  WHEN 'alta' THEN 0
  WHEN 'media' THEN 1
  WHEN 'baja' THEN 2
END`;

export async function getTasksForWeek(weekLabel: string): Promise<readonly CrmTask[]> {
  return db
    .select()
    .from(crmTasks)
    .where(eq(crmTasks.weekLabel, weekLabel))
    .orderBy(asc(PRIORITY_ORDER), asc(crmTasks.dueDate), desc(crmTasks.createdAt));
}

export async function getMyTasks(ownerId: string, weekLabel: string): Promise<readonly CrmTask[]> {
  return db
    .select()
    .from(crmTasks)
    .where(and(eq(crmTasks.ownerId, ownerId), eq(crmTasks.weekLabel, weekLabel)))
    .orderBy(asc(PRIORITY_ORDER), asc(crmTasks.dueDate), desc(crmTasks.createdAt));
}

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
    .where(inArray(user.role, ['admin', 'staff']))
    .groupBy(user.id, user.name, user.email, user.role)
    .orderBy(asc(user.name));

  return rows;
}

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

export async function createTask(
  input: Omit<NewCrmTask, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'rolledOver' | 'rolledFromWeek'>,
): Promise<CrmTask> {
  const [row] = await db.insert(crmTasks).values(input).returning();
  if (!row) throw new Error('Failed to insert crm task');
  return row;
}

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

export async function completeTask(id: number): Promise<CrmTask | null> {
  const [row] = await db
    .update(crmTasks)
    .set({ status: 'completada', completedAt: new Date(), updatedAt: new Date() })
    .where(eq(crmTasks.id, id))
    .returning();
  return row ?? null;
}

export async function isStaffUser(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) return false;
  return row.role === 'admin' || row.role === 'staff';
}

export async function deleteTask(id: number): Promise<void> {
  await db.delete(crmTasks).where(eq(crmTasks.id, id));
}

export async function deleteTasks(ids: readonly number[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(crmTasks).where(inArray(crmTasks.id, [...ids]));
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
  readonly invoice: ReadonlyArray<{ readonly id: number; readonly label: string }>;
};

export async function getTaskRelatedOptions(): Promise<RelatedOptionList> {
  const [brandRows, talentRows, invoiceRows] = await Promise.all([
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    db
      .select({ id: invoices.id, number: invoices.number, concept: invoices.concept })
      .from(invoices)
      .orderBy(desc(invoices.issueDate))
      .limit(200),
  ]);

  return {
    brand: brandRows.map((r) => ({ id: r.id, label: r.name })),
    talent: talentRows.map((r) => ({ id: r.id, label: r.name })),
    invoice: invoiceRows.map((r) => ({ id: r.id, label: r.number ? `${r.number} — ${r.concept}` : r.concept })),
  };
}

export type RelatedLabel = {
  readonly type: 'brand' | 'talent' | 'invoice';
  readonly id: number;
  readonly label: string;
};

export async function resolveRelatedLabels(
  tasks: readonly CrmTask[],
): Promise<ReadonlyMap<string, RelatedLabel>> {
  const brandIds = new Set<number>();
  const talentIds = new Set<number>();
  const invoiceIds = new Set<number>();
  for (const t of tasks) {
    if (t.relatedType === 'brand' && t.relatedId) brandIds.add(t.relatedId);
    else if (t.relatedType === 'talent' && t.relatedId) talentIds.add(t.relatedId);
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

/** Comprueba si ya existe una tarea con ese título exacto en la semana dada. */
export async function taskExistsForWeek(title: string, weekLabel: string): Promise<boolean> {
  const [row] = await db
    .select({ id: crmTasks.id })
    .from(crmTasks)
    .where(and(eq(crmTasks.weekLabel, weekLabel), eq(crmTasks.title, title)))
    .limit(1);
  return row !== undefined;
}

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

// ── Plantillas semanales (CRUD) ───────────────────────────────────────

export async function getTaskTemplates(): Promise<readonly CrmTaskTemplate[]> {
  const rows = await db
    .select()
    .from(crmTaskTemplates)
    .orderBy(asc(crmTaskTemplates.id));

  // Seed con plantillas predeterminadas si la tabla está vacía
  if (rows.length === 0) {
    const seeded = await db
      .insert(crmTaskTemplates)
      .values(WEEKLY_TEMPLATES.map((t) => ({ title: t.title, category: t.category, priority: t.priority as 'alta' | 'media' | 'baja', isActive: true })))
      .returning();
    return seeded;
  }
  return rows;
}

export async function createTaskTemplate(values: {
  title:    string;
  category: string;
  priority: 'alta' | 'media' | 'baja';
}): Promise<CrmTaskTemplate> {
  const [row] = await db.insert(crmTaskTemplates).values(values).returning();
  if (!row) throw new Error('Failed to insert template');
  return row;
}

export async function updateTaskTemplate(
  id: number,
  patch: Partial<{ title: string; category: string; priority: 'alta' | 'media' | 'baja'; isActive: boolean }>,
): Promise<CrmTaskTemplate | null> {
  const [row] = await db
    .update(crmTaskTemplates)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(crmTaskTemplates.id, id))
    .returning();
  return row ?? null;
}

export async function deleteTaskTemplate(id: number): Promise<void> {
  await db.delete(crmTaskTemplates).where(eq(crmTaskTemplates.id, id));
}
