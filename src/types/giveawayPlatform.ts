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

/**
 * Categorías de items canjeables en tienda.
 *
 * Se amplió el 2026-07-03 con las 3 categorías cosméticas (profile, frame,
 * badge) — todas caben en el `varchar(10)` actual de `shop_items.category`,
 * por lo que NO se necesita migración de esquema para admitirlas.
 *
 * `profile` — profile cards de fondo del perfil.
 * `frame`   — marcos animados alrededor del avatar.
 * `badge`   — badges premium visibles en pill/perfil.
 *
 * NOTA: para EQUIPAR estos cosméticos (aplicarlos visualmente al perfil
 * del usuario) sí hace falta migración — ver `docs/sorteos-coin-economy.md`
 * §4.2. Mientras tanto se pueden canjear y quedan en `redemptions`.
 */
export type ShopCategory = 'skin' | 'merch' | 'team' | 'gift' | 'profile' | 'frame' | 'badge';
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

/** Row del ranking mensual por puntos ganados (racha + mision). */
export interface PointsRankingRow {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  pointsEarned: number;
}

/** Posición del usuario logueado en el ranking mensual por puntos. */
export interface UserMonthlyStanding {
  rank: number | null;
  pointsEarned: number;
  totalParticipants: number;
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

/** Card de sorteo gratis para el hub de recompensas. */
export interface FreeRaffleCardData {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  rewardName: string;
  endsAt: Date | null;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  entryCount: number;
  userHasEntered: boolean;
  winner: { displayName: string; avatarUrl: string | null } | null;
}

/** Participante público de un sorteo — respeta player_profiles.isPrivate. */
export interface RaffleParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  enteredAt: Date;
}
