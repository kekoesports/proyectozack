import * as fs from 'fs';
import * as path from 'path';
import { issuerCompanySchema } from '@/lib/schemas/issuedInvoice';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf-8');
}

describe('empresa emisora principal', () => {
  it('valida identidad mercantil internacional y el flag principal', () => {
    const result = issuerCompanySchema.safeParse({
      name: 'Example Media LLC',
      legalName: 'Example Media LLC',
      taxId: '00-0000000',
      country: 'United States',
      address: '100 Example Street',
      city: 'Sheridan',
      stateRegion: 'WY',
      postalCode: '82801',
      email: 'billing@example.com',
      phone: '+1 307 000 0000',
      registrationNumber: '2026-000000000',
      incorporationDate: '2026-03-16',
      defaultCurrency: 'EUR',
      invoiceSeriesPrefix: 'PM',
      isDefault: 'true',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(true);
      expect(result.data.stateRegion).toBe('WY');
      expect(result.data.incorporationDate).toBe('2026-03-16');
    }
  });

  it('rechaza una fecha de constitución con formato ambiguo', () => {
    const result = issuerCompanySchema.safeParse({
      name: 'Example Media LLC',
      defaultCurrency: 'EUR',
      invoiceSeriesPrefix: 'PM',
      incorporationDate: '16/03/2026',
    });

    expect(result.success).toBe(false);
  });

  it('ordena primero el emisor marcado explícitamente como principal', () => {
    const querySource = read('src/lib/queries/issuedInvoices.ts');
    expect(querySource).toMatch(
      /orderBy\(desc\(issuerCompanies\.isDefault\), asc\(issuerCompanies\.id\)\)/,
    );
  });

  it('usa la moneda del trato antes que la moneda por defecto del emisor', () => {
    const actionSource = read('src/app/admin/(dashboard)/campanas/create-invoice-from-deal.ts');
    expect(actionSource).toMatch(
      /campaign\.currency \|\| issuer\.defaultCurrency \|\| 'EUR'/,
    );
  });
});

describe('migración 0143 — datos fiscales del emisor', () => {
  const sql = read('drizzle/0143_issuer-company-default.sql');

  it('añade los campos mercantiles y un único emisor principal', () => {
    expect(sql).toMatch(/ADD COLUMN "state_region" varchar\(100\)/);
    expect(sql).toMatch(/ADD COLUMN "phone" varchar\(40\)/);
    expect(sql).toMatch(/ADD COLUMN "registration_number" varchar\(80\)/);
    expect(sql).toMatch(/ADD COLUMN "incorporation_date" date/);
    expect(sql).toMatch(/ADD COLUMN "is_default" boolean DEFAULT false NOT NULL/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "issuer_companies_single_default_uq"[\s\S]*WHERE is_default = true/);
  });

  it('no altera facturas históricas ni sus contadores', () => {
    expect(sql).not.toMatch(/issued_invoices/);
    expect(sql).not.toMatch(/next_invoice_number|next_rectification_number/);
    expect(sql).not.toMatch(/UPDATE\s+"issuer_companies"/i);
  });

  it('no publica datos de ninguna empresa real en el repositorio', () => {
    expect(sql).not.toMatch(/PLAYMAKER|ELEVATEX|Tax ID|EIN/i);
  });
});
