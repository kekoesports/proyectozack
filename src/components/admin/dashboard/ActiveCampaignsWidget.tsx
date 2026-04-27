import { KpiCard } from '@/components/admin/ui/KpiCard';

type Props = {
  readonly count: number;
};

export function ActiveCampaignsWidget({ count }: Props): React.ReactElement {
  return (
    <KpiCard
      title="Campañas activas"
      value={count}
      tone={count > 0 ? 'success' : 'neutral'}
      href="/admin/campanas?status=activa"
    />
  );
}
