'server-only';

// Documentación interna del CRM que el asistente puede consultar para
// responder preguntas de funcionamiento del sistema.

export type HelpSection = {
  readonly topic: string;
  readonly content: string;
};

const HELP_SECTIONS: readonly HelpSection[] = [
  {
    topic: 'facturacion_general',
    content: `
El módulo de facturación de SocialPro gestiona dos tipos de facturas:
1. **Facturas legacy** (ingresos y gastos): registros internos de campaña y empresa.
2. **Facturas emitidas** (nueva arquitectura): facturas formales con emisor legal, cliente de facturación, líneas de concepto y PDF.

**Estados de factura:**
- borrador: creada pero no enviada
- emitida: generada formalmente
- enviada: enviada al cliente (email automático disponible)
- cobrada/pagada: importe recibido/pagado
- vencida: fecha de vencimiento superada sin cobro
- anulada: cancelada
- rectificada: existe una factura rectificativa asociada

**KPIs de facturación:** ingresos totales, gastos totales, resultado neto, facturas pendientes, vencidas y cobradas del periodo.
    `.trim(),
  },
  {
    topic: 'campanas',
    content: `
Los **Tratos (campañas)** en SocialPro son los contratos comerciales entre marcas y creadores.

**Ciclo de vida:**
propuesta → negociación → aprobada → activa → completada → pagada
(también: cancelada)

**Campos clave:**
- amountBrand: presupuesto acordado con la marca (lo que cobra la agencia)
- amountTalent: lo que se paga al talento
- Margen = (amountBrand - amountTalent) / amountBrand × 100
- cobroConfirmado: la marca ha pagado a la agencia
- pagoTalentConfirmado: la agencia ha pagado al talento
- cnmcChecklistOk: se ha completado el checklist de publicidad transparente (CNMC)
    `.trim(),
  },
  {
    topic: 'marcas',
    content: `
Las **Marcas (brands)** son los clientes anunciantes de SocialPro.

**Estados de marca:**
lead → contactada → en_negociacion → activa → inactiva → perdida/pausada/cerrada

Para vincular una marca con una factura: usa "relatedBrandId" en facturas emitidas o "brandId" en facturas legacy.

Los **Billing Clients** son las entidades fiscales de las marcas para emitir facturas formales.
    `.trim(),
  },
  {
    topic: 'talentos',
    content: `
Los **Talentos** son los creadores de contenido representados por SocialPro.

Datos relevantes:
- plataforma: twitch o youtube (principal)
- taxType: autonomo_es | sl_sa | latam | no_residente (afecta a retenciones fiscales)
- cnmcStatus: estado de registro en CNMC (publicidad transparente)
- Los talentos tienen gastos asociados (pago por campaña) y facturas vinculadas

Para ver el rendimiento financiero de un talento: revisar campañas donde talentId = id del talento y las facturas asociadas.
    `.trim(),
  },
  {
    topic: 'gastos_recurrentes',
    content: `
Los **Gastos Recurrentes** son suscripciones y pagos fijos mensuales de la agencia.

Categorías habituales: Software, Laboral, Fiscal, Bancario, Marketing, Hosting.

Se activan el día del mes configurado (dayOfMonth). Solo los activos se contabilizan en el P&L mensual.
Para ver el resumen mensual de gastos fijos: módulo Gastos en el admin.
    `.trim(),
  },
  {
    topic: 'pl_dashboard',
    content: `
El **P&L (Profit & Loss)** consolida ingresos y gastos de todos los módulos.

**Ingresos = facturas con kind='income' y status IN ('cobrada','pagada')**
**Gastos = facturas con kind='expense' + gastos recurrentes del periodo**
**Resultado = Ingresos - Gastos**

El dashboard de P&L está en /admin/pl y muestra evolución mensual, desglose por categoría y comparativa con periodo anterior.

NOTA: campaigns.amountBrand es el presupuesto previsto, NO los pagos reales. Los pagos reales se reflejan en facturas con campaignId vinculado.
    `.trim(),
  },
  {
    topic: 'sistema_archivos',
    content: `
Los **Archivos** en SocialPro se guardan en Vercel Blob Storage.

Tipos de archivo: invoice (factura), statement (extracto), contract (contrato), briefing, geo_stats, receipt (recibo), other.

Los archivos se vinculan a entidades mediante relatedType + relatedId (polimórfico).
Para facturas emitidas: el PDF se genera automáticamente y se sube a Blob.
    `.trim(),
  },
];

export function getCrmHelpContext(topic?: string): readonly HelpSection[] {
  if (topic) {
    const match = HELP_SECTIONS.filter((s) =>
      s.topic.includes(topic.toLowerCase()) || topic.toLowerCase().includes(s.topic),
    );
    if (match.length > 0) return match;
  }
  return HELP_SECTIONS;
}

export function getHelpContextText(topic?: string): string {
  const sections = getCrmHelpContext(topic);
  return sections.map((s) => `## ${s.topic}\n${s.content}`).join('\n\n');
}
