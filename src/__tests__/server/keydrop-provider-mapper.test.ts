/**
 * Tests puros del mapper KeyDrop → ExternalGiveawayCard.
 *
 * Fixture basado en el shape real observado durante el probe diagnóstico
 * (2026-07): organizer, prizes, requirements con typo `fullfilled`,
 * buckets active/finished.
 */

import { keydropItemToCard, formatCurrency, buildKeydropDeepLink } from '@/lib/external-giveaways/providers/keydrop/mapper';
import {
  KeydropListItemSchema,
  KeydropListResponseSchema,
  type KeydropListItem,
} from '@/lib/external-giveaways/providers/keydrop/zod-schemas';

const organizer = {
  idSteam: '76561198000000001',
  username: 'zack',
  steamAvatar: 'https://cdnkd.com/avatar/zack.jpg',
  promocode: 'ZACKCSGO',
};

const prizeFactory = (o: Partial<{ id: number; price: number; currency: string; title: string; subtitle: string | null; itemImg: string }> = {}) => ({
  id: o.id ?? 505255,
  color: 'gold',
  itemImg: o.itemImg ?? 'https://cdnkd.com/skins/flip.png',
  title: o.title ?? '★ Flip Knife',
  subtitle: o.subtitle ?? 'Lore',
  phase: null,
  price: o.price ?? 421.25,
  condition: 'FN',
  weaponType: 'knife',
  currency: o.currency ?? 'USD',
});

const baseItem: KeydropListItem = {
  id: 'o3S8gi66000',
  hot: 0,
  boost: null,
  status: 'new',
  maxUsers: 0,
  minUsers: 398,
  duractionSeconds: 86400,
  totalPrizes: 4253.94,
  organizer,
  depositAmountRequired: 10,
  depositAmountRequiredUSD: 10,
  depositAmountRequiredCurrency: 'USD',
  createdAt: 1781720838000,
  deadlineTimestamp: null,
  prizes: [prizeFactory(), prizeFactory({ id: 2, price: 300, title: 'AK-47', subtitle: 'Redline' })],
  participantCount: 2,
  haveIJoined: false,
  chance: 0,
};

function map(item: KeydropListItem, creatorSlug = 'zacketizor') {
  return keydropItemToCard({ item, creatorSlug });
}

describe('[keydrop-mapper] activo → ExternalGiveawayCard', () => {
  it('mapea campos básicos', () => {
    const c = map(baseItem);
    expect(c.id).toBe('o3S8gi66000');
    expect(c.provider).toBe('keydrop');
    expect(c.creatorSlug).toBe('zacketizor');
    expect(c.title).toBe('★ Flip Knife');
    expect(c.subtitle).toBe('Lore');
    expect(c.status).toBe('active');   // "new" → "active" normalizado
  });

  it('imageUrl = prizes[0].itemImg', () => {
    expect(map(baseItem).imageUrl).toBe('https://cdnkd.com/skins/flip.png');
  });

  it('totalValue usa totalPrizes si viene', () => {
    expect(map(baseItem).totalValue).toBe(4253.94);
  });

  it('totalValue = sum(prizes[].price) si totalPrizes ausente', () => {
    const item = { ...baseItem, totalPrizes: undefined };
    // 421.25 + 300 = 721.25
    expect(map(item).totalValue).toBe(721.25);
  });

  it('promoCode desde organizer si no hay requirements', () => {
    expect(map(baseItem).promoCode).toBe('ZACKCSGO');
  });

  it('externalUrl usa kd.link con code + giveaway id (deep link con promocode)', () => {
    // baseItem.organizer.promocode = 'ZACKCSGO', item.id = 'o3S8gi66000'
    expect(map(baseItem).externalUrl).toBe(
      'https://kd.link/?code=ZACKCSGO&giveaway=o3S8gi66000',
    );
  });

  it('externalUrl siempre incluye el id del giveaway (no genérico)', () => {
    const url = map(baseItem).externalUrl;
    expect(url).toContain('o3S8gi66000');
    expect(url).not.toBe('https://keydrop.com/es/giveaways');
    expect(url).not.toBe('https://key-drop.com/es/giveaways');
  });

  it('externalUrl usa dominio nuevo keydrop.com (nunca el legacy key-drop.com con guión)', () => {
    // El dominio antiguo devuelve 403 Cloudflare — nunca lo usamos.
    expect(map(baseItem).externalUrl).not.toMatch(/key-drop\.com/);
  });

  it('prizeCount + prizesPreview + extraPrizeCount coherentes', () => {
    const c = map(baseItem);
    expect(c.prizeCount).toBe(2);
    expect(c.prizesPreview).toHaveLength(2);
    expect(c.extraPrizeCount).toBe(1);
    // Cada preview tiene los campos esperados
    expect(c.prizesPreview[0]).toMatchObject({
      title: '★ Flip Knife',
      subtitle: 'Lore',
      currency: 'USD',
      condition: 'FN',
      weaponType: 'knife',
    });
  });

  it('startsAt cae en createdAt si no hay startDate', () => {
    expect(map(baseItem).startsAt?.getTime()).toBe(baseItem.createdAt);
  });

  it('endsAt null si deadlineTimestamp null', () => {
    expect(map(baseItem).endsAt).toBeNull();
  });
});

