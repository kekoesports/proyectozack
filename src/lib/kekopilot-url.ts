const KEKOPILOT_PUBLIC_ORIGIN = 'https://kekopilot.com';

export const KEKOPILOT_APP_URL = 'https://app.kekopilot.com';

export function kekopilotUrl(path: string): string {
  if (path === '' || path === '/') return KEKOPILOT_PUBLIC_ORIGIN;
  return `${KEKOPILOT_PUBLIC_ORIGIN}/${path.replace(/^\/+/, '')}`;
}
