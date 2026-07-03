'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { redeemShopItem } from '@/app/sorteos/plataforma/actions';
import {
  PLANNED_TEAM_MERCH,
  REAL_STEAM_REWARDS,
  type CatalogReward,
} from '@/features/giveaway-platform/constants/rewards-catalog';
import type { ShopCategory, ShopItem } from '@/types/giveawayPlatform';

interface Props {
  items: ShopItem[];
  balance: number;
  /** True si el usuario ya tiene Steam Trade URL configurada. */
  hasSteamTradeUrl: boolean;
}

const CATEGORIES: { key: ShopCategory | 'all'; label: string }[] = [
  { key: 'all',     label: 'Todo' },
  { key: 'skin',    label: '🔫 Skins CS2' },
  { key: 'merch',   label: '👕 Merch SocialPro' },
  { key: 'team',    label: '🏆 Merch equipos CS2' },
  { key: 'gift',    label: '🎁 Tarjetas regalo' },
  { key: 'profile', label: '🎨 Profile Cards' },
  { key: 'frame',   label: '🖼️ Avatar Frames' },
  { key: 'badge',   label: '🏅 Badges' },
];

/**
 * Sección "Recompensas" (antes "Tienda"). Un solo grid unificado.
 *
 * Contenido de la grid:
 *  1. Items reales de DB (`items`) — canjeables si hay saldo y stock.
 *  2. Cards "próximamente" (`PLANNED_TEAM_MERCH`) — no canjeables,
 *     placeholder visual, sin logo oficial de equipo. Se filtran del
 *     grid cuando el owner active un item equivalente en DB.
 *
 * No hay bloque separado. Todo pasa por el mismo grid + filtros por
 * categoría. Los items de tipo skin requieren Steam Trade URL — la
 * card muestra un gate visual con CTA a `/sorteos/perfil` cuando el
 * usuario aún no la tiene configurada.
 */
