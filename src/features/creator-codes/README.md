# Feature · creator-codes

> Páginas de creadores con códigos de promoción y giveaways individuales.
> Estética sub-brand (cyber/neon-lime) intencional, distinta del marketing
> editorial.

## Routes que sirve

- `/[creatorSlug]` — landing del creador (root-level dynamic route)
- `/c/[slug]` — link corto a un código
- `/creadores/[slug]` — variant alternativa

## Entry points

- `components/CreatorHero.tsx` — hero con perfil del creador.
- `components/GiveawayCard.tsx` — card de giveaway.
- `components/GiveawayGrid.tsx` — grid de giveaways del creador.
- `components/CountdownTimer.tsx` — timer hasta cierre del giveaway.
- `components/UnboxReveal.tsx` — animación de "unbox" para reveal del código.

## Server vs Client

- **Client** todos: countdown, unbox animation, hover states.

## Dependencias clave

- `@/lib/queries/creatorCodes`, `@/lib/queries/giveaways`.
- `motion/react` — animaciones.
