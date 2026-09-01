import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

/** Entidades existentes. Una sociedad chipriota futura no puede soportar costes todavía. */
export const ipLegalEntityEnum = pgEnum('ip_legal_entity', [
  'elevatex_agency_pa_sl',
  'playmaker_media_llc',
  'founder_personal',
]);

export const ipProjectStatusEnum = pgEnum('ip_project_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
]);

export const ipActivityCategoryEnum = pgEnum('ip_activity_category', [
  'research',
  'experimental_development',
  'product_development',
  'testing',
  'maintenance',
  'operations',
  'security',
  'sales_marketing',
  'administration',
  'training',
]);

/** Clasificación preliminar: nunca sustituye un informe motivado o criterio del asesor. */
export const ipProvisionalAssessmentEnum = pgEnum('ip_provisional_assessment', [
  'unassessed',
  'rd_candidate',
  'it_candidate',
  'non_qualifying',
]);

export const ipEvidenceKindEnum = pgEnum('ip_evidence_kind', [
  'git_commit',
  'github_pr',
  'task',
  'document',
  'test_run',
  'deployment',
  'other',
]);

export const ipRecordModeEnum = pgEnum('ip_record_mode', [
  'contemporaneous',
  'reconstructed',
]);

export const ipProjects = pgTable(
  'ip_projects',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 40 }).notNull(),
    name: varchar('name', { length: 180 }).notNull(),
    assetName: varchar('asset_name', { length: 180 }).notNull(),
    ownerEntity: ipLegalEntityEnum('owner_entity').notNull(),
    payingEntity: ipLegalEntityEnum('paying_entity').notNull(),
    futureCyprusCandidate: boolean('future_cyprus_candidate').notNull().default(false),
    repositoryRef: varchar('repository_ref', { length: 500 }),
    technicalUncertainty: text('technical_uncertainty'),
    expectedOutcome: text('expected_outcome'),
    startedOn: date('started_on').notNull(),
    endedOn: date('ended_on'),
    status: ipProjectStatusEnum('status').notNull().default('active'),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ip_projects_code_uq').on(t.code),
    index('ip_projects_status_started_idx').on(t.status, t.startedOn),
    index('ip_projects_owner_idx').on(t.ownerEntity),
  ],
);

/**
 * Ledger append-only de trabajo. No existe acción de edición o borrado: una
 * futura corrección deberá añadirse como evento separado y conservar el original.
 */
export const ipWorkLogs = pgTable(
  'ip_work_logs',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull().references(() => ipProjects.id, { onDelete: 'restrict' }),
    contributorName: varchar('contributor_name', { length: 160 }).notNull(),
    contributorUserId: text('contributor_user_id').references(() => user.id, { onDelete: 'set null' }),
    workDate: date('work_date').notNull(),
    minutes: integer('minutes').notNull(),
    activityCategory: ipActivityCategoryEnum('activity_category').notNull(),
    provisionalAssessment: ipProvisionalAssessmentEnum('provisional_assessment').notNull(),
    description: text('description').notNull(),
    evidenceKind: ipEvidenceKindEnum('evidence_kind').notNull(),
    evidenceRef: varchar('evidence_ref', { length: 500 }).notNull(),
    recordMode: ipRecordModeEnum('record_mode').notNull(),
    ownerEntitySnapshot: ipLegalEntityEnum('owner_entity_snapshot').notNull(),
    payingEntitySnapshot: ipLegalEntityEnum('paying_entity_snapshot').notNull(),
    integrityHash: varchar('integrity_hash', { length: 64 }).notNull(),
    recordedByUserId: text('recorded_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('ip_work_logs_minutes_check', sql`${t.minutes} > 0 AND ${t.minutes} <= 1440`),
    check('ip_work_logs_date_check', sql`${t.workDate} <= CURRENT_DATE`),
    uniqueIndex('ip_work_logs_integrity_hash_uq').on(t.integrityHash),
    index('ip_work_logs_project_date_idx').on(t.projectId, t.workDate),
    index('ip_work_logs_assessment_date_idx').on(t.provisionalAssessment, t.workDate),
    index('ip_work_logs_created_idx').on(t.createdAt),
  ],
);

