import { requirePermission } from '@/lib/permissions';
import { PlaceholderSection } from '@/features/admin/finance-dashboard/components/PlaceholderSection';

export const metadata = { title: 'Documentos · Finanzas' };

export default async function FinanzasDocumentosPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');
  return (
    <PlaceholderSection
      icon="📁"
      title="Documentos"
      subtitle="Centro documental financiero: facturas, tickets, nóminas, contratos, extractos, impuestos."
      bullets={[
        'Tipos: factura emitida / recibida, ticket, nómina, justificante, contrato, extracto, impuesto.',
        'Estados: pendiente de revisar, clasificado, validado, contabilizado, duplicado, rechazado.',
        'Funciones: upload PDF, preview, extracción OCR, clasificación manual, asociación a marca/campaña/talento.',
        'Se apoyará en la tabla polimórfica `files` existente + adjuntos actuales de invoices.',
      ]}
      relatedLinks={[
        { href: '/admin/facturacion/import', label: 'Importar factura PDF (IA)' },
        { href: '/admin/finanzas/nominas/importar', label: 'Importar nóminas' },
      ]}
    />
  );
}
