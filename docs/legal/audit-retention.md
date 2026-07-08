# Retención de `sp_audit_events`

**Status**: política manual (sin cron). Última revisión: 2026-07-08.

Fase 1 PR2 — se implementa la política de retención pero **sin cron automático**. La purga es un script manual con guard explícito, disponible en `scripts/purge-audit-events.ts`.

## Qué son los eventos de auditoría

`sp_audit_events` es el ledger append-only del módulo de Sorteos. Registra acciones sensibles que requieren forensics, antifraude o cumplimiento legal:

- Consent: grant y revoke de consent con partners externos.
- Participaciones en sorteos (pagados y gratuitos).
- Elección de ganadores (acción admin).
- Canjes en tienda.
- Verificación y claim de misiones.
- Reclamación de recompensa diaria (racha).

Ver `AUDIT_ACTIONS` en `src/db/schema/giveawayAuditEvents.ts` para el set cerrado.

## Qué datos contienen

Por fila:

| Columna | Contenido | PII directa |
|---|---|---|
| `userId` | id del usuario Better Auth (nullable) | Sí (indirecta — sujeta a acceso restringido) |
| `action` | string del set cerrado | No |
| `refType`, `refId` | referencia a entidad (giveaway, shop_item, mission…) | No |
| `outcome` | success, blocked, error, rate_limited, already_done, unauthorized | No |
| `ipHash` | SHA-256 sin salt global | Pseudonímica |
| `userAgent` | primeros 500 chars del `user-agent` header | Pseudonímica |
| `country` | ISO2 desde `x-vercel-ip-country` | Bajo |
| `metadata` | jsonb — payload por-action | Depende — ver saneamiento |
| `createdAt` | timestamp con TZ | No |

## Qué NO contienen

- **NO** contienen IP en claro. Solo el SHA-256 de la primera IP en `x-vercel-forwarded-for` / `x-forwarded-for`.
- **NO** contienen email del usuario. Solo `userId` con FK a `user`.
- **NO** contienen tokens OAuth, access tokens ni refresh tokens.
- **NO** contienen contraseñas, secrets, ni credenciales de partners externos.
- **NO** contienen dirección postal ni Steam trade URL (esos viven en `player_profiles`, con acceso restringido separado).

La vista admin (`/admin/giveaways/auditoria`) aplica saneamiento adicional en render vía `src/lib/audit/redactMetadata.ts`:

- Whitelist de claves de metadata visibles (giveawayId, coinsEarned, etc.). Todo lo demás se colapsa como "N ocultos".
- Cualquier clave que matchee `email|token|secret|password|apiKey|authorization|cookie|jwt|refresh|access|steamId|tradeUrl|address|phone|nif|dni|iban|card|cvv` se sustituye por `[redacted]`.
- `ipHash` truncado a 12 caracteres visibles.
- `userAgent` truncado y resumido a ~60 caracteres.

## Retención recomendada

**Default: 730 días (~2 años)**.

Fundamentos:
- Cubre el marco típico de reclamos administrativos en España (procedimiento sancionador ordinario máximo 12 meses + margen).
- Suficiente para tendencias antifraude interanuales.
- Balance entre observabilidad y GDPR (art. 5.1.e, limitación del plazo de conservación).

Ajustable por argumento CLI del script entre 30 y 3650 días.

## Comando dry-run

Dry-run es el modo por defecto. **No borra nada**. Muestra el conteo por `action` y el total que se borrarían.

```bash
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/purge-audit-events.ts
```

Con retención personalizada:

```bash
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/purge-audit-events.ts --older-than-days=365
```

## Comando real (con guard)

El script solo borra si la variable de entorno `CONFIRM_PURGE_AUDIT_EVENTS` vale **exactamente** `I_ACCEPT_PURGE_AUDIT_EVENTS`.

```bash
DOTENV_CONFIG_PATH=.env.local \
CONFIRM_PURGE_AUDIT_EVENTS=I_ACCEPT_PURGE_AUDIT_EVENTS \
npx tsx -r dotenv/config scripts/purge-audit-events.ts --older-than-days=730
```

Cualquier otro valor (incluido `1`, `true`, `yes`) mantiene el modo dry-run. **Esto es intencional para evitar accidentes.**

## Riesgos

- **Irreversible**. La tabla no tiene versionado. Un borrado erróneo no se puede recuperar sin restore de backup Neon (ver política en `docs/tech-debt.md` § TD-15 sobre Preview aislado; el mismo backup automático de Neon aplica).
- **Sin cron por diseño (por ahora)**. Un cron automático implica ejecutar borrado sin supervisión. En Fase 1 PR2 hemos decidido dejarlo manual para forzar decisión humana en cada ronda.
- **Backups Neon**. Neon mantiene point-in-time recovery (PITR) por defecto en el plan actual del proyecto. Un borrado accidental puede restaurarse en la ventana de PITR.
- **Cambios de retención rápidos** pueden borrar datos aún útiles. Cambiar `--older-than-days` de 730 a 90 vaciaría ~85% de la tabla. El dry-run **es la salvaguarda operativa** — hay que revisarlo antes.

## Estado de automatización

- **Hoy**: manual, ejecución mensual/trimestral por operaciones.
- **Futuro**: se considerará añadir cron en `/api/cron/purge-audit-events` con la misma retención (730 días) y guard `CRON_SECRET`. Requiere PR separada + tests de idempotencia + señal explícita en `docs/tech-debt.md`.

## Referencias

- Schema: `src/db/schema/giveawayAuditEvents.ts`
- Helper insert: `src/lib/audit/logGiveawayEvent.ts`
- Saneamiento vista: `src/lib/audit/redactMetadata.ts`
- UI admin: `src/app/admin/(dashboard)/giveaways/auditoria/`
- Permiso: `sorteos:audit` en `src/lib/permissions.ts` (solo admin, admin_limited_tasks, manager)
- Script: `scripts/purge-audit-events.ts`
