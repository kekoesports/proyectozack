import { getLocaleDecision } from '../src/lib/locale-detection';
import { isBotUserAgent } from '../src/proxy';

const scenarios = [
  {
    name: 'Googlebot desde USA (mayoría del crawl) → GET /',
    input: {
      pathname: '/',
      cookieLocale: undefined,
      country: 'US',
      acceptLanguage: 'en-US,en;q=0.9',
    },
  },
  {
    name: 'Googlebot desde Alemania → GET /',
    input: {
      pathname: '/',
      cookieLocale: undefined,
      country: 'DE',
      acceptLanguage: 'en-US,en;q=0.9',
    },
  },
  {
    name: 'Googlebot desde España → GET /',
    input: {
      pathname: '/',
      cookieLocale: undefined,
      country: 'ES',
      acceptLanguage: 'es-ES,es;q=0.9',
    },
  },
  {
    name: 'Googlebot desde USA → GET /en',
    input: {
      pathname: '/en',
      cookieLocale: undefined,
      country: 'US',
      acceptLanguage: 'en-US,en;q=0.9',
    },
  },
  {
    name: 'Googlebot sin país (raro) → GET /',
    input: {
      pathname: '/',
      cookieLocale: undefined,
      country: null,
      acceptLanguage: 'en-US,en;q=0.9',
    },
  },
];

console.log('=== Simulación de proxy geo para Googlebot ===\n');
for (const s of scenarios) {
  const decision = getLocaleDecision(s.input);
  const verb = decision.action === 'redirect' ? `→ 307 REDIRECT ${decision.to}` : `→ 200 PASS`;
  console.log(`${s.name}`);
  console.log(`  raw locale-detection: ${verb}\n`);
}

console.log('\n=== Bypass de bots (isBotUserAgent) ===\n');
const uaScenarios: Array<{ ua: string; expected: boolean }> = [
  { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',   expected: true },
  { ua: 'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',    expected: true },
  { ua: 'GPTBot/1.0',                                                                  expected: true },
  { ua: 'OAI-SearchBot/1.0',                                                           expected: true },
  { ua: 'ChatGPT-User/1.0',                                                            expected: true },
  { ua: 'ClaudeBot/1.0',                                                               expected: true },
  { ua: 'PerplexityBot/1.0',                                                           expected: true },
  { ua: 'Amazonbot/0.1',                                                               expected: true },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Firefox/121.0',       expected: false },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',                      expected: false },
];

let failed = 0;
for (const s of uaScenarios) {
  const actual = isBotUserAgent(s.ua);
  const ok = actual === s.expected ? '✓' : '✗';
  if (actual !== s.expected) failed += 1;
  console.log(`${ok} ${s.expected ? 'BOT ' : 'USER'} → detected=${actual}  ${s.ua.slice(0, 70)}`);
}

if (failed > 0) {
  console.log(`\n${failed} scenario(s) failed`);
  process.exit(1);
}
console.log('\nBypass regex OK.');
