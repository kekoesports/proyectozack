# Catálogo de recompensas — SocialPro Giveaways

**Estado:** Fase 1 — 8 skins CS2 con metadata real confirmada por el owner. 2026-07-03.
**Ámbito:** sección "Recompensas" en `/sorteos/[creatorSlug]`.
**Fuente de verdad:** `src/features/giveaway-platform/constants/rewards-catalog.ts` → `REAL_STEAM_REWARDS`.

Este documento reemplaza a `docs/socialpro-prizes-catalog.md` como fuente de verdad de la fase 1. El anterior se mantiene por retrocompatibilidad con tests existentes; su contenido se conserva.

---

## TL;DR

- 8 skins CS2 con **metadata real**: nombre exacto, imagen local descargada del CDN oficial de Steam, precio en puntos calibrado, stock 1.
- **Activas / canjeables** una vez ejecutado el seed en producción (comando en §5).
- No hay scraping runtime. No hay dependencia del CDN externo de Steam.
- Precios fijos (no live). No se muestra conversión € o $ al usuario.

---

## Las 8 skins confirmadas

| # | Skin | Wear | Rareza | Precio (puntos) | Stock | Imagen local |
|---|------|------|--------|------------------|-------|--------------|
| 1 | **Glock-18 \| Fully Tuned** | Field-Tested | Covert | 104.500 ⭐ | 1 | `public/images/rewards/glock-18-fully-tuned-ft.png` |
| 2 | **USP-S \| Cortex** | Field-Tested | Classified | 6.500 ⭐ | 1 | `public/images/rewards/usp-s-cortex-ft.png` |
| 3 | **M4A4 \| Temukau** | Field-Tested | Covert | 57.700 ⭐ | 1 | `public/images/rewards/m4a4-temukau-ft.png` |
| 4 | **AK-47 \| Asiimov** | Field-Tested | Covert | 70.000 ⭐ | 1 | `public/images/rewards/ak-47-asiimov-ft.png` |
| 5 | **M4A4 \| Desolate Space** | Field-Tested | Classified | 23.200 ⭐ | 1 | `public/images/rewards/m4a4-desolate-space-ft.png` |
| 6 | **Glock-18 \| Vogue** | Field-Tested | Classified | 6.700 ⭐ | 1 | `public/images/rewards/glock-18-vogue-ft.png` |
| 7 | **Glock-18 \| Block-18** | Field-Tested | Restricted | 800 ⭐ | 1 | `public/images/rewards/glock-18-block-18-ft.png` |
| 8 | **AWP \| Atheris** | Field-Tested | Restricted | 8.100 ⭐ | 1 | `public/images/rewards/awp-atheris-ft.png` |

**Todas**:
- `category: 'skin'`, `game: 'CS2'`, `source: 'steam_market'`.
- `delivery: 'steam_trade_offer'`, `requiresManualReview: true`.
- URL original de Steam Market conservada en `steamMarketUrl` para trazabilidad (no expuesta en UI).

---

## Flujo end-to-end

```
1. rewards-catalog.ts (constante REAL_STEAM_REWARDS)  ← fuente de verdad
2. public/images/rewards/*.png                         ← imágenes locales
3. scripts/enrich-rewards.ts (dev-only)                ← refresh metadata cuando sea necesario
4. scripts/seed-socialpro-rewards-steam.ts (manual)    ← sincroniza a shop_items DB
5. UI PlatformShop.tsx                                 ← lee de DB → grid + vitrina
```

---

## Regla de pricing (interna, NO publicar)

```
1$ coste interno  ≈ 1.000 puntos
1€ coste interno  ≈ 1.100 puntos
precio en puntos  = coste estimado en € × 1.100 × multiplicador (1.2–1.5)
```

Multiplicador aplicado en este catálogo: **~1.3**.

**Estas equivalencias NO se muestran al usuario.** Aparecen solo en este `.md` y en `docs/sorteos-coin-economy.md`. Un test estructural verifica que ningún componente UI las expone.

---

