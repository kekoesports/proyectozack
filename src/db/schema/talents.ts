import { pgTable, serial, varchar, text, integer, pgEnum, index, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// platform: real values from source data are 'twitch' | 'youtube' only
export const platformEnum = pgEnum('platform', ['twitch', 'youtube']);
// status: active (working) | available (open for hire) | inactive (retired/paused)
export const statusEnum = pgEnum('status', ['active', 'available', 'inactive']);
// visibility: controls whether talent appears on public site
export const visibilityEnum = pgEnum('visibility', ['public', 'internal']);

// cnmcStatus: compliance with Spanish LGCA (Ley General de Comunicación Audiovisual)
// registrado   = registered in CNMC Registro Estatal de Prestadores Audiovisuales
// pendiente    = needs registration (>10k followers with commercial activity)
// en_tramite   = registration in progress
// no_aplica    = <10k followers or no commercial activity
export const cnmcStatusEnum = pgEnum('cnmc_status', [
  'registrado', 'pendiente', 'en_tramite', 'no_aplica',
]);

// taxType: Spanish/international fiscal classification for IRPF withholding
// autonomo_es  = Spanish self-employed, standard 15% IRPF (or 7% in first year)
// autonomo_es_nuevo = Spanish self-employed, first-year reduced 7% IRPF
// sl_sa        = Spanish company (Sociedad Limitada / Anónima), no IRPF withholding
// latam        = Latin American resident (no Spanish IRPF, may need EU VAT rules)
// no_residente = Non-EU resident
export const taxTypeEnum = pgEnum('talent_tax_type', [
  'autonomo_es', 'autonomo_es_nuevo', 'sl_sa', 'latam', 'no_residente',
]);

export const talents = pgTable('talents', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 150 }).notNull(),
  role2: varchar('role2', { length: 150 }),
  game: varchar('game', { length: 100 }).notNull(),
  platform: platformEnum('platform').notNull(),
  status: statusEnum('status').notNull().default('active'),
  bio: text('bio').notNull(),
  gradientC1: varchar('gradient_c1', { length: 7 }).notNull(),
  gradientC2: varchar('gradient_c2', { length: 7 }).notNull(),
  initials: varchar('initials', { length: 4 }).notNull(),
  photoUrl: varchar('photo_url', { length: 500 }),
  sortOrder: integer('sort_order').notNull().default(0),
  visibility: visibilityEnum('visibility').notNull().default('public'),
  topGeos: jsonb('top_geos').$type<Array<{ country: string; pct: number }>>(),
  audienceLanguage: text('audience_language'),
  creatorCountry: varchar('creator_country', { length: 2 }),
  audienceStatus: varchar('audience_status', { length: 20 }), // 'activo'|'inactivo'|'pendiente'|'potencial'
  lastStatsUpdateAt: timestamp('last_stats_update_at', { withTimezone: true }),

  // ── Compliance CNMC (Ley General de Comunicación Audiovisual, vigente oct-2025) ──
  cnmcStatus: cnmcStatusEnum('cnmc_status').notNull().default('no_aplica'),
  cnmcRegisteredAt: timestamp('cnmc_registered_at', { withTimezone: true }),
  cnmcNotes: text('cnmc_notes'),
  // Seguro de Responsabilidad Civil — obligatorio para talentos registrados en CNMC
  hasRcInsurance: boolean('has_rc_insurance').notNull().default(false),

  // ── Fiscalidad española ──
  taxType: taxTypeEnum('tax_type'),
  nif: varchar('nif', { length: 20 }),           // NIF/CIF/NIE del talent o su sociedad
  fiscalName: varchar('fiscal_name', { length: 250 }), // Nombre fiscal (puede diferir del nombre artístico)
  fiscalAddress: text('fiscal_address'),          // Dirección fiscal completa

  // ── Bio extendida (F5) ──
  bioLong:    text('bio_long'),                                        // texto largo markdown ~200-300 palabras
  highlights: jsonb('highlights').$type<string[]>(),                   // ej: ["Top 1% CS2 ES", "Partner Twitch"]

  // ── Live section controls ──
  featuredLive:     boolean('featured_live').notNull().default(false),     // manual override para destacado en directo
  excludeFromLive:  boolean('exclude_from_live').notNull().default(false),  // ocultar de sección live
  featuredFallback: boolean('featured_fallback').notNull().default(false),  // aparece en grid cuando nadie está live (máx 10)

  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('talents_slug_idx').on(t.slug),
  index('talents_platform_idx').on(t.platform),
  index('talents_status_idx').on(t.status),
]);

export const talentTags = pgTable('talent_tags', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull(),
}, (t) => [
  index('talent_tags_talent_id_idx').on(t.talentId),
]);

export const talentStats = pgTable('talent_stats', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  icon: varchar('icon', { length: 10 }).notNull(),
  value: varchar('value', { length: 50 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('talent_stats_talent_id_idx').on(t.talentId),
]);

export const talentSocials = pgTable('talent_socials', {
  id: serial('id').primaryKey(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 50 }).notNull(),
  handle: varchar('handle', { length: 100 }).notNull(),
  followersDisplay: varchar('followers_display', { length: 20 }).notNull(),
  profileUrl: text('profile_url'),
  hexColor: varchar('hex_color', { length: 7 }).notNull(),
  platformId: varchar('platform_id', { length: 200 }),
  sortOrder: integer('sort_order').notNull().default(0),
  avgViewers: integer('avg_viewers'),
  topGeos: jsonb('top_geos').$type<Array<{ country: string; pct: number }>>(),
}, (t) => [
  index('talent_socials_talent_id_idx').on(t.talentId),
]);

export const talentsRelations = relations(talents, ({ many }) => ({
  tags: many(talentTags),
  stats: many(talentStats),
  socials: many(talentSocials),
}));

export const talentTagsRelations = relations(talentTags, ({ one }) => ({
  talent: one(talents, { fields: [talentTags.talentId], references: [talents.id] }),
}));

export const talentStatsRelations = relations(talentStats, ({ one }) => ({
  talent: one(talents, { fields: [talentStats.talentId], references: [talents.id] }),
}));

export const talentSocialsRelations = relations(talentSocials, ({ one }) => ({
  talent: one(talents, { fields: [talentSocials.talentId], references: [talents.id] }),
}));
