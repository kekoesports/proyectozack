# Operaciones manuales sobre el ledger de puntos

**Estado:** Herramienta interna dev/staff — 2026-07-04.
**Ámbito:** `scripts/admin-grant-points.ts` y patrones relacionados.

Este documento explica **cuándo y cómo** conceder puntos a un usuario concreto
de SocialPro Giveaways de forma manual, y cómo hacer rollback si te equivocas.
No es un panel administrativo público — es un script CLI que sólo se ejecuta
desde una máquina de operador con `.env.local`.

---

## 1. Cuándo usar el script

Casos aceptables:

- **Prueba interna de canje**: darte a ti mismo los puntos justos para
  validar el flujo Steam Trade URL → redemption pendiente → email interno
  → decremento de stock (ver §5).
- **Compensación de soporte**: usuario reportó bug legítimo que hizo que
  perdiera puntos ganados. Documentar en el `reason` el ticket.
- **Campaña especial**: sorteo one-shot fuera del sistema de misiones
  (ej. Twitter/Discord). Documentar en el `reason` la campaña.
- **Corrección post-incidente**: cuando un fallo de servicio afectó las
  recompensas y hay que restablecer saldo.

Casos **no** aceptables:

- ❌ "Regalar" puntos a amigos sin justificación operativa.
- ❌ "Corregir" el saldo de un canje que ya se completó — usar rollback
  compensatorio (ver §Rollback) en su lugar, no borrar.
- ❌ Grants recurrentes automatizados — cambia la lógica de misiones o
  daily rewards en su lugar.

---

## 2. Cómo buscar el usuario

La identificación es por Steam ID (recomendado) o por `user.id` (auth
Better Auth interno).

**Buscar Steam ID de un jugador (desde la propia web):**

- Cada perfil `/sorteos/perfil` muestra el Steam ID pública. Pídele al
  usuario que te lo pase (o localízalo desde el ranking mensual).
- Formato Steam64: 17 dígitos empezando por `7656119...`.

**Buscar user.id (Better Auth):**

- Si necesitas hacer un grant y el usuario no tiene `player_profiles`
  todavía (raro), puedes usar directamente `user.id`.
- Consulta SQL de referencia:
  ```sql
  SELECT id, name, email FROM "user"
   WHERE email ILIKE '%buscar%' OR name ILIKE '%buscar%';
  ```

---

## 3. Cómo conceder puntos

### Comando ejemplo (mío, Kevin — 1000 puntos para prueba Glock-18 Block-18)

Reemplaza `76561198XXXXXXXXX` por tu Steam ID real:

```bash
CONFIRM_ADMIN_GRANT_POINTS=I_ACCEPT_GRANT_POINTS \
  npx tsx --env-file=.env.local scripts/admin-grant-points.ts \
  --steam-id 76561198XXXXXXXXX \
  --amount 1000 \
  --reason "Test canje Glock-18 Block-18 (800 pts) — 2026-07-04"
```

### Salida esperada

```
=== Grant de puntos manual ===
  Usuario:    Kevin
  Steam ID:   76561198XXXXXXXXX
  User ID:    <uuid Better Auth>
  Cantidad:   +1.000 pts
  Reason:     Test canje Glock-18 Block-18 (800 pts) — 2026-07-04
  Saldo ant.: 42 pts
  Saldo post: 1.042 pts

✓ Grant aplicado — tx#237 @ 2026-07-04T...Z
  Saldo verificado post-INSERT: 1.042 pts
```

### Argumentos

| Flag | Obligatorio | Descripción |
|------|-------------|-------------|
| `--steam-id <76561198…>` | ⚠️ Uno de los dos | Steam64 del jugador. Preferido. |
| `--user-id <auth-uuid>` | ⚠️ Uno de los dos | ID interno Better Auth. Bypass Steam. |
| `--amount <int>` | ✅ | Cantidad positiva 1..100.000. |
| `--reason "<texto>"` | ✅ | Justificación (queda en el ledger). Max 200 chars. |

### Guards

- ❌ Bloqueado en CI, Vercel build, `NODE_ENV=production`, `GITHUB_ACTIONS`.
- ❌ Sin `CONFIRM_ADMIN_GRANT_POINTS=I_ACCEPT_GRANT_POINTS` aborta con
  `exit 1`.
- ❌ `--amount <= 0` o `--amount > 100.000` → error.
- ❌ `--reason` vacío o > 200 chars → error.
- ❌ Pasar `--steam-id` y `--user-id` a la vez → error.

---

## 4. Prueba de canje end-to-end

Flujo recomendado para la validación de Glock-18 Block-18 (800 pts):

1. **Conceder 1.000 pts** con el comando de §3.
2. **Verificar en `/sorteos/perfil`**: sección "🧾 Últimas transacciones"
   muestra la línea `+1.000 · Admin · Test canje Glock-18 Block-18...`.
3. **Comprobar que la Steam Trade URL está configurada** en el perfil
   (input `Steam Trade URL` con el formato `https://steamcommunity.com/tradeoffer/new/?partner=…&token=…`).
