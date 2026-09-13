/** Bound unauthenticated/provider payload memory before JSON parsing. */
export async function readIntakeBody(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: number }> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400 };
  let size = 0;
  let text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 32_000) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const value: unknown = JSON.parse(text);
    return { ok: true, value };
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }
}
