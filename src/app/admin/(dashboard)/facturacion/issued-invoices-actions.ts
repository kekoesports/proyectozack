'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requirePermission } from '@/lib/permissions';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';
import {
  allocateInvoiceNumber,
  allocateRectificationNumber,
  createIssuedInvoice,
  updateIssuedInvoice,
  deleteIssuedInvoice,
  createBillingClient,
  updateBillingClient,
  updateIssuerCompany,
  getIssuedInvoice,
  getBillingClient,
  getIssuerCompany,
} from '@/lib/queries/issuedInvoices';
import { createInvoice, listInvoices } from '@/lib/queries/invoices';
import { sendInvoiceEmail } from '@/lib/email';
import { createTask } from '@/lib/queries/crmTasks';
import { getIsoWeekLabel } from '@/lib/utils/week';
import {
  createIssuedInvoiceSchema,
  updateIssuedInvoiceSchema,
  rectifyInvoiceSchema,
  billingClientSchema,
  issuerCompanySchema,
  ISSUED_INVOICE_STATUSES,
  type InvoiceLineInput,
} from '@/lib/schemas/issuedInvoice';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly id?: number };

const StatusSchema = z.enum(ISSUED_INVOICE_STATUSES);

const issuerCompanyWithIdSchema = issuerCompanySchema.extend({ id: IdSchema });
const billingClientWithIdSchema = billingClientSchema.extend({ id: IdSchema });

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function computeAmounts(lines: InvoiceLineInput[], vatRate: number, withholdingRate: number) {
  const netAmount = lines.reduce((s, l) => {
    const sub = Math.round(Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discount) / 100) * 100) / 100;
    return s + sub;
  }, 0);
  const vatAmount         = Math.round(netAmount * vatRate / 100 * 100) / 100;
  const withholdingAmount = Math.round(netAmount * withholdingRate / 100 * 100) / 100;
  const totalAmount       = netAmount + vatAmount - withholdingAmount;
  return {
    netAmount:         round2(netAmount),
    vatAmount:         round2(vatAmount),
    withholdingAmount: round2(withholdingAmount),
    totalAmount:       round2(totalAmount),
  };
}

const InvoiceLinesPayload = z.array(z.unknown()).min(1, 'La factura debe tener al menos una línea');

function parseLines(raw: string): InvoiceLineInput[] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    const arr = InvoiceLinesPayload.safeParse(data);
    if (!arr.success) return null;
    return arr.data as InvoiceLineInput[];
  } catch {
    return null;
  }
}

export async function createIssuedInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requirePermission('facturacion', 'read');

  const parsed = parseFormData(formData, createIssuedInvoiceSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[issued-invoices] createIssuedInvoice validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }

  const { linesJson, vatRate, withholdingRate, issuerCompanyId, ...invoiceData } = parsed.data;

  const lines = parseLines(linesJson);
  if (!lines || lines.length === 0) return { error: 'La factura debe tener al menos una línea' };

  const amounts = computeAmounts(lines, Number(vatRate), Number(withholdingRate));

  try {
    const invoiceNumber = await allocateInvoiceNumber(issuerCompanyId);
    const row = await createIssuedInvoice({
      invoice: {
        issuerCompanyId,
        billingClientId:   invoiceData.billingClientId,
        relatedBrandId:    invoiceData.relatedBrandId    ?? null,
        relatedTalentId:   invoiceData.relatedTalentId   ?? null,
        relatedDealId:     invoiceData.relatedDealId     ?? null,
        invoiceNumber,
        series:            invoiceNumber.split('-')[0] ?? null,
        status:            invoiceData.status,
        issueDate:         invoiceData.issueDate,
        dueDate:           invoiceData.dueDate ?? null,
        currency:          invoiceData.currency,
        vatRate,
        withholdingRate,
        ...amounts,
        paymentTerms:      invoiceData.paymentTerms ?? null,
        legalNote:         invoiceData.legalNote    ?? null,
        notes:             invoiceData.notes        ?? null,
        pdfUrl:            null,
        rectifiedInvoiceId:  null,
        rectificationType:   null,
        rectificationReason: null,
        createdByUserId:   session.user.id,
      },
      lines: lines.map((l) => ({
        concept:     l.concept,
        description: l.description ?? null,
        quantity:    l.quantity,
        unitPrice:   l.unitPrice,
        discount:    l.discount,
        subtotal:    l.subtotal,
      })),
    });
    revalidatePath('/admin/facturacion');
    return { success: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[issued-invoices] createIssuedInvoice error:', msg);
    if (msg.includes('duplicate') || msg.includes('unique')) return { error: 'El número de factura ya existe para esta empresa' };
    return { error: 'Error al crear la factura' };
  }
}

