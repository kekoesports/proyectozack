import fs from 'node:fs';
import path from 'node:path';

import robots from '@/app/robots';

describe('Search Console indexability guards', () => {
  it('lets Googlebot load Vercel-versioned Next.js rendering assets', () => {
    const rules = robots().rules;
    const generic = Array.isArray(rules)
      ? rules.find((rule) => rule.userAgent === '*')
      : rules;

    expect(generic).toBeDefined();
    expect(generic?.allow).toContain('/_next/static/');
    expect(generic?.disallow).toContain('/*?*');
  });

  it('declares the same content-use policy for every crawler group', () => {
    const rules = robots().rules;

    expect(Array.isArray(rules)).toBe(true);
    if (!Array.isArray(rules)) return;

    for (const rule of rules) {
      expect(rule.other).toEqual({
        'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
      });
    }
  });

  it('does not advertise a WebSite SearchAction without a working site search', () => {
    const layoutSource = fs.readFileSync(
      path.join(process.cwd(), 'src/app/layout.tsx'),
      'utf8',
    );

    expect(layoutSource).not.toContain("'@type': 'SearchAction'");
    expect(layoutSource).not.toContain('search_term_string');
  });
});
