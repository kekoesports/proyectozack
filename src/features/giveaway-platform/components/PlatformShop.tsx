'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { redeemShopItem } from '@/app/sorteos/plataforma/actions';
import type { ShopCategory, ShopItem } from '@/types/giveawayPlatform';

interface Props {
  items: ShopItem[];
  balance: number;
}

const CATEGORIES: { key: ShopCategory | 'all'; label: string }[] = [
  { key: 'all',     label: 'Todo' },
  { key: 'skin',    label: '🔫 Skins CS2' },
  { key: 'merch',   label: '👕 Merch SocialPro' },
  { key: 'gift',    label: '🎁 Tarjetas regalo' },
  // Nuevas categorías cosméticas (2026-07-03) — se muestran solo si hay
  // items canjeables en cada una. Ver docs/sorteos-coin-economy.md §4.
  { key: 'profile', label: '🎨 Profile Cards' },
  { key: 'frame',   label: '🖼️ Avatar Frames' },
  { key: 'badge',   label: '🏅 Badges' },
];

export function PlatformShop({ items, balance }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<ShopCategory | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo<Record<string, number>>(() => {
    const byCat: Record<string, number> = { all: items.length };
    for (const it of items) byCat[it.category] = (byCat[it.category] ?? 0) + 1;
    return byCat;
  }, [items]);

  const cheapestUnaffordable = useMemo(() => {
    const stockPos = items.filter((i) => i.stock > 0 && i.costCoins > balance);
    if (stockPos.length === 0) return null;
    return stockPos.reduce((a, b) => (a.costCoins <= b.costCoins ? a : b));
  }, [items, balance]);

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
      <div className="gp-shop-summary">
        <div className="gp-shop-balance">
          <span className="l">Tu saldo</span>
          <b>🪙 {balance.toLocaleString('es-ES')}</b>
        </div>
        {cheapestUnaffordable ? (
          <div className="gp-shop-next">
            Siguiente premio a tu alcance:{' '}
            <b>{cheapestUnaffordable.name}</b> — te faltan{' '}
            <span className="gp-shop-next-gap">
              {(cheapestUnaffordable.costCoins - balance).toLocaleString('es-ES')} 🪙
            </span>
          </div>
        ) : items.length > 0 ? (
          <div className="gp-shop-next ok">✓ Puedes canjear cualquier premio disponible.</div>
        ) : null}
      </div>

      <p className="gp-shop-disclaimer" role="note">
        Las monedas son puntos internos <b>sin valor monetario</b>, no
        transferibles y no canjeables por dinero. Los precios y la
        disponibilidad pueden cambiar. Los canjes pueden requerir revisión
        antes del envío.
      </p>

      <div className="gp-shop-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`gp-shop-tab${category === c.key ? ' is-active' : ''}`}
          >
            {c.label}
            <span className="gp-shop-tab-count">{counts[c.key] ?? 0}</span>
          </button>
        ))}
      </div>
      {error ? <p className="gp-shop-error">{error}</p> : null}
      {visible.length === 0 ? (
        <p className="gp-rank-empty">
          No hay artículos en esta categoría. Prueba otra pestaña.
        </p>
      ) : (
        <div className="gp-shop-grid">
          {visible.map((item) => {
            const affordable = balance >= item.costCoins && item.stock > 0;
            const stockClass = item.stock === 0 ? ' gone' : item.stock < 4 ? ' low' : '';
            const pct = Math.min(100, Math.round((balance / Math.max(1, item.costCoins)) * 100));
            return (
              <div key={item.id} className={`gp-shop-card${affordable ? ' affordable' : ''}`}>
                <div className="gp-shop-img">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} />
                  ) : (
                    <div className="gp-shop-img-empty">Imagen pendiente</div>
                  )}
                  {affordable ? <span className="gp-shop-badge">Disponible</span> : null}
                </div>
                <h4 className="gp-shop-name">{item.name}</h4>
                {item.description ? <p className="gp-shop-desc">{item.description}</p> : <p className="gp-shop-desc" />}
                <div className="gp-shop-cost">🪙 {item.costCoins.toLocaleString('es-ES')}</div>
                <div className="gp-shop-progress" aria-hidden>
                  <span className="gp-shop-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className={`gp-shop-stock${stockClass}`}>
                  {item.stock > 0 ? `${item.stock} en stock` : 'Agotado'}
                </div>
                <button
                  type="button"
                  onClick={() => handleRedeem(item.id)}
                  disabled={!affordable || isPending}
                  className="gp-shop-btn"
                >
                  {isPending ? 'Canjeando…' : affordable ? 'Canjear' : `Faltan ${(item.costCoins - balance).toLocaleString('es-ES')} 🪙`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
