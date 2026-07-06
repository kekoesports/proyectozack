'use client';

import { useState } from 'react';
import { PlatformShop } from './PlatformShop';
import { FreeRaffleCard } from './FreeRaffleCard';
import { MonthlyPointsRanking } from './MonthlyPointsRanking';
import { PrizesBlock } from './PrizesBlock';
import type {
  FreeRaffleCardData,
  PointsRankingRow,
  ShopItem,
  UserMonthlyStanding,
} from '@/types/giveawayPlatform';

interface Props {
  shopItems: readonly ShopItem[];
  balance: number;
  hasSteamTradeUrl: boolean;
  freeRaffles: readonly FreeRaffleCardData[];
  pointsRanking: readonly PointsRankingRow[];
  rankingTotal: number;
  myStanding: UserMonthlyStanding | null;
  isLoggedIn: boolean;
}

type TabKey = 'shop' | 'raffles' | 'ranking';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'shop',    label: 'Recompensas por puntos' },
  { key: 'raffles', label: 'Sorteos gratis' },
  { key: 'ranking', label: 'Ranking mensual' },
];

export function RewardsHub({
  shopItems,
  balance,
  hasSteamTradeUrl,
  freeRaffles,
  pointsRanking,
  rankingTotal,
  myStanding,
  isLoggedIn,
}: Props): React.ReactElement {
  const [tab, setTab] = useState<TabKey>('shop');

  const activeRafflesCount = freeRaffles.filter(
    (r) => r.status === 'active' && (!r.endsAt || new Date(r.endsAt) > new Date()),
  ).length;

  return (
    <div className="gp-rewards-hub">
      <div className="gp-rewards-hub-tabs" role="tablist">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          const count = t.key === 'raffles'
            ? activeRafflesCount
            : t.key === 'ranking'
              ? rankingTotal
              : shopItems.length;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`gp-rewards-hub-tab${isActive ? ' is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {count > 0 ? <span className="gp-rewards-hub-tab-count">{count}</span> : null}
            </button>
          );
        })}
      </div>

      {tab === 'shop' ? (
        <>
          <p className="gp-rewards-hub-intro">Canjea tus puntos por recompensas exclusivas.</p>
          <PlatformShop items={[...shopItems]} balance={balance} hasSteamTradeUrl={hasSteamTradeUrl} />
        </>
      ) : null}

      {tab === 'raffles' ? (
        <>
          <p className="gp-rewards-hub-intro">Participa gratis en sorteos de skins CS2.</p>
          {freeRaffles.length === 0 ? (
            <p className="gp-rank-empty">No hay sorteos gratis ahora mismo. Vuelve pronto.</p>
          ) : (
            <div className="gp-free-raffle-grid">
              {freeRaffles.map((r) => (
                <FreeRaffleCard key={r.id} raffle={r} isLoggedIn={isLoggedIn} />
              ))}
            </div>
          )}
        </>
      ) : null}

      {tab === 'ranking' ? (
        <>
          <MonthlyPointsRanking
            rows={pointsRanking}
            totalParticipants={rankingTotal}
            myStanding={myStanding}
            isLoggedIn={isLoggedIn}
          />
          <div style={{ marginTop: 20 }}>
            <PrizesBlock />
          </div>
        </>
      ) : null}
    </div>
  );
}
