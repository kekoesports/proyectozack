import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWhatsAppSignature(bytes: Uint8Array, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(bytes).digest();
  const supplied = Buffer.from(signature.slice(7), 'hex');
  return timingSafeEqual(expected, supplied);
}

export async function readWhatsAppBytes(request: Request): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 32_000) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
    return Buffer.concat(chunks);
  } catch { return null; } finally { reader.releaseLock(); }
}
