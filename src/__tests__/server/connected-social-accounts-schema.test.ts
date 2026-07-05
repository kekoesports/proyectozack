/**
 * Fix schema `connected_social_accounts` — invariantes estructurales.
 *
 * Incidente 2026-07-04:
 *   La tabla existía en producción con columnas legacy que NO coincidían
 *   con el schema Drizzle post-0104. Resultado: `getConnectedAccount`
 *   crashaba con `column "provider_username" does not exist` en cualquier
 *   sesión, y /sorteos/zacketizor con sesión mostraba error boundary.
 *
 * Esta suite bloquea que reaparezca:
 *   1) La migración 0105 dropea + recrea con el schema correcto.
 *   2) El schema Drizzle usa los nombres canónicos.
 *   3) `_journal.json` incluye la entry 0105.
 *   4) No aparecen columnas legacy (`username`, `avatar_url`, `scopes`
 *      ARRAY, `access_token_enc`, etc.) en el schema Drizzle actual.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const P = {
  migration: 'drizzle/0105_fix_connected_social_accounts_schema.sql',
  journal: 'drizzle/meta/_journal.json',
  schema: 'src/db/schema/connectedSocialAccounts.ts',
  query: 'src/lib/queries/connectedSocialAccounts.ts',
};

describe('[csa-schema-fix] migración 0105', () => {
  const sql = read(P.migration);

  it('existe el fichero de migración', () => {
    expect(fs.existsSync(path.join(ROOT, P.migration))).toBe(true);
  });

  it('DROP TABLE IF EXISTS connected_social_accounts CASCADE (idempotente y limpio)', () => {
    expect(sql).toMatch(/DROP TABLE IF EXISTS\s+"?connected_social_accounts"?\s+CASCADE/i);
  });

  it('CREATE TABLE connected_social_accounts (sin IF NOT EXISTS — fuerza estado canónico)', () => {
    expect(sql).toMatch(/CREATE TABLE\s+"?connected_social_accounts"?\s*\(/i);
    expect(sql).not.toMatch(/CREATE TABLE\s+IF NOT EXISTS\s+"?connected_social_accounts"?/i);
  });

  it.each([
    ['id', /"?id"?\s+serial\s+PRIMARY KEY/i],
    ['user_id', /"?user_id"?\s+text\s+NOT NULL/i],
    ['provider', /"?provider"?\s+varchar\(20\)\s+NOT NULL/i],
    ['provider_user_id', /"?provider_user_id"?\s+varchar\(64\)\s+NOT NULL/i],
    ['provider_username', /"?provider_username"?\s+varchar\(100\)(?!\s+NOT NULL)/i],
    ['provider_display_name', /"?provider_display_name"?\s+varchar\(100\)(?!\s+NOT NULL)/i],
    ['access_token_encrypted', /"?access_token_encrypted"?\s+text\s+NOT NULL/i],
    ['refresh_token_encrypted', /"?refresh_token_encrypted"?\s+text(?!\s+NOT NULL)/i],
    ['scope', /"?scope"?\s+text\s+NOT NULL/i],
    ['expires_at', /"?expires_at"?\s+timestamp/i],
    ['connected_at', /"?connected_at"?\s+timestamp/i],
    ['disconnected_at', /"?disconnected_at"?\s+timestamp/i],
    ['metadata', /"?metadata"?\s+jsonb/i],
  ])('la columna %s aparece con el tipo correcto', (_col, re) => {
    expect(sql).toMatch(re);
  });

  it('NO reintroduce nombres legacy (regresión prevenida) — solo mira declaraciones de columna', () => {
    // Filtramos comentarios (líneas que empiezan con `--`) para no falso-positivar
    // el header explicativo que menciona los nombres legacy como referencia.
    const noComments = sql
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('--'))
      .join('\n');
    // Detección tipo "declaración de columna": nombre entrecomillado + tipo SQL.
    expect(noComments).not.toMatch(/"username"\s+(text|varchar)/i);
    expect(noComments).not.toMatch(/"avatar_url"\s+(text|varchar)/i);
    expect(noComments).not.toMatch(/"access_token_enc"\s+text/i);
    expect(noComments).not.toMatch(/"refresh_token_enc"\s+text/i);
    expect(noComments).not.toMatch(/"scopes"\s+(text\s*\[\]|ARRAY)/i);
    expect(noComments).not.toMatch(/"updated_at"\s+timestamp/i);
  });

  it('FK user_id → user.id ON DELETE CASCADE', () => {
    expect(sql).toMatch(/ADD CONSTRAINT\s+"?connected_social_accounts_user_id_user_id_fk"?[\s\S]*ON DELETE cascade/i);
  });

  it('UNIQUE (user_id, provider) y (provider, provider_user_id)', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX\s+"?conn_social_user_provider_uq"?[\s\S]*"user_id","provider"/i);
    expect(sql).toMatch(/CREATE UNIQUE INDEX\s+"?conn_social_provider_user_uq"?[\s\S]*"provider","provider_user_id"/i);
  });

  it('no toca otras tablas (alcance restringido)', () => {
    const other = [
      'platform_missions',
      'mission_claims',
      'mission_verification_attempts',
      'coin_transactions',
      'shop_items',
      'redemptions',
      'giveaways',
      'giveaway_entries',
      'daily_streaks',
      'player_profiles',
    ];
    for (const t of other) {
      expect(sql).not.toMatch(new RegExp(`DROP TABLE[\\s\\S]*"?${t}"?`, 'i'));
      expect(sql).not.toMatch(new RegExp(`ALTER TABLE\\s+"?${t}"?`, 'i'));
    }
  });
});

describe('[csa-schema-fix] journal registra la 0105', () => {
  const journal = JSON.parse(read(P.journal)) as { entries: { idx: number; tag: string }[] };
  it('entry 0105 presente', () => {
    const hit = journal.entries.find((e) => e.tag === '0105_fix_connected_social_accounts_schema');
    expect(hit).toBeDefined();
    expect(hit?.idx).toBe(105);
  });

  it('0104 sigue registrada', () => {
    const hit = journal.entries.find((e) => e.tag === '0104_discord_missions_fase_a');
    expect(hit).toBeDefined();
  });
});

describe('[csa-schema-fix] schema Drizzle usa nombres canónicos', () => {
  const src = read(P.schema);

  it.each([
    ['providerUsername', /providerUsername:\s*varchar\('provider_username'/],
    ['providerDisplayName', /providerDisplayName:\s*varchar\('provider_display_name'/],
    ['accessTokenEncrypted', /accessTokenEncrypted:\s*text\('access_token_encrypted'/],
    ['refreshTokenEncrypted', /refreshTokenEncrypted:\s*text\('refresh_token_encrypted'/],
    ['scope', /scope:\s*text\('scope'/],
    ['connectedAt', /connectedAt:\s*timestamp\('connected_at'/],
    ['disconnectedAt', /disconnectedAt:\s*timestamp\('disconnected_at'/],
    ['metadata', /metadata:\s*jsonb\('metadata'/],
  ])('mapea la columna %s con el nombre canónico', (_col, re) => {
    expect(src).toMatch(re);
  });

  it('NO reintroduce nombres legacy en el schema Drizzle', () => {
    expect(src).not.toMatch(/\bavatarUrl\b/);
    expect(src).not.toMatch(/'access_token_enc'/);
    expect(src).not.toMatch(/'refresh_token_enc'/);
    expect(src).not.toMatch(/'scopes'/);
    expect(src).not.toMatch(/'updated_at'/);
  });
});

describe('[csa-schema-fix] query no usa columnas legacy', () => {
  const src = read(P.query);

  it('SELECT explícito o via .select() no menciona las columnas legacy', () => {
    // Aunque el query use el objeto Drizzle (`.select().from(...)`) sin
    // listar columnas, verificamos que no aparezcan hardcodeadas por error.
    expect(src).not.toMatch(/access_token_enc\b/);
    expect(src).not.toMatch(/avatar_url/);
    expect(src).not.toMatch(/\bscopes\b/);
  });
});