describe('[keydrop-mapper] finalizado', () => {
  const finished: KeydropListItem = {
    ...baseItem,
    id: 'j43msi31534',
    status: 'ended',
    deadlineTimestamp: 1743196228000,
    participantCount: 1000,
    winners: [
      { idSteam: '76561198100000001', username: 'winner1', steamAvatar: 'https://cdnkd.com/w1.jpg', prizeId: 1 },
      { idSteam: '76561198100000002', username: 'winner2', steamAvatar: 'https://cdnkd.com/w2.jpg', prizeId: 2 },
    ],
  };

  it('status "ended" mapea a "ended"', () => {
    expect(map(finished).status).toBe('ended');
  });

  it('winners normalizados a {externalUserId, username, avatarUrl, prizeId}', () => {
    const c = map(finished);
    expect(c.winners).toHaveLength(2);
    expect(c.winners[0]).toEqual({
      externalUserId: '76561198100000001',
      username: 'winner1',
      avatarUrl: 'https://cdnkd.com/w1.jpg',
      prizeId: 1,
    });
  });

  it('endsAt = deadlineTimestamp cuando existe', () => {
    expect(map(finished).endsAt?.getTime()).toBe(1743196228000);
  });
});

describe('[keydrop-mapper] status normalization', () => {
  it('"new" y "started" → "active"', () => {
    expect(map({ ...baseItem, status: 'new' }).status).toBe('active');
    expect(map({ ...baseItem, status: 'started' }).status).toBe('active');
  });
  it('"ended" → "ended"', () => {
    expect(map({ ...baseItem, status: 'ended' }).status).toBe('ended');
  });
  it('cualquier otro status → "unknown"', () => {
    expect(map({ ...baseItem, status: 'draft' }).status).toBe('unknown');
    expect(map({ ...baseItem, status: 'canceled' }).status).toBe('unknown');
  });
});

describe('[keydrop-mapper] multi-currency', () => {
  it('EUR se mapea correctamente al depositCurrency', () => {
    const item: KeydropListItem = {
      ...baseItem,
      depositAmountRequiredCurrency: 'EUR',
      prizes: [prizeFactory({ currency: 'EUR' })],
    };
    const c = map(item);
    expect(c.depositCurrency).toBe('EUR');
    expect(c.currency).toBe('EUR');
  });

  it('formatCurrency respeta símbolos USD y EUR', () => {
    expect(formatCurrency(1073.78, 'USD')).toBe('$1,073.78');
    expect(formatCurrency(10, 'EUR')).toBe('10.00 €');
    expect(formatCurrency(500, 'BTC')).toBe('500.00 BTC');
  });
});

