'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { redeemShopItem } from '@/app/sorteos/plataforma/actions';
import { REAL_STEAM_REWARDS, type CatalogReward } from '@/features/giveaway-platform/constants/rewards-catalog';
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

/**
 * Componente "Recompensas" (antes "Tienda"). Renombrado 2026-07-03 por
 * compliance — no queremos que parezca una tienda donde se compra con
 * dinero. Nomenclatura: el usuario canjea puntos por recompensas.
 *
 * Estructura:
 *  1. Resumen de saldo + próximo canjeable.
 *  2. Disclaimer compliance.
 *  3. Tabs por categoría.
 *  4. Grid de recompensas activas (fuente: `items` — DB).
 *  5. Bloque "Vitrina · próximamente en tienda" con recompensas del
 *     catálogo `REAL_STEAM_REWARDS` que aún no están en DB. Se
 *     deduplican por `name` para no aparecer dos veces cuando el seed
 *     las mueva a `shop_items`.
 */
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

  // Vitrina · items del catálogo que NO estén ya en DB. Cuando el seed
  // pase, los mismos `name` se filtrarán de aquí y aparecerán en la grid
  // principal como canjeables. Sin dup visual.
  const showcase = useMemo(() => {
    const dbNames = new Set(items.map((i) => i.name));
    return REAL_STEAM_REWARDS.filter(
      (r) =>
        r.status === 'active' &&
        !dbNames.has(r.name) &&
        (category === 'all' || r.category === category),
    );
  }, [items, category]);

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
          <b>⭐ {balance.toLocaleString('es-ES')}</b>
        </div>
        {cheapestUnaffordable ? (
          <div className="gp-shop-next">
            Siguiente recompensa a tu alcance:{' '}
            <b>{cheapestUnaffordable.name}</b> — te faltan{' '}
            <span className="gp-shop-next-gap">
              {(cheapestUnaffordable.costCoins - balance).toLocaleString('es-ES')} ⭐
            </span>
          </div>
        ) : items.length > 0 ? (
          <div className="gp-shop-next ok">✓ Puedes canjear cualquier recompensa disponible.</div>
        ) : null}
      </div>

      <p className="gp-shop-disclaimer" role="note">
        Los puntos son recompensas internas <b>sin valor monetario</b>, no
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
          No hay recompensas en esta categoría.{' '}
          {showcase.length > 0 ? 'Mira las próximas más abajo.' : 'Prueba otra pestaña.'}
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
                    <RewardPlaceholder category={item.category as ShopCategory} />
                  )}
                  {affordable ? <span className="gp-shop-badge">Disponible</span> : null}
                </div>
                <h4 className="gp-shop-name">{item.name}</h4>
                {item.description ? <p className="gp-shop-desc">{item.description}</p> : <p className="gp-shop-desc" />}
                <div className="gp-shop-cost">⭐ {item.costCoins.toLocaleString('es-ES')}</div>
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
                  {isPending ? 'Canjeando…' : affordable ? 'Canjear' : `Faltan ${(item.costCoins - balance).toLocaleString('es-ES')} ⭐`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Vitrina · recompensas del catálogo aún no en DB. */}
      {showcase.length > 0 ? (
        <section className="gp-rewards-upcoming" aria-labelledby="rewards-showcase-title">
          <div className="gp-rewards-upcoming-head">
            <h3 id="rewards-showcase-title" className="gp-rewards-upcoming-title">
              Próximas en tienda · Skins CS2
            </h3>
            <p className="gp-rewards-upcoming-sub">
              Confirmadas en catálogo · disponibles para canjear tras el próximo update de tienda
            </p>
          </div>
          <div className="gp-shop-grid">
            {showcase.map((r) => (
              <ShowcaseCard key={r.slug} reward={r} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

/**
 * Card de vitrina — se usa para recompensas ya definidas en el catálogo
 * (`REAL_STEAM_REWARDS`) pero que aún no han pasado por seed al DB.
 * Muestra la misma info que una card canjeable (imagen local, nombre,
 * precio en puntos, stock, rareza) pero SIN botón Canjear — en su lugar
 * indica "Próximamente disponible" y ofrece "Ver en Steam Market".
 *
 * Cuando el seed corra, DB tendrá el mismo `name`, la vitrina la filtra
 * fuera automáticamente y la card canjeable de la grid principal es la
 * única que renderiza.
 */
function ShowcaseCard({ reward }: { reward: CatalogReward }) {
  return (
    <article className="gp-shop-card gp-shop-card-planned">
      <div className="gp-shop-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={reward.imageUrl} alt={reward.name} />
        <span className="gp-shop-badge gp-shop-badge-soon">Próximamente</span>
      </div>
      <h4 className="gp-shop-name">{reward.name}</h4>
      <p className="gp-shop-desc">{reward.description}</p>
      <div className="gp-shop-cost">⭐ {reward.costPoints.toLocaleString('es-ES')}</div>
      <div className="gp-shop-stock">
        {reward.stock > 0 ? `${reward.stock} en stock` : 'Agotado'}
      </div>
      <a
        href={reward.steamMarketUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="gp-shop-btn gp-shop-btn-outline"
        aria-label={`Ver ${reward.name} en Steam Market`}
      >
        Ver en Steam Market
      </a>
    </article>
  );
}

/**
 * Placeholder premium para recompensas sin `imageUrl`. Reemplaza al
 * fallback plano anterior — poco profesional en una sección de
 * recompensas. Muestra:
 *   - Fondo oscuro tipo CS2 con textura sutil.
 *   - Badge de categoría arriba a la izquierda.
 *   - Icono grande centrado.
 *   - Etiqueta legible del tipo de recompensa.
 */
function RewardPlaceholder({ category }: { category: ShopCategory }) {
  const config = PLACEHOLDER_BY_CATEGORY[category] ?? PLACEHOLDER_BY_CATEGORY.skin;
  return (
    <div className={`gp-reward-placeholder gp-reward-placeholder-${category}`} aria-hidden>
      <span className="gp-reward-placeholder-badge">{config.badge}</span>
      <span className="gp-reward-placeholder-icon">{config.icon}</span>
      <span className="gp-reward-placeholder-label">{config.label}</span>
    </div>
  );
}

const PLACEHOLDER_BY_CATEGORY: Record<ShopCategory, { badge: string; icon: string; label: string }> = {
  skin:    { badge: 'CS2',   icon: '🔫', label: 'Skin CS2' },
  merch:   { badge: 'MERCH', icon: '👕', label: 'Merch SocialPro' },
  gift:    { badge: 'GIFT',  icon: '🎁', label: 'Tarjeta regalo' },
  profile: { badge: 'CARD',  icon: '🎨', label: 'Profile Card' },
  frame:   { badge: 'FRAME', icon: '🖼️', label: 'Avatar Frame' },
  badge:   { badge: 'BADGE', icon: '🏅', label: 'Badge' },
};
