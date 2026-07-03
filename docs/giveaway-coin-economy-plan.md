# Plan técnico — Economía de monedas por click / participación

**Estado:** Borrador para revisión — 2026-07-02
**Ámbito:** `/sorteos/plataforma` — SocialPro Giveaways
**Autor:** overnight session (Claude)
**Doc-only:** no toca código en esta iteración.

---

## 1. Objetivo

Definir cómo se ganan, se gastan y se reconcilian las 🪙 monedas dentro de la plataforma de sorteos, con foco en dos vectores nuevos que aún no están implementados:

1. **Monedas por click** — recompensas por acciones "leves" de engagement (visitar un creador, ver un video, seguir un canal externo verificable, unirse a Discord, etc.).
2. **Monedas por participación** — recompensa por entrar a un sorteo (ya existe en `ENTRY_COIN_REWARD`, pero necesita reglas de anti-farm y cap diario documentadas).

El objetivo es que el saldo sea significativo (afecta al canjeo en tienda) sin abrir vectores de farmeo trivial. Todo lo que aquí se propone se implementa **respetando el ledger existente** (`coin_transactions`), sin nuevas tablas paralelas.

---

## 2. Estado actual (2026-07-02)

- **Ledger único:** `coin_transactions` con columna `source` (enum: `racha | mision | sorteo | tienda | admin`).
- **`getCoinBalance(userId)`** = `SUM(amount)` sobre el ledger. No hay caché.
- **Fuentes hoy:**
  - `racha`: reclamación diaria (`DailyStreakCard`).
  - `mision`: `MissionsGrid` + `progressFor()` + `loadMissionProgress`.
  - `sorteo`: `+ENTRY_COIN_REWARD` al entrar a un sorteo interno.
  - `tienda`: gasto (`-item.costCoins`) al canjear.
  - `admin`: ajustes manuales.
- **Sinks hoy:** solo `tienda`. Los canjes descuentan del saldo y reservan stock del `shopItem`.

**No hay hoy:**

- Monedas por acciones fuera del sorteo (visitas, follows, plays).
- Cap diario/semanal por fuente.
- Anti-abuse structured (rate limiting por acción, dedup por device).
- Auditoría periódica (reconciliar `SUM(coin_transactions) === materialized balance`, si algún día se materializa).

---

## 3. Nuevos vectores de ganancia

### 3.1 Monedas por click (acciones micro)

Definimos "click actions" como acciones ligeras pero verificables. Cada acción tiene un `type`, un `reward` en monedas y un `cap` (por día o por lifetime). La granularidad la lleva la tabla existente `mission_claims` — no hace falta esquema nuevo.

Propuesta de acciones iniciales:

| Acción                                    | Reward | Cap                    | Verificación                                                    |
|-------------------------------------------|:------:|------------------------|-----------------------------------------------------------------|
| Visitar `/creadores/[slug]` (5s+)         | +2 🪙  | 1× / día / creador     | Beacon `POST /api/giveaway/visit-creator` firmado (ver 5.2)     |
| Ver un video destacado del creador (30s+) | +5 🪙  | 1× / día / video       | YouTube IFrame API `onStateChange === PLAYING` >= 30s           |
| Seguir a un canal Twitch (una vez)        | +25 🪙 | 1× lifetime / canal    | Helix `GetUserFollows` cronado (ver §7)                         |
| Follow en X del creador (una vez)         | +25 🪙 | 1× lifetime / handle   | Verificación diferida por token pegado en bio (bajo, opcional)  |
| Unirse a Discord del creador              | +50 🪙 | 1× lifetime            | OAuth Discord opcional (feature flag)                           |
| Compartir un sorteo (Twitter intent)      | +3 🪙  | 3× / día               | Beacon con giveawayId + intent URL (baja fricción)              |
| Login diario (aparte de la racha)         | 0 🪙   | —                      | La racha ya cubre este vector; NO duplicar reward               |

Reglas transversales:

