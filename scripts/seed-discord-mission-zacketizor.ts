/**
 * Seed misión Discord "Únete al Discord de ZACKETIZOR".
 *
 * ============================================================
 * NUNCA se ejecuta automáticamente. Requiere env var explícita:
 *   CONFIRM_SEED_DISCORD_MISSION=I_ACCEPT_DISCORD_MISSION
 *
 * Comando real:
 *   CONFIRM_SEED_DISCORD_MISSION=I_ACCEPT_DISCORD_MISSION \
 *     npx tsx --env-file=.env.local scripts/seed-discord-mission-zacketizor.ts
 * ============================================================
 *
 * Requisitos previos (env `.env.local`):
 *   DISCORD_CLIENT_ID
 *   DISCORD_CLIENT_SECRET
 *   DISCORD_OAUTH_REDIRECT_URL
 *   DISCORD_ZACKETIZOR_GUILD_ID
 *   DISCORD_ZACKETIZOR_INVITE_URL
 *   TOKEN_ENCRYPTION_KEY (64 hex chars = 32 bytes AES-256)
 *
 * Idempotente:
 *   - Si ya existe una misión con `title === TITLE` NO la duplica.
 *   - Actualiza `rewardCoins`, `provider`, `targetId`, `targetUrl`,
 *     `verificationMode`, `isActive`, `sortOrder` a los valores canónicos.
 */
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { platformMissions } from '../src/db/schema';
import { env } from '../src/lib/env';
import { DISCORD_GUILD_MEMBER_MODE } from '../src/features/giveaway-platform/constants/discord-missions';

const CONFIRM_TOKEN = 'I_ACCEPT_DISCORD_MISSION';
const TITLE = 'Únete al Discord de ZACKETIZOR';
const REWARD_COINS = 100;
const SORT_ORDER = 0; // primera del top — se mostrará arriba de todo

async function main() {
  if (process.env.CONFIRM_SEED_DISCORD_MISSION !== CONFIRM_TOKEN) {
    console.error(
      'Seed abortado. Requiere env var explícita:\n' +
      `  CONFIRM_SEED_DISCORD_MISSION=${CONFIRM_TOKEN} npx tsx --env-file=.env.local scripts/seed-discord-mission-zacketizor.ts\n\n` +
      'Motivo: este seed INSERTA/UPDATE una misión operativa que concede\n' +
      'puntos reales tras verificación OAuth Discord. Se ejecuta a mano.',
    );
    process.exit(1);
  }

  const guildId = env.DISCORD_ZACKETIZOR_GUILD_ID;
  const inviteUrl = env.DISCORD_ZACKETIZOR_INVITE_URL;
  if (!guildId || !inviteUrl) {
    console.error(
      'Faltan env vars requeridas:\n' +
      '  DISCORD_ZACKETIZOR_GUILD_ID (snowflake 17-20 dígitos)\n' +
      '  DISCORD_ZACKETIZOR_INVITE_URL (https://discord.gg/... o https://discord.com/invite/...)',
    );
    process.exit(1);
  }

  const existing = await db.query.platformMissions.findFirst({
    where: eq(platformMissions.title, TITLE),
  });

  if (existing) {
    await db
      .update(platformMissions)
      .set({
        description: `Únete al servidor Discord de ZACKETIZOR y gana ${REWARD_COINS} puntos. Verificamos que estás dentro en tiempo real vía OAuth Discord.`,
        conditionType: 'external_verified',
        goal: 1,
        rewardCoins: REWARD_COINS,
        isActive: true,
        sortOrder: SORT_ORDER,
        provider: 'discord',
        targetId: guildId,
        targetUrl: inviteUrl,
        verificationMode: DISCORD_GUILD_MEMBER_MODE,
      })
      .where(eq(platformMissions.id, existing.id));
    console.log(`Misión Discord actualizada (id=${existing.id})`);
    return;
  }

  const inserted = await db
    .insert(platformMissions)
    .values({
      title: TITLE,
      description: `Únete al servidor Discord de ZACKETIZOR y gana ${REWARD_COINS} puntos. Verificamos que estás dentro en tiempo real vía OAuth Discord.`,
      conditionType: 'external_verified',
      goal: 1,
      rewardCoins: REWARD_COINS,
      isActive: true,
      sortOrder: SORT_ORDER,
      provider: 'discord',
      targetId: guildId,
      targetUrl: inviteUrl,
      verificationMode: DISCORD_GUILD_MEMBER_MODE,
    })
    .returning({ id: platformMissions.id });

  console.log(`Misión Discord creada (id=${inserted[0]?.id ?? 'unknown'})`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
