import { KpiCard } from '@/features/admin/_shared/components/KpiCard';

type Props = {
  readonly count: number;
};

/**
 * Widget KPI con el número de campañas activas, enlaza al listado filtrado.
 *
 * @kind server
 * @feature admin/dashboard
 * @route /admin
 */
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
