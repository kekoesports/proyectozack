/**
 * Inserta el Anexo de Prestación de Servicios Publicitarios (genérico)
 * como template de tipo 'general' en la BD.
 * Ejecutar una sola vez: npx tsx scripts/seed-anexo-campana-template.ts
 *
 * Se adjunta como complemento a cualquier contrato marco para detallar
 * los entregables concretos de cada campaña.
 *
 * Variables:
 *   {{brand_name}}          — nombre del cliente / empresa anunciante
 *   {{start_date}}          — fecha de inicio de la campaña
 *   {{campaign_duration}}   — duración total (ej. "3 meses" / "90 días")
 *   {{influencer_name}}     — nombre del creador
 *   {{deliverables}}        — canales y contenido acordado (texto libre)
 *   {{total_amount}}        — importe acordado
 *   {{payment_terms}}       — forma de pago
 *   {{publish_deadline}}    — plazo / fechas de publicación
 *   {{today}}               — fecha de firma
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { contractTemplates } from '../src/db/schema/contractTemplates';
import { eq } from 'drizzle-orm';

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* ok */ }

const TEMPLATE_NAME = 'Anexo de Prestación de Servicios Publicitarios (Campaña)';

const CONTENT = `ANEXO DE PRESTACIÓN DE SERVICIOS PUBLICITARIOS

Campaña para: {{brand_name}}

Fecha de inicio: {{start_date}}
Duración: {{campaign_duration}}

Creador: {{influencer_name}}

---

CANALES Y CONTENIDO ACORDADO

{{deliverables}}

---

CONDICIONES ESPECÍFICAS

- El contenido deberá permanecer publicado un mínimo de 3 años.
- El cliente podrá facilitar saldo, productos o acceso a la plataforma para realizar el contenido.
- Prohibida la promoción de marcas competidoras durante la vigencia del acuerdo.
- El Creador seguirá las instrucciones de la Agencia en la producción de los contenidos.

---

CONDICIONES ECONÓMICAS

Importe acordado: {{total_amount}}
Forma de pago: {{payment_terms}}
Plazo de publicación del contenido: {{publish_deadline}}

---

PENALIZACIONES

- Retirada anticipada del contenido: devolución proporcional o sustitución del contenido.
- Incumplimiento grave: penalización económica de hasta el 100% del valor acordado.

---

Firmado por ambas partes a {{today}}.

ELEVATEX AGENCY PA S.L. (SOCIALPRO)                    EL CREADOR

Nombre: Pablo Camacho Carrión                              Nombre: {{influencer_name}}
Cargo: Representante Legal

Firma: _______________________________          Firma: _______________________________`;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

  const sql = neon(url);
  const db  = drizzle(sql);

  const existing = await db
    .select({ id: contractTemplates.id })
    .from(contractTemplates)
    .where(eq(contractTemplates.name, TEMPLATE_NAME))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Template "${TEMPLATE_NAME}" ya existe (id=${existing[0]!.id}). No se ha modificado.`);
    return;
  }

  const [row] = await db
    .insert(contractTemplates)
    .values({
      name:        TEMPLATE_NAME,
      type:        'general',
      description: 'Anexo de campaña genérico (basado en Hexaboost SL). Se adjunta a cualquier contrato marco para detallar canales, entregables y condiciones económicas concretas. Permanencia mínima 3 años. Penalización hasta 100% por incumplimiento grave.',
      language:    'es',
      content:     CONTENT,
      isActive:    true,
    })
    .returning({ id: contractTemplates.id });

  console.log(`✓ Template insertado con id=${row?.id}`);
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