- Todo insert al ledger pasa por un helper `awardCoins(userId, source, amount, refKey)` (nuevo).
- `refKey` codifica el evento único (`click:visit-creator:2026-07-02:zacketizor`), es UNIQUE.
- Cap = UNIQUE index en `(userId, refKey)` — impacto en el ledger, no en tabla nueva.

### 3.2 Monedas por participación (sorteos)

Ya existe `ENTRY_COIN_REWARD` (probable = 20). Reglas nuevas:

- **Cap diario por fuente `sorteo`:** máximo 100 🪙 / día (5 sorteos). Excedente = entry se registra pero no genera transacción positiva.
- **Anti farm creador:** si el creador es el mismo, cap 3 sorteos / día. Los demás cuentan hacia el cap global.
- **No hay reward por sorteos externos (KeyDrop, etc.)** — solo internos SocialPro. Esto es política: los externos son señales de marca, no de ganancia interna.

---

## 4. Sinks (canjeos y sanciones)

- **Tienda:** ya implementado. Cost fijo por item.
- **Pujas privadas (futuro):** sorteos "premium" gated por coste en 🪙 en vez de gratis. Requiere UI extra — fuera del scope inmediato.
- **Sanciones:** transacción negativa con `source = 'admin'`. Casos:
  - Cuenta multi-account detectada → devolver bono referido a 0 y bloquear.
  - Abuso de beacons → decremento simbólico + revocar acceso a acciones micro por 30 días.

---

## 5. Reglas de integridad

### 5.1 UNIQUEs y ledger

- `coin_transactions.ref_key` (nuevo, nullable text) — UNIQUE cuando no es `null`. Permite:
  - Idempotencia de `awardCoins()` — si el `refKey` ya existe → no-op.
  - Auditoría por fuente (`admin` reversal referencia el `refKey` original).
- `mission_claims.mission_id + userId + period` sigue siendo UNIQUE — no cambia.
- `giveaway_entries.userId + giveawayId` UNIQUE — ya vigente.

### 5.2 Verificación de acciones micro

Regla: el cliente **nunca** dicta el reward. Sólo emite un beacon con `actionType + payload`. El server:

1. Valida `session` (Better Auth).
2. Valida `actionType` contra whitelist.
3. Ejecuta el verifier específico:
   - `visit-creator`: mira `Referer` y timestamp. Rate-limit por IP + userId (Turnstile opcional).
   - `watch-video`: requiere el `videoId` real; sólo lo consideramos si aparece en `talents.socials.platform_id`.
   - `follow-twitch`: encolar y verificar en cron via Helix API.
4. Si todo OK → `awardCoins(userId, 'mision', reward, refKey)` (usamos source `mision` para no crear enum nuevo — es filosóficamente una micro-misión).

Si se decide crear un enum `source = 'action'`, sería una migration menor:

```sql
ALTER TYPE coin_source ADD VALUE 'action';
```

Decisión pospuesta hasta que ADR lo justifique.

### 5.3 Rate limiting

- Beacons: `10 requests / minuto / userId` a nivel de middleware.
- Anti-bot: Turnstile invisible en `awardCoins` (no bloquea, sólo señaliza si el token es débil → transacción queda en cuarentena hasta review admin).

### 5.4 Auditoría

Nuevo cron `/api/cron/coin-audit` diario:

- Compara `SUM(coin_transactions) per user` con caché derivada (si se materializa).
- Detecta gasto negativo neto imposible (canje > balance en el momento).
- Alerta en `crm_alerts` si hay drift.

---

## 6. Cambios de esquema propuestos

Todos con migration Drizzle (NUNCA `push`):

```ts
// src/db/schema/coinTransactions.ts (patch)
refKey: text('ref_key'),
// + uniqueIndex('coin_tx_ref_key_uq').on(t.refKey).where(sql`ref_key is not null`),
```

Nota: partial UNIQUE index requiere `.where()` en Drizzle 0.30+. Verificar sintaxis actual antes de generar.

```ts
// src/lib/giveaway-platform/awardCoins.ts (nuevo)
export async function awardCoins(opts: {
  userId: string;
  source: CoinSource;
  amount: number;
  refKey?: string;
}): Promise<{ ok: boolean; awarded: number; reason?: 'duplicate' | 'cap_exceeded' }>;
```

