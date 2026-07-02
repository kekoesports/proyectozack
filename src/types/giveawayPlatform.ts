import type { InferSelectModel } from 'drizzle-orm';
import type {
  playerProfiles,
  coinTransactions,
  giveawayEntries,
  platformMissions,
  missionClaims,
  dailyStreaks,
  shopItems,
  redemptions,
} from '@/db/schema';

export type PlayerProfile = InferSelectModel<typeof playerProfiles>;
export type CoinTransaction = InferSelectModel<typeof coinTransactions>;
export type GiveawayEntry = InferSelectModel<typeof giveawayEntries>;
export type PlatformMission = InferSelectModel<typeof platformMissions>;
export type MissionClaim = InferSelectModel<typeof missionClaims>;
export type DailyStreak = InferSelectModel<typeof dailyStreaks>;
export type ShopItem = InferSelectModel<typeof shopItems>;
export type Redemption = InferSelectModel<typeof redemptions>;

export type ShopCategory = 'skin' | 'merch' | 'gift';
export type RedemptionStatus = 'pendiente' | 'enviado' | 'cancelado';
export type MissionConditionType = 'entries_total' | 'distinct_creators' | 'streak_days';
export type CoinSource = 'racha' | 'mision' | 'sorteo' | 'tienda' | 'admin';

export interface MissionWithProgress extends PlatformMission {
  current: number;
  claimed: boolean;
}

export interface RankingRow {
  userId: string;
  displayName: string;
  tickets: number;
}

export interface GiveawayWithEntryData {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  brandName: string;
  value: string | null;
  endsAt: Date | null;
  talentId: number;
  entryCount: number;
  userHasEntered: boolean;
}
