/**
 * Exporta las tablas críticas del CRM como JSON estructurado.
 * Solo lectura — nunca modifica datos.
 */
import { db } from '@/lib/db';
import {
  campaigns, crmBrands, crmBrandContacts, crmBrandFollowups,
  crmTasks, crmTaskTemplates,
  invoices, issuedInvoices, issuedInvoiceLines, billingClients, issuerCompanies,
  talents, talentSocials, talentBusiness,
  posts, caseStudies,
} from '@/db/schema';

export type BackupMeta = {
  readonly version:    string;
  readonly createdAt:  string;
  readonly tables:     string[];
  readonly totalRows:  number;
};

export type CrmBackup = {
  readonly meta:               BackupMeta;
  readonly campaigns:          unknown[];
  readonly crmBrands:          unknown[];
  readonly crmBrandContacts:   unknown[];
  readonly crmBrandFollowups:  unknown[];
  readonly crmTasks:           unknown[];
  readonly crmTaskTemplates:   unknown[];
  readonly invoices:           unknown[];
  readonly issuedInvoices:     unknown[];
  readonly issuedInvoiceLines: unknown[];
  readonly billingClients:     unknown[];
  readonly issuerCompanies:    unknown[];
  readonly talents:            unknown[];
  readonly talentSocials:      unknown[];
  readonly talentBusiness:     unknown[];
  readonly posts:              unknown[];
  readonly caseStudies:        unknown[];
};

export async function exportCrmData(): Promise<CrmBackup> {
  const [
    campaignRows,
    brandRows,
    contactRows,
    followupRows,
    taskRows,
    templateRows,
    invoiceRows,
    issuedRows,
    issuedLineRows,
    clientRows,
    issuerRows,
    talentRows,
    socialRows,
    businessRows,
    postRows,
    caseRows,
  ] = await Promise.all([
    db.select().from(campaigns),
    db.select().from(crmBrands),
    db.select().from(crmBrandContacts),
    db.select().from(crmBrandFollowups),
    db.select().from(crmTasks),
    db.select().from(crmTaskTemplates),
    db.select().from(invoices),
    db.select().from(issuedInvoices),
    db.select().from(issuedInvoiceLines),
    db.select().from(billingClients),
    db.select().from(issuerCompanies),
    db.select().from(talents),
    db.select().from(talentSocials),
    db.select().from(talentBusiness),
    db.select().from(posts),
    db.select().from(caseStudies),
  ]);

  const tables = [
    'campaigns', 'crmBrands', 'crmBrandContacts', 'crmBrandFollowups',
    'crmTasks', 'crmTaskTemplates',
    'invoices', 'issuedInvoices', 'issuedInvoiceLines',
    'billingClients', 'issuerCompanies',
    'talents', 'talentSocials', 'talentBusiness',
    'posts', 'caseStudies',
  ];

  const totalRows = [
    campaignRows, brandRows, contactRows, followupRows,
    taskRows, templateRows,
    invoiceRows, issuedRows, issuedLineRows,
    clientRows, issuerRows,
    talentRows, socialRows, businessRows,
    postRows, caseRows,
  ].reduce((s, arr) => s + arr.length, 0);

  return {
    meta: {
      version:   '1.0',
      createdAt: new Date().toISOString(),
      tables,
      totalRows,
    },
    campaigns:          campaignRows,
    crmBrands:          brandRows,
    crmBrandContacts:   contactRows,
    crmBrandFollowups:  followupRows,
    crmTasks:           taskRows,
    crmTaskTemplates:   templateRows,
    invoices:           invoiceRows,
    issuedInvoices:     issuedRows,
    issuedInvoiceLines: issuedLineRows,
    billingClients:     clientRows,
    issuerCompanies:    issuerRows,
    talents:            talentRows,
    talentSocials:      socialRows,
    talentBusiness:     businessRows,
    posts:              postRows,
    caseStudies:        caseRows,
  };
}

export function serializeBackup(data: CrmBackup): string {
  return JSON.stringify(data, null, 2);
}

export function buildBackupFileName(type: 'diario' | 'semanal' | 'manual'): string {
  const now  = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '-');
  return `socialpro-backup-${type}-${date}-${time}.json`;
}
