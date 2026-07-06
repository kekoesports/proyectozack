import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlatformShell } from '@/features/giveaway-platform/components/PlatformShell';
import { FreeRaffleCard } from '@/features/giveaway-platform/components/FreeRaffleCard';
import { MonthlyPointsRanking } from '@/features/giveaway-platform/components/MonthlyPointsRanking';
import { PrizesBlock } from '@/features/giveaway-platform/components/PrizesBlock';
import type {
  FreeRaffleCardData,
  PointsRankingRow,
  UserMonthlyStanding,
} from '@/types/giveawayPlatform';

/**
 * QA preview de la sección "Sorteos Gratis" + "Ranking mensual" con
 * fixtures hardcodeados. NO ejecuta writes en DB. NO usa server actions.
 *
 * Gate: solo se renderiza si `VERCEL_ENV !== 'production'`. En producción
 * devuelve `notFound()` — la ruta no existe públicamente.
 *
 * Ver PR de rewards-hub para QA visual sin crear sorteos reales.
 */

export const metadata: Metadata = {
  title: 'QA Preview · Rewards Hub',
  robots: { index: false, follow: false },
};

const IMAGES = {
  glockBlock: '/images/rewards/glock-18-block-18-ft.png',
  glockVogue: '/images/rewards/glock-18-vogue-ft.png',
  akAsiimov:  '/images/rewards/ak-47-asiimov-ft.png',
  awpAtheris: '/images/rewards/awp-atheris-ft.png',
} as const;

// 4 sorteos que cubren todos los estados de card.
const FREE_RAFFLES: FreeRaffleCardData[] = [
  {
    id: 9001,
    title: 'Sorteo gratis · Glock-18 | Block-18',
    description: null,
    imageUrl: IMAGES.glockBlock,
    rewardName: 'Glock-18 | Block-18',
    endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 días
    status: 'active',
    entryCount: 143,
    userHasEntered: false,
    winner: null,
  },
  {
    id: 9002,
    title: 'Sorteo gratis · AK-47 | Asiimov',
    description: null,
    imageUrl: IMAGES.akAsiimov,
    rewardName: 'AK-47 | Asiimov',
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // +2d 6h
    status: 'active',
    entryCount: 72,
    userHasEntered: true, // estado "Ya participas"
    winner: null,
  },
  {
    id: 9003,
    title: 'Sorteo gratis · AWP | Atheris',
    description: null,
    imageUrl: IMAGES.awpAtheris,
    rewardName: 'AWP | Atheris',
    endsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // ya terminó ayer
    status: 'ended',
    entryCount: 218,
    userHasEntered: true,
    winner: { displayName: 'K***** (Preview)', avatarUrl: null },
  },
  {
    id: 9004,
    title: 'Sorteo gratis · Glock-18 | Vogue',
    description: null,
    imageUrl: IMAGES.glockVogue,
    rewardName: 'Glock-18 | Vogue',
    endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    status: 'active',
    entryCount: 0, // sin participantes → no muestra "Ver participantes"
    userHasEntered: false,
    winner: null,
  },
];

const PREVIEW_PARTICIPANTS = [
  { userId: 'p1', displayName: 'zackfan92',   avatarUrl: null, enteredAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { userId: 'p2', displayName: 'D*****',      avatarUrl: null, enteredAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { userId: 'p3', displayName: 'imanTops',    avatarUrl: null, enteredAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { userId: 'p4', displayName: 'N*****',      avatarUrl: null, enteredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { userId: 'p5', displayName: 'j*****',      avatarUrl: null, enteredAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { userId: 'p6', displayName: 'todo_cs2',    avatarUrl: null, enteredAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { userId: 'p7', displayName: 'A*****',      avatarUrl: null, enteredAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString() },
] as const;

const RANKING: PointsRankingRow[] = [
  { userId: 'r1', displayName: 'zackfan92',   avatarUrl: null, pointsEarned: 1250 },
  { userId: 'r2', displayName: 'imanTops',    avatarUrl: null, pointsEarned: 940 },
  { userId: 'r3', displayName: 'todo_cs2',    avatarUrl: null, pointsEarned: 720 },
  { userId: 'r4', displayName: 'D*****',      avatarUrl: null, pointsEarned: 610 },
  { userId: 'r5', displayName: 'j*****',      avatarUrl: null, pointsEarned: 450 },
  { userId: 'r6', displayName: 'A*****',      avatarUrl: null, pointsEarned: 300 },
];

const MY_STANDING: UserMonthlyStanding = {
  rank: 12,
  pointsEarned: 180,
  totalParticipants: 84,
};

function isPreviewEnv(): boolean {
  return process.env.VERCEL_ENV !== 'production';
}

export default async function RewardsHubPreviewPage() {
  if (!isPreviewEnv()) {
    notFound();
  }

  return (
    <PlatformShell>
      <main className="gp-wrap" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div style={{ marginBottom: 16, padding: '10px 14px', border: '1px dashed rgba(245, 179, 66, 0.55)', borderRadius: 10, background: 'rgba(245, 179, 66, 0.08)' }}>
          <b style={{ color: '#f5b342' }}>QA Preview</b>{' '}
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            fixtures visuales — sin DB, sin escritura, sin server actions. Solo se renderiza si <code>VERCEL_ENV !== &apos;production&apos;</code>.
          </span>
        </div>

        <section id="recompensas">
          <div className="gp-legacy-block">
            <h2>Sorteos gratis · preview</h2>
            <p className="gp-rewards-hub-intro">Participa gratis en sorteos de skins CS2.</p>
            <div className="gp-free-raffle-grid">
              {FREE_RAFFLES.map((r) => (
                <FreeRaffleCard
                  key={r.id}
                  raffle={r}
                  isLoggedIn
                  preview={{ participants: PREVIEW_PARTICIPANTS }}
                />
              ))}
            </div>
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <div className="gp-legacy-block">
            <h2>Ranking mensual · preview</h2>
            <MonthlyPointsRanking
              rows={RANKING}
              totalParticipants={84}
              myStanding={MY_STANDING}
              isLoggedIn
            />
            <div style={{ marginTop: 20 }}>
              <PrizesBlock />
            </div>
          </div>
        </section>
      </main>
    </PlatformShell>
  );
}