4. **Ir a `/sorteos/<creator>#recompensas`**, filtrar por tab
   "🔫 Skins CS2", localizar **Glock-18 | Block-18** (800 pts). Debe
   mostrarse como canjeable (botón "Canjear" activo).
5. **Pulsar "Canjear"**. Debe aparecer el banner verde:
   > *Solicitud recibida. Revisaremos el canje y enviaremos la recompensa
   > manualmente por Steam Trade Offer.*
6. **Verificar cambios en DB / UI**:
   - `/sorteos/perfil` → "🎒 Inventario" muestra la nueva redemption con
     estado "Pendiente".
   - Card de Glock-18 Block-18 pasa a "Agotado" (stock 1 → 0).
   - Historial de puntos añade `-800 · Tienda · Canje · Glock-18 | Block-18`.
7. **Verificar email en `info@socialpro.es`**: asunto
   `Nueva recompensa solicitada · Skin CS2 — Glock-18 | Block-18`.
   Contenido con Redemption ID, Steam Trade URL, Steam ID, fecha.

Si algún paso falla, **no** intentes canjear otra skin — reporta el fallo
y depuramos primero.

---

## 5. Riesgos y prevenciones

| Riesgo | Prevención |
|--------|------------|
| Concesión por typo (ej. 100.000 en lugar de 1.000) | `MAX_GRANT = 100_000` hard-cap por ejecución. Snapshot antes/después impreso siempre. |
| Ejecutar el script en Vercel/CI por accidente | Guard `detectCiOrProd()` — abort con exit 1. |
| Duplicar grants (correr dos veces por error) | Sin idempotencia — cada ejecución inserta una fila nueva. Verificar `Saldo post-INSERT` antes de reintentar. |
| Grant a un Steam ID equivocado | Snapshot muestra `Usuario` (nombre) y `User ID` antes de la fila real. **Verifica antes** de confirmar cualquier acción downstream (canje real). |
| Filtración del token de confirmación | `CONFIRM_ADMIN_GRANT_POINTS=I_ACCEPT_GRANT_POINTS` es un check de intención, no un secreto. La vulnerabilidad real es acceso al archivo `.env.local` (DB URL). Mantener `.env.local` fuera del repo. |
| Modificar balances directos (bypass ledger) | El script **NUNCA** hace UPDATE a `shop_items`, `redemptions`, `player_profiles` ni al saldo del `user`. Ledger append-only por diseño. |
| Rollback tardío | Ver §Rollback abajo. |

---

## 6. Rollback (compensación negativa)

Si te equivocas al conceder puntos:

- **NO** intentes borrar la fila insertada en `coin_transactions`. Rompe
  auditoría. Además la FK `redemptions.shopItemId ON DELETE RESTRICT` y
  patrones similares en el CRM asumen que el ledger es histórico.
- El patrón correcto es **transacción negativa compensatoria** con
  `concept` explícito:

  ```sql
  INSERT INTO coin_transactions (user_id, amount, source, concept, ref_id, created_at)
  VALUES
    ('<user-id>', -1000, 'admin', 'Reverso de tx#237 — typo en grant', NULL, NOW());
  ```

- El script actual **NO** permite `--amount` negativo por diseño — es un
  guard extra contra typos. Si necesitas hacer un reverso:
  1. Documenta el motivo en un ticket interno.
  2. Ejecuta la SQL manualmente con `--env-file=.env.local`, verificando
     el `user_id` con SELECT antes.
  3. Verifica el saldo posterior con `getCoinBalance()` equivalente.

Alternativa futura (**no implementada**): añadir bandera `--allow-negative`
en el script con guard extra y sanity check en pantalla. Requeriría OK
explícito y actualización de tests.

---

## 7. Auditoría — qué queda en la DB

Cada grant deja una fila permanente en `coin_transactions`:

| Campo | Valor |
|-------|-------|
| `id` | serial auto |
| `user_id` | `target.userId` (resuelto desde `--steam-id` o `--user-id`) |
| `amount` | positivo (1..100.000) |
| `source` | `'admin'` (categoría del `CoinSource`, ya en tipos) |
| `concept` | valor de `--reason` (max 200 chars) |
| `ref_id` | `NULL` (no hay entidad origen — ni giveaway ni misión) |
| `created_at` | `now()` con TZ |

Para consultar grants históricos por reason:

```sql
SELECT id, user_id, amount, concept, created_at
  FROM coin_transactions
 WHERE source = 'admin'
 ORDER BY created_at DESC
 LIMIT 50;
```

---

## 8. Historial

- **2026-07-04** — Script inicial `admin-grant-points.ts` + doc. Nace por
  necesidad de dotar de puntos a operador (Kevin) para prueba controlada
  de canje Glock-18 Block-18 (800 pts). Alineado con el patrón de scripts
  destructivos/DB existentes (`CONFIRM_...=I_ACCEPT_...`).
