# Catálogo de premios SocialPro Giveaways

**Estado:** Draft / fase 1 — 2026-07-03
**Ámbito:** Definición inicial de premios para la tienda / sorteos SocialPro.
**Owner:** kekoesports
**Documentos relacionados:**
- `docs/keydrop-api-capabilities.md` — qué datos podemos leer de partners
- `docs/giveaway-coin-economy-plan.md` — modelo de economía interna

---

## TL;DR

Documento de catálogo de premios **planeados** (sin activar en UI, sin
seed, sin canjes activos). Fase inicial: 8 skins CS2 con su URL oficial
de Steam Market como fuente de verdad. Diseñado para soportar futuras
categorías (gift cards, merch SocialPro, profile cards, avatar frames,
badges) sin migraciones adicionales.

**Reglas duras que este documento respeta:**

- No scraping de Steam en producción.
- No ejecuta seed automático.
- No cambia precios reales actuales de `shop_items`.
- No crea canjes activos sin OK explícito del owner.
- No inventa metadata (títulos/imágenes/precios) — placeholders explícitos
  cuando no hay fuente fiable.

---

## Fase 1 — Skins CS2 desde Steam Market

Los 8 items iniciales, con `is_active: false` y `status: planned`. La URL
del Steam Market se conserva como referencia canónica.

Placeholder titles hasta que se apruebe metadata real (no scraping).

| # | Placeholder            | Steam Market URL                                                                                                                                                     | Status  | is_active | suggested_coin_price |
|---|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|-----------|----------------------|
| 1 | Steam CS2 Prize #1     | `https://steamcommunity.com/market/listings/730/G1804208D0B3004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730`                            | planned | false     | pending              |
| 2 | Steam CS2 Prize #2     | `https://steamcommunity.com/market/listings/730/G183D20C1053004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730`                            | planned | false     | pending              |
| 3 | Steam CS2 Prize #3     | `https://steamcommunity.com/market/listings/730/G181020CC093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730` | planned | false     | pending              |
| 4 | Steam CS2 Prize #4     | `https://steamcommunity.com/market/listings/730/G180720A1063004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730&detail=555779260423308555` | planned | false     | pending              |
| 5 | Steam CS2 Prize #5     | `https://steamcommunity.com/market/listings/730/G181020CC043004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730` | planned | false     | pending              |
| 6 | Steam CS2 Prize #6     | `https://steamcommunity.com/market/listings/730/G180420C3073004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730` | planned | false     | pending              |
| 7 | Steam CS2 Prize #7     | `https://steamcommunity.com/market/listings/730/G1804208F093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730` | planned | false     | pending              |
| 8 | Steam CS2 Prize #8     | `https://steamcommunity.com/market/listings/730/G180920C6063004?category_Type=CSGO_Type_SniperRifle&category_Exterior=WearCategory2&appid=730`                        | planned | false     | pending              |

### Metadata común (fase 1)

```yaml
source: steam_market
category: skin
game: CS2
status: planned
is_active: false
suggested_coin_price: pending
```

### Placeholder rules

- **Título**: `Steam CS2 Prize #N`. Cambio a nombre real solo cuando
  metadata sea fiable (ver "Cómo obtener metadata real" abajo).
- **Imagen**: `null` — se pintará como placeholder genérico CS2 en la UI
  cuando (si) se decida mostrar. Nunca inventar imágenes.
- **Precio moneda**: `pending`. Nunca exponer conversión monetaria a
  público sin OK.

---

## Cómo obtener metadata real (si se aprueba)

**Steam Market NO se scrapea en producción.**

Vías aceptables (solo cuando se apruebe):

1. **Manual, uno a uno**: alguien copia el nombre + hover-image del
   listing y lo pega en el catálogo. Es la vía más segura y la
   recomendada mientras sean pocos items.
2. **Steam Web API (documentado, con app key)**: si se necesita a escala,
   requiere `STEAM_API_KEY` y trabajar con `IEconMarket`/`IEconService`
   respetando rate-limits. **No implementar hasta tener aprobación
   explícita** — impacto en cuota API compartida con auth Steam.
3. **Extracción en dev/build**: script que corre solo local y produce un
   JSON commited al repo. Nunca en producción.

