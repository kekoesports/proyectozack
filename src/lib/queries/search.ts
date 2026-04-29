import { and, eq, ilike, ne, isNull, or, asc, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  campaigns,
  crmBrandContacts,
  crmBrands,
  crmTasks,
  invoices,
  talents,
} from '@/db/schema';

import type { Role } from '@/lib/auth-guard';

export type SearchSession = {
  readonly userId: string;
  readonly role: Role;
};

export type SearchHit = {
  readonly id: number;
  readonly title: string;
  readonly subtitle: string | null;
  readonly href: string;
};

export type SearchGroup =
  | 'brands'
  | 'talents'
  | 'campaigns'
  | 'invoices'
  | 'tasks'
  | 'contacts';

export type GlobalSearchResults = {
  readonly query: string;
  readonly groups: Record<SearchGroup, readonly SearchHit[]>;
  readonly tookMs: number;
};

const EMPTY_GROUPS: Record<SearchGroup, readonly SearchHit[]> = {
  brands: [],
  talents: [],
  campaigns: [],
  invoices: [],
  tasks: [],
  contacts: [],
};

function isStaff(role: Role): boolean {
  return role === 'staff';
}

// Defense-in-depth: even if the route handler skips the bound, the query layer
// caps the pattern length (Drizzle parametrises but Postgres still evaluates).
const QUERY_LENGTH_CAP = 100;

/**
 * Búsqueda global ILIKE sobre brands, talents, campaigns, invoices, tasks y contacts.
 * Capa el patrón a 100 chars; staff aplica filtro de visibilidad por created_by/assigned_to.
 *
 * @cache none
 * @visibility admin
 * @scope staff
 * @returns `{ query, groups, tookMs }`. `groups` siempre tiene las 6 keys (puede ser arrays vacíos).
 */
