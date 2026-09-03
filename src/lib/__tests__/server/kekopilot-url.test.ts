import { isKekoPilotHost, KEKOPILOT_APP_URL, kekopilotUrl } from '@/lib/kekopilot-url';

describe('KekoPilot production URLs', () => {
  it('keeps the public website on its own domain', () => {
    expect(kekopilotUrl('/')).toBe('https://kekopilot.com');
    expect(kekopilotUrl('/en')).toBe('https://kekopilot.com/en');
    expect(kekopilotUrl('kekopilot-og.png')).toBe('https://kekopilot.com/kekopilot-og.png');
  });

  it('keeps the SaaS panel on the app subdomain', () => {
    expect(KEKOPILOT_APP_URL).toBe('https://app.kekopilot.com');
  });

  it('recognizes only the KekoPilot production hosts', () => {
    expect(isKekoPilotHost('kekopilot.com')).toBe(true);
    expect(isKekoPilotHost('APP.KEKOPILOT.COM:443')).toBe(true);
    expect(isKekoPilotHost('www.kekopilot.com.')).toBe(true);
    expect(isKekoPilotHost('socialpro.es')).toBe(false);
    expect(isKekoPilotHost('kekopilot.com.attacker.example')).toBe(false);
    expect(isKekoPilotHost(null)).toBe(false);
  });
});
