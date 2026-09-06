import { StudioRangeHeader } from '@/lib/schemas/studio';

export type ByteRange = { start: number; end: number };

/** One RFC byte range; reject multipart ranges rather than buffering uploads. */
export function parseStudioRange(
  header: string,
  size: number,
): ByteRange | null {
  const parsed = StudioRangeHeader.safeParse(header);
  if (!parsed.success) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size <= 0) return null;
  const first = Number(match[1]);
  const last = Number(match[2]);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return null;
  const start = match[1] ? first : Math.max(0, size - last);
  const end = match[1] && match[2] ? Math.min(last, size - 1) : size - 1;
  return start >= size || start > end ? null : { start, end };
}

/** Bounded-memory fallback compatible with both private storage providers. */
export function studioRangeStream(
  source: ReadableStream<Uint8Array>,
  range: ByteRange,
) {
  const reader = source.getReader();
  let offset = 0;
  let finished = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (finished) return;
        while (offset <= range.end) {
          const { done, value } = await reader.read();
          if (finished) return;
          if (done) {
            finished = true;
            controller.close();
            return;
          }
          const previous = offset;
          offset += value.byteLength;
          if (offset <= range.start) continue;
          controller.enqueue(
            value.subarray(
              Math.max(0, range.start - previous),
              Math.min(value.byteLength, range.end - previous + 1),
            ),
          );
          if (offset > range.end) {
            finished = true;
            controller.close();
            await reader.cancel();
          }
          return;
        }
      } catch (error) {
        if (!finished) { finished = true; controller.error(error); }
      }
    },
    cancel: (reason) => { finished = true; return reader.cancel(reason); },
  });
}