export async function globalSearch(
  rawQuery: string,
  options: { readonly session: SearchSession; readonly limit?: number },
): Promise<GlobalSearchResults> {
  const limit = options.limit ?? 5;
  const trimmed = rawQuery.trim();
  const query = trimmed.length > QUERY_LENGTH_CAP ? trimmed.slice(0, QUERY_LENGTH_CAP) : trimmed;
  const start = Date.now();

  if (query.length < 2) {
    return { query, groups: EMPTY_GROUPS, tookMs: Date.now() - start };
  }

  const pattern = `%${query.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const session = options.session;

  const [brandsHits, talentsHits, campaignsHits, invoicesHits, tasksHits, contactsHits] =
    await Promise.all([
      // Brands
      db
        .select({
          id: crmBrands.id,
          name: crmBrands.name,
          status: crmBrands.status,
          sector: crmBrands.sector,
          createdByUserId: crmBrands.createdByUserId,
          assignedToUserId: crmBrands.assignedToUserId,
        })
        .from(crmBrands)
        .where(
          and(
            ilike(crmBrands.name, pattern),
            ne(crmBrands.status, 'archivada'),
            isStaff(session.role)
              ? or(
                  eq(crmBrands.createdByUserId, session.userId),
                  eq(crmBrands.assignedToUserId, session.userId),
                )
              : undefined,
          ),
        )
        .orderBy(asc(crmBrands.name))
        .limit(limit),

      // Talents
      db
        .select({
          id: talents.id,
          name: talents.name,
          slug: talents.slug,
        })
        .from(talents)
        .where(or(ilike(talents.name, pattern), ilike(talents.slug, pattern)))
        .orderBy(asc(talents.name))
        .limit(limit),

      // Campaigns
      db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          brandName: crmBrands.name,
          talentName: talents.name,
          status: campaigns.status,
          assignedToUserId: campaigns.assignedToUserId,
          createdByUserId: campaigns.createdByUserId,
        })
        .from(campaigns)
        .innerJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
        .innerJoin(talents, eq(talents.id, campaigns.talentId))
        .where(
          and(
            ilike(campaigns.name, pattern),
            isNull(campaigns.archivedAt),
            isStaff(session.role)
              ? or(
                  eq(campaigns.createdByUserId, session.userId),
                  eq(campaigns.assignedToUserId, session.userId),
                  eq(campaigns.responsibleUserId, session.userId),
                )
              : undefined,
          ),
        )
        .orderBy(desc(campaigns.createdAt))
        .limit(limit),

      // Invoices — staff currently has no scoped FK so for now they can search by counterparty
      db
        .select({
          id: invoices.id,
          number: invoices.number,
          concept: invoices.concept,
          counterpartyName: invoices.counterpartyName,
          brandName: crmBrands.name,
          totalAmount: invoices.totalAmount,
          status: invoices.status,
        })
        .from(invoices)
        .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
        .where(
          and(
            or(
              ilike(invoices.concept, pattern),
              ilike(invoices.number, pattern),
              ilike(invoices.counterpartyName, pattern),
              ilike(crmBrands.name, pattern),
            ),
            ne(invoices.status, 'anulada'),
            isStaff(session.role) ? eq(invoices.createdByUserId, session.userId) : undefined,
          ),
        )
        .orderBy(desc(invoices.issueDate))
        .limit(limit),

      // Tasks
      db
        .select({
          id: crmTasks.id,
          title: crmTasks.title,
          status: crmTasks.status,
          priority: crmTasks.priority,
          weekLabel: crmTasks.weekLabel,
          assignedToUserId: crmTasks.assignedToUserId,
          createdByUserId: crmTasks.createdByUserId,
          ownerId: crmTasks.ownerId,
        })
        .from(crmTasks)
        .where(
          and(
            ilike(crmTasks.title, pattern),
            ne(crmTasks.status, 'completada'),
            isStaff(session.role)
              ? or(
                  eq(crmTasks.assignedToUserId, session.userId),
                  eq(crmTasks.createdByUserId, session.userId),
                  eq(crmTasks.ownerId, session.userId),
                )
              : undefined,
          ),
        )
        .orderBy(asc(crmTasks.weekLabel))
        .limit(limit),

      // Contacts
      db
        .select({
          id: crmBrandContacts.id,
          name: crmBrandContacts.name,
          email: crmBrandContacts.email,
          brandId: crmBrandContacts.brandId,
          brandName: crmBrands.name,
          assignedToUserId: crmBrands.assignedToUserId,
          brandCreatedByUserId: crmBrands.createdByUserId,
        })
        .from(crmBrandContacts)
        .leftJoin(crmBrands, eq(crmBrands.id, crmBrandContacts.brandId))
        .where(
          and(
            or(
              ilike(crmBrandContacts.name, pattern),
              ilike(crmBrandContacts.email, pattern),
            ),
            isStaff(session.role)
              ? or(
                  eq(crmBrands.assignedToUserId, session.userId),
                  eq(crmBrands.createdByUserId, session.userId),
                )
              : undefined,
          ),
        )
        .orderBy(asc(crmBrandContacts.name))
        .limit(limit),
    ]);

  const groups: Record<SearchGroup, readonly SearchHit[]> = {
    brands: brandsHits.map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: [row.status, row.sector ?? null].filter(Boolean).join(' · ') || null,
      href: `/admin/brands?focus=${row.id}`,
    })),
    talents: talentsHits.map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: row.slug ? `/talentos/${row.slug}` : null,
      href: `/admin/talents/${row.id}`,
    })),
    campaigns: campaignsHits.map((row) => ({
      id: row.id,
      title: `${row.brandName} × ${row.talentName} — ${row.name}`,
      subtitle: row.status,
      href: `/admin/campanas/${row.id}`,
    })),
    invoices: invoicesHits.map((row) => ({
      id: row.id,
      title: row.number ? `${row.number} — ${row.concept}` : row.concept,
      subtitle: [row.brandName ?? row.counterpartyName, row.status].filter(Boolean).join(' · ') || null,
      href: `/admin/facturacion?invoice=${row.id}`,
    })),
    tasks: tasksHits.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: `${row.priority} · ${row.status} · ${row.weekLabel}`,
      href: `/admin/tareas?focus=${row.id}`,
    })),
    contacts: contactsHits.map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: [row.email, row.brandName ?? null].filter(Boolean).join(' · ') || null,
      href: row.brandId ? `/admin/brands?focus=${row.brandId}` : '/admin/brands',
    })),
  };

  return { query, groups, tookMs: Date.now() - start };
}
