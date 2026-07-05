# Política de recompensas y puntos — SocialPro Giveaways

> Documento operativo interno. Fuente de verdad para producto e ingeniería sobre qué se puede y qué no se puede hacer con puntos y recompensas.

Última actualización: 2026-07-05

## Principios (invariantes)

1. Los puntos **no se compran**.
2. Los puntos **no se transfieren** entre usuarios.
3. Los puntos **no se venden**.
4. Los puntos **no se pierden** por azar ni por decisión unilateral (fuera de casos de fraude documentado).
5. Los puntos **no se multiplican** por azar.
6. Los puntos solo se obtienen por **acciones objetivas verificables** (racha, misión, sorteo interno, decisión admin auditada).
7. Las recompensas tienen **coste fijo** (`shopItems.costCoins`).
8. Los sorteos SocialPro son **gratuitos** — participación libre y única por `giveawayEntries.UNIQUE(userId, giveawayId)`.
9. Los partners externos **nunca modifican** el saldo interno de SocialPro.

Estos principios están reforzados por la función `assertAllowedCoinSource` en `src/lib/rewards/allowed-coin-sources.ts` y por tests unitarios.

## Fuentes de puntos permitidas

Enum canónico en `coinTransactions.source`:

| Source | Descripción | Genera puntos |
|---|---|:-:|
| `racha` | Login diario / streak | ✓ |
| `mision` | Misión objetiva verificada (follow social, join Discord, follows Twitch, etc.) | ✓ |
| `sorteo` | Bonificación por participar en sorteo interno gratuito | ✓ |
| `tienda` | Ajuste por canje (débito) | débito |
| `admin` | Ajuste manual auditado por operador | ambos |

## Fuentes de puntos prohibidas

Cualquier `source` fuera de la allowlist debe ser rechazada por `assertAllowedCoinSource`. Casos explícitamente vetados:

- `apuesta`, `wager`
- `ruleta`, `wheel`, `spin`
- `jackpot`
- `multiplicador`, `multiply`
- `case_battle`, `case_opening`, `box`
- `upgrader`, `upgrade`
- `partner_deposit`, `deposit`
- `cara_cruz`, `coin_flip`
- `gamble`, `bet`

Si el negocio necesita alguna vez una fuente nueva, se añade explícitamente a la allowlist tras revisión legal.

## Tipos de recompensa

Enum canónico en `src/lib/rewards/types.ts`:

| Tipo | Definición | Ejemplos |
|---|---|---|
| `fixed_reward` | Canje directo con `costCoins` fijo y `stock` limitado | Skin CS2 en tienda, gift-card, camiseta |
| `free_raffle` | Sorteo promocional gratuito con bases legales publicadas | Sorteo Zack de un teclado, sorteo mensual |
| `external_partner_giveaway` | Sorteo operado por partner en su propia plataforma; SocialPro solo muestra | KeyDrop, Hellcase, SkinsMonkey |
| `cosmetic_badge` | Recompensa sin valor económico | Badge de "10 sorteos participados" |

## Reglas por categoría de premio

### Skins CS2

- **Se mantienen** en el catálogo (decisión producto).
- Solo como `fixed_reward` en tienda o `free_raffle` en sorteo interno.
- **Prohibido**: ruleta, caja aleatoria, upgrader, jackpot, case battle, cara/cruz, multiplicador.
- Controles operativos:
  - Verificación de Steam Trade URL válida.
  - Log de entrega con `userId`, `skinId`, valor de mercado al entregar, timestamp, tradeUrl, IP hash, país aproximado.
  - Restricción `+18` verificada.
  - Valor máximo por unidad orientativo `100€` hasta validación fiscal.

### Tarjetas regalo Riot / Steam / PSN

- Solo como `fixed_reward` en tienda.
- Feature flag `GIFT_CARDS_REWARDS` — si no hay bases y fiscalidad validada, se ocultan.
- Límite por usuario/mes definido en operativa.

### Merch de esports

- Solo como `fixed_reward` o premio de `free_raffle`.
- Feature flag `MERCH_REWARDS`.
- Envío revisado manualmente (`redemptions.status`).

### Recompensas cosméticas / badges

- Sin restricciones fiscales.
- Se pueden usar libremente para retention.

## Validaciones técnicas

- **`assertAllowedCoinSource`** en `src/lib/rewards/allowed-coin-sources.ts`: rechaza fuentes fuera de la allowlist. Debe llamarse en cualquier server action que inserte en `coinTransactions`.
- **Test unitario** en `src/__tests__/server/allowed-coin-sources.test.ts` verifica la allowlist.
- **Test de copy sensible** en `src/__tests__/server/sensitive-copy-allowlist.test.ts` grepa strings prohibidos en UI ES.
- **Ledger append-only**: nunca `UPDATE` ni `DELETE` sobre `coinTransactions`; solo `INSERT`.

## Anti-patterns detectados en la industria (a evitar)

- "Recarga tu saldo para desbloquear premios".
- "Multiplica tus puntos al final del mes".
- "Abre esta caja gratis para ganar un premio aleatorio" cuando el premio tiene valor económico.
- "Deposita en [partner] y consigue tickets extra".
- "Pierde puntos si no participas en 7 días".

Si alguno aparece en un PR, el test de copy debe fallar.
