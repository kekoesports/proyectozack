# Matriz de riesgos legales — SocialPro Giveaways

> **No es asesoramiento jurídico.** Registro interno de riesgos identificados durante la fase de producto. Cada riesgo debe cerrarse con validación de gestoría/abogado antes de retirar `noindex` de las páginas legales.

Última actualización: 2026-07-05

## Leyenda

- 🔴 **Alto** — bloqueante para publicar. Requiere validación externa firmada antes de continuar.
- 🟡 **Medio** — mitigable con controles internos + validación externa antes de escalar.
- 🟢 **Bajo** — controlado si se mantiene el modelo actual sin regresiones.

## Riesgos

### 🔴 R1 — Comunicación comercial de juego sin título habilitante

- **Base normativa:** RD 958/2020 arts. 2, 3.g y 6.2 · Ley 13/2011.
- **Evidencia en el código:** copy en `BrandCardKeyDrop` con `"200% Bonus"`, `"12x wagering"`, `"raffles de 3000$"`, `"Club VIP"` + `data-cta="keydrop-bonus"` apuntando a `kd.link/?code=X`.
- **Impacto:** SocialPro puede considerarse afiliado/intermediario que difunde comunicación comercial de actividad de juego dirigida a residentes en España cuando el operador no tenga título habilitante DGOJ.
- **Acción inmediata (implementada en Fase 0):** feature flag `KEYDROP_EXTERNAL_CTAS` por defecto `false` en país ES; render de card "restricted" sin bonus/wagering/VIP; `PartnerExternalNotice` obligatorio.
- **Pendiente abogado:** verificar en [Registro DGOJ](https://www.ordenacionjuego.es/es/operadores-habilitados) la licencia de KeyDrop y decidir si la card completa se puede reactivar en ES con controles adicionales.

### 🟡 R2 — Recompensas con valor económico

- **Categorías:** skins CS2, tarjetas regalo Riot/Steam/PSN, merch de esports.
- **Estado actual:** encajan en programa de fidelización mientras los puntos se obtengan por acciones objetivas y se canjeen con `costCoins` fijo.
- **Escalada a alto** si se añade cualquier mecánica de azar sobre puntos (ruleta, caja, upgrader, jackpot, case battle, cara/cruz, multiplicador).
- **Acción Fase 0:** guard `assertAllowedCoinSource` que rechaza fuentes de puntos no incluidas en allowlist; tests unitarios.
- **Pendiente abogado:** revisión fiscal (retención IRPF, comunicación AEAT) por valor de premio; base legal por sorteo.

### 🟡 R3 — Cláusulas de limitación de responsabilidad y jurisdicción

- **Base normativa:** RDL 1/2007 arts. 82–91 y 90.2.
- **Estado actual:** Términos §10 y §11 en borrador, con `LegalDraftBanner` y `noindex`.
- **Pendiente abogado:** redacción definitiva excluyendo daños indirectos sin cláusula abusiva; no imponer jurisdicción distinta al domicilio del consumidor.

### 🟡 R4 — Base jurídica del ranking público

- **Base normativa:** art. 6.1.a y 6.1.f RGPD · directrices AEPD.
- **Estado actual:** interés legítimo + opt-out ya implementado en `playerProfiles`.
- **Pendiente abogado:** decidir entre interés legítimo con test de ponderación documentado o migrar a opt-in explícito.

### 🟡 R5 — Menores y verificación de edad

- **Estado actual:** Términos mencionan "+18" pero no hay verificación de fecha de nacimiento antes de participar/canjear.
- **Pendiente producto/abogado:** añadir campo `birthDate` obligatorio y bloqueo de canjes sensibles a `age < 18`.

### 🟡 R6 — Fiscalidad de premios

- **Estado actual:** no hay proceso documentado de retención IRPF ni comunicación AEAT para premios en especie.
- **Pendiente gestoría:** definir umbrales de valor por premio y por usuario/mes que activan obligación de retención/comunicación; snapshot de valor en fecha de entrega en `redemptions`.

### 🟢 R7 — Sorteos internos gratuitos

- **Base normativa:** Ley 13/2011 art. 3.i (exclusión de combinaciones aleatorias con finalidad publicitaria sin sobreprecio).
- **Estado actual:** `giveawayEntries` con UNIQUE(userId, giveawayId), sin coste, sin puntos comprables ni transferibles. Encaja en la exclusión.
- **Riesgo bajo** condicional a mantener el modelo (ver `docs/rewards-policy.md`).

## Reglas de producto que sostienen el modelo (no negociables)

Cambios que rompen la calificación de "programa de fidelización + sorteo promocional gratuito" y elevan el riesgo a alto:

1. Compra, transferencia o venta de puntos entre usuarios.
2. Puntos obtenidos por depósito o wagering en un partner externo.
3. Mecánicas de azar donde el usuario puede perder o multiplicar puntos.
4. Tickets adicionales pagados o canjeados.
5. Conversión de puntos en efectivo o retirada monetaria.
6. Ruleta, caja aleatoria, upgrader, jackpot, case battle, cara/cruz.

Ver `docs/rewards-policy.md` para el detalle operativo.

## TODOs para abogado

Registrados en `docs/legal/todos-abogado.md`.
