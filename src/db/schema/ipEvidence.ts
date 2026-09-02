import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
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

export const ipDocumentCategoryEnum = pgEnum('ip_document_category', [
  'ownership',
  'people',
  'cost',
  'technical',
  'valuation',
  'tax',
  'transfer_pricing',
  'corporate',
  'revenue',
  'brand_domain',
  'other',
]);

export const ipDocumentStatusEnum = pgEnum('ip_document_status', [
  'draft',
  'collected',
  'review_required',
  'advisor_approved',
  'replaced',
]);

export const ipDocumentStorageLocationEnum = pgEnum('ip_document_storage_location', [
  'google_drive',
  'crm_private',
  'github',
  'other',
]);

export const ipProjects = pgTable(
  'ip_projects',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 40 }).notNull(),
    name: varchar('name', { length: 180 }).notNull(),
    assetName: varchar('asset_name', { length: 180 }).notNull(),
    // Nullable mientras la cadena jurídica o el pagador real estén bajo
    // revisión. Es preferible un dato pendiente explícito a una atribución
    // inventada para poder abrir el expediente.
    ownerEntity: ipLegalEntityEnum('owner_entity'),
    payingEntity: ipLegalEntityEnum('paying_entity'),
    futureCyprusCandidate: boolean('future_cyprus_candidate').notNull().default(false),
    repositoryRef: varchar('repository_ref', { length: 500 }),
    evidenceTrackingStartedAt: timestamp('evidence_tracking_started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
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
 * Evidencia técnica descubierta automáticamente. Es un registro factual e
 * inmutable: por sí solo no declara horas, costes ni una calificación fiscal.
 */
export const ipEvidenceEvents = pgTable(
  'ip_evidence_events',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull().references(() => ipProjects.id, { onDelete: 'restrict' }),
    externalId: varchar('external_id', { length: 240 }).notNull(),
    evidenceKind: ipEvidenceKindEnum('evidence_kind').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    evidenceRef: varchar('evidence_ref', { length: 500 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    actorName: varchar('actor_name', { length: 160 }),
    sourceMetadata: jsonb('source_metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ip_evidence_events_external_id_uq').on(t.externalId),
    index('ip_evidence_events_project_occurred_idx').on(t.projectId, t.occurredAt),
    index('ip_evidence_events_created_idx').on(t.createdAt),
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
    evidenceEventId: integer('evidence_event_id').references(() => ipEvidenceEvents.id, { onDelete: 'restrict' }),
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
    ownerEntitySnapshot: ipLegalEntityEnum('owner_entity_snapshot'),
    payingEntitySnapshot: ipLegalEntityEnum('paying_entity_snapshot'),
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
    index('ip_work_logs_evidence_event_idx').on(t.evidenceEventId),
  ],
);

/**
 * Índice append-only de documentos del data room. El archivo sensible vive en
 * Drive privado o en el almacenamiento privado del CRM; aquí se conserva su
 * referencia, versión, estado e integridad sin permitir reescritura histórica.
 */
export const ipDocuments = pgTable(
  'ip_documents',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').notNull().references(() => ipProjects.id, { onDelete: 'restrict' }),
    requirementCode: varchar('requirement_code', { length: 60 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    category: ipDocumentCategoryEnum('category').notNull(),
    status: ipDocumentStatusEnum('status').notNull(),
    legalEntity: ipLegalEntityEnum('legal_entity'),
    storageLocation: ipDocumentStorageLocationEnum('storage_location').notNull(),
    documentRef: varchar('document_ref', { length: 1_000 }).notNull(),
    versionLabel: varchar('version_label', { length: 80 }),
    contentSha256: varchar('content_sha256', { length: 64 }),
    effectiveOn: date('effective_on'),
    expiresOn: date('expires_on'),
    notes: text('notes'),
    integrityHash: varchar('integrity_hash', { length: 64 }).notNull(),
    recordedByUserId: text('recorded_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'ip_documents_content_sha256_check',
      sql`${t.contentSha256} IS NULL OR ${t.contentSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    uniqueIndex('ip_documents_integrity_hash_uq').on(t.integrityHash),
    index('ip_documents_project_created_idx').on(t.projectId, t.createdAt),
    index('ip_documents_requirement_created_idx').on(t.requirementCode, t.createdAt),
    index('ip_documents_status_idx').on(t.status),
  ],
);
