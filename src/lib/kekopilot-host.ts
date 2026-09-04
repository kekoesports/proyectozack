const KEKOPILOT_APP_HOST = 'app.kekopilot.com';

export function isKekoPilotAppHost(rawHost: string | null): boolean {
  const firstHost = rawHost?.split(',')[0]?.trim().toLocaleLowerCase('en-US');
  const hostname = firstHost?.split(':')[0];
  return hostname === KEKOPILOT_APP_HOST;
}
