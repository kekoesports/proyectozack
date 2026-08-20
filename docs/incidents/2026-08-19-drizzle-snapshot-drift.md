# Drift de snapshots de Drizzle — `drizzle-kit generate` emite SQL destructivo

**Fecha:** 2026-08-19
**Severidad:** alta — riesgo de pérdida de datos en producción
**Estado:** **CERRADO el 2026-08-20** — ver "Resolución" al final
**Detectado en:** rama `feat/crm-leads-module`, al generar la migración del módulo Leads
**Ámbito:** `drizzle/meta/` en `master` (no lo introduce ninguna rama concreta)

---

## Resumen en una línea

`npx drizzle-kit generate` sobre `master` produce hoy 69 líneas de SQL que **no
corresponden a ningún cambio pendiente**: re-emite reparaciones ya aplicadas,
incluyendo `DROP COLUMN` sobre `connected_social_accounts` (tokens OAuth
cifrados) y un `ADD COLUMN ... NOT NULL` sin default.

## Por qué importa

`package.json` define:

```json
"build": "tsx scripts/migrate.ts && next build && tsx scripts/ping-indexnow.ts"
```

`scripts/migrate.ts` aplica todo lo pendiente en `drizzle/` contra
`DATABASE_URL`. Es decir: **cualquiera que corra `drizzle-kit generate`,
commitee el resultado sin leerlo y mergee a master, dispara ese SQL en el
siguiente deploy de producción.** El fichero generado se llama igual que
cualquier otra migración legítima y no hay nada en el flujo que avise.

`drizzle-kit check` **no** detecta esto — devuelve `Everything's fine`.
Sólo valida la coherencia interna del journal, no que los snapshots reflejen lo
que las migraciones SQL hicieron de verdad.

## Causa raíz

`drizzle-kit generate` no lee la base de datos: diffea `src/db/schema/*.ts`
contra el **último snapshot** de `drizzle/meta/`. Ese snapshot es
`0112_snapshot.json`, y describe un estado que las migraciones posteriores —y
algunas anteriores, escritas a mano— ya cambiaron.

El caso más claro es `connected_social_accounts`:

- `0105_fix_connected_social_accounts_schema.sql` es una migración **escrita a
  mano** (incidente 2026-07-04) que hace `DROP TABLE` + `CREATE TABLE` con el
  esquema nuevo: `provider_username`, `access_token_encrypted`, `scope`,
  `connected_at`, `disconnected_at`, `metadata`.
- Nadie regeneró los snapshots después. `0112_snapshot.json` sigue describiendo
  la tabla vieja: `username`, `access_token_enc`, `scopes`, `created_at`,
  `updated_at`.
- Resultado: drizzle-kit cree que hay que convertir la tabla vieja en la nueva,
  y como no le consta ningún rename, lo hace con `DROP COLUMN` + `ADD COLUMN`.

## Snapshots que faltan

13 entradas del journal no tienen `*_snapshot.json`:

| idx | tag |
|---|---|
| 0018 | `0018_green_morbius` |
| 0033 | `0033_curved_white_tiger` |
| 0039 | `0039_contact_submissions_phone` |
| 0040 | `0040_contact_submissions_missing_cols` |
| 0044 | `0044_brand_brief_content` |
| 0046 | `0046_brand_crm_redaction` |
| 0051 | `0051_create_crm_alerts` |
| 0059 | `0059_mature_forge` |
| 0110 | `0110_add_preroll_to_deliverable_type` |
| 0111 | `0111_add_tracking_sheet_to_campaigns` |
| 0113 | `0113_add_creator_notes_to_campaigns` |
| 0114 | `0114_seed_twitch_mission_zacketizor` |
| 0115 | `0115_automation_deals_api` |

Las de la franja 0110–0115 son las que más pesan, por ser posteriores al último
snapshot existente.

## Evidencia

Sobre `origin/master` limpio (`d5ba99f1`), sin ningún cambio local, `generate`
**ni siquiera llega a emitir SQL por sí solo**: se para a preguntar.

```
$ npx drizzle-kit generate --name=drift_probe
Error: Interactive prompts require a TTY terminal
    at promptColumnsConflicts (...)
    at columnsResolver (...)
```

Drizzle-kit detecta columnas que no sabe si son nuevas o renombradas y abre un
prompt por cada una: *create column* frente a *rename column*. En un shell no
interactivo (CI, un agente, un `npm script`) revienta ahí. En un terminal normal,
espera a que alguien conteste.

**Esto es lo peor del asunto: la salida no es determinista.** Depende de cómo
conteste quien lo ejecute, y quien lo ejecute normalmente no tiene contexto para
saber que `access_token_enc` → `access_token_encrypted` fue un rename hecho a
mano en `0105`.

