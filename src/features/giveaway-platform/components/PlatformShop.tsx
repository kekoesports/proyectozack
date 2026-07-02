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
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              category === c.key ? 'border-primary text-foreground' : 'border-border text-muted-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item) => {
          const affordable = balance >= item.costCoins && item.stock > 0;
          return (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4 text-center">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="mx-auto h-28 object-contain" />
              ) : (
                <div className="mx-auto flex h-28 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                  Imagen pendiente
                </div>
              )}
              <h4 className="mt-2 text-sm font-semibold">{item.name}</h4>
              {item.description ? (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              ) : null}
              <div className="mt-2 font-bold text-amber-400">🪙 {item.costCoins.toLocaleString('es-ES')}</div>
              <div className={`text-xs ${item.stock < 4 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {item.stock > 0 ? `${item.stock} en stock` : 'Agotado'}
              </div>
              <button
                onClick={() => handleRedeem(item.id)}
                disabled={!affordable || isPending}
                className="mt-3 w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-40"
              >
                Canjear
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
