import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { serializableDb } from '@/lib/db';

const ParticipationRow = z.object({
  giveaway_id: z.coerce.number().int().positive(),
  title: z.string(),
  entry_award_coins: z.coerce.number().int().nonnegative(),
  inserted: z.boolean(),
});

const MissionClaimRow = z.object({
  claimed: z.boolean(),
});

const StreakClaimRow = z.object({
  current_day: z.coerce.number().int().min(1).max(7),
  amount: z.coerce.number().int().positive(),
});

const RedemptionRow = z.object({
  redemption_id: z.coerce.number().int().positive(),
  item_name: z.string(),
  category: z.string(),
  cost_coins: z.coerce.number().int().positive(),
});

const WinnerRow = z.object({
  user_id: z.string().min(1),
  display_name: z.string().min(1),
  entries_count: z.coerce.number().int().positive(),
});

const CancelRedemptionRow = z.object({
  redemption_id: z.coerce.number().int().positive(),
});

const CompleteRedemptionRow = z.object({
  redemption_id: z.coerce.number().int().positive(),
});

function isSerializationFailure(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return error.code === '40001';
  }
  return error instanceof Error && error.message.includes('could not serialize');
}

async function serializableRows(query: SQL): Promise<unknown[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const [result] = await serializableDb.batch([
        serializableDb.execute(query),
      ]);
      return result.rows;
    } catch (error) {
      if (!isSerializationFailure(error) || attempt === 2) throw error;
    }
  }
  return [];
}

export async function participateAndAward(input: {
  readonly userId: string;
  readonly giveawayId: number;
}): Promise<z.infer<typeof ParticipationRow> | null> {
  const rows = await serializableRows(sql`
    WITH eligible AS (
      SELECT g.id, g.title, g.entry_award_coins
      FROM giveaways g
      INNER JOIN player_profiles pp
        ON pp.user_id = ${input.userId}
       AND pp.adult_attested_at IS NOT NULL
      WHERE g.id = ${input.giveawayId}
        AND g.status = 'active'
        AND g.starts_at <= now()
        AND (g.ends_at IS NULL OR g.ends_at > now())
    ),
    new_entry AS (
      INSERT INTO giveaway_entries (giveaway_id, user_id)
      SELECT id, ${input.userId}
      FROM eligible
      ON CONFLICT (giveaway_id, user_id) DO NOTHING
      RETURNING giveaway_id
    ),
    award AS (
      INSERT INTO coin_transactions
        (user_id, amount, source, concept, ref_id, ref_key)
      SELECT
        ${input.userId},
        e.entry_award_coins,
        'sorteo',
        left('Participación · ' || e.title, 200),
        e.id,
        'giveaway:' || e.id::text || ':user:' || ${input.userId}
      FROM eligible e
      INNER JOIN new_entry ne ON ne.giveaway_id = e.id
      WHERE e.entry_award_coins > 0
      ON CONFLICT (ref_key) DO NOTHING
    )
    SELECT
      e.id AS giveaway_id,
      e.title,
      e.entry_award_coins,
      EXISTS (SELECT 1 FROM new_entry) AS inserted
    FROM eligible e
  `);
  const parsed = ParticipationRow.safeParse(rows[0]);
  return parsed.success ? parsed.data : null;
}

export async function claimMissionAndAward(input: {
  readonly userId: string;
  readonly missionId: number;
  readonly title: string;
  readonly rewardCoins: number;
}): Promise<boolean> {
  const rows = await serializableRows(sql`
    WITH new_claim AS (
      INSERT INTO mission_claims (mission_id, user_id)
      VALUES (${input.missionId}, ${input.userId})
      ON CONFLICT (mission_id, user_id) DO NOTHING
      RETURNING id
    ),
    award AS (
      INSERT INTO coin_transactions
        (user_id, amount, source, concept, ref_id, ref_key)
      SELECT
        ${input.userId},
        ${input.rewardCoins},
        'mision',
        left('Misión completada · ' || ${input.title}, 200),
        ${input.missionId},
        'mission:' || ${input.missionId}::text || ':user:' || ${input.userId}
      FROM new_claim
      ON CONFLICT (ref_key) DO NOTHING
      RETURNING id
    )
    SELECT
      EXISTS (SELECT 1 FROM new_claim)
      AND EXISTS (SELECT 1 FROM award) AS claimed
  `);
  const parsed = MissionClaimRow.safeParse(rows[0]);
  return parsed.success && parsed.data.claimed;
}