describe('[keydrop-mapper] requirements + fullfilled → fulfilled', () => {
  it('objeto con clave "0" se convierte a array + typo corregido', () => {
    const item: KeydropListItem = {
      ...baseItem,
      requirements: {
        '0': {
          type: 'PROMO_CODE_USAGE',
          promoCode: 'ZACKCSGO',
          refillAmount: 10,
          fullfilled: false,   // sic
          currency: 'USD',
        },
      },
    };
    const c = map(item);
    expect(c.requirements).toHaveLength(1);
    expect(c.requirements[0]?.type).toBe('PROMO_CODE_USAGE');
    expect(c.requirements[0]?.fulfilled).toBe(false);
    expect(c.requirements[0]).not.toHaveProperty('fullfilled');
  });

  it('promoCode toma el de requirements si existe', () => {
    const item: KeydropListItem = {
      ...baseItem,
      requirements: {
        '0': {
          type: 'PROMO_CODE_USAGE',
          promoCode: 'OTHERCODE',
          refillAmount: 5,
        },
      },
    };
    expect(map(item).promoCode).toBe('OTHERCODE');
  });
});

describe('[keydrop-mapper] Zod schemas parsean el shape real', () => {
  it('KeydropListItemSchema parsea un item mínimo', () => {
    expect(KeydropListItemSchema.safeParse(baseItem).success).toBe(true);
  });
  it('KeydropListResponseSchema parsea un response completo', () => {
    const response = {
      success: true,
      data: {
        active: [baseItem],
        finished: [{ ...baseItem, status: 'ended', deadlineTimestamp: 1743196228000 }],
      },
    };
    expect(KeydropListResponseSchema.safeParse(response).success).toBe(true);
  });
  it('rechaza response sin data.active', () => {
    expect(KeydropListResponseSchema.safeParse({ success: true, data: { finished: [] } }).success).toBe(false);
  });
  it('acepta prizes con subtitle null', () => {
    const item = { ...baseItem, prizes: [prizeFactory({ subtitle: null })] };
    expect(KeydropListItemSchema.safeParse(item).success).toBe(true);
  });
});

describe('[keydrop-mapper] buildKeydropDeepLink — deep link con promocode', () => {
  it('id + promoCode → shortener kd.link con ambos parámetros', () => {
    expect(buildKeydropDeepLink('o3S8gi66000', 'ZACKCSGO')).toBe(
      'https://kd.link/?code=ZACKCSGO&giveaway=o3S8gi66000',
    );
  });

  it('URL-encodea el id y el promoCode', () => {
    // Caso extremo: promocode con guion o espacios NO debería llegar, pero
    // si llegara, se sanea para no romper la URL.
    expect(buildKeydropDeepLink('id/with slash', 'CODE 1')).toBe(
      'https://kd.link/?code=CODE%201&giveaway=id%2Fwith%20slash',
    );
  });

  it('sin promoCode → path canónico keydrop.com/es/giveaways/{id}', () => {
    expect(buildKeydropDeepLink('o3S8gi66000', undefined)).toBe(
      'https://keydrop.com/es/giveaways/o3S8gi66000',
    );
    expect(buildKeydropDeepLink('o3S8gi66000', '')).toBe(
      'https://keydrop.com/es/giveaways/o3S8gi66000',
    );
  });

  it('sin id ni promoCode → listing genérico (nunca URL rota /giveaway/ vacío)', () => {
    expect(buildKeydropDeepLink('', undefined)).toBe('https://keydrop.com/es/giveaways');
    expect(buildKeydropDeepLink('', '')).toBe('https://keydrop.com/es/giveaways');
  });

  it('nunca produce URL sobre el dominio legacy key-drop.com (403 Cloudflare)', () => {
    expect(buildKeydropDeepLink('any', 'ANY')).not.toMatch(/key-drop\.com/);
    expect(buildKeydropDeepLink('any', undefined)).not.toMatch(/key-drop\.com/);
    expect(buildKeydropDeepLink('', undefined)).not.toMatch(/key-drop\.com/);
  });

  it('nunca genera /giveaway/ (singular) — devuelve 404 en keydrop.com', () => {
    expect(buildKeydropDeepLink('any', 'ANY')).not.toMatch(/\/giveaway\//);
    expect(buildKeydropDeepLink('any', undefined)).not.toMatch(/\/giveaway\//);
  });

  it('no pierde el id del giveaway cuando lo tiene', () => {
    expect(buildKeydropDeepLink('my-real-id', 'PROMO')).toContain('my-real-id');
    expect(buildKeydropDeepLink('my-real-id', undefined)).toContain('my-real-id');
  });
});
