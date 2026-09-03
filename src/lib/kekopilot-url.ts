const KEKOPILOT_PUBLIC_ORIGIN = 'https://kekopilot.com';
const KEKOPILOT_HOSTS = new Set(['kekopilot.com', 'www.kekopilot.com', 'app.kekopilot.com']);

export const KEKOPILOT_APP_URL = 'https://app.kekopilot.com';

export function kekopilotUrl(path: string): string {
  if (path === '' || path === '/') return KEKOPILOT_PUBLIC_ORIGIN;
  return `${KEKOPILOT_PUBLIC_ORIGIN}/${path.replace(/^\/+/, '')}`;
}

export function isKekoPilotHost(host: string | null): boolean {
  if (!host) return false;

  const firstHost = host.split(',', 1)[0]?.trim().toLowerCase() ?? '';
  const hostname = firstHost.replace(/:\d+$/, '').replace(/\.$/, '');
  return KEKOPILOT_HOSTS.has(hostname);
}