export function PlatformShop({ items, balance, hasSteamTradeUrl }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<ShopCategory | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Recompensas "próximamente" en el mismo grid — sin bloque separado.
  // Combina dos fuentes:
  //   1. `REAL_STEAM_REWARDS` — las 8 skins CS2 reales, mientras el seed
  //      no las haya movido a DB. Renderizadas con su imagen real, nombre,
  //      precio en puntos y stock — Canjear disabled hasta que se active.
  //   2. `PLANNED_TEAM_MERCH` — camisetas de equipos planned, placeholder
  //      visual sin logo oficial.
  //
  // Cuando el owner corre el seed (o activa un item manualmente), el mismo
  // `name` aparece en `items` (DB) → esta lista lo filtra para no duplicar
  // y la card canjeable de la grid principal es la única visible.
  const upcomingCards = useMemo(() => {
    const dbNames = new Set(items.map((i) => i.name));
    const skinsPending = REAL_STEAM_REWARDS.filter(
      (r) => r.status === 'active' && !dbNames.has(r.name),
    );
    const teamPending = PLANNED_TEAM_MERCH.filter((m) => !dbNames.has(m.name));
    // Skins primero (más atractivas visualmente) — luego team merch.
    return [...skinsPending, ...teamPending];
  }, [items]);

  const counts = useMemo<Record<string, number>>(() => {
    const byCat: Record<string, number> = { all: items.length + upcomingCards.length };
    for (const it of items) byCat[it.category] = (byCat[it.category] ?? 0) + 1;
    for (const u of upcomingCards) byCat[u.category] = (byCat[u.category] ?? 0) + 1;
    return byCat;
  }, [items, upcomingCards]);

  const cheapestUnaffordable = useMemo(() => {
    const stockPos = items.filter((i) => i.stock > 0 && i.costCoins > balance);
    if (stockPos.length === 0) return null;
    return stockPos.reduce((a, b) => (a.costCoins <= b.costCoins ? a : b));
  }, [items, balance]);

  const visibleItems = items.filter((i) => category === 'all' || i.category === category);
  const visibleUpcoming = upcomingCards.filter((u) => category === 'all' || u.category === category);
  const nothing = visibleItems.length === 0 && visibleUpcoming.length === 0;

  function handleRedeem(shopItemId: number) {
    setError(null);
    setErrorCode(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await redeemShopItem({ shopItemId });
      if (result.ok) {
        setSuccessMsg(
          result.data.requiresManualReview
            ? 'Solicitud recibida. Revisaremos el canje y enviaremos la recompensa manualmente por Steam Trade Offer.'
            : '¡Canje registrado! Revisa tu perfil para el estado del envío.',
        );
        router.refresh();
      } else {
        setError(result.error);
        setErrorCode(result.code);
      }
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

      {successMsg ? (
        <p className="gp-shop-success" role="status">
          {successMsg}
        </p>
      ) : null}
      {error ? (
        <div className="gp-shop-error" role="alert">
          <p>{error}</p>
          {errorCode === 'trade_url_required' ? (
            <Link href="/sorteos/perfil" className="gp-shop-error-cta">
              Añadir Steam Trade URL →
            </Link>
          ) : null}
        </div>
      ) : null}

      {nothing ? (
        <p className="gp-rank-empty">No hay recompensas en esta categoría. Prueba otra pestaña.</p>
      ) : (
        <div className="gp-shop-grid">
          {visibleItems.map((item) => {
            const affordable = balance >= item.costCoins && item.stock > 0;
            const isSkin = item.category === 'skin';
            const needsTradeUrl = isSkin && !hasSteamTradeUrl;
            const stockClass = item.stock === 0 ? ' gone' : item.stock < 4 ? ' low' : '';
            const pct = Math.min(100, Math.round((balance / Math.max(1, item.costCoins)) * 100));
            return (
              <div key={`db-${item.id}`} className={`gp-shop-card${affordable && !needsTradeUrl ? ' affordable' : ''}`}>
                <div className="gp-shop-img">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} />
                  ) : (
                    <RewardPlaceholder category={item.category as ShopCategory} />
                  )}
                  {affordable && !needsTradeUrl ? <span className="gp-shop-badge">Disponible</span> : null}
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

                {needsTradeUrl && affordable ? (
                  <Link href="/sorteos/perfil" className="gp-shop-btn gp-shop-btn-outline">
                    Añadir Steam Trade URL →
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRedeem(item.id)}
                    disabled={!affordable || isPending}
                    className="gp-shop-btn"
                  >
                    {isPending ? 'Canjeando…' : affordable ? 'Canjear' : `Faltan ${(item.costCoins - balance).toLocaleString('es-ES')} ⭐`}
                  </button>
                )}
              </div>
            );
          })}

          {visibleUpcoming.map((r) => (
            <UpcomingCard key={`upcoming-${r.slug}`} reward={r} />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Card "Próximamente" para recompensas planificadas del catálogo que aún
 * no viven en DB (típicamente `PLANNED_TEAM_MERCH`). Sin logo oficial de
 * equipo — placeholder + copy honesto "Diseño pendiente de confirmación".
 * Sin botón Canjear.
 */
function UpcomingCard({ reward }: { reward: CatalogReward }) {
  return (
    <article className="gp-shop-card gp-shop-card-planned">
      <div className="gp-shop-img">
        {reward.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.imageUrl} alt={reward.name} />
        ) : (
          <RewardPlaceholder category={reward.category} />
        )}
        <span className="gp-shop-badge gp-shop-badge-soon">Próximamente</span>
      </div>
      <h4 className="gp-shop-name">{reward.name}</h4>
      <p className="gp-shop-desc">{reward.description}</p>
      <div className="gp-shop-cost gp-shop-cost-pending">
        {reward.costPoints === null ? 'Precio pendiente' : `⭐ ${reward.costPoints.toLocaleString('es-ES')}`}
      </div>
      <div className="gp-shop-stock">
        {reward.stock === null ? 'Stock pendiente' : `${reward.stock} en stock`}
      </div>
      <button type="button" disabled className="gp-shop-btn" aria-label="Próximamente disponible">
        Próximamente
      </button>
    </article>
  );
}

/**
 * Placeholder visual premium para recompensas sin `imageUrl`. Fondo tipo
 * CS2 + badge de categoría + icono + label. Usado tanto por items DB sin
 * imagen como por planificados de catálogo.
 */
function RewardPlaceholder({ category }: { category: ShopCategory | 'team' }) {
  const config = PLACEHOLDER_BY_CATEGORY[category] ?? PLACEHOLDER_BY_CATEGORY.skin;
  return (
    <div className={`gp-reward-placeholder gp-reward-placeholder-${category}`} aria-hidden>
      <span className="gp-reward-placeholder-badge">{config.badge}</span>
      <span className="gp-reward-placeholder-icon">{config.icon}</span>
      <span className="gp-reward-placeholder-label">{config.label}</span>
    </div>
  );
}

const PLACEHOLDER_BY_CATEGORY: Record<ShopCategory | 'team', { badge: string; icon: string; label: string }> = {
  skin:    { badge: 'CS2',   icon: '🔫', label: 'Skin CS2' },
  merch:   { badge: 'MERCH', icon: '👕', label: 'Merch SocialPro' },
  team:    { badge: 'TEAM',  icon: '🏆', label: 'Merch equipos CS2' },
  gift:    { badge: 'GIFT',  icon: '🎁', label: 'Tarjeta regalo' },
  profile: { badge: 'CARD',  icon: '🎨', label: 'Profile Card' },
  frame:   { badge: 'FRAME', icon: '🖼️', label: 'Avatar Frame' },
  badge:   { badge: 'BADGE', icon: '🏅', label: 'Badge' },
};