export async function updateIssuedInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('facturacion', 'read');

  const parsed = parseFormData(formData, updateIssuedInvoiceSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[issued-invoices] updateIssuedInvoice validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }

  const { id, linesJson, vatRate, withholdingRate, issuerCompanyId, ...invoiceData } = parsed.data;
  if (!id) return { error: 'ID requerido' };

  let lines: InvoiceLineInput[] | undefined;
  if (linesJson) {
    const parsedLines = parseLines(linesJson);
    if (!parsedLines) return { error: 'Error en líneas de factura' };
    lines = parsedLines;
  }

  const amounts = lines
    ? computeAmounts(lines, Number(vatRate ?? 0), Number(withholdingRate ?? 0))
    : {};

  try {
    await updateIssuedInvoice(
      id,
      {
        ...(issuerCompanyId && { issuerCompanyId }),
        relatedBrandId:  invoiceData.relatedBrandId  ?? null,
        relatedTalentId: invoiceData.relatedTalentId ?? null,
        relatedDealId:   invoiceData.relatedDealId   ?? null,
        ...(invoiceData.issueDate && { issueDate: invoiceData.issueDate }),
        dueDate:         invoiceData.dueDate ?? null,
        ...(invoiceData.currency   && { currency:        invoiceData.currency }),
        ...(invoiceData.status     && { status:          invoiceData.status }),
        ...(vatRate                && { vatRate }),
        ...(withholdingRate        && { withholdingRate }),
        ...amounts,
        paymentTerms:    invoiceData.paymentTerms ?? null,
        legalNote:       invoiceData.legalNote    ?? null,
        notes:           invoiceData.notes        ?? null,
      },
      lines?.map((l) => ({
        concept:     l.concept,
        description: l.description ?? null,
        quantity:    l.quantity,
        unitPrice:   l.unitPrice,
        discount:    l.discount,
        subtotal:    l.subtotal,
      })),
    );
    revalidatePath('/admin/facturacion');
    return { success: true, id };
  } catch (err) {
    logRedacted('error', '[issued-invoices] updateIssuedInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar la factura' };
  }
}

