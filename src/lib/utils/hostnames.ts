export function hostnameFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
}

export function isHostOrSubdomain(rawUrl: string, expectedHost: string): boolean {
  const hostname = hostnameFromUrl(rawUrl);
  const normalizedExpected = expectedHost.toLowerCase().replace(/\.$/, '');
  return hostname === normalizedExpected || hostname?.endsWith(`.${normalizedExpected}`) === true;
}
