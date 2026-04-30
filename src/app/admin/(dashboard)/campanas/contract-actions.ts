'use server';

import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { requireAnyRole, requireRole } from '@/lib/auth-guard';
import {
  getContractByCampaign, createContract, updateContract,
  addSigner, removeSigner,
} from '@/lib/queries/contracts';
import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = new Resend(env.RESEND_API_KEY);
import { absoluteUrl } from '@/lib/site-url';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly id?: number };

function revalidate(campaignId: number): void {
  revalidatePath(`/admin/campanas/${campaignId}`);
}

// ── Subir contrato ────────────────────────────────────────────────────

export async function uploadContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const campaignId = Number(formData.get('campaignId'));
  if (isNaN(campaignId)) return { error: 'ID de trato inválido' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Selecciona un archivo PDF' };
  if (file.type !== 'application/pdf') return { error: 'Solo se admiten archivos PDF' };
  if (file.size > 20 * 1024 * 1024) return { error: 'El archivo supera el límite de 20 MB' };

  const notes = (formData.get('notes') as string | null)?.trim() || null;

  try {
    const existing = await getContractByCampaign(campaignId);

    // Reemplazar archivo anterior si existe
    if (existing?.filePath) {
      try { await del(existing.filePath); } catch { /* ignore */ }
    }

    const safeName = file.name.replace(/[^\w.\-]/g, '_');
    const path     = `contracts/${campaignId}/${Date.now()}-${safeName}`;
    const blob     = await put(path, file, { access: 'public', contentType: 'application/pdf' });

    if (existing) {
      await updateContract(existing.id, {
        fileUrl: blob.url, filePath: path, fileName: file.name,
        status: 'draft', notes,
      });
      revalidate(campaignId);
      return { success: true, id: existing.id };
    }

    const row = await createContract({
      campaignId,
      fileUrl: blob.url, filePath: path, fileName: file.name,
      signedFileUrl: null, status: 'draft',
      sentAt: null, signedAt: null, notes,
      createdByUserId: session.user.id,
    });
    revalidate(campaignId);
    return { success: true, id: row.id };
  } catch (err) {
    console.error('[admin] uploadContract error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al subir el contrato' };
  }
}

// ── Añadir firmante ───────────────────────────────────────────────────

export async function addSignerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const contractId = Number(formData.get('contractId'));
  const campaignId = Number(formData.get('campaignId'));
  const name  = (formData.get('name')  as string | null)?.trim();
  const email = (formData.get('email') as string | null)?.trim();
  const role  = (formData.get('role')  as string | null)?.trim() || 'brand';

  if (!name || !email) return { error: 'Nombre y email son obligatorios' };
  if (isNaN(contractId)) return { error: 'ID de contrato inválido' };

  try {
    const token = crypto.randomUUID().replace(/-/g, '');
    const row = await addSigner({
      contractId, name, email,
      role: role as 'brand' | 'influencer' | 'agency',
      status: 'pending',
      token,
      signedAt: null, ipAddress: null, signedName: null,
    });
    revalidate(campaignId);
    return { success: true, id: row.id };
  } catch (err) {
    console.error('[admin] addSigner error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al añadir firmante' };
  }
}

// ── Eliminar firmante ─────────────────────────────────────────────────

export async function removeSignerAction(signerId: number, campaignId: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  try {
    await removeSigner(signerId);
    revalidate(campaignId);
    return { success: true };
  } catch (err) {
    console.error('[admin] removeSigner error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al eliminar firmante' };
  }
}

// ── Solicitar firmas ──────────────────────────────────────────────────

export async function requestSignaturesAction(contractId: number, campaignId: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  try {
    const contract = await (await import('@/lib/queries/contracts')).getContractById(contractId);
    if (!contract) return { error: 'Contrato no encontrado' };
    if (!contract.fileUrl) return { error: 'Sube el PDF del contrato antes de enviar' };
    if (contract.signers.length === 0) return { error: 'Añade al menos un firmante' };

    const pendingSigners = contract.signers.filter((s) => s.status === 'pending');
    if (pendingSigners.length === 0) return { error: 'Todos los firmantes ya han firmado' };

    // Enviar email a cada firmante pendiente
    for (const signer of pendingSigners) {
      const signingUrl = absoluteUrl(`/firmar/${signer.token}`);
      await resend.emails.send({
        from: 'SocialPro <noreply@socialpro.es>',
        to:   signer.email,
        subject: 'Solicitud de firma de contrato — SocialPro',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="font-size:20px;font-weight:800;color:#16161f;margin:0 0 8px">
              Firma de contrato pendiente
            </h2>
            <p style="color:#72728a;margin:0 0 20px">Hola <strong>${signer.name}</strong>,</p>
            <p style="color:#72728a;margin:0 0 20px">
              Tienes un contrato pendiente de firma. Haz clic en el botón para revisarlo y firmar.
            </p>
            <a href="${signingUrl}"
              style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f5632a,#8b3aad);color:#fff;text-decoration:none;border-radius:9999px;font-weight:700;font-size:14px;">
              Revisar y firmar contrato
            </a>
            <p style="color:#aaa;font-size:12px;margin:24px 0 0">
              Si no esperabas este email, puedes ignorarlo.<br/>
              Link: <a href="${signingUrl}" style="color:#f5632a">${signingUrl}</a>
            </p>
          </div>
        `,
      });
    }

    await updateContract(contractId, { status: 'pending_signature', sentAt: new Date() });
    revalidate(campaignId);
    return { success: true };
  } catch (err) {
    console.error('[admin] requestSignatures error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al enviar las solicitudes de firma' };
  }
}
