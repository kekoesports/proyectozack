import type { GiveawayWithTalent, CreatorCodeWithTalent, GiveawayWinnerWithGiveaway } from '@/types';

type Props = {
  readonly giveaways: readonly GiveawayWithTalent[];
  readonly codes:     readonly CreatorCodeWithTalent[];
  readonly winners:   readonly GiveawayWinnerWithGiveaway[];
};

function isActive(endsAt: Date | null): boolean {
  return endsAt === null || new Date(endsAt) > new Date();
}

type StatCardProps = {
  readonly label: string;
  readonly value: number | string;
  readonly icon?: React.ReactNode;
};

function StatCard({ label, value, icon }: StatCardProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border p-5 flex flex-col gap-2">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-sp-admin-bg flex items-center justify-center text-sp-admin-muted">
          {icon}
        </div>
      )}
      <p className="text-[11px] font-bold uppercase tracking-wider text-sp-admin-muted">{label}</p>
      <p className="font-display text-3xl font-black text-sp-admin-text leading-none">{value}</p>
    </div>
  );
}

export function StatsCards({ giveaways, codes, winners }: Props): React.ReactElement {
  const activeGiveaways = giveaways.filter((g) => isActive(g.endsAt)).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Sorteos activos"
        value={activeGiveaways}
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.615Z" />
            <path fillRule="evenodd" d="M9.99 1.012a8.988 8.988 0 1 0 0 17.976 8.988 8.988 0 0 0 0-17.976ZM4.51 9c0-2.491 2.017-4.5 4.51-4.5v-1A5.5 5.5 0 0 0 3.51 9h1Zm4.51 4.5v1a5.5 5.5 0 0 0 5.48-5.5h-1c0 2.491-2.018 4.5-4.48 4.5Zm0-9v1.5A2.5 2.5 0 0 1 11.5 9h1A3.5 3.5 0 0 0 9.02 4.5v0Zm0 9V12a2.5 2.5 0 0 1-2.5-2.5H5a3.5 3.5 0 0 0 4.02 3h0Z" clipRule="evenodd" />
          </svg>
        }
      />
      <StatCard
        label="Sorteos totales"
        value={giveaways.length}
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path d="M3 4a1 1 0 0 0-1 1v1h16V5a1 1 0 0 0-1-1H3ZM2 9.5v5.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5H2Zm5 3.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5Z" />
          </svg>
        }
      />
      <StatCard
        label="Códigos"
        value={codes.length}
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25Zm4.03 6.28a.75.75 0 0 0-1.06-1.06L4.97 9.47a.75.75 0 0 0 0 1.06l2.25 2.25a.75.75 0 0 0 1.06-1.06L6.56 10l1.72-1.72Zm4.5-1.06a.75.75 0 1 0-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06l2.25-2.25a.75.75 0 0 0 0-1.06l-2.25-2.25Z" clipRule="evenodd" />
          </svg>
        }
      />
      <StatCard
        label="Ganadores"
        value={winners.length}
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path fillRule="evenodd" d="M10 1c-1.828 0-3.623.149-5.371.435a.75.75 0 0 0-.629.74v.387c-.827.157-1.642.345-2.445.561a.75.75 0 0 0-.552.698 5 5 0 0 0 4.503 5.152 6 6 0 0 0 2.946 1.822A6.451 6.451 0 0 1 7.768 13H7.5A1.5 1.5 0 0 0 6 14.5V17h-.75a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5H14v-2.5A1.5 1.5 0 0 0 12.5 13h-.268a6.453 6.453 0 0 1-.684-2.202 6 6 0 0 0 2.946-1.822 5 5 0 0 0 4.503-5.152.75.75 0 0 0-.552-.698A31.804 31.804 0 0 0 16 2.562v-.387a.75.75 0 0 0-.629-.74A33.227 33.227 0 0 0 10 1ZM2.525 4.422C3.012 4.3 3.504 4.19 4 4.09V5c0 .74.134 1.448.38 2.103a3.503 3.503 0 0 1-1.855-2.68Zm14.95 0a3.503 3.503 0 0 1-1.854 2.68C15.866 6.449 16 5.74 16 5v-.91c.496.099.988.21 1.475.332Z" clipRule="evenodd" />
          </svg>
        }
      />
    </div>
  );
}
