export const MAX_STUDIO_UPLOAD = 20 * 1024 * 1024;

/** Validate binary signatures, not the browser MIME or filename extension. */
export function detectStudioMedia(
  data: Buffer,
): { contentType: string; extension: string } | null {
  if (data.length < 12) return null;
  if (
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { contentType: 'image/png', extension: 'png' };
  if (data[0] === 255 && data[1] === 216 && data[2] === 255)
    return { contentType: 'image/jpeg', extension: 'jpg' };
  const head = data.toString('ascii', 0, 4);
  if (head === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP')
    return { contentType: 'image/webp', extension: 'webp' };
  if (head === 'RIFF' && data.toString('ascii', 8, 12) === 'WAVE')
    return { contentType: 'audio/wav', extension: 'wav' };
  if (head === 'OggS') return { contentType: 'audio/ogg', extension: 'ogg' };
  if (data.toString('ascii', 0, 3) === 'ID3' || (data[0] === 255 && ((data[1] ?? 0) & 0xe6) === 0xe2))
    return { contentType: 'audio/mpeg', extension: 'mp3' };
  if (
    data.toString('ascii', 4, 8) === 'ftyp' &&
    ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(
      data.toString('ascii', 8, 12),
    )
  )
    return { contentType: 'video/mp4', extension: 'mp4' };
  return null;
}
