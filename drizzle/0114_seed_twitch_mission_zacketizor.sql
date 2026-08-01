-- Seed misión Twitch ZACKETIZOR + acortar copy Discord.
-- Data migration: idempotente. Necesaria porque el seed CLI no puede
-- tocar DATABASE_URL production (tipo sensitive en Vercel).

-- 1) Twitch follow mission (provider=twitch).
INSERT INTO "platform_missions" (
  "title",
  "description",
  "condition_type",
  "goal",
  "reward_coins",
  "is_active",
  "sort_order",
  "provider",
  "target_id",
  "target_url",
  "verification_mode"
)
SELECT
  'Sigue a ZACKETIZOR en Twitch',
  'Sigue el canal de ZACKETIZOR en Twitch y gana 100 puntos.',
  'external_verified',
  1,
  100,
  true,
  0,
  'twitch',
  '549186441',
  'https://www.twitch.tv/zacketizorcs2',
  'twitch_follow_channel'
WHERE NOT EXISTS (
  SELECT 1 FROM "platform_missions"
  WHERE "title" = 'Sigue a ZACKETIZOR en Twitch'
);
--> statement-breakpoint

-- 2) Si ya existía (p.ej. seed manual en un branch), re-sincroniza campos canónicos.
UPDATE "platform_missions"
SET
  "description" = 'Sigue el canal de ZACKETIZOR en Twitch y gana 100 puntos.',
  "condition_type" = 'external_verified',
  "goal" = 1,
  "reward_coins" = 100,
  "is_active" = true,
  "sort_order" = 0,
  "provider" = 'twitch',
  "target_id" = '549186441',
  "target_url" = 'https://www.twitch.tv/zacketizorcs2',
  "verification_mode" = 'twitch_follow_channel'
WHERE "title" = 'Sigue a ZACKETIZOR en Twitch';
--> statement-breakpoint

-- 3) Copy corto Discord (la UI ya oculta description en estado Cobrado).
UPDATE "platform_missions"
SET "description" = 'Únete al Discord y gana 100 puntos.'
WHERE "provider" = 'discord'
  AND "title" = 'Únete al Discord de ZACKETIZOR';
