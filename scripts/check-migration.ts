import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

async function main(): Promise<void> {
  try {
    const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }

  const sql = neon(process.env.DATABASE_URL!);

  // Simular la query COMPLETA que hace listInvoices (incluyendo campaigns join)
  try {
    const rows = await sql`
      SELECT i.id, i.scope, i.kind, i.concept, i.total_amount, i.status,
             b.name AS brand_name, t.name AS talent_name, c.name AS campaign_name
      FROM invoices i
      LEFT JOIN crm_brands b ON b.id = i.brand_id
      LEFT JOIN talents t ON t.id = i.talent_id
      LEFT JOIN campaigns c ON c.id = i.campaign_id
      WHERE i.talent_id = 5
        AND i.status != 'anulada'
      ORDER BY i.issue_date DESC, i.id DESC
    `;
    console.log(`listInvoices(talentId=5) con campaigns join: OK — ${rows.length} rows`);
  } catch (e) {
    console.log('listInvoices ERROR:', (e as Error).message);
  }

  // Simular la query getBillingKPIs
  try {
    const [row] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN kind='expense' AND scope='campaign' AND status!='anulada' THEN total_amount ELSE 0 END),0)::text AS gastos_campana,
        COALESCE(SUM(CASE WHEN kind='expense' AND scope='company' AND status!='anulada' THEN total_amount ELSE 0 END),0)::text AS gastos_empresa
      FROM invoices
    `;
    console.log(`getBillingKPIs: OK — gastosCampana=${row.gastos_campana}, gastosEmpresa=${row.gastos_empresa}`);
  } catch (e) {
    console.log('getBillingKPIs ERROR:', (e as Error).message);
  }

  // Test listCampaigns for talent 5
  try {
    const rows = await sql`
      SELECT id, name, status FROM campaigns WHERE talent_id = 5 LIMIT 5
    `;
    console.log(`listCampaigns(talentId=5): OK — ${rows.length} rows`);
  } catch (e) {
    console.log('listCampaigns ERROR:', (e as Error).message);
  }

  // Test columnas de 0079: amount_in_kind_talent y amount_in_kind_community
  try {
    await sql`SELECT amount_in_kind_talent, amount_in_kind_community FROM campaigns LIMIT 1`;
    console.log('migración 0079 (amount_in_kind_talent): OK — columnas existen');
  } catch (e) {
    console.log('migración 0079 ERROR:', (e as Error).message);
  }

  // Verificar datos migrados y ausencia de columna vieja
  try {
    const rows = await sql`
      SELECT id, name, amount_in_kind_talent, amount_in_kind_community
      FROM campaigns
      WHERE amount_in_kind_talent IS NOT NULL AND amount_in_kind_talent != '0'
      LIMIT 5
    `;
    console.log(`datos migrados amount_in_kind_talent != NULL/0: ${rows.length} filas`);
    for (const r of rows) {
      console.log(`  campaña ${r.id} "${r.name}": talent=${r.amount_in_kind_talent}, community=${r.amount_in_kind_community ?? 'NULL'}`);
    }
  } catch (e) {
    console.log('check datos ERROR:', (e as Error).message);
  }

  // Confirmar que amount_in_kind (nombre viejo) ya no existe
  try {
    await sql`SELECT amount_in_kind FROM campaigns LIMIT 1`;
    console.log('ADVERTENCIA: columna antigua amount_in_kind TODAVÍA EXISTE');
  } catch (e) {
    console.log('columna antigua amount_in_kind: correctamente eliminada (no existe)');
  }

  // Confirmar que listCampaigns completo (SELECT *) funciona
  try {
    const rows = await sql`SELECT * FROM campaigns WHERE talent_id = 5 LIMIT 1`;
    console.log(`SELECT * FROM campaigns: OK — ${rows.length} filas`);
  } catch (e) {
    console.log('SELECT * campaigns ERROR:', (e as Error).message);
  }

  // Test getTalentLiveStatus
  try {
    const rows = await sql`
      SELECT talent_id, is_live, platform FROM talent_live_status WHERE talent_id = 5 LIMIT 1
    `;
    console.log(`getTalentLiveStatus(5): OK — ${rows.length > 0 ? 'has status' : 'no status (null expected)'}`);
  } catch (e) {
    console.log('getTalentLiveStatus ERROR:', (e as Error).message);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
