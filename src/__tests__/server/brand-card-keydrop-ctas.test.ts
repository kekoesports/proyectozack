/**
 * CTAs del banner principal de KeyDrop en `/sorteos/[creatorSlug]`.
 *
 * Contexto: los CTAs del banner (Reclamar, 200% Bonus, Cómo participar)
 * son `<a>` reales con el deep-link del afiliado (`kd.link/?code={promocode}`)
 * aplicando el código del creador. El "Club VIP" original se ha retirado
 * del banner por decisión de producto (2026-07-10) — no era información
 * necesaria del partner en primer plano.
 *
 * Regla: ningún CTA muerto en el banner. Ni `data-todo`, ni `<button>`
 * sin `onClick`/`type="submit"`.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[brand-card-keydrop] CTAs vivos con code aplicado', () => {
  const src = read('src/features/giveaway-platform/components/BrandCardKeyDrop.tsx');

  it('importa `buildKeydropClaimUrl` del mapper (no duplica lógica de URL)', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*\bbuildKeydropClaimUrl\b[^}]*\}\s*from\s*'@\/lib\/external-giveaways\/providers\/keydrop\/mapper'/,
    );
  });

  it('calcula `claimUrl` a partir del `code` recibido por props', () => {
    expect(src).toMatch(/const\s+claimUrl\s*=\s*buildKeydropClaimUrl\(code\)/);
  });

  it('ya NO tiene `data-todo` — los CTAs no son placeholder', () => {
    expect(src).not.toMatch(/data-todo/);
  });

  it('ya NO tiene `<button>` — todos los CTAs son `<a>`', () => {
    // Cualquier `<button` con `data-todo` sería un CTA muerto. Aceptamos
    // ausencia total de `<button` en esta card (los CTAs son enlaces).
    expect(src).not.toMatch(/<button[\s>]/);
  });

  it('los 3 CTAs son `<a>` con href={claimUrl}', () => {
    // Cada `data-cta` etiqueta un CTA. Verificamos que existe y que su
    // ancla usa `claimUrl`, `target="_blank"` y `rel="noopener noreferrer"`.
    const ctas = ['keydrop-claim', 'keydrop-bonus', 'keydrop-how'] as const;
    for (const cta of ctas) {
      const re = new RegExp(
        `<a[^>]*href=\\{claimUrl\\}[\\s\\S]{0,300}data-cta="${cta}"|` +
        `<a[^>]*data-cta="${cta}"[\\s\\S]{0,300}href=\\{claimUrl\\}`,
      );
      expect(src).toMatch(re);
    }
  });

  it('el CTA de VIP se ha retirado del banner (regresión 2026-07-10)', () => {
    // El bloque "VIP CLUB" / "Únete al Club VIP" ya no forma parte del
    // banner. Ni el data-cta ni el copy deben aparecer.
    expect(src).not.toMatch(/data-cta="keydrop-vip"/);
    expect(src).not.toMatch(/VIP CLUB/);
    expect(src).not.toMatch(/Únete al Club VIP/);
  });

  it('todos los `<a>` externos llevan target="_blank" + rel="noopener noreferrer"', () => {
    // Cada ancla que use `claimUrl` debe abrir en nueva pestaña con rel seguro.
    const anchorBlocks = src.match(/<a[\s\S]*?>/g) ?? [];
    const claimAnchors = anchorBlocks.filter((a) => a.includes('href={claimUrl}'));
    expect(claimAnchors.length).toBeGreaterThanOrEqual(3);
    for (const a of claimAnchors) {
      expect(a).toMatch(/target="_blank"/);
      expect(a).toMatch(/rel="noopener noreferrer"/);
    }
  });

  it('mantiene la clase `gp-cta-link` en cada ancla para reset visual', () => {
    // `.gp-cta-link` desactiva `text-decoration` para que el ancla se vea
    // como el botón/chip que ya estaba estilado en CSS.
    const anchorBlocks = src.match(/<a[\s\S]*?>/g) ?? [];
    const claimAnchors = anchorBlocks.filter((a) => a.includes('href={claimUrl}'));
    for (const a of claimAnchors) {
      expect(a).toMatch(/gp-cta-link/);
    }
  });
});

describe('[brand-card-keydrop] CSS de reset del ancla-CTA', () => {
  const css = read('src/app/sorteos/plataforma/platform.css');

  it('`.gp-cta-link` desactiva text-decoration y hereda color', () => {
    expect(css).toMatch(/a\.gp-cta-link\s*\{[\s\S]{0,300}text-decoration:\s*none/);
    expect(css).toMatch(/a\.gp-cta-link\s*\{[\s\S]{0,300}color:\s*inherit/);
  });
});

describe('[brand-card-keydrop] ZACKETIZOR → ZACKCSGO', () => {
  it('el creator ZACKETIZOR tiene `code: ZACKCSGO` en creators.ts', () => {
    // El `code` que recibe BrandCardKeyDrop sale de aquí. Aseguramos que
    // el mapeo no se pierda por refactor.
    const creatorsSrc = read('src/features/giveaway-platform/constants/creators.ts');
    expect(creatorsSrc).toMatch(/zacketizor:\s*\{[^}]*code:\s*'ZACKCSGO'/);
  });
});

describe('[brand-card-keydrop] sorteos individuales usan `externalUrl` construida', () => {
  const src = read('src/features/giveaway-platform/components/ExternalGiveawayCard.tsx');

  it('el CTA del sorteo usa `card.externalUrl` — no una URL hardcodeada', () => {
    expect(src).toMatch(/href=\{card\.externalUrl\}/);
  });

  it('no hay URLs de sorteos hardcodeadas en la card presentacional', () => {
    // Los 5 IDs conocidos de ZACKETIZOR (2026-07) NO deben aparecer en la
    // card genérica. La lógica buena viene del `id` real de la API.
    const knownIds = [
      'ACL7ri33722',
      '7TxLri41436',
      '6DI9xi35681',
      'N8fZYi35680',
      'o3S8gi66000',
    ];
    for (const id of knownIds) {
      expect(src).not.toContain(id);
    }
  });
});