## Comando de seed (ejecución manual)

**Solo tras revisar el catálogo y las imágenes.**

```bash
CONFIRM_SEED_STEAM_REWARDS=I_ACCEPT_ADD_STEAM_REWARDS \
  npx tsx scripts/seed-socialpro-rewards-steam.ts
```

Comportamiento:
- **Idempotente**: si el `name` ya existe en `shop_items`, hace `UPDATE`. Si no, `INSERT`.
- Nunca borra items existentes.
- Nunca modifica items fuera del catálogo.
- Nunca toca balances ni redemptions.
- Requiere `DATABASE_URL` en `.env.local` — apunta a la DB que quieres actualizar (dev o prod, según sesión).

**Sin la env var** el script aborta con `exit 1`. Es imposible ejecutarlo por accidente.

---

## Enriquecimiento local (opcional)

Cuando haga falta refresh de metadata (precio cambia, item eliminado del Market, etc.):

```bash
npx tsx scripts/enrich-rewards.ts
```

Bloqueado en CI (detecta `CI=true`, `VERCEL=1`, `GITHUB_ACTIONS`).

Rate-limited: 1 req cada 3s + backoff exponencial en 429/403. Salida en `.scratch/steam-enrich-<date>.json` para revisar antes de tocar el catálogo o commitear cambios.

---

## UI — cómo se ven

Cuando el seed ha corrido y las 8 skins están en `shop_items`:

- Aparecen en la grid principal de "Recompensas" bajo la tab **🔫 Skins CS2**.
- Cada card muestra:
  - Imagen real del skin (PNG local).
  - Nombre exacto (`AK-47 | Asiimov`).
  - Descripción: "Skin [rareza]. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual."
  - Precio en puntos (⭐).
  - Stock (1 en stock / Agotado).
  - Botón **Canjear** si el usuario tiene puntos suficientes; si no, "Faltan N ⭐".
- **No** se muestra: precio en €, precio en $, lowest price de Steam, referencia a conversión.

Cuando el seed NO ha corrido aún (típicamente preview de Vercel):

- Vitrina **"Próximas en tienda · Skins CS2"** debajo de la grid principal.
- Mismas cards pero con badge "Próximamente" y CTA "Ver en Steam Market" en lugar de Canjear.
- Se dedupica automáticamente contra items en DB una vez ejecutado el seed.

---

## Campos DB soportados

Schema `shop_items` (`src/db/schema/shopItems.ts`):

| Campo constante         | Campo DB      | Notas |
|-------------------------|---------------|-------|
| `category`              | `category`    | 'skin' |
| `name`                  | `name`        | market_hash_name completo |
| `description`           | `description` | Copy visible al usuario |
| `imageUrl`              | `image_url`   | `/images/rewards/{slug}.png` |
| `costPoints`            | `cost_coins`  | Precio final en puntos |
| `stock`                 | `stock`       | 1 por skin |
| `status: 'active'`      | `is_active`   | true |
| — (sortOrder generado)  | `sort_order`  | 900+ (aparecen al final) |

Campos del catálogo que **no** persisten en DB (viven solo en la constante):

- `wear`, `rarity`, `game`, `source`, `steamMarketUrl`, `delivery`, `requiresManualReview`, `slug`, `status`.

Motivo: son metadata de referencia y trazabilidad. Añadirlos como columnas requiere migración (Fase futura). Mientras tanto la UI los consume desde la constante para las cards de vitrina.

---

## Qué NO se implementa en este PR

- ❌ No hay migraciones DB.
- ❌ No hay ejecución automática del seed. Requiere env var explícita.
- ❌ No hay fetch runtime a Steam.
- ❌ No hay conversión monetaria expuesta al usuario.
- ❌ No hay marketplace P2P, ni compra de puntos, ni transferencias.

---

## Historial

- **2026-07-03** — 8 skins CS2 confirmadas por el owner con metadata real. Imágenes locales descargadas del CDN Akamai. Precios calibrados con multiplicador 1.3 sobre precios Steam Market en el momento del PR.
