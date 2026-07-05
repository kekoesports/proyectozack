// Genera drizzle/meta/0106_snapshot.json y actualiza _journal.json
// para la migración 0106 (user_partner_consents + sp_audit_events).
// Ejecutar: node scripts/build-migration-0106-snapshot.mjs
//
// Se usa solo porque el entorno actual no tiene TTY interactivo para
// `drizzle-kit generate`. El script copia el snapshot 0105, añade las
// 2 tablas nuevas y genera IDs UUID nuevos.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const ROOT = process.cwd();
const META = join(ROOT, 'drizzle', 'meta');

const prev = JSON.parse(readFileSync(join(META, '0105_snapshot.json'), 'utf8'));

// Nuevas tablas — mismos identifiers/tipos que en la migración SQL.
const userPartnerConsents = {
  name: 'user_partner_consents',
  schema: '',
  columns: {
    id:              { name: 'id',              type: 'serial',                       primaryKey: true, notNull: true },
    user_id:         { name: 'user_id',         type: 'text',                         primaryKey: false, notNull: true },
    consent_version: { name: 'consent_version', type: 'varchar(16)',                  primaryKey: false, notNull: true },
    granted_at:      { name: 'granted_at',      type: 'timestamp with time zone',     primaryKey: false, notNull: true, default: 'now()' },
    revoked_at:      { name: 'revoked_at',      type: 'timestamp with time zone',     primaryKey: false, notNull: false },
    ip_hash:         { name: 'ip_hash',         type: 'varchar(64)',                  primaryKey: false, notNull: false },
    user_agent:      { name: 'user_agent',      type: 'varchar(500)',                 primaryKey: false, notNull: false },
  },
  indexes: {
    user_partner_consents_user_id_idx: {
      name: 'user_partner_consents_user_id_idx',
      columns: [{ expression: 'user_id', isExpression: false, asc: true, nulls: 'last' }],
      isUnique: false,
      concurrently: false,
      method: 'btree',
      with: {},
    },
    user_partner_consents_active_idx: {
      name: 'user_partner_consents_active_idx',
      columns: [
        { expression: 'user_id', isExpression: false, asc: true, nulls: 'last' },
        { expression: 'revoked_at', isExpression: false, asc: true, nulls: 'last' },
      ],
      isUnique: false,
      concurrently: false,
      method: 'btree',
      with: {},
    },
    user_partner_consents_active_uq: {
      name: 'user_partner_consents_active_uq',
      columns: [
        { expression: 'user_id', isExpression: false, asc: true, nulls: 'last' },
        { expression: 'consent_version', isExpression: false, asc: true, nulls: 'last' },
      ],
      isUnique: true,
      concurrently: false,
      method: 'btree',
      with: {},
      where: 'revoked_at IS NULL',
    },
  },
  foreignKeys: {
    user_partner_consents_user_id_user_id_fk: {
      name: 'user_partner_consents_user_id_user_id_fk',
      tableFrom: 'user_partner_consents',
      tableTo: 'user',
      schemaTo: 'public',
      columnsFrom: ['user_id'],
      columnsTo: ['id'],
      onDelete: 'cascade',
      onUpdate: 'no action',
    },
  },
  compositePrimaryKeys: {},
  uniqueConstraints: {},
  policies: {},
  checkConstraints: {},
  isRLSEnabled: false,
};

const spAuditEvents = {
  name: 'sp_audit_events',
  schema: '',
  columns: {
    id:         { name: 'id',         type: 'serial',                       primaryKey: true,  notNull: true },
    user_id:    { name: 'user_id',    type: 'text',                         primaryKey: false, notNull: false },
    action:     { name: 'action',     type: 'varchar(40)',                  primaryKey: false, notNull: true },
    ref_type:   { name: 'ref_type',   type: 'varchar(40)',                  primaryKey: false, notNull: false },
    ref_id:     { name: 'ref_id',     type: 'integer',                      primaryKey: false, notNull: false },
    outcome:    { name: 'outcome',    type: 'varchar(24)',                  primaryKey: false, notNull: true },
    ip_hash:    { name: 'ip_hash',    type: 'varchar(64)',                  primaryKey: false, notNull: false },
    user_agent: { name: 'user_agent', type: 'varchar(500)',                 primaryKey: false, notNull: false },
    country:    { name: 'country',    type: 'varchar(2)',                   primaryKey: false, notNull: false },
    metadata:   { name: 'metadata',   type: 'jsonb',                        primaryKey: false, notNull: false },
    created_at: { name: 'created_at', type: 'timestamp with time zone',     primaryKey: false, notNull: true, default: 'now()' },
  },
  indexes: {
    sp_audit_events_user_idx: {
      name: 'sp_audit_events_user_idx',
      columns: [{ expression: 'user_id', isExpression: false, asc: true, nulls: 'last' }],
      isUnique: false,
      concurrently: false,
      method: 'btree',
      with: {},
    },
    sp_audit_events_action_idx: {
      name: 'sp_audit_events_action_idx',
      columns: [{ expression: 'action', isExpression: false, asc: true, nulls: 'last' }],
      isUnique: false,
      concurrently: false,
      method: 'btree',
      with: {},
    },
    sp_audit_events_created_at_idx: {
      name: 'sp_audit_events_created_at_idx',
      columns: [{ expression: 'created_at', isExpression: false, asc: true, nulls: 'last' }],
      isUnique: false,
      concurrently: false,
      method: 'btree',
      with: {},
    },
    sp_audit_events_ref_idx: {
      name: 'sp_audit_events_ref_idx',
      columns: [
        { expression: 'ref_type', isExpression: false, asc: true, nulls: 'last' },
        { expression: 'ref_id',   isExpression: false, asc: true, nulls: 'last' },
      ],
      isUnique: false,
      concurrently: false,
      method: 'btree',
      with: {},
    },
  },
  foreignKeys: {
    sp_audit_events_user_id_user_id_fk: {
      name: 'sp_audit_events_user_id_user_id_fk',
      tableFrom: 'sp_audit_events',
      tableTo: 'user',
      schemaTo: 'public',
      columnsFrom: ['user_id'],
      columnsTo: ['id'],
      onDelete: 'set null',
      onUpdate: 'no action',
    },
  },
  compositePrimaryKeys: {},
  uniqueConstraints: {},
  policies: {},
  checkConstraints: {},
  isRLSEnabled: false,
};

const next = {
  ...prev,
  id: randomUUID(),
  prevId: prev.id,
  tables: {
    ...prev.tables,
    'public.user_partner_consents': userPartnerConsents,
    'public.sp_audit_events': spAuditEvents,
  },
};

writeFileSync(
  join(META, '0106_snapshot.json'),
  JSON.stringify(next, null, 2) + '\n',
  'utf8',
);

// Actualizar _journal.json añadiendo la entrada 0106.
const journalPath = join(META, '_journal.json');
const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
const last = journal.entries[journal.entries.length - 1];
if (last.idx !== 105) {
  throw new Error(`Se esperaba último idx=105, encontrado idx=${last.idx}`);
}
journal.entries.push({
  idx: 106,
  version: last.version,
  when: Date.now(),
  tag: '0106_user_partner_consents_and_audit',
  breakpoints: true,
});
writeFileSync(journalPath, JSON.stringify(journal, null, 2) + '\n', 'utf8');

console.log('OK — 0106 snapshot + journal actualizados.');
console.log(`  new snapshot id: ${next.id}`);
console.log(`  prev id:         ${prev.id}`);
