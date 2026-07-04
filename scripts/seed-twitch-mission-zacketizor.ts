/**
 * Seed misión Twitch "Sigue el canal de ZACKETIZOR en Twitch".
 *
 * ============================================================
 * NUNCA se ejecuta automáticamente. Requiere env var explícita:
 *   CONFIRM_SEED_TWITCH_MISSION=I_ACCEPT_TWITCH_MISSION
 *
 * Comando real:
 *   CONFIRM_SEED_TWITCH_MISSION=I_ACCEPT_TWITCH_MISSION \
 *     npx tsx --env-file=.env.local scripts/seed-twitch-mission-zacketizor.ts
 * ============================================================
 *
 * Requisitos previos (env `.env.local`):
 *   TWITCH_CLIENT_ID
 *   TWITCH_CLIENT_SECRET
 *   TWITCH_OAUTH_REDIRECT_URL
 *   TOKEN_ENCRYPTION_KEY (compartido con Discord Fase A)
 *   TWITCH_ZACKETIZOR_BROADCASTER_ID
 *   TWITCH_ZACKETIZOR_CHANNEL_URL
 *
 * Idempotente:
 *   - Si ya existe una misión con `title === TITLE` NO la duplica.
 *   - Actualiza `rewardCoins`, `provider`, `targetId`, `targetUrl`,
 *     `verificationMode`, `isActive`, `sortOrder` a valores canónicos.
 */
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { platformMissions } from '../src/db/schema';
import { env } from '../src/lib/env';
import { TWITCH_FOLLOW_CHANNEL_MODE } from '../src/features/giveaway-platform/constants/twitch-missions';

const CONFIRM_TOKEN = 'I_ACCEPT_TWITCH_MISSION';
const TITLE = 'Sigue a ZACKETIZOR en Twitch';
const REWARD_COINS = 100;
// Discord ZACKETIZOR va con sortOrder=0. Ponemos Twitch inmediatamente
// después para que aparezca en el top junto a Discord.
const SORT_ORDER = 0;

async function main() {
  if (process.env.CONFIRM_SEED_TWITCH_MISSION !== CONFIRM_TOKEN) {
    console.error(
      'Seed abortado. Requiere env var explícita:\n' +
      `  CONFIRM_SEED_TWITCH_MISSION=${CONFIRM_TOKEN} npx tsx --env-file=.env.local scripts/seed-twitch-mission-zacketizor.ts\n\n` +
      'Motivo: este seed INSERTA/UPDATE una misión operativa que concede\n' +
      'puntos reales tras verificación OAuth Twitch. Se ejecuta a mano.',
    );
    process.exit(1);
  }

  const broadcasterId = env.TWITCH_ZACKETIZOR_BROADCASTER_ID;
  const channelUrl = env.TWITCH_ZACKETIZOR_CHANNEL_URL;
  if (!broadcasterId || !channelUrl) {
    console.error(
      'Faltan env vars requeridas:\n' +
      '  TWITCH_ZACKETIZOR_BROADCASTER_ID (numérico Helix user ID)\n' +
      '  TWITCH_ZACKETIZOR_CHANNEL_URL (https://www.twitch.tv/<login>)',
    );
    process.exit(1);
  }

  const existing = await db.query.platformMissions.findFirst({
    where: eq(platformMissions.title, TITLE),
  });

  const description = `Sigue el canal de ZACKETIZOR en Twitch y gana ${REWARD_COINS} puntos. Verificamos que le sigues en tiempo real vía OAuth Twitch.`;

  if (existing) {
    await db
      .update(platformMissions)
      .set({
        description,
        conditionType: 'external_verified',
        goal: 1,
        rewardCoins: REWARD_COINS,
        isActive: true,
        sortOrder: SORT_ORDER,
        provider: 'twitch',
        targetId: broadcasterId,
        targetUrl: channelUrl,
        verificationMode: TWITCH_FOLLOW_CHANNEL_MODE,
      })
      .where(eq(platformMissions.id, existing.id));
    console.log(`Misión Twitch actualizada (id=${existing.id})`);
    return;
  }

  const inserted = await db
    .insert(platformMissions)
    .values({
      title: TITLE,
      description,
      conditionType: 'external_verified',
      goal: 1,
      rewardCoins: REWARD_COINS,
      isActive: true,
      sortOrder: SORT_ORDER,
      provider: 'twitch',
      targetId: broadcasterId,
      targetUrl: channelUrl,
      verificationMode: TWITCH_FOLLOW_CHANNEL_MODE,
    })
    .returning({ id: platformMissions.id });

  console.log(`Misión Twitch creada (id=${inserted[0]?.id ?? 'unknown'})`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
