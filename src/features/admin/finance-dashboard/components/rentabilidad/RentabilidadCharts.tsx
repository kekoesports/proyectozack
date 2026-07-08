'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RentabilidadCharts as RentabilidadChartsData } from '@/lib/queries/financeDashboard/rentabilidad';

const EUR         = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EUR_COMPACT = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact' });

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function truncateLabel(s: string, max = 22): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

// ── Chart wrapper card ────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  isEmpty,
  emptyLabel,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly isEmpty: boolean;
  readonly emptyLabel: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
      <h3 className="text-sm font-bold text-sp-admin-fg">{title}</h3>
      <p className="text-[11px] text-sp-admin-muted mt-0.5 mb-3">{subtitle}</p>
      {isEmpty ? (
        <div className="h-52 flex items-center justify-center text-[12px] text-sp-admin-muted italic">
          {emptyLabel}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────

export function RentabilidadChartsBlock({ charts }: { readonly charts: RentabilidadChartsData }): React.ReactElement {
  const ivc = charts.ingresosVsCostesTop15.map((r) => ({
    name:     truncateLabel(r.name),
    fullName: r.name,
    Ingresos: safeNumber(r.ingresosReales),
    Costes:   safeNumber(r.costesReales),
  }));

  const marca = charts.margenPorMarcaTop10.map((r) => ({
    brandName:     truncateLabel(r.brandName, 26),
    fullBrandName: r.brandName,
    margenReal:    safeNumber(r.margenReal),
  }));

  const talentos = charts.talentosPorCosteTop10.map((r) => ({
    talentName:     truncateLabel(r.talentName, 26),
    fullTalentName: r.talentName,
    costeReal:      safeNumber(r.costeReal),
  }));

  const dist = [
    { name: 'Rentables',   value: charts.distribucionMargen.rentable,  fill: '#16a34a' },
    { name: 'Margen bajo', value: charts.distribucionMargen.bajo,      fill: '#f59e0b' },
    { name: 'Negativas',   value: charts.distribucionMargen.negativo,  fill: '#ef4444' },
    { name: 'Sin datos',   value: charts.distribucionMargen.sinDatos,  fill: '#94a3b8' },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Ingresos vs costes por campaña ─────────────────────────────── */}
      <ChartCard
        title="Ingresos vs costes por campaña"
        subtitle="Top 15 por volumen económico total (ingresos + costes)."
        isEmpty={ivc.length === 0}
        emptyLabel="Sin campañas con actividad económica en el período."
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={ivc} margin={{ top: 8, right: 8, left: 0, bottom: 42 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: '#a8a39d' }}
              interval={0}
              angle={-30}
              textAnchor="end"
              tickLine={false}
              height={60}
            />
            <YAxis
              tickFormatter={(v) => EUR_COMPACT.format(safeNumber(v))}
              tick={{ fontSize: 10, fill: '#a8a39d' }}
              tickLine={false}
              width={60}
            />
            <Tooltip
              formatter={(value, name) => [EUR.format(safeNumber(value)), String(name)]}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as { fullName?: string } | undefined;
                return item?.fullName ?? '';
              }}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Ingresos" fill="#16a34a" />
            <Bar dataKey="Costes"   fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Margen bruto por marca ─────────────────────────────────────── */}
      <ChartCard
        title="Margen bruto por marca"
        subtitle="Top 10 por margen real (ingresos − costes) agregado por marca."
        isEmpty={marca.length === 0}
        emptyLabel="Sin marcas con margen registrado en el período."
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={marca} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
            <XAxis
              type="number"
              tickFormatter={(v) => EUR_COMPACT.format(safeNumber(v))}
              tick={{ fontSize: 10, fill: '#a8a39d' }}
              tickLine={false}
            />
            <YAxis
              dataKey="brandName"
              type="category"
              tick={{ fontSize: 10, fill: '#a8a39d' }}
              tickLine={false}
              width={110}
            />
            <Tooltip
              formatter={(value) => EUR.format(safeNumber(value))}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as { fullBrandName?: string } | undefined;
                return item?.fullBrandName ?? '';
              }}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }}
            />
            <Bar dataKey="margenReal" name="Margen real">
              {marca.map((m, i) => (
                <Cell key={i} fill={m.margenReal >= 0 ? '#16a34a' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Top talentos por coste ────────────────────────────────────── */}
      <ChartCard
        title="Top talentos por coste real"
        subtitle="Pagos a talento agregados por persona, top 10."
        isEmpty={talentos.length === 0}
        emptyLabel="Sin pagos a talentos registrados en el período."
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={talentos} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
            <XAxis
              type="number"
              tickFormatter={(v) => EUR_COMPACT.format(safeNumber(v))}
              tick={{ fontSize: 10, fill: '#a8a39d' }}
              tickLine={false}
            />
            <YAxis
              dataKey="talentName"
              type="category"
              tick={{ fontSize: 10, fill: '#a8a39d' }}
              tickLine={false}
              width={110}
            />
            <Tooltip
              formatter={(value) => EUR.format(safeNumber(value))}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as { fullTalentName?: string } | undefined;
                return item?.fullTalentName ?? '';
              }}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }}
            />
            <Bar dataKey="costeReal" name="Coste real" fill="#e03070" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Distribución de margen % por bandas ────────────────────────── */}
      <ChartCard
        title="Distribución de campañas por banda de margen"
        subtitle="Cuántas campañas caen en cada zona (rentable, bajo, negativo, sin datos)."
        isEmpty={dist.length === 0}
        emptyLabel="Sin datos suficientes para calcular la distribución."
      >
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={dist}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={2}
            >
              {dist.map((d, idx) => <Cell key={idx} fill={d.fill} />)}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${safeNumber(value)} camp.`, String(name)]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
