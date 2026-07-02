'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { redeemShopItem } from '@/app/sorteos/plataforma/actions';
import type { ShopCategory, ShopItem } from '@/types/giveawayPlatform';

interface Props {
  items: ShopItem[];
  balance: number;
}

const CATEGORIES: { key: ShopCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'skin', label: '🔫 Skins CS2' },
  { key: 'merch', label: '👕 Merch SocialPro' },
  { key: 'gift', label: '🎁 Tarjetas regalo' },
];

export function PlatformShop({ items, balance }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<ShopCategory | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = items.filter((i) => category === 'all' || i.category === category);

  function handleRedeem(shopItemId: number) {
    setError(null);
    startTransition(async () => {
      const result = await redeemShopItem({ shopItemId });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <>
      <div className="gp-shop-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`gp-shop-tab${category === c.key ? ' is-active' : ''}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error ? <p className="gp-shop-error">{error}</p> : null}
      <div className="gp-shop-grid">
        {visible.map((item) => {
          const affordable = balance >= item.costCoins && item.stock > 0;
          const stockClass = item.stock === 0 ? ' gone' : item.stock < 4 ? ' low' : '';
          return (
            <div key={item.id} className="gp-shop-card">
              <div className="gp-shop-img">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} />
                ) : (
                  <div className="gp-shop-img-empty">Imagen pendiente</div>
                )}
              </div>
              <h4 className="gp-shop-name">{item.name}</h4>
              {item.description ? <p className="gp-shop-desc">{item.description}</p> : <p className="gp-shop-desc" />}
              <div className="gp-shop-cost">🪙 {item.costCoins.toLocaleString('es-ES')}</div>
              <div className={`gp-shop-stock${stockClass}`}>
                {item.stock > 0 ? `${item.stock} en stock` : 'Agotado'}
              </div>
              <button
                type="button"
                onClick={() => handleRedeem(item.id)}
                disabled={!affordable || isPending}
                className="gp-shop-btn"
              >
                Canjear
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