Cualquiera de las 3 vías debe:

- Guardar el resultado como fixture estático (`docs/steam-catalog-*.json`
  o similar), nunca fetch runtime.
- Marcar cada item con `metadata_verified_at: <fecha>` para saber qué
  premios tienen metadata real vs placeholder.

---

## Conversión coste → puntos (interno, no publicar)

Regla propuesta:

```txt
1 USD coste interno  ≈ 1_000 puntos
1 EUR coste interno  ≈ 1_100 puntos
```

**Estos valores se calculan solo en este documento** — no aparecen en
`shop_items`, ni en `platform-shop.tsx`, ni en ningún endpoint público.
Cuando se apruebe activar un premio, el owner define el precio final en
puntos y lo escribe manualmente en el seed / migración.

Hasta entonces, cada item tiene `suggested_coin_price: pending`.

Esto respeta la regla "no exponer precios monetarios como conversión
pública" y evita que el usuario pueda derivar precios reales desde el
UI.

---

## Categorías soportadas por el catálogo

El catálogo está pensado para soportar (sin migraciones adicionales) las
siguientes fuentes/categorías:

| Category         | Source           | Ejemplo                                          | Fase |
|------------------|------------------|--------------------------------------------------|------|
| `skin`           | `steam_market`   | AK-47, cuchillos, pistolas CS2                   | 1    |
| `gift_card`      | `partner`        | Voucher KeyDrop/Twitch/Steam wallet              | 2    |
| `merch`          | `socialpro`      | Camiseta, hoodie, taza SocialPro                 | 2    |
| `profile_card`   | `socialpro`      | Marco de perfil, tarjeta cosmética               | 3    |
| `avatar_frame`   | `socialpro`      | Frame animado para el avatar                     | 3    |
| `badge`          | `socialpro`      | Insignia por evento / temporada                  | 3    |

**Fase 1** = este documento (solo skins CS2, planned).
**Fase 2** = solo cuando el owner apruebe y llegue nuevo brief.
**Fase 3** = cuando existan mockups aprobados.

---

## Qué NO se implementa en este PR

- ❌ No hay seed. Ningún script en `scripts/` inserta estos 8 items en
  `shop_items` ni en ninguna tabla.
- ❌ No hay UI pública. Ni sección "Próximamente" ni placeholders
  visuales en `PlatformShop.tsx`.
- ❌ No hay migraciones. No se crean columnas nuevas en `shop_items` ni
  en ninguna tabla.
- ❌ No hay scraping runtime. Ningún módulo en `src/` hace `fetch` a
  `steamcommunity.com/market`.
- ❌ No hay conversión monetaria expuesta a usuario. La regla de 1$≈1000
  puntos queda encerrada en este `.md`.
- ❌ No hay marketplace P2P, ni compra de puntos, ni transferencias.

---

## Qué SÍ se implementa

- ✅ Este documento como fuente de verdad de la fase 1.
- ✅ Tests estructurales que verifican:
  - Los 8 URLs están presentes en el documento.
  - Cada premio se marca como `planned` / `is_active: false`.
  - No hay seed script que inserte estos 8 URLs.
  - No hay código de producción que haga `fetch` a Steam Market.
  - La conversión coste → puntos no aparece en ningún componente UI.
- ✅ Compatibilidad futura con más categorías (documentada).

---

## Próximos pasos (fuera de este PR)

1. **Metadata real fase 1** — capturar título + imagen de los 8 items
   manualmente y actualizar la tabla arriba. Requiere OK del owner
   antes de tocar imagen assets.
2. **Precios en puntos** — owner define coin-price por item cuando
   decida activarlos.
3. **Sección "Próximamente" en la tienda** — cuando haya OK visual del
   owner, mostrar en `PlatformShop.tsx` bloque claramente marcado
   "Próximamente · Premios CS2" con placeholders no canjeables.
4. **Fase 2 (gift cards + merch)** — brief separado. Los mockups de
   merch SocialPro se harán después, no antes.

---

## Historial

- **2026-07-03** — Documento inicial con los 8 premios fase 1. Sin seed,
  sin UI, sin scraping. Placeholders explícitos hasta que llegue metadata
  fiable.