```ts
// src/lib/giveaway-platform/dailyCaps.ts (nuevo)
export async function checkDailyCap(userId: string, source: CoinSource): Promise<{
  awardedToday: number;
  capForSource: number;
  remaining: number;
}>;
```

No hay tabla nueva. Todo funciona sobre `coin_transactions` + índices.

---

## 7. Verificaciones cron (jobs)

- `/api/cron/verify-twitch-follows` — 1×/hora — procesa cola de acciones `follow-twitch` pendientes. Requiere Helix token del backend (client credentials).
- `/api/cron/coin-audit` — 1×/día — auditoría integral.
- `/api/cron/dispatch-referral-bonuses` (futuro) — al invitar Steam → bonus para el invitador cuando el invitado alcance N tickets.

Todos protegidos con `Bearer ${CRON_SECRET}` como el resto de crons del proyecto.

---

## 8. UX changes que implica

Para el usuario:

- Nueva tarjeta "Gana monedas rápido" en `/sorteos/plataforma` con las acciones micro disponibles. UI similar a `MissionsGrid` pero con countdown "1× hoy".
- En la card de creador (perfil), añadir "🪙 Recompensas por interactuar" y las 3-4 acciones activas para él.
- En `PlatformShop`, mantener el summary actual pero añadir un "Tu ganancia media / semana" (proyección basada en historial últimas 4 semanas).

Para el admin (fuera de scope inmediato):

- `/admin/sorteos/coin-ledger` — tabla auditable, filtros por source, refKey, userId.
- `/admin/sorteos/coin-actions` — CRUD del catálogo de acciones micro (feature-flag por acción, reward, cap).

---

## 9. Riesgos

| Riesgo                                            | Mitigación                                                              |
|---------------------------------------------------|-------------------------------------------------------------------------|
| Farm de acciones micro (beacons falsos)           | Rate limit + Turnstile + verificadores server-side + refKey UNIQUE      |
| Inflación (usuarios acumulan sin gastar)          | Cap diario global + expiración blanda (info UI: "próximamente")         |
| Drift ledger (balance falla)                      | Cron `coin-audit` + alerta crm_alerts                                   |
| Fricción para el usuario (hoy es muy sencillo)    | Mantener la racha diaria y misiones como camino principal; acciones = extra |
| Steam multi-account (dos cuentas mismo dueño)     | Anti-fraud diferido (F-print, IP delta, revisión manual)                |

---

## 10. Fases sugeridas

1. **Fase A — Ledger evolutivo (1 PR)**
   - Añadir `ref_key` a `coin_transactions` + partial UNIQUE.
   - Helper `awardCoins` + `checkDailyCap` con tests estructurales.

2. **Fase B — Cap sorteos (1 PR)**
   - Aplicar cap por fuente `sorteo` al entrar. UI: "Ya llegaste al máximo hoy".

3. **Fase C — Acciones micro visibles (1 PR)**
   - Catálogo estático hardcodeado en constants + página `/sorteos/plataforma` mostrando los cards.
   - Verificadores solo para `visit-creator` y `share-giveaway` (los que no requieren API externa).

4. **Fase D — Verificaciones externas (1 PR)**
   - Cron Twitch follow verification.
   - OAuth Discord opcional.

5. **Fase E — Admin ledger (1 PR)**
   - Vistas admin + auditoría + alertas.

Total: 5 PRs bien acotados. La fase A es la base; el resto se puede reordenar en función de prioridades comerciales.

---

## 11. Preguntas abiertas

- ¿Los sorteos externos (KeyDrop) suman al ranking global? **Propuesta:** NO — el ranking es sobre `giveawayEntries` internas.
- ¿Debe caducar el saldo? **Propuesta:** no, pero avisar en UI si pasa X meses sin actividad.
- ¿Recompensa por referido Steam? **Propuesta:** sí, pero fase F, gated por confirmación de participación mínima del invitado.
- ¿Tope duro por usuario y mes? **Propuesta:** 3.000 🪙/mes en fase inicial — revisable con métricas reales.
