# Catálogo de recompensas — SocialPro Giveaways

**Estado:** Fase 1 — planificado. 2026-07-03.
**Ámbito:** sección "Recompensas" en `/sorteos/[creatorSlug]`.
**Fuente de verdad**: `src/features/giveaway-platform/constants/rewards-catalog.ts` (código) + este documento (estado, activación, procesos).

Este documento reemplaza a `docs/socialpro-prizes-catalog.md` como fuente de verdad de la fase 1. El anterior se mantiene por retrocompatibilidad con tests existentes; su contenido no se elimina para evitar romper la trazabilidad.

---

## TL;DR

- 8 skins CS2 dadas de alta como recompensas **planificadas**.
- Ninguna es canjeable — no tienen precio ni stock aprobado.
- No hay seed. No hay scraping. No hay migraciones.
- Se pintan visualmente en `PlatformShop.tsx` (renombrada "Recompensas") en un bloque **"Próximas recompensas"** con placeholder premium — no como card fea "Imagen pendiente".
- Sólo se activan (mueven a `shop_items`) cuando el owner apruebe metadata, precio y stock por recompensa.

---

## Estado por recompensa (fase 1)

Cada item vive en `PLANNED_REWARDS` (`rewards-catalog.ts`). Estado inicial idéntico para las 8:

```yaml
category: skin
game: CS2
source: steam_market
status: planned
imageUrl: null
costPoints: null       # pendiente de aprobar
stock: null            # pendiente de aprobar
```

| # | Slug                    | Steam Market URL                                                                                                                                                     | Estado  | Canjeable |
|---|-------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|-----------|
| 1 | `cs2-skin-reward-1`     | `https://steamcommunity.com/market/listings/730/G1804208D0B3004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730`                            | planned | ❌        |
| 2 | `cs2-skin-reward-2`     | `https://steamcommunity.com/market/listings/730/G183D20C1053004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730`                            | planned | ❌        |
| 3 | `cs2-skin-reward-3`     | `https://steamcommunity.com/market/listings/730/G181020CC093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730` | planned | ❌        |
| 4 | `cs2-skin-reward-4`     | `https://steamcommunity.com/market/listings/730/G180720A1063004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730&detail=555779260423308555` | planned | ❌        |
| 5 | `cs2-skin-reward-5`     | `https://steamcommunity.com/market/listings/730/G181020CC043004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730` | planned | ❌        |
| 6 | `cs2-skin-reward-6`     | `https://steamcommunity.com/market/listings/730/G180420C3073004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730` | planned | ❌        |
| 7 | `cs2-skin-reward-7`     | `https://steamcommunity.com/market/listings/730/G1804208F093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730` | planned | ❌        |
| 8 | `cs2-skin-reward-8`     | `https://steamcommunity.com/market/listings/730/G180920C6063004?category_Type=CSGO_Type_SniperRifle&category_Exterior=WearCategory2&appid=730`                        | planned | ❌        |

Metadata real (nombre, imagen) queda como placeholder `CS2 Skin Reward #N` hasta que el owner apruebe. Ver §"Cómo obtener metadata real" en `docs/socialpro-prizes-catalog.md`.

---

## Regla de activación

```
sin metadata fiable          → status: planned      → nunca canjeable
metadata OK, sin precio      → status: coming_soon  → nunca canjeable
metadata OK, precio, stock   → mover a shop_items   → canjeable
```

**Requiere OK explícito del owner en cada transición.** El PR de activación debe:

1. Añadir metadata real (título + imageUrl) al item en `PLANNED_REWARDS`.
2. Fijar `costPoints` y `stock`.
3. Escribir la fila real en `scripts/seed-giveaway-platform.ts` con `isActive: true`.
4. Ejecutar `npx tsx scripts/seed-giveaway-platform.ts` en producción cuando decida el owner.
5. Retirar el slug de `PLANNED_REWARDS` — ya no es "planificado".

---

## UI

**Naming**:
- Sección: **Recompensas** (antes "Tienda").
- Nav item: **Recompensas** (antes "Tienda").
- Subsección para items de `PLANNED_REWARDS`: **Próximas recompensas**.

**Placeholder visual para cards sin `imageUrl`**:
- Fondo oscuro tipo CS2 (gradient dark + textura sutil).
- Badge "CS2" arriba a la izquierda.
- Icono de skin/caja centrado.
- Etiqueta grande "Skin CS2".
- Etiqueta pequeña abajo con el estado ("Próximamente", "Pendiente de precio", "Pendiente de stock").

Reemplaza al placeholder anterior plano "Imagen pendiente" — feo y confuso.

**Categorías visibles** (ampliación, sin migración):

```
Todas · Skins CS2 · Merch SocialPro · Tarjetas regalo · Profile Cards · Avatar Frames · Badges
```

---

## Conversión coste → puntos (interno, no publicar)

```
1 USD coste interno ≈ 1_000 puntos
1 EUR coste interno ≈ 1_100 puntos
```

**Regla dura:** esto NO se muestra al usuario. No aparece en `PlatformShop.tsx` ni en `PLANNED_REWARDS`. Solo aquí. Cuando se apruebe una activación, el precio en puntos final lo decide el owner manualmente.

Ver `docs/sorteos-coin-economy.md` para el detalle económico completo.

---

## Categorías soportadas por el catálogo

Sin migración de esquema (`shop_items.category` es `varchar(10)`):

| Categoría        | Ejemplo                                                                 | Fase |
|------------------|-------------------------------------------------------------------------|------|
| `skin`           | AK-47, cuchillos, pistolas CS2                                          | 1    |
| `gift_card`      | Voucher KeyDrop/Twitch/Steam wallet                                     | 2    |
| `merch`          | Camiseta, hoodie, taza SocialPro                                        | 2    |
| `profile_card`   | Marco de perfil, tarjeta cosmética                                      | 3    |
| `avatar_frame`   | Frame animado para el avatar                                            | 3    |
| `badge`          | Insignia por evento / temporada                                         | 3    |

En este PR **solo se documenta fase 1** (skins CS2). Fase 2 y 3 quedan como referencia futura.

---

## Qué NO se implementa en este PR

- ❌ No hay seed que active los 8 items en `shop_items`.
- ❌ No hay scraping runtime de `steamcommunity.com/market`.
- ❌ No hay migraciones DB.
- ❌ No hay conversión monetaria expuesta al usuario.
- ❌ No hay marketplace P2P, ni compra de puntos, ni transferencias.
- ❌ No se cambian precios reales de items existentes en `shop_items`.

---

## Qué SÍ se implementa en este PR

- ✅ Constante `PLANNED_REWARDS` con los 8 items.
- ✅ Sección UI "Próximas recompensas" que renderiza los 8 items.
- ✅ Placeholder visual premium (`.gp-reward-placeholder`) para cards sin imagen — reemplaza al plano "Imagen pendiente".
- ✅ Naming completo Tienda → Recompensas en UI pública.
- ✅ Tests estructurales que verifican las invariantes.

---

## Historial

- **2026-07-03** — Documento inicial. 8 skins CS2 dadas de alta como `planned`. Sin seed, sin scraping, sin UI canjeable.
