# Economía de monedas — SocialPro Giveaways

**Estado:** Fase 1 — política aprobada por producto, pendiente de revisión legal para textos públicos.
**Alcance:** `/sorteos/plataforma`, misiones, tienda, rankings, perfil.
**Autor:** producto (2026-07-03).

Este documento fija la regla interna de balance para la economía de monedas 🪙 de la plataforma. La regla NO se expone al usuario ni se comunica como conversión monetaria — es una guía interna para calibrar rewards y precios.

---

## 1. Regla interna de valoración

- **1 USD de coste interno ≈ 1.000 monedas.**
- **1 EUR de coste interno ≈ 1.100 monedas.**

Uso: cuando un artículo cueste al proveedor (SocialPro) X€, su precio interno base es `X × 1.100`. Se ajusta a la baja para incentivar canjes menores y al alza para artículos premium (fricción, uso de stock limitado, marca).

**Importante — nunca exponer al usuario:**
- No mostrar "1.000 monedas = 1$" en la UI.
- No permitir comprar monedas con dinero.
- No permitir transferir monedas entre usuarios.
- No permitir marketplace usuario↔usuario.
- No decir que las monedas tienen valor monetario.
- Copy público estable: *"Las monedas son puntos internos sin valor monetario, no transferibles y no canjeables por dinero."*

Ver también `docs/giveaway-coin-economy-plan.md` (plan técnico futuro de expansión), `docs/sorteos-*` legales.

---

## 2. Diagnóstico del estado actual (2026-07-03)

### Rewards actuales (`src/lib/giveaway-platform/constants.ts` + `scripts/seed-giveaway-platform.ts`)

| Fuente | Valor |
|---|---|
| Racha diaria días 1-7 | `[10, 15, 20, 25, 30, 40, 60]` → total semana **200 monedas** |
| Participar en sorteo interno (`ENTRY_COIN_REWARD`) | 20 monedas |
| Misión "Primera participación" | 50 |
| Misión "Participa en +5 sorteos" | 250 |
| Misión "Participa en +50 sorteos" | 1.500 |
| Misión "Participa en +100 sorteos" | 3.000 |
| Misión "Racha 7 días" | 400 |

### Precios actuales de tienda

| Item | Precio actual |
|---|---|
| Glock-18 · Water Elemental | 150 |
| USP-S · Kill Confirmed | 450 |
| AK-47 · Redline | 800 |
| Camiseta SocialPro | 300 |
| Gorra SocialPro | 220 |
| Tarjeta Steam 10€ | **1.000** |
| Tarjeta Steam 20€ | 1.900 |
| Tarjeta Steam 50€ | 4.500 |
| PSN Plus 1 mes (~5€) | 900 |
| Riot Points 10€ | 1.000 |

Ratio actual = ~100 monedas/€. Propuesta = ~1.100 monedas/€. **Factor de reajuste ≈ 11×.**

---

## 3. Nueva economía objetivo

### 3.1 Ganancia (rewards)

| Fuente | Rango objetivo |
|---|---|
| Login diario (racha día 1) | 20 monedas |
| Racha 3 días completada | +75 monedas |
| Racha 7 días completada | +250 monedas |
| Misión básica | 50 monedas |
| Misión media | 250 monedas |
| Misión premium (verificada) | 1.000 monedas |
| Participar en sorteo interno | 50 monedas |
| Completar perfil | 150 monedas (una vez) |
| Conectar Discord/YouTube (futuro) | 250-750 monedas (una vez cada canal) |
| Ranking mensual — Top 3 | premio especial (ver §6) |

**Ganancia esperada por perfil:**
- **Casual** (login diario + 1 sorteo/semana): ~150 mon/semana → ~600/mes.
- **Activo** (racha completa + 3 misiones básicas/mes): ~1.200 mon/mes.
- **Grinder** (racha + misiones media + participaciones semanales): ~3.500-5.000 mon/mes.

### 3.2 Precios de tienda