export async function updateInvoiceStatusAction(id: number, status: string): Promise<ActionState> {
  const idCheck = IdSchema.safeParse(id);
  if (!idCheck.success) return { error: 'ID inválido' };
  const statusCheck = StatusSchema.safeParse(status);
  if (!statusCheck.success) return { error: 'Estado inválido' };

  // Anular requiere admin; el resto pueden hacerlo admin y staff
  const session = statusCheck.data === 'anulada'
    ? await requirePermission('facturacion', 'delete')
    : await requirePermission('facturacion', 'read');

  try {
    await updateIssuedInvoice(idCheck.data, { status: statusCheck.data });

    const inv = await getIssuedInvoice(idCheck.data);

    if (statusCheck.data === 'emitida' && inv) {
      const weekLabel = getIsoWeekLabel(new Date());

      const dueDate = inv.dueDate
        ? new Date(inv.dueDate + 'T12:00:00').toISOString().slice(0, 10)
        : new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

      const amount = Number(inv.totalAmount ?? 0);
      const priority = amount >= 1000 ? 'alta' : 'media';

      await createTask({
        title:        `Cobrar factura — Factura ${inv.invoiceNumber}`,
        description:  `Factura emitida por ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: inv.currency ?? 'EUR' }).format(amount)}. Vence: ${dueDate}.`,
        ownerId:      session.user.id,
        assignedToUserId: session.user.id,
        createdByUserId:  session.user.id,
        priority,
        status:       'pendiente',
        category:     'Facturación',
        weekLabel,
        dueDate,
        relatedType:  inv.relatedDealId ? 'campaign' : null,
        relatedId:    inv.relatedDealId ?? null,
        recurrenceTemplateId: null,
      });
    }

    if (statusCheck.data === 'enviada' && inv) {
      const [client, issuer] = await Promise.all([
        getBillingClient(inv.billingClientId),
        getIssuerCompany(inv.issuerCompanyId),
      ]);
      if (client?.email) {
        sendInvoiceEmail({
          clientEmail:   client.email,
          clientName:    client.legalName ?? client.name,
          issuerName:    issuer?.name ?? 'SocialPro',
          issuerEmail:   issuer?.email,
          invoiceNumber: inv.invoiceNumber,
          totalAmount:   String(inv.totalAmount ?? '0'),
          currency:      inv.currency ?? 'EUR',
          issueDate:     inv.issueDate ?? new Date().toISOString().slice(0, 10),
          dueDate:       inv.dueDate,
          paymentTerms:  inv.paymentTerms ?? issuer?.defaultPaymentTerms,
          bankDetails:   issuer?.bankDetails,
          legalNote:     inv.legalNote ?? issuer?.notes,
        }).catch((err: unknown) => {
          logRedacted('error', '[issued-invoices] sendInvoiceEmail error:', err instanceof Error ? err.message : 'unknown');
        });
      }
    }

    if (statusCheck.data === 'cobrada' && inv && Number(inv.totalAmount) > 0 && !inv.rectifiedInvoiceId) {
      const today     = new Date().toISOString().slice(0, 10);
      const conceptId = `Factura emitida — ${inv.invoiceNumber}`;

      const existingMov = await listInvoices({ search: inv.invoiceNumber });
      const duplicate   = existingMov.find(
        (m) => m.kind === 'income' && m.concept.includes(inv.invoiceNumber),
      );

      if (!duplicate) {
        await createInvoice({
          kind:            'income',
          scope:           inv.relatedDealId != null ? 'campaign' : 'company',
          concept:         conceptId,
          issueDate:       inv.issueDate ?? today,
          dueDate:         inv.dueDate  ?? undefined,
          paidDate:        today,
          status:          'cobrada',
          netAmount:       String(inv.netAmount       ?? inv.totalAmount),
          vatPct:          String(inv.vatRate          ?? '0'),
          withholdingPct:  String(inv.withholdingRate  ?? '0'),
          totalAmount:     String(inv.totalAmount),
          paidAmount:      String(inv.totalAmount),
          currency:        inv.currency  ?? 'EUR',
          series:          inv.series    ?? 'I',
          brandId:         inv.relatedBrandId  ?? undefined,
          talentId:        inv.relatedTalentId ?? undefined,
          campaignId:      inv.relatedDealId   ?? undefined,
          notes:           `Creado automáticamente al marcar cobrada la factura ${inv.invoiceNumber}`,
          createdByUserId: session.user.id,
        });
      }
    }

    revalidatePath('/admin/facturacion');
    if (inv?.relatedDealId) {
      revalidatePath(`/admin/campanas/${inv.relatedDealId}`);
    }
    return { success: true };
  } catch (err) {
    logRedacted('error', '[issued-invoices] updateInvoiceStatus error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar estado' };
  }
}

export async function deleteIssuedInvoiceAction(id: number): Promise<ActionState> {
  const idCheck = IdSchema.safeParse(id);
  if (!idCheck.success) return { error: 'ID inválido' };

  await requirePermission('facturacion', 'delete');

  try {
    const deleted = await deleteIssuedInvoice(idCheck.data);
    if (!deleted) return { error: 'Solo se pueden eliminar facturas en borrador o anuladas' };
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[issued-invoices] deleteIssuedInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al eliminar la factura' };
  }
}

