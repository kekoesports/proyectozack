# Plataforma de Sorteos — Paquete de integración para proyectozack

Código real escrito siguiendo las convenciones del repo (Drizzle serial+snake_case
con índices en array, queries con JSDoc @cache/@visibility, Zod safeParse en
fronteras según ADR-0001, regla Server/Client de AGENTS.md, archivos <500 LOC).
Las rutas de carpeta de este paquete son ESPEJO de las del repo: cada archivo
se copia en la misma ruta.

## Qué hace

Plataforma pública de sorteos multi-creador sobre las tablas EXISTENTES
(`giveaways`, `talents`, `user` de Better Auth): participaciones idempotentes
con contador, monedas (libro mayor), misiones automáticas, racha diaria,
ranking mensual por tickets y tienda de canje (skins CS2 / merch / gift cards).
Sin ninguna mecánica de apuesta o azar con pérdida (fuera del ámbito DGOJ).

## Archivos incluidos

- `src/db/schema/`: playerProfiles, coinTransactions, giveawayEntries,
  platformMissions (+missionClaims), dailyStreaks, shopItems (+redemptions)
- `src/types/giveawayPlatform.ts`
- `src/lib/schemas/giveawayPlatform.ts` (Zod)
- `src/lib/giveaway-platform/`: constants.ts, missions.ts (evaluación+cobro automático)
- `src/lib/queries/giveawayPlatform.ts`
- `src/app/sorteos/plataforma/`: actions.ts (server actions), page.tsx
- `src/features/giveaway-platform/components/`: CreatorSwitcher, DailyStreakCard,
  MissionsGrid, EntryButton, PlatformShop, MonthlyRanking
- `scripts/seed-giveaway-platform.ts`

## Prompt para Claude Code

Copia los archivos al repo y pega esto:

```
Integra la plataforma de sorteos cuyo código acabo de copiar al repo
(ver README-INTEGRACION.md en la raíz para el contexto). Pasos:

1. SCHEMA: añade a src/db/schema/index.ts los exports de los 6 archivos
   nuevos (playerProfiles, coinTransactions, giveawayEntries,
   platformMissions, dailyStreaks, shopItems). Ejecuta
   `npx drizzle-kit generate` y revisa el SQL antes de
   `npx drizzle-kit migrate`. Después `npx tsx scripts/seed-giveaway-platform.ts`.

2. VERIFICA CONVENCIONES: pasa `npx tsc --noEmit` y `npm run lint` sobre los
   archivos nuevos y corrige cualquier fricción con el código existente
   (imports, nombres de columnas de talents como photoUrl, export de
   authClient, etc.). Los archivos se escribieron leyendo el repo, pero
   valida contra el código real.

3. AUTH STEAM: los jugadores entran SOLO con Steam (OpenID 2.0). Better Auth
   no lo trae de serie: busca el plugin de comunidad para Steam de Better Auth
   o implementa el flujo OpenID en una ruta propia que cree user + session de
   Better Auth y una fila en player_profiles (steamId, avatar, nombre) en el
   primer login. IMPORTANTE: estos usuarios NO llevan role admin/staff; revisa
   src/lib/auth-guard.ts y src/lib/permissions.ts para que un jugador jamás
   acceda a /admin. Documenta STEAM_API_KEY en .env.example.

4. UI: la página src/app/sorteos/plataforma/page.tsx usa clases Tailwind
   neutras (border-border, bg-card, text-muted-foreground, bg-primary…).
   Alinéala con los tokens reales de globals.css @theme y reutiliza
   componentes existentes (src/components/ui/button.tsx, SectionHeading,
   FilterTabs, CountdownTimer de creator-codes, GiveawayPrizePlaceholder…).
   Envuelve la página con el chrome público (PublicChrome/Nav/Footer) y añade
   el enlace en la navegación junto a /sorteos y /codigos. El botón de login
   debe disparar el sign-in de Steam del paso 3.

5. ADMIN: en src/app/admin/(dashboard)/giveaways añade dos pestañas siguiendo
   el patrón de las existentes (GiveawaysTab/CodesTab/WinnersTab):
   - "Tienda": CRUD de shop_items con subida de imagen a Vercel Blob
     (usa el patrón de BrandLogoUpload + validateUploadedFile) y control de stock.
   - "Canjes": lista de redemptions con cambio de estado pendiente→enviado
     (muestra deliveryInfo: trade URL, dirección o email).
   Añade también en la pestaña de sorteos el contador de participantes por
   sorteo (COUNT de giveaway_entries) y un botón "Elegir ganador" que
   seleccione una entry aleatoria en SERVIDOR y la registre en
   giveaway_winners (tabla existente).

6. TESTS: siguiendo el patrón de src/__tests__/server/, escribe tests para:
   participación idempotente (segunda llamada no duplica ni acredita),
   no doble cobro de misión, no canje sin saldo o sin stock, no doble
   claim diario, y ranking que enmascara perfiles privados.

7. Recorre el flujo completo en local con el seed y arregla lo que falle.
   Un commit por paso con scripts/committer.
```

## Decisiones técnicas que Claude Code debe respetar

- **neon-http no soporta transacciones**: la consistencia se apoya en
  UNIQUEs (onConflictDoNothing + returning) y UPDATEs condicionales
  (stock > 0). No "simplificar" quitando estos patrones.
- **El saldo nunca se cachea ni se confía al cliente**: siempre
  SUM(coin_transactions.amount) en servidor.
- **Recompensas fijas**: nada de multiplicadores aleatorios ni mecánicas
  de apuesta. Si alguien pide añadirlas, es un cambio de alcance legal (DGOJ).
- **Imágenes**: giveaways.image_url y shop_items.image_url apuntan a
  Vercel Blob (fotos reales de skins subidas desde el admin).