Contestando *create column* a cada prompt (el valor por defecto, y lo que sale de
darle a Enter sin leer) el resultado son 69 líneas, ninguna relacionada con el
módulo que se estuviera desarrollando:

```
$ npx drizzle-kit generate --name=drift_probe    # respondiendo "create column"
✓ Your SQL migration file ➜ drizzle/0116_drift_probe.sql

$ wc -l < drizzle/0116_drift_probe.sql
69
$ grep -c "contact_submissions\|lead_status" drizzle/0116_drift_probe.sql
0
```

Extracto de lo que emite:

```sql
ALTER TABLE "connected_social_accounts" ADD COLUMN "access_token_encrypted" text NOT NULL;
...
ALTER TABLE "connected_social_accounts" DROP COLUMN "username";
ALTER TABLE "connected_social_accounts" DROP COLUMN "access_token_enc";
ALTER TABLE "connected_social_accounts" DROP COLUMN "refresh_token_enc";
ALTER TABLE "connected_social_accounts" DROP COLUMN "scopes";
ALTER TABLE "connected_social_accounts" DROP COLUMN "created_at";
ALTER TABLE "connected_social_accounts" DROP COLUMN "updated_at";
```

Además re-emite: `CREATE TABLE mission_verification_attempts`, 9 columnas de
`campaigns` (tracking sheet + automation), 4 de `platform_missions`, 4 de
`redemptions`, 2 de `player_profiles`, `coin_transactions.ref_key`, el
`ALTER TYPE deliverable_type ADD VALUE 'preroll'` y 8 CHECK constraints sobre
`giveaways`, `redemptions` y `shop_items`.

### Modo de fallo real

Contra una DB que ya tiene 0104–0115 aplicadas, el desenlace más probable **no
es la pérdida del token**, es el bloqueo de los deploys:

`ALTER TABLE "connected_social_accounts" ADD COLUMN "access_token_encrypted" text NOT NULL;`
sobre una tabla **no vacía** y sin default falla en Postgres. Y como
`scripts/migrate.ts` corre dentro de `npm run build`, el fallo tumba el build de
Vercel entero: no se despliega nada hasta que alguien deshaga la migración a
mano.

Verificado en la DB de desarrollo: `connected_social_accounts` tiene 1 fila con
tokens OAuth reales, así que la tabla no está vacía y ese `ADD COLUMN` fallaría.

Cuál de los dos desenlaces toca depende del orden en que Postgres ejecute los
statements y de dónde aborte la transacción. En una DB parcialmente migrada el
resultado es directamente impredecible. Ninguna de las ramas es aceptable.

## Cómo se ha esquivado en la PR de Leads

`drizzle/0118_crm_leads_module.sql` está **escrito a mano** con sólo el enum
`lead_status`, las 4 columnas nuevas de `contact_submissions`, su FK y sus 2
índices — mismo patrón que 0105. Deliberadamente **no** se añade
`drizzle/meta/0118_snapshot.json`: generarlo consolidaría el estado incorrecto
del snapshot 0112 y agravaría el problema.

La migración se validó aplicándola contra un Postgres 16 real con la tabla
`contact_submissions` en su forma actual y 46 filas: aplica limpio, es
idempotente (`IF NOT EXISTS` / `DO $$ ... EXCEPTION WHEN duplicate_object`), y
las 46 filas quedan en `status='nuevo'`.

## Plan de reconciliación propuesto

No lo resuelve la PR de Leads. Requiere conocer el estado real de producción,
así que va aparte.

1. **Fotografiar producción.** Volcar el esquema real:
   `pg_dump --schema-only $DATABASE_URL > /tmp/prod-schema.sql`. Es la única
   fuente de verdad; los snapshots no lo son ahora mismo.
2. **Confirmar `__drizzle_migrations`.** Comprobar que contiene hasta 0115 y que
   los hashes cuadran con los ficheros de `drizzle/`. Si falta alguna entrada,
   backfillear antes de tocar nada (ya está documentado en CLAUDE.md).
3. **Levantar una DB desechable** y aplicar `drizzle/*.sql` de 0000 a 0115 en
   orden. Diffear el resultado contra `/tmp/prod-schema.sql`. Las diferencias
   que salgan son la deuda real, distinta del ruido de snapshots.
4. **Regenerar el snapshot de cabecera.** Con el schema TypeScript y la DB ya
   alineados, generar un snapshot que describa el estado verdadero y commitearlo
   como `0116_snapshot.json` (o el índice que toque), sin SQL asociado o con un
   SQL vacío/no-op.
