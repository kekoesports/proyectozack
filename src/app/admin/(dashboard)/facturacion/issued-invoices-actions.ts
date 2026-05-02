'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, requireAnyRole } from '@/lib/auth-guard';
import {
  allocateInvoiceNumber,
  createIssuedInvoice,
  updateIssuedInvoice,
  createBillingClient,
  updateBillingClient,
  updateIssuerCompany,
  getIssuedInvoice,
} from '@/lib/queries/issuedInvoices';
import { createInvoice, listInvoices } from '@/lib/queries/invoices';
import { createTask } from '@/lib/queries/crmTasks';
import { getIsoWeekLabel } from '@/lib/utils/week';
import {
  createIssuedInvoiceSchema,
  updateIssuedInvoiceSchema,
  billingClientSchema,
  issuerCompanySchema,
  type InvoiceLineInput,
} from '@/lib/schemas/issuedInvoice';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly id?: number };

function formToObj(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (!(v instanceof File)) obj[k] = v;
  return obj;
}

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

export async function createIssuedInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = createIssuedInvoiceSchema.safeParse(formToObj(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { linesJson, vatRate, withholdingRate, issuerCompanyId, ...invoiceData } = parsed.data;

  let lines: InvoiceLineInput[];
  try {
    lines = JSON.parse(linesJson) as InvoiceLineInput[];
    if (!Array.isArray(lines) || lines.length === 0) return { error: 'La factura debe tener al menos una línea' };
  } catch {
    return { error: 'Error en líneas de factura' };
  }

  const vatRateNum         = Number(vatRate);
  const withholdingRateNum = Number(withholdingRate);
  const amounts = computeAmounts(lines, vatRateNum, withholdingRateNum);

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
    console.error('[admin] createIssuedInvoice error:', msg);
    if (msg.includes('duplicate') || msg.includes('unique')) return { error: 'El número de factura ya existe para esta empresa' };
    return { error: 'Error al crear la factura' };
  }
}

export async function updateIssuedInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = updateIssuedInvoiceSchema.safeParse(formToObj(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, linesJson, vatRate, withholdingRate, issuerCompanyId, ...invoiceData } = parsed.data;
  if (!id) return { error: 'ID requerido' };

  let lines: InvoiceLineInput[] | undefined;
  if (linesJson) {
    try {
      lines = JSON.parse(linesJson) as InvoiceLineInput[];
    } catch { return { error: 'Error en líneas de factura' }; }
  }

  const vatRateNum         = Number(vatRate ?? 0);
  const withholdingRateNum = Number(withholdingRate ?? 0);
  const amounts = lines ? computeAmounts(lines, vatRateNum, withholdingRateNum) : {};

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
    console.error('[admin] updateIssuedInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar la factura' };
  }
}

export async function updateInvoiceStatusAction(id: number, status: string): Promise<ActionState> {
  // Anular requiere admin; el resto pueden hacerlo admin y staff
  const session = status === 'anulada'
    ? await requireRole('admin', '/admin/login')
    : await requireAnyRole(['admin', 'staff'], '/admin/login');

  try {
    await updateIssuedInvoice(id, { status });

    const inv = await getIssuedInvoice(id);

    // ── FASE 2: al emitir factura → crear tarea "Cobrar factura" ──────
    if (status === 'emitida' && inv) {
      const weekLabel = getIsoWeekLabel(new Date());

      // Vencimiento: usar dueDate de la factura o +30 días
      const dueDate = inv.dueDate
        ? new Date(inv.dueDate + 'T12:00:00').toISOString().slice(0, 10)
        : new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

      const amount = Number(inv.totalAmount ?? 0);
      const priority = amount >= 1000 ? 'alta' : 'media';

      const clientLabel = inv.relatedBrandId ? `Factura ${inv.invoiceNumber}` : `Factura ${inv.invoiceNumber}`;

      await createTask({
        title:        `Cobrar factura — ${clientLabel}`,
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

    // ── FASE 3: al cobrar → crear movimiento financiero ───────────────
    if (status === 'cobrada' && inv && Number(inv.totalAmount) > 0) {
      const today     = new Date().toISOString().slice(0, 10);
      const conceptId = `Factura emitida — ${inv.invoiceNumber}`;

      const existingMov = await listInvoices({ search: inv.invoiceNumber });
      const duplicate   = existingMov.find(
        (m) => m.kind === 'income' && m.concept.includes(inv.invoiceNumber),
      );

      if (!duplicate) {
        await createInvoice({
          kind:            'income',
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
    console.error('[admin] updateInvoiceStatus error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar estado' };
  }
}

export async function createBillingClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const parsed = billingClientSchema.safeParse(formToObj(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
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
    console.error('[admin] createBillingClient error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al crear el cliente' };
  }
}

export async function updateIssuerCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole('admin', '/admin/login');
  const idRaw = formData.get('id');
  const id = idRaw ? Number(idRaw) : NaN;
  if (Number.isNaN(id)) return { error: 'ID inválido' };
  const parsed = issuerCompanySchema.safeParse(formToObj(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  try {
    await updateIssuerCompany(id, {
      ...parsed.data,
      legalName:           parsed.data.legalName           ?? null,
      taxId:               parsed.data.taxId               ?? null,
      country:             parsed.data.country             ?? null,
      address:             parsed.data.address             ?? null,
      city:                parsed.data.city                ?? null,
      postalCode:          parsed.data.postalCode          ?? null,
      email:               parsed.data.email               ?? null,
      defaultPaymentTerms: parsed.data.defaultPaymentTerms ?? null,
      bankDetails:         parsed.data.bankDetails         ?? null,
      cryptoDetails:       parsed.data.cryptoDetails       ?? null,
      notes:               parsed.data.notes               ?? null,
    });
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    console.error('[admin] updateIssuerCompany error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar empresa emisora' };
  }
}

export async function updateBillingClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const idRaw = formData.get('id');
  const id = idRaw ? Number(idRaw) : NaN;
  if (Number.isNaN(id)) return { error: 'ID inválido' };
  const parsed = billingClientSchema.safeParse(formToObj(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  try {
    await updateBillingClient(id, {
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
    return { success: true };
  } catch (err) {
    console.error('[admin] updateBillingClient error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar el cliente' };
  }
}
