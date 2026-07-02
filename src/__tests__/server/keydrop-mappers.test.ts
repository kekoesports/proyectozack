/**
 * Tests puros del mapper KeyDrop → KeydropCard.
 *
 * Fixtures basados en el shape real observado durante el probe (2026-07):
 * organizer, prizes, requirements con typo `fullfilled`, buckets active/finished.
 */

import {
  buildKeydropExternalUrl,
  formatCurrency,
  toKeydropCard,
} from '@/lib/keydrop/mappers';
import {
  KeydropListItemSchema,
  KeydropListResponseSchema,
  type KeydropListItem,
} from '@/lib/keydrop/types';

const organizer = {
  idSteam: '76561198000000001',
  username: 'zack',
  steamAvatar: 'https://cdnkd.com/avatar/zack.jpg',
  promocode: 'ZACKCSGO',
};

const prizeFactory = (overrides: Partial<{ price: number; currency: string; title: string; subtitle: string | null; itemImg: string; id: number }> = {}) => ({
  id: overrides.id ?? 505255,
  color: 'gold',
  itemImg: overrides.itemImg ?? 'https://cdnkd.com/skins/flip.png',
  title: overrides.title ?? '★ Flip Knife',
  subtitle: overrides.subtitle ?? 'Lore',
  phase: null,
  price: overrides.price ?? 421.25,
  condition: 'FN',
  weaponType: 'knife',
  currency: overrides.currency ?? 'USD',
});