5. **Verificar.** `npx drizzle-kit generate` sobre master limpio debe producir
   **cero** statements. Ese es el criterio de cierre.
6. **Blindarlo en CI.** Añadir un job que corra `drizzle-kit generate` en un
   directorio temporal y falle si emite algo. Es la única defensa real: `check`
   no cubre este caso. CLAUDE.md ya pedía `drizzle-kit check` en CI tras el
   incidente de `crm_alerts` (2026-05-06) — no basta.

   Mientras tanto, hay una defensa barata que se puede poner hoy: como
   `generate` se bloquea pidiendo TTY en entornos no interactivos, un job de CI
   que lo ejecute sin terminal **ya falla** ante este drift. Es un canario
   accidental, pero funciona.

## Reglas provisionales hasta que se cierre

- **No commitear la salida de `drizzle-kit generate` sin leerla entera.** Si
  menciona una tabla que no estás tocando, es drift: descártala.
- Migraciones nuevas: escribirlas a mano, acotadas a la tabla que toca,
  idempotentes, y añadir la entrada en `_journal.json`.
- No añadir snapshots nuevos hasta el paso 4.

## Referencias

- `drizzle/0104_discord_missions_fase_a.sql`, `drizzle/0105_fix_connected_social_accounts_schema.sql`
- `CLAUDE.md` → sección *Database Migrations* (incidente `crm_alerts`, 2026-05-06)
- `docs/2026-05-14-drizzle-migration-tracker.md`
- `scripts/migrate.ts`, `package.json` → script `build`

---

## Resolución (2026-08-20)

Cerrado con la migración `0119_reconcile_schema_drift.sql` y el snapshot rebasado
`drizzle/meta/0119_snapshot.json`.

### Cómo se diagnosticó

En lugar de regenerar snapshots a ciegas, se enfrentaron **las dos verdades**:

1. `drizzle-kit introspect` contra producción → el schema real de la base.
2. `drizzle-kit generate` sobre un árbol con `drizzle/` vacío → el schema que
   describe el TypeScript.

Comparar ambos separó lo que era **ruido de snapshots perdidos** de lo que era
**deuda real de schema**. El resultado fue tranquilizador y a la vez revelador:
el schema TS y la base concordaban tabla a tabla y columna a columna salvo en
cinco puntos.

### Lo que se encontró

| Divergencia | Naturaleza |
|---|---|
| `crm_brand_status` sin `inactiva` ni `perdida` | **Bug vivo en producción** |
| 10 columnas residuales en `campaigns` | Restos de un modelo anterior |
| `invoices.entity` | Residuo |
| `playing_with_neon` | Tabla de ejemplo que crea Neon al provisionar |
| Orden de `crm_task_related_type` y `deliverable_type` | Cosmético, sin efecto |

**El bug:** `src/db/schema/crmBrands.ts` y `src/lib/schemas/crmBrand.ts` declaraban
`inactiva` y `perdida` como estados de marca, pero el enum de la base sólo tenía 8
valores. Marcar una marca con cualquiera de esos dos estados fallaba con
`invalid input value for enum crm_brand_status: "inactiva"`. Nadie lo había
reportado, probablemente porque son estados poco usados.

Las columnas residuales se verificaron una a una antes de tocarlas: 8 de las 10 a
`0/96` no nulos, y `brand_paid`/`talent_paid` a `boolean NOT NULL DEFAULT false`
con las 96 filas en `false`. `invoices.entity` a `0/93`. Cero filas con valor
significativo, y respaldo tomado antes de aplicar.

### Por qué no se tocó el orden de los enums

Reordenar valores de un enum en Postgres obliga a recrear el tipo. Y no hace
falta: `generate` compara el schema TypeScript contra el **snapshot**, no contra
la base, así que un orden distinto en la base no produce diff. Sólo se notaría al
hacer `introspect`.

### Criterio de cierre, cumplido

```
$ npx drizzle-kit generate --name=verificacion_drift < /dev/null
No schema changes, nothing to migrate 😴
```

Sin prompts interactivos, sin SQL emitido, exit 0.

### Consecuencia en CI

El paso `Snapshot drift canary` de `.github/workflows/ci.yml` **deja de llevar
`continue-on-error`** y pasa a ser un gate real. Si vuelve a fallar, es que se ha
tocado el schema sin migración o que los snapshots se han desalineado otra vez.

### Lo que esto desbloquea

Las migraciones vuelven a ser seguras, así que ya se puede atacar la deuda que
dependía de esto: el unique index `(tracker_id, normalized_url)` en
`deal_deliverable_items`, la unificación de los dos normalizadores de URL y el
escritor único de `current_count`.
