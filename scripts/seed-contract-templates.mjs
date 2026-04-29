import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

const TEMPLATE_ES = `CONTRATO DE SERVICIOS DE MARKETING DIGITAL
=========================================

Entre {{agency_entity}} (en adelante, "la Agencia"), con CIF {{agency_taxid}},
y {{brand_name}} (en adelante, "el Cliente"),

han acordado el siguiente contrato de servicios:

OBJETO
------
La Agencia prestará servicios de marketing digital a través del influencer
{{influencer_name}} (alias: @{{influencer_alias}}) para la campaña denominada
"{{campaign_name}}".

SECTOR: {{sector}}   |   GEO: {{geo}}

FECHAS
------
Fecha de inicio:       {{start_date}}
Fecha de finalización: {{end_date}}

ENTREGABLES
-----------
{{deliverables}}

CONDICIONES ECONÓMICAS
----------------------
Importe total acordado: {{total_amount}} {{currency}}
Comisión de agencia:    {{commission}} {{currency}}

NOTAS ADICIONALES
-----------------
{{campaign_notes}}

---
Las partes firman el presente contrato en señal de conformidad.

Por la Marca:                     Por la Agencia:
__________________________        __________________________
{{brand_name}}                    {{agency_name}}

Por el Influencer:
__________________________
{{influencer_name}}
`;

const TEMPLATE_EN = `MARKETING SERVICES AGREEMENT
============================

This agreement is entered into between:
  {{agency_entity}} ("Agency")
  and {{brand_name}} ("Client")

SERVICES
--------
Agency will provide digital marketing services through the creator
{{influencer_name}} (@{{influencer_alias}}) for the campaign "{{campaign_name}}".

SECTOR: {{sector}}   |   GEO: {{geo}}

TERM
----
Start date: {{start_date}}
End date:   {{end_date}}

DELIVERABLES
------------
{{deliverables}}

COMPENSATION
------------
Total amount: {{total_amount}} {{currency}}
Agency fee:   {{commission}} {{currency}}

ADDITIONAL NOTES
----------------
{{campaign_notes}}

---
This agreement is governed by applicable law.

Signature (Client):               Signature (Agency):
__________________________        __________________________
{{brand_name}}                    {{agency_name}}

Signature (Creator):
__________________________
{{influencer_name}}
`;

try {
  await sql`CREATE TABLE IF NOT EXISTS contract_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'service_agreement',
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`;
  console.log('✓ contract_templates');

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM contract_templates`;
  if (n === 0) {
    await sql`INSERT INTO contract_templates (name, type, content) VALUES
      (${'Contrato de servicios marketing (ES)'}, ${'service_agreement'}, ${TEMPLATE_ES}),
      (${'Marketing Services Agreement (EN)'},     ${'international'},       ${TEMPLATE_EN})`;
    console.log('✓ Plantillas base insertadas');
  } else {
    console.log('✓ Plantillas ya existen');
  }

  await sql`CREATE INDEX IF NOT EXISTS contract_templates_type_idx ON contract_templates (type)`;
  console.log('✓ Migración completada');
} catch (e) {
  console.error(e.message);
}