export async function rectifyInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requirePermission('facturacion', 'read');

  const parsed = parseFormData(formData, rectifyInvoiceSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[issued-invoices] rectifyInvoice validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }

  const { originalInvoiceId, rectificationType, rectificationReason, issueDate, linesJson } = parsed.data;

  const lines = parseLines(linesJson);
  if (!lines || lines.length === 0) return { error: 'La factura rectificativa debe tener al menos una línea' };

  const original = await getIssuedInvoice(originalInvoiceId);
  if (!original) return { error: 'Factura original no encontrada' };
  if (original.status === 'anulada') return { error: 'No se puede rectificar una factura anulada' };
  if (original.status === 'rectificada') return { error: 'Esta factura ya tiene una rectificativa emitida' };

  try {
    const rectNumber = await allocateRectificationNumber(original.issuerCompanyId);

    const amounts = computeAmounts(
      lines,
      Number(original.vatRate ?? '0'),
      Number(original.withholdingRate ?? '0'),
    );

    const [newInvoice] = await Promise.all([
      createIssuedInvoice({
        invoice: {
          issuerCompanyId:     original.issuerCompanyId,
          billingClientId:     original.billingClientId,
          relatedBrandId:      original.relatedBrandId   ?? null,
          relatedTalentId:     original.relatedTalentId  ?? null,
          relatedDealId:       original.relatedDealId    ?? null,
          invoiceNumber:       rectNumber,
          series:              rectNumber.split('-').slice(0, 2).join('-'),
          status:              'emitida',
          issueDate,
          dueDate:             original.dueDate ?? null,
          currency:            original.currency ?? 'EUR',
          vatRate:             original.vatRate ?? '0',
          withholdingRate:     original.withholdingRate ?? '0',
          ...amounts,
          paymentTerms:        original.paymentTerms ?? null,
          legalNote:           original.legalNote ?? null,
          notes:               null,
          pdfUrl:              null,
          rectifiedInvoiceId:  originalInvoiceId,
          rectificationType,
          rectificationReason,
          createdByUserId:     session.user.id,
        },
        lines: lines.map((l) => ({
          concept:     l.concept,
          description: l.description ?? null,
          quantity:    l.quantity,
          unitPrice:   l.unitPrice,
          discount:    l.discount,
          subtotal:    l.subtotal,
        })),
      }),
    ]);

    // Marcar la original como rectificada
    await updateIssuedInvoice(originalInvoiceId, { status: 'rectificada' });

    revalidatePath('/admin/facturacion');
    return { success: true, id: newInvoice.id };
  } catch (err) {
    logRedacted('error', '[issued-invoices] rectifyInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al crear la factura rectificativa' };
  }
}

export async function createBillingClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission('facturacion', 'read');
  const parsed = parseFormData(formData, billingClientSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[issued-invoices] createBillingClient validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }
  try {
    const row = await createBillingClient({
      ...parsed.data,
      relatedBrandId:        parsed.data.relatedBrandId        ?? null,
      legalName:             parsed.data.legalName             ?? null,
      taxId:                 parsed.data.taxId                 ?? null,
      vatNumber:             parsed.data.vatNumber             ?? null,
      country:               parsed.data.country               ?? null,
      address:               parsed.data.address               ?? null,
      city:                  parsed.data.city                  ?? null,
      postalCode:            parsed.data.postalCode            ?? null,
      email:                 parsed.data.email                 ?? null,
      notes:                 parsed.data.notes                 ?? null,
    });
    revalidatePath('/admin/facturacion');
    return { success: true, id: row.id };
  } catch (err) {
    logRedacted('error', '[issued-invoices] createBillingClient error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al crear el cliente' };
  }
}

export async function updateIssuerCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission('facturacion', 'delete');
  const parsed = parseFormData(formData, issuerCompanyWithIdSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[issued-invoices] updateIssuerCompany validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }
  const { id, ...data } = parsed.data;
  try {
    await updateIssuerCompany(id, {
      ...data,
      legalName:           data.legalName           ?? null,
      taxId:               data.taxId               ?? null,
      country:             data.country             ?? null,
      address:             data.address             ?? null,
      city:                data.city                ?? null,
      postalCode:          data.postalCode          ?? null,
      email:               data.email               ?? null,
      defaultPaymentTerms: data.defaultPaymentTerms ?? null,
      bankDetails:         data.bankDetails         ?? null,
      cryptoDetails:       data.cryptoDetails       ?? null,
      notes:               data.notes               ?? null,
    });
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[issued-invoices] updateIssuerCompany error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar empresa emisora' };
  }
}

export async function updateBillingClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission('facturacion', 'read');
  const parsed = parseFormData(formData, billingClientWithIdSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[issued-invoices] updateBillingClient validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }
  const { id, ...data } = parsed.data;
  try {
    await updateBillingClient(id, {
      ...data,
      relatedBrandId:        data.relatedBrandId        ?? null,
      legalName:             data.legalName             ?? null,
      taxId:                 data.taxId                 ?? null,
      vatNumber:             data.vatNumber             ?? null,
      country:               data.country               ?? null,
      address:               data.address               ?? null,
      city:                  data.city                  ?? null,
      postalCode:            data.postalCode            ?? null,
      email:                 data.email                 ?? null,
      notes:                 data.notes                 ?? null,
    });
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[issued-invoices] updateBillingClient error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar el cliente' };
  }
}
