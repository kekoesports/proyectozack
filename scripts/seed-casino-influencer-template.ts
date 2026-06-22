/**
 * Inserta el Contrato de Prestación de Servicios Publicitarios (casino/iGaming)
 * como template de tipo 'casino' en la BD.
 * Ejecutar una sola vez: npx tsx scripts/seed-casino-influencer-template.ts
 *
 * Basado en el contrato real SOCIALPRO ↔ María Julissa / 1WIN (25/05/2026).
 *
 * Variables que cambian por contrato:
 *   {{today}}               — fecha de firma
 *   {{influencer_name}}     — nombre completo de la creadora
 *   {{influencer_address}}  — domicilio de la creadora
 *   {{brand_name}}          — marca/plataforma anunciante (ej. 1WIN)
 *   {{deliverables}}        — entregables acordados (ej. "12 reels / 1 reel semanal / 3 meses")
 *   {{amount_per_unit}}     — precio por entregable (ej. "6.000 USD por cada reel publicado")
 *   {{total_amount}}        — importe total en cifra y letra
 *   {{payment_terms}}       — método de pago (ej. USDT/TRC20, transferencia, etc.)
 *   {{influencer_channel}}  — URL del canal de publicación
 *   {{exclusivity}}         — sector en exclusividad temporal (ej. "casino online")
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { contractTemplates } from '../src/db/schema/contractTemplates';
import { eq } from 'drizzle-orm';

// Cargar .env.local
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

const TEMPLATE_NAME = 'Contrato de Servicios Publicitarios — Casino / iGaming (SocialPro)';

const CONTENT = `CONTRATO DE PRESTACIÓN DE SERVICIOS PUBLICITARIOS

REUNIDOS

De una parte,

ELEVATEX AGENCY PA S.L., comercialmente conocida como "SOCIALPRO", con CIF B21821046 y domicilio en Calle Teruel 19 3º3, Córdoba, España, en adelante "SOCIALPRO".

Y de otra,

{{influencer_name}}, con domicilio en {{influencer_address}}, en adelante "LA CREADORA".

Ambas partes, reconociéndose capacidad legal suficiente, acuerdan celebrar el presente contrato de colaboración publicitaria.

---

1. OBJETO DEL CONTRATO

LA CREADORA realizará acciones promocionales y publicitarias para la marca y plataforma "{{brand_name}}" mediante la creación y publicación de contenido en sus redes sociales.

El presente acuerdo contempla:

{{deliverables}}

---

2. REMUNERACIÓN

SOCIALPRO abonará a LA CREADORA la cantidad de:

{{amount_per_unit}}

El importe total estimado del acuerdo asciende a:

{{total_amount}}

Los pagos serán realizados mediante {{payment_terms}}.

---

3. APROBACIÓN DEL CONTENIDO Y METODOLOGÍA DE PUBLICACIÓN

LA CREADORA deberá enviar previamente cada pieza de contenido en formato draft/borrador para revisión y aprobación de SOCIALPRO y/o de {{brand_name}}.

Una vez aprobado el contenido, ambas partes coordinarán la fecha de publicación correspondiente.

LA CREADORA se compromete a publicar el contenido aprobado en la fecha acordada, respetando:

- códigos promocionales,
- llamadas a la acción,
- y requisitos básicos de la campaña.

SOCIALPRO y el anunciante podrán solicitar hasta un máximo de 2 modificaciones antes de la aprobación final del contenido.

La esencia y estilo personal de LA CREADORA será respetado en todo momento.

---

4. PLAZOS Y CONDICIONES DE PAGO

Primer entregable

El primer entregable será abonado íntegramente tras su correcta publicación conforme a las condiciones acordadas.

Entregables restantes

Para los entregables restantes, el pago se realizará de la siguiente manera:

- 50% del importe correspondiente tras la aprobación del draft/borrador
- 50% restante tras la correcta publicación del contenido aprobado

LA CREADORA deberá recibir los pagos correspondientes en un plazo máximo de 48 horas desde el momento en que se cumplan las condiciones indicadas anteriormente.

En caso de retraso en los pagos pendientes correspondientes a contenido ya aprobado o publicado, LA CREADORA tendrá derecho a pausar temporalmente futuras publicaciones pendientes hasta regularizar la situación.

---

5. PERMANENCIA DEL CONTENIDO Y ESTADÍSTICAS

LA CREADORA se compromete a mantener visibles y públicos todos los contenidos publicados en virtud del presente acuerdo durante un período mínimo de 4 meses desde la fecha de publicación.

La publicación deberá mantenerse correctamente visible y contener los enlaces, códigos y elementos acordados en el momento de publicación.

La eliminación, archivado, ocultación o modificación sustancial del contenido antes de dicho plazo requerirá autorización previa y por escrito de SOCIALPRO.

En caso de eliminación injustificada antes del período mínimo acordado, SOCIALPRO podrá solicitar la devolución proporcional del importe abonado correspondiente a dicha publicación.

La presente obligación no aplicará en casos de eliminación por causas ajenas al control de LA CREADORA, incluyendo restricciones, sanciones o eliminaciones realizadas por plataformas digitales.

Asimismo, LA CREADORA se compromete a facilitar a SOCIALPRO las estadísticas y métricas de cada publicación realizada para {{brand_name}}, incluyendo:

- alcance,
- visualizaciones,
- interacciones,
- y cualquier otra métrica relevante disponible en la plataforma.

---

6. EXCLUSIVIDAD

El presente acuerdo NO implica exclusividad general.

Sin embargo, con el objetivo de respetar el espacio publicitario y visibilidad de la campaña de {{brand_name}}, LA CREADORA se compromete a no promocionar plataformas competidoras directas de:

- {{exclusivity}}

durante el siguiente período:

- 1 día previo a cada publicación acordada,
- el día de publicación de la acción,
- y 1 día posterior a la publicación.

A efectos del presente acuerdo, no se considerarán competidores directos plataformas de videojuegos, marketplaces, skins, case opening o servicios ajenos al sector de apuestas deportivas y casino online.

Finalizada la campaña, dicha exclusividad dejará automáticamente de tener efecto.

---

7. OBLIGACIONES DE LA CREADORA

LA CREADORA se compromete a:

- Publicar el contenido en las fechas acordadas.
- Mantener una actitud profesional durante la campaña.
- No modificar enlaces o códigos sin autorización.
- Cumplir con las políticas de las plataformas utilizadas.
- Facilitar la comunicación necesaria para la correcta ejecución de la campaña.

LA CREADORA declara ser mayor de edad y tener plena capacidad legal para promocionar contenido relacionado con apuestas y plataformas de gambling conforme a la legislación aplicable en su país de residencia.

El canal para estas publicaciones deberá de ser: {{influencer_channel}}

El incumplimiento reiterado de fechas, entregas o requisitos esenciales de campaña por parte de LA CREADORA facultará a SOCIALPRO para pausar o cancelar publicaciones pendientes sin obligación de realizar pagos futuros correspondientes a contenido no publicado.

SOCIALPRO no será responsable por restricciones, bloqueos, shadowban o limitaciones aplicadas por plataformas externas.

---

8. MODIFICACIONES, PAUSAS Y CANCELACIÓN DE CAMPAÑA

LA CREADORA reconoce y acepta que SOCIALPRO actúa exclusivamente como intermediario comercial y agencia de representación entre la marca anunciante y el creador.

Las partes acuerdan mantener el cumplimiento íntegro de la campaña acordada, salvo en situaciones excepcionales que imposibiliten o dificulten razonablemente la correcta ejecución de la colaboración.

SOCIALPRO y/o el anunciante podrán pausar, reprogramar o cancelar parcialmente futuras publicaciones pendientes únicamente en casos como:

- retrasos reiterados en entregas o publicaciones acordadas,
- dificultades continuadas para coordinar fechas de publicación,
- incumplimiento repetido de instrucciones esenciales de campaña,
- necesidad reiterada de modificaciones por incumplimiento del briefing acordado,
- incumplimientos relacionados con menciones, llamadas a la acción o requisitos básicos previamente aprobados,
- ausencia total o significativamente anormal de registros, clics, actividad o depósitos derivados de la campaña durante un período continuado.

En cualquier caso, SOCIALPRO únicamente estará obligado a abonar aquellos contenidos efectivamente aprobados, publicados y pendientes de pago conforme a las condiciones del presente contrato.

LA CREADORA acepta expresamente que no podrá reclamar importes correspondientes a publicaciones futuras no realizadas tras una cancelación justificada conforme a los supuestos anteriores.

Asimismo, SOCIALPRO o el cliente {{brand_name}} podrán pausar temporalmente publicaciones pendientes mientras existan revisiones, cambios estratégicos o instrucciones pendientes por parte del anunciante.

---

9. USO DEL CONTENIDO

LA CREADORA autoriza a SOCIALPRO y a {{brand_name}} a mencionar y comunicar públicamente la colaboración realizada entre las partes, incluyendo el uso de su nombre artístico, imagen, capturas del contenido publicado y referencias comerciales relacionadas con la campaña, únicamente con fines promocionales, corporativos y de portfolio en redes sociales, presentaciones comerciales y página web de SOCIALPRO.

Asimismo, SOCIALPRO y {{brand_name}} podrán compartir o repostear el contenido original publicado por LA CREADORA durante la duración de la campaña y hasta 30 días posteriores a su finalización.

Cualquier uso comercial adicional o campañas publicitarias pagadas utilizando la imagen de LA CREADORA requerirán aprobación previa por escrito.

---

10. RELACIÓN ENTRE LAS PARTES

Las partes reconocen que la presente relación es exclusivamente de carácter mercantil y publicitario, sin que exista relación laboral, societaria o de dependencia entre SOCIALPRO y LA CREADORA.

---

11. RESPONSABILIDAD

SOCIALPRO actúa exclusivamente como intermediario comercial entre el anunciante y LA CREADORA.

SOCIALPRO no garantiza:

- resultados,
- conversiones,
- depósitos,
- visualizaciones,
- ingresos,
- ni métricas específicas derivadas de la campaña.

SOCIALPRO no será responsable por limitaciones algorítmicas, bloqueos, restricciones, eliminaciones de contenido o cualquier otra medida adoptada por plataformas digitales externas.

---

12. CONFIDENCIALIDAD

Las partes acuerdan mantener confidenciales:

- tarifas,
- condiciones económicas,
- métricas,
- estrategias,
- y cualquier información privada compartida durante la colaboración.

---

13. LEGISLACIÓN APLICABLE

El presente contrato se regirá conforme a la legislación española.

Para cualquier conflicto derivado del presente acuerdo, ambas partes se someten a los juzgados y tribunales de Córdoba, España.

---

14. ACEPTACIÓN

El presente contrato podrá firmarse electrónicamente y tendrá plena validez mediante aceptación escrita por correo electrónico, WhatsApp o firma digital.

SOCIALPRO

Nombre: Pablo Camacho Carrión
Cargo: Representante Legal
Fecha: {{today}}

Firma: _______________________________


LA CREADORA

Nombre: {{influencer_name}}
Fecha: {{today}}

Firma: _______________________________`;

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
      type:        'casino',
      description: 'Contrato de Servicios Publicitarios para campañas casino/iGaming. Basado en el contrato real SocialPro ↔ María Julissa / 1WIN (25/05/2026). 14 cláusulas ES: pago 50/50 draft+publicación, permanencia 4 meses, exclusividad ±1 día. Ley española, Córdoba.',
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