const baseItem: KeydropListItem = {
  id: 'o3S8gi66000',
  hot: 0,
  boost: null,
  status: 'new',
  maxUsers: 0,
  minUsers: 398,
  duractionSeconds: 86400,   // sic — typo upstream
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

describe('[keydrop-mappers] toKeydropCard — activo', () => {
  it('mapea campos básicos correctamente', () => {
    const card = toKeydropCard(baseItem);
    expect(card.id).toBe('o3S8gi66000');
    expect(card.source).toBe('keydrop');
    expect(card.title).toBe('★ Flip Knife');
    expect(card.subtitle).toBe('Lore');
    expect(card.status).toBe('new');
    expect(card.participantCount).toBe(2);
    expect(card.maxUsers).toBe(0);
    expect(card.minUsers).toBe(398);
  });

  it('imageUrl = prizes[0].itemImg', () => {
    const card = toKeydropCard(baseItem);
    expect(card.imageUrl).toBe('https://cdnkd.com/skins/flip.png');
  });

  it('totalValue usa `totalPrizes` si viene', () => {
    const card = toKeydropCard(baseItem);
    expect(card.totalValue).toBe(4253.94);
  });

  it('totalValue = sum(prizes[].price) si totalPrizes ausente', () => {
    const item = { ...baseItem, totalPrizes: undefined };
    const card = toKeydropCard(item);
    // 421.25 + 300 = 721.25
    expect(card.totalValue).toBe(721.25);
  });

  it('promoCode desde organizer si no hay requirements', () => {
    const card = toKeydropCard(baseItem);
    expect(card.promoCode).toBe('ZACKCSGO');
  });

  it('externalUrl apunta al listing genérico (KeyDrop no expone URL individual)', () => {
    const card = toKeydropCard(baseItem);
    // KeyDrop no publica URLs individuales por id — el listing es la landing
    // más específica disponible por ahora.
    expect(card.externalUrl).toBe('https://key-drop.com/es/giveaways');
  });

  it('prizeCount cuenta todos los premios', () => {
    const card = toKeydropCard(baseItem);
    expect(card.prizeCount).toBe(2);
  });

  it('deadlineTimestamp nullable si viene null', () => {
    const card = toKeydropCard(baseItem);
    expect(card.deadlineTimestamp).toBeNull();
  });

  it('createdAt convertido a Date', () => {
    const card = toKeydropCard(baseItem);
    expect(card.createdAt).toBeInstanceOf(Date);
    expect(card.createdAt.getTime()).toBe(1781720838000);
  });
});

describe('[keydrop-mappers] toKeydropCard — finalizado', () => {
  const finishedItem: KeydropListItem = {
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

  it('mapea winners a array normalizado', () => {
    const card = toKeydropCard(finishedItem);
    expect(card.winners).toHaveLength(2);
    expect(card.winners[0]).toEqual({
      steamId: '76561198100000001',
      username: 'winner1',
      avatarUrl: 'https://cdnkd.com/w1.jpg',
      prizeId: 1,
    });
  });

  it('status ended reconocido', () => {
    expect(toKeydropCard(finishedItem).status).toBe('ended');
  });

  it('deadlineTimestamp convertido a Date cuando existe', () => {
    const card = toKeydropCard(finishedItem);
    expect(card.deadlineTimestamp).toBeInstanceOf(Date);
    expect(card.deadlineTimestamp?.getTime()).toBe(1743196228000);
  });
});

describe('[keydrop-mappers] status desconocido', () => {
  it('status extraño → "unknown" (no rompe UI)', () => {
    const item = { ...baseItem, status: 'draft' };
    expect(toKeydropCard(item).status).toBe('unknown');
  });
});

describe('[keydrop-mappers] multi-currency', () => {
  it('EUR se mapea correctamente al depositCurrency', () => {
    const item = {
      ...baseItem,
      depositAmountRequiredCurrency: 'EUR',
      prizes: [prizeFactory({ currency: 'EUR' })],
    };
    const card = toKeydropCard(item);
    expect(card.depositCurrency).toBe('EUR');
    expect(card.currency).toBe('EUR');
  });

  it('formatCurrency respeta símbolos USD y EUR', () => {
    expect(formatCurrency(1073.78, 'USD')).toBe('$1,073.78');
    expect(formatCurrency(10, 'EUR')).toBe('10.00 €');
    expect(formatCurrency(500, 'BTC')).toBe('500.00 BTC');
  });
});

describe('[keydrop-mappers] requirements normalizadas + fullfilled → fulfilled', () => {
  it('objeto con clave "0" se convierte a array', () => {
    const withReqs: KeydropListItem & {
      requirements: Record<string, { type: string; promoCode: string; fullfilled: boolean; refillAmount: number; currency: string }>;
    } = {
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
    const card = toKeydropCard(withReqs);
    expect(card.requirements).toHaveLength(1);
    expect(card.requirements[0]?.type).toBe('PROMO_CODE_USAGE');
    // Corrección del typo upstream
    expect(card.requirements[0]?.fulfilled).toBe(false);
    // Y NO expone `fullfilled` en el shape interno
    expect(card.requirements[0]).not.toHaveProperty('fullfilled');
  });

  it('promoCode toma el de requirements si existe', () => {
    const withReqs: KeydropListItem & {
      requirements: Record<string, { type: string; promoCode: string; refillAmount: number }>;
    } = {
      ...baseItem,
      requirements: {
        '0': {
          type: 'PROMO_CODE_USAGE',
          promoCode: 'OTHERCODE',   // distinto al de organizer
          refillAmount: 5,
        },
      },
    };
    const card = toKeydropCard(withReqs);
    expect(card.promoCode).toBe('OTHERCODE');
  });

  it('sin requirements → promoCode desde organizer', () => {
    const card = toKeydropCard(baseItem);
    expect(card.promoCode).toBe('ZACKCSGO');
  });
});

describe('[keydrop-mappers] buildKeydropExternalUrl', () => {
  // KeyDrop no expone URL pública por id — devolvemos el listing genérico
  // para evitar botones que llevan a 404. El id se ignora por diseño hasta
  // que KeyDrop publique URLs individuales.
  it('devuelve el listing público independiente del id', () => {
    expect(buildKeydropExternalUrl('abc123')).toBe('https://key-drop.com/es/giveaways');
    expect(buildKeydropExternalUrl('otroId'))
      .toBe('https://key-drop.com/es/giveaways');
  });
});

describe('[keydrop-mappers] Zod schemas parsean el shape real', () => {
  it('KeydropListItemSchema parsea un item mínimo', () => {
    const result = KeydropListItemSchema.safeParse(baseItem);
    expect(result.success).toBe(true);
  });

  it('KeydropListResponseSchema parsea un response completo', () => {
    const response = {
      success: true,
      data: {
        active: [baseItem],
        finished: [{ ...baseItem, status: 'ended', deadlineTimestamp: 1743196228000 }],
      },
    };
    const result = KeydropListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('rechaza response sin `data.active`', () => {
    const bad = { success: true, data: { finished: [] } };
    expect(KeydropListResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('acepta prizes con subtitle null', () => {
    const item = { ...baseItem, prizes: [prizeFactory({ subtitle: null })] };
    expect(KeydropListItemSchema.safeParse(item).success).toBe(true);
  });
});