export async function claimStreakAndAward(input: {
  readonly userId: string;
  readonly today: string;
  readonly yesterday: string;
}): Promise<z.infer<typeof StreakClaimRow> | null> {
  const rows = await serializableRows(sql`
    WITH streak AS (
      INSERT INTO daily_streaks (user_id, current_day, last_claim_date)
      VALUES (${input.userId}, 1, ${input.today}::date)
      ON CONFLICT (user_id) DO UPDATE SET
        current_day = CASE
          WHEN daily_streaks.last_claim_date = ${input.yesterday}::date
            THEN CASE WHEN daily_streaks.current_day >= 7
              THEN 1 ELSE daily_streaks.current_day + 1 END
          ELSE 1
        END,
        last_claim_date = ${input.today}::date,
        updated_at = now()
      WHERE daily_streaks.last_claim_date IS DISTINCT FROM ${input.today}::date
      RETURNING current_day
    ),
    award AS (
      INSERT INTO coin_transactions
        (user_id, amount, source, concept, ref_key)
      SELECT
        ${input.userId},
        CASE current_day
          WHEN 1 THEN 10 WHEN 2 THEN 15 WHEN 3 THEN 20
          WHEN 4 THEN 25 WHEN 5 THEN 30 WHEN 6 THEN 40 ELSE 60
        END,
        'racha',
        'Recompensa diaria · Día ' || current_day::text,
        'streak:' || ${input.today} || ':user:' || ${input.userId}
      FROM streak
      ON CONFLICT (ref_key) DO NOTHING
      RETURNING amount
    )
    SELECT s.current_day, a.amount
    FROM streak s
    INNER JOIN award a ON true
  `);
  const parsed = StreakClaimRow.safeParse(rows[0]);
  return parsed.success ? parsed.data : null;
}

export async function redeemAtomically(input: {
  readonly userId: string;
  readonly shopItemId: number;
  readonly requestKey: string;
  readonly deliveryInfo: string | null;
  readonly allowGift: boolean;
  readonly allowSkins: boolean;
  readonly allowMerch: boolean;
}): Promise<z.infer<typeof RedemptionRow> | null> {
  const rows = await serializableRows(sql`
    WITH eligible AS (
      SELECT si.id, si.name, si.category, si.cost_coins
      FROM shop_items si
      INNER JOIN player_profiles pp
        ON pp.user_id = ${input.userId}
       AND pp.adult_attested_at IS NOT NULL
      WHERE si.id = ${input.shopItemId}
        AND si.is_active = true
        AND si.stock > 0
        AND (${input.allowGift} OR si.category <> 'gift')
        AND (${input.allowSkins} OR si.category <> 'skin')
        AND (${input.allowMerch} OR si.category NOT IN ('merch', 'team'))
        AND NOT EXISTS (
          SELECT 1 FROM redemptions r WHERE r.request_key = ${input.requestKey}
        )
        AND (
          SELECT coalesce(sum(ct.amount), 0)
          FROM coin_transactions ct
          WHERE ct.user_id = ${input.userId}
        ) >= si.cost_coins
    ),
    reserved_stock AS (
      UPDATE shop_items si
      SET stock = si.stock - 1, updated_at = now()
      FROM eligible e
      WHERE si.id = e.id
        AND si.stock > 0
      RETURNING si.id
    ),
    debit AS (
      INSERT INTO coin_transactions
        (user_id, amount, source, concept, ref_id, ref_key)
      SELECT
        ${input.userId},
        -e.cost_coins,
        'tienda',
        left('Canje · ' || e.name, 200),
        e.id,
        'redemption:' || ${input.requestKey}
      FROM eligible e
      INNER JOIN reserved_stock rs ON rs.id = e.id
      RETURNING id
    ),
    redemption AS (
      INSERT INTO redemptions
        (user_id, shop_item_id, cost_coins, delivery_info, request_key)
      SELECT
        ${input.userId},
        e.id,
        e.cost_coins,
        ${input.deliveryInfo},
        ${input.requestKey}
      FROM eligible e
      INNER JOIN debit d ON true
      RETURNING id, shop_item_id, cost_coins
    )
    SELECT
      r.id AS redemption_id,
      e.name AS item_name,
      e.category,
      r.cost_coins
    FROM redemption r
    INNER JOIN eligible e ON e.id = r.shop_item_id
  `);
  const parsed = RedemptionRow.safeParse(rows[0]);
  return parsed.success ? parsed.data : null;
}

