'use server';

import { headers } from 'next/headers';
import { recordSignature, getSignerByToken, updateContract, getContractById } from '@/lib/queries/contracts';
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

type SignState = { readonly error?: string; readonly success?: boolean };

export async function signContractAction(_prev: SignState, formData: FormData): Promise<SignState> {
  const token      = (formData.get('token')      as string | null)?.trim();
  const signedName = (formData.get('signedName') as string | null)?.trim();
  const accepted   = formData.get('accepted');

  if (!token)      return { error: 'Token inválido' };
  if (!signedName) return { error: 'Escribe tu nombre para firmar' };
  if (!accepted)   return { error: 'Debes aceptar los términos para firmar' };

  // Obtener IP del firmante
  const hdrs = await headers();
  const ip   =
    hdrs.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    hdrs.get('x-real-ip') ??
    '0.0.0.0';

  try {
    const signerData = await getSignerByToken(token);
    if (!signerData) return { error: 'Link de firma inválido o ya usado' };
    if (signerData.status === 'signed') return { error: 'Este contrato ya ha sido firmado' };

    await recordSignature(token, signedName, ip);

    // Comprobar si todos los firmantes han firmado → marcar contrato como firmado
    const contract = await getContractById(signerData.contractId);
    if (contract) {
      const allSigned = contract.signers.every((s) => s.status === 'signed' || timingSafeEqual(s.token, token));
      if (allSigned) {
        await updateContract(contract.id, { status: 'signed', signedAt: new Date() });
      }
      revalidatePath(`/admin/campanas/${contract.campaignId}`);
    }

    return { success: true };
  } catch (err) {
    console.error('[sign] signContract error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al registrar la firma. Inténtalo de nuevo.' };
  }
}