| Categoría | Rango | Ejemplo |
|---|---|---|
| Profile card básica | 1.500-3.000 | Neon Pink, Cyber Blue |
| Profile card premium | 5.000-10.000 | Gold Elite, Inferno |
| Avatar frame básico | 2.000-4.000 | Cyan glow, Basic gold |
| Avatar frame premium | 7.500-15.000 | Legendary flame |
| Badge premium | 3.000-10.000 | OG Member, Top Grinder |
| Gift card 5$ | 5.500-7.500 | Steam, Riot, PSN |
| Gift card 10€ | 11.000-15.000 | Steam, PSN Plus |
| Gift card 25$ | 25.000-40.000 | Steam / Riot Points |
| Skin CS2 pequeña | 3.000-8.000 | Glock, USP-S básicas |
| Skin CS2 media | 10.000-25.000 | AK-47 · Redline y similares |
| Skin CS2 premium | 40.000+ | knife, gloves, top-tier factory new |
| Merch físico (T-shirt) | coste-interno × 1.3 → ~15.000 mon si T-shirt cuesta ~11€ |

### 3.3 Política de dificultad

- **Casual** (login diario) → alcanza recompensa pequeña (Profile card básica) en ~2 semanas.
- **Activo** → gift card 10€ o skin pequeña en ~1 mes.
- **Grinder** → skin media o gift card 25$ en 2-3 meses.
- **Premio grande** (skin premium, knife/gloves) requiere constancia + ranking + campañas especiales — NO farmeable con solo login diario.

Regla dura: **con solo login diario 30 días** el usuario acumula ~600 monedas → una profile card básica. No permite skin ni gift card. Hace falta misiones + participación.

### 3.4 Reglas legales / disclaimers públicos

Estas frases deben aparecer literales o equivalentes en tienda/FAQ/perfil (borrador; validar con gestoría antes de definitivas):

- "Las monedas son puntos internos sin valor monetario."
- "No son criptomonedas."
- "No son transferibles entre usuarios."
- "No pueden venderse."
- "No son canjeables por dinero en efectivo."
- "Los precios y disponibilidad pueden cambiar."
- "Los canjes pueden requerir revisión antes del envío."

---

## 4. Sistema de personalización de perfil (nuevo)

### 4.1 MVP inicial — items visuales

Los siguientes items entran como categorías nuevas en `shop_items`:

| Item | Categoría | Precio inicial | Notas |
|---|---|---|---|
| Profile Card — Neon Pink | `profile` | 1.500 | Básica |
| Profile Card — Cyber Blue | `profile` | 2.500 | Básica |
| Profile Card — Gold Elite | `profile` | 5.000 | Premium |
| Profile Card — Inferno | `profile` | 8.000 | Premium |
| Avatar Frame — Cyan | `frame` | 2.000 | Básico |
| Avatar Frame — Gold | `frame` | 7.500 | Premium |
| Badge — OG Member | `badge` | 3.000 | Exclusivo pre-registro |
| Badge — Top Grinder | `badge` | 5.000 | Constancia |

**Categorías nuevas** (`profile`, `frame`, `badge`) caben en el `varchar(10)` actual de `shop_items.category` — no requiere migración de esquema.

**Estado del rendering visual:** hasta que exista soporte de equipamiento (§4.2), los items aparecen en tienda como "Próximamente disponible para equipar". Se canjean, se registran en `redemptions`, pero el efecto visual queda pendiente.

### 4.2 Qué falta para "equipar" cosméticos

Para que el usuario pueda equipar y ver su cosmético en el perfil hace falta:

**Migración pendiente (requiere confirmación de Pablo antes de generar):**

Opción A — columnas por tipo en `player_profiles`:
```sql
ALTER TABLE player_profiles
  ADD COLUMN equipped_profile_card_id INTEGER REFERENCES shop_items(id),
  ADD COLUMN equipped_frame_id        INTEGER REFERENCES shop_items(id),
  ADD COLUMN equipped_badge_id        INTEGER REFERENCES shop_items(id);
```

Opción B — tabla dedicada `user_cosmetics`:
```sql
CREATE TABLE user_cosmetics (
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  shop_item_id INTEGER REFERENCES shop_items(id),
  equipped BOOLEAN NOT NULL DEFAULT false,
  acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, shop_item_id)
);
```

**Recomendación:** Opción B es más flexible (permite múltiples cosméticos del mismo tipo, historial, etc.) pero también requiere más código de UI. Opción A es más rápida.

Cuando Pablo apruebe, se hace en un PR separado con migración Drizzle (`npx drizzle-kit generate` → `npm run migrate`).

### 4.3 Categorías de tienda visibles en UI

Ampliación en `src/features/giveaway-platform/components/PlatformShop.tsx`:

- Todo (`all`)
- 🔫 Skins CS2 (`skin`)
- 👕 Merch SocialPro (`merch`)
- 🎁 Tarjetas regalo (`gift`)
- 🎨 Profile Cards (`profile`) *(nueva)*
- 🖼️ Avatar Frames (`frame`) *(nueva)*
- 🏅 Badges (`badge`) *(nueva)*

---

## 5. Reajuste de la economía existente

**Rewards** — cambio recomendado:
- `STREAK_REWARDS`: `[20, 25, 30, 40, 50, 60, 75]` → total semana **300** (antes 200).
- `ENTRY_COIN_REWARD`: 20 → 50 (antes también incluía "por sorteo", ahora "por participación").

**Misiones** — mantener rango 50-3.000, pero clarificar tiers:
- Básica: 50 mon (una tarea puntual).
- Media: 250 mon (semanal o "5 acciones").
- Premium: 1.000-1.500 mon (mensual, verificada).

**Precios shop** — factor ~11×:
- Steam 10€: 1.000 → 11.000.
- Steam 20€: 1.900 → 22.000.
- Steam 50€: 4.500 → 55.000.
- Skins pequeñas (Glock/USP): 150-450 → 3.000-6.000.
- Skin media (AK Redline): 800 → 12.000-15.000.
- T-shirt: 300 → 12.000-15.000 (coste ~11€ × 1.3 ratio).
- Gorra: 220 → 9.000.

**Riesgo:** si aplicamos el reajuste de golpe, los balances actuales de usuarios existentes quedarán muy bajos vs la nueva escala. Dos opciones:
- **A.** Aplicar rebase 1:11 a todos los balances (`UPDATE coin_transactions SET amount = amount * 11 WHERE created_at < NOW()`). Complejo y auditable.
- **B.** No reescalar el pasado; los usuarios existentes conservan su saldo y ganan al ritmo nuevo. Puede parecer inflación pero es la opción honesta y auditable.

Recomiendo **B**. Documentar el cambio con fecha en un mensaje interno.

---

## 6. Ranking y campañas especiales

Espacio reservado para expansiones futuras:

- **Ranking mensual** — top 3 recibe bonus one-shot (2.500 / 1.500 / 1.000 monedas + badge exclusivo). Ver `getMonthlyRanking` en `src/lib/queries/giveawayPlatform.ts`.
- **Campañas de creador** — un partner (KeyDrop, futuros) puede lanzar campaña con multiplicador de monedas por participar (ej. ×2 durante 1 semana). Implementación pendiente.
- **Season pass** — badge premium mensual desbloqueable con actividad.

Cada expansión requiere PR propio + revisión legal si hay premio en dinero equivalente.

---

## 7. Contras / vectores de fraude

- **Multi-account** — riesgo mitigable con verificación Steam ID único (ya implementado en `player_profiles.steamId UNIQUE`).
- **Bots** — actualmente no hay CAPTCHA en la participación. Coste bajo por bot → riesgo de vaciar stock de gift cards. Mitigable con rate limit + revisión manual antes de canjear items caros.
- **Trade offers Steam** — para canjear skins CS2 hace falta que el usuario tenga configurada su URL de trade. Ya existe en `player_profiles.steamTradeUrl` (opcional).
- **Refunds** — los canjes son firmes. Ver disclaimer del apartado legal.

---

## 8. Roadmap

| Fase | Alcance | Requiere migración |
|---|---|---|
| Fase 1 — este doc | Política, tablas, disclaimers | No |
| Fase 2 — UI adaptada | Nuevas categorías tienda, disclaimer, seeds actualizados (no ejecutados) | No |
| Fase 3 — equipar cosméticos | `equipped_*` en `player_profiles` o `user_cosmetics` | **Sí** — pedir OK antes |
| Fase 4 — reajuste económico | Cambio de constantes rewards + `costCoins` en seed. Aplicar a producción con seed idempotente | No (solo re-seed) |
| Fase 5 — ranking mensual bonus | Cron end-of-month que distribuye premios | Posible tabla `monthly_bonuses` |
| Fase 6 — campañas creador | Tabla `coin_campaigns` con multiplicadores temporales | Sí |

**Este PR se limita a Fase 1 + Fase 2 sin ejecutar el reseed.** Los cambios de precios reales en producción los aplicas tú corriendo `npx tsx scripts/seed-giveaway-platform.ts` cuando decidas.