export async function pickWinnerAtomically(input: {
  readonly giveawayId: number;
}): Promise<z.infer<typeof WinnerRow> | null> {
  const rows = await serializableRows(sql`
    WITH eligible_giveaway AS (
      SELECT id
      FROM giveaways
      WHERE id = ${input.giveawayId}
        AND status IN ('active', 'ended')
        AND starts_at <= now()
        AND ends_at IS NOT NULL
        AND ends_at <= now()
        AND NOT EXISTS (
          SELECT 1 FROM giveaway_winners gw WHERE gw.giveaway_id = giveaways.id
        )
    ),
    participant_count AS (
      SELECT count(*)::int AS entries_count
      FROM giveaway_entries ge
      INNER JOIN eligible_giveaway eg ON eg.id = ge.giveaway_id
    ),
    selected AS (
      SELECT
        ge.user_id,
        CASE
          WHEN pp.is_private = false THEN u.name
          ELSE left(u.name, 1) || '*****'
        END AS display_name,
        CASE WHEN pp.is_private = false THEN u.image ELSE NULL END AS avatar
      FROM giveaway_entries ge
      INNER JOIN eligible_giveaway eg ON eg.id = ge.giveaway_id
      INNER JOIN "user" u ON u.id = ge.user_id
      LEFT JOIN player_profiles pp ON pp.user_id = ge.user_id
      ORDER BY random()
      LIMIT 1
    ),
    winner AS (
      INSERT INTO giveaway_winners
        (giveaway_id, winner_name, winner_avatar, winner_user_id)
      SELECT
        ${input.giveawayId}, s.display_name, s.avatar, s.user_id
      FROM selected s
      ON CONFLICT (giveaway_id) DO NOTHING
      RETURNING winner_user_id, winner_name
    ),
    closed AS (
      UPDATE giveaways
      SET status = 'ended', updated_at = now()
      WHERE id = ${input.giveawayId}
        AND EXISTS (SELECT 1 FROM winner)
      RETURNING id
    )
    SELECT
      w.winner_user_id AS user_id,
      w.winner_name AS display_name,
      pc.entries_count
    FROM winner w
    INNER JOIN participant_count pc ON pc.entries_count > 0
    INNER JOIN closed c ON true
  `);
  const parsed = WinnerRow.safeParse(rows[0]);
  return parsed.success ? parsed.data : null;
}

export async function cancelRedemptionAtomically(input: {
  readonly redemptionId: number;
  readonly adminUserId: string;
  readonly adminNotes: string | null;
}): Promise<boolean> {
  const rows = await serializableRows(sql`
    WITH cancelled AS (
      UPDATE redemptions
      SET
        status = 'cancelado',
        processed_by = ${input.adminUserId},
        processed_at = now(),
        admin_notes = ${input.adminNotes},
        updated_at = now()
      WHERE id = ${input.redemptionId}
        AND status = 'pendiente'
      RETURNING id, user_id, shop_item_id, cost_coins
    ),
    restored_stock AS (
      UPDATE shop_items si
      SET stock = si.stock + 1, updated_at = now()
      FROM cancelled c
      WHERE si.id = c.shop_item_id
      RETURNING si.id
    ),
    refund AS (
      INSERT INTO coin_transactions
        (user_id, amount, source, concept, ref_id, ref_key)
      SELECT
        c.user_id,
        c.cost_coins,
        'admin',
        'Reembolso · canje cancelado #' || c.id::text,
        c.id,
        'redemption-refund:' || c.id::text
      FROM cancelled c
      INNER JOIN restored_stock rs ON rs.id = c.shop_item_id
      ON CONFLICT (ref_key) DO NOTHING
      RETURNING ref_id
    )
    SELECT c.id AS redemption_id
    FROM cancelled c
    INNER JOIN refund r ON r.ref_id = c.id
  `);
  const parsed = CancelRedemptionRow.safeParse(rows[0]);
  return parsed.success;
}

export async function completeRedemptionAtomically(input: {
  readonly redemptionId: number;
  readonly adminUserId: string;
  readonly adminNotes: string | null;
}): Promise<boolean> {
  const rows = await serializableRows(sql`
    UPDATE redemptions
    SET
      status = 'enviado',
      processed_by = ${input.adminUserId},
      processed_at = now(),
      admin_notes = ${input.adminNotes},
      updated_at = now()
    WHERE id = ${input.redemptionId}
      AND status = 'pendiente'
    RETURNING id AS redemption_id
  `);
  return CompleteRedemptionRow.safeParse(rows[0]).success;
}
