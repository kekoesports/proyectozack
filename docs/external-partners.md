# Partners externos — SocialPro Giveaways

> Registro operativo de partners externos consumidos vía API o affiliate link. Fuente de verdad para las decisiones de gating por país y para el `PartnerExternalNotice`.

Última actualización: 2026-07-05

## Regla base

SocialPro **no opera** los sorteos, códigos ni bonos que se muestran de partners externos. Los muestra como vitrina informativa/promocional del creador. Cada card externa debe:

1. Renderizar `PartnerExternalNotice` visible encima.
2. Usar CTA neutro (`Ver oferta externa`, `Ir al partner`). Nunca `Depositar`, `Reclamar bonus`, `Wagering`.
3. Estar diferenciada visualmente (border/color/icono `↗`).
4. Estar sujeta a feature flag por país (`geoLegalConfig`).
5. Ser server-side rendered leyendo `x-vercel-ip-country` para gating fiable.

## Partners actuales

| Partner | Categoría | Copy sensible detectado | Feature flag | Estado ES (2026-07-05) |
|---|---|---|---|---|
| **KeyDrop** | Skin market + case openings + raffles | "200% Bonus", "12x wagering", "raffles de 3000$", "Club VIP" | `KEYDROP_EXTERNAL_CTAS` | 🔴 OFF hasta validar licencia DGOJ (R1) |
| **CSGOSKINS** | Skin marketplace | "5% Bonus + drops semanales" | `EXTERNAL_PARTNER_CTAS` | 🟡 Copy neutralizado |
| **SkinsMonkey** | Skin trade P2P | "35% Bonus + hasta 5$ Gratis" | `EXTERNAL_PARTNER_CTAS` | 🟡 Copy neutralizado |
| **Skin.Club** | Skin marketplace | "7% bonus · 25 usos" | `EXTERNAL_PARTNER_CTAS` | 🟡 Copy neutralizado |
| **1WIN** | Casino/apuestas | Solo aparece en `/casos/onewin` (caso de estudio) | — | 🟢 Sin CTA activo, solo referencia histórica |
| **Blogabet** | Pronósticos CS2 | Solo en `/apuesta-segura-cs2` (Telegram partner) | — | Fuera de scope de sorteos |

## Comprobaciones previas a activar un partner en ES

Antes de retirar el gating de un partner externo para país ES:

1. **Verificación de licencia**: comprobar en el Registro DGOJ si el operador tiene título habilitante para operar en España cuando la actividad del partner encaja como juego (RD 1614/2011 anexo).
2. **Revisión de copy**: eliminar términos sensibles (ver `docs/legal/sensitive-copy-allowlist.md`).
3. **Revisión de flujo**: confirmar que no se otorgan puntos SocialPro por acciones económicas en el partner (depósitos, wagering, compras).
4. **Disclaimer firmado**: `PartnerExternalNotice` con texto adaptado a la categoría del partner.
5. **Aprobación producto + legal**: registrada en este documento como fecha y estado.

## Consumo de API — reglas técnicas

Cualquier API de partner (KeyDrop u otro) debe consumirse:

- Server-side (no exponer credenciales ni endpoint desde el cliente).
- Con cache configurable (5–15 min por defecto).
- Con validación Zod del payload.
- Con timeout ≤ 3s y fallback UI.
- Con sanitización de campos (`title`, `imageUrl`, `expiresAt`).
- Con filtro de tipos sensibles (case openings, upgrader, jackpot, battle).
- Con rate-limit por IP en la ruta interna.

## Enlace canónico a la card externa

El componente reutilizable es `src/components/partner/PartnerExternalNotice.tsx`. Cualquier `BrandCard*` externa debe usarlo. Si un card nuevo lo omite, el test `sensitive-copy-allowlist.test.ts` no lo detecta directamente — añadir un test específico en `brand-card-*.test.ts` que verifique presencia del notice.
