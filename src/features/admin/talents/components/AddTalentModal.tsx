'use client';

import { useState, useTransition } from 'react';
import { createTalentAction } from '@/app/admin/(dashboard)/talents/actions';

type Props = { readonly onClose: () => void };

// ── Constantes ────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'twitch',    label: 'Twitch',    color: '#9147ff', icon: '📺' },
  { id: 'kick',      label: 'Kick',      color: '#53fc18', icon: '🟢' },
  { id: 'youtube',   label: 'YouTube',   color: '#ff0000', icon: '▶' },
  { id: 'instagram', label: 'Instagram', color: '#e1306c', icon: '📷' },
  { id: 'tiktok',    label: 'TikTok',    color: '#010101', icon: '🎵' },
  { id: 'x',         label: 'X',         color: '#1da1f2', icon: '𝕏' },
] as const;

type PlatformId = (typeof PLATFORMS)[number]['id'];

const COUNTRIES = [
  { code: 'ES', label: 'España' },
  { code: 'AR', label: 'Argentina' },
  { code: 'MX', label: 'México' },
  { code: 'CL', label: 'Chile' },
  { code: 'CO', label: 'Colombia' },
  { code: 'PE', label: 'Perú' },
  { code: 'BR', label: 'Brasil' },
  { code: 'US', label: 'EEUU' },
  { code: 'TR', label: 'Turquía' },
] as const;

const SECTORS = [
  { id: 'casino',         label: 'Casino' },
  { id: 'cs2_cases',      label: 'CS2 Cases' },
  { id: 'sports_betting', label: 'Apuestas' },
  { id: 'cs2_marketplace',label: 'CS2 Marketplace' },
  { id: 'gaming_brands',  label: 'Gaming / Esports' },
  { id: 'crypto',         label: 'Crypto' },
  { id: 'tech',           label: 'Tech' },
  { id: 'otros',          label: 'Otros' },
] as const;

const CONTACT_TYPES = [
  { id: 'telegram',  label: 'Telegram',  placeholder: '@usuario' },
  { id: 'discord',   label: 'Discord',   placeholder: 'usuario#0000' },
  { id: 'whatsapp',  label: 'WhatsApp',  placeholder: '+34 600…' },
  { id: 'email',     label: 'Email',     placeholder: 'mail@ejemplo.com' },
] as const;

type ContactType = (typeof CONTACT_TYPES)[number]['id'];

// ── Helpers de flag ────────────────────────────────────────────────────
function flag(code: string): string {
  const c = code.toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return c;
  const OFF = 0x1F1E6 - 0x41;
  try {
    return String.fromCodePoint(c.charCodeAt(0) + OFF) + String.fromCodePoint(c.charCodeAt(1) + OFF);
  } catch { return c; }
}

// ── Estilos ───────────────────────────────────────────────────────────
const INPUT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors';
const LABEL = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1.5';

// ── Componente principal ──────────────────────────────────────────────

export function AddTalentModal({ onClose }: Props): React.ReactElement {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Campos básicos
  const [name,       setName]       = useState('');
  const [game,       setGame]       = useState('');
  const [status,     setStatus]     = useState<'active' | 'inactive'>('active');
  const [visibility, setVisibility] = useState<'internal' | 'public'>('internal');

  // Plataforma principal
  const [mainPlatform, setMainPlatform] = useState<PlatformId>('twitch');
  const [mainHandle,   setMainHandle]   = useState('');

  // Plataformas secundarias (hasta 3)
  const [secondaries, setSecondaries] = useState<{ platform: PlatformId; handle: string }[]>([]);

  // País
  const [country, setCountry] = useState('');

  // Sectores (multi-selección)
  const [sectors, setSectors] = useState<Set<string>>(new Set());
  const toggleSector = (id: string): void =>
    setSectors((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  // Contactos (hasta 2)
  const [contacts, setContacts] = useState<{ type: ContactType; value: string }[]>([
    { type: 'telegram', value: '' },
  ]);

  const addContact = (): void => {
    if (contacts.length < 2) setContacts((p) => [...p, { type: 'email', value: '' }]);
  };

  const updateContact = (i: number, field: 'type' | 'value', val: string): void =>
    setContacts((p) => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  // Submit
  const handleSubmit = (): void => {
    if (!name.trim() || !mainHandle.trim()) {
      setError('Nombre y handle principal son obligatorios.');
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set('name', name.trim());
    fd.set('platform', mainPlatform);
    fd.set('handle', mainHandle.trim().replace(/^@/, ''));
    fd.set('game', game.trim());
    fd.set('country', country);
    fd.set('status', status);
    fd.set('visibility', visibility);
    fd.set('verticals', [...sectors].join(','));

    secondaries.forEach((s, i) => {
      if (s.platform && s.handle.trim()) {
        fd.set(`platform_${i + 2}`, s.platform);
        fd.set(`handle_${i + 2}`, s.handle.trim().replace(/^@/, ''));
      }
    });

    contacts.forEach((c, i) => {
      if (c.value.trim()) {
        fd.set(`contact_${i + 1}_type`, c.type);
        fd.set(`contact_${i + 1}_value`, c.value.trim());
      }
    });

    startTransition(async () => {
      const result = await createTalentAction({ success: false }, fd);
      if (result.error) setError(result.error);
      else onClose();
    });
  };

  const availableSecondaryPlatforms = PLATFORMS.filter((p) => p.id !== mainPlatform);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border sticky top-0 bg-sp-admin-card z-10">
          <h2 className="text-base font-bold text-sp-admin-text">Añadir talento</h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Nombre */}
          <div>
            <label className={LABEL}>Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: MechaAlvarez" className={INPUT} />
          </div>

          {/* Plataforma principal */}
          <div>
            <label className={LABEL}>Plataforma principal *</label>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setMainPlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                    mainPlatform === p.id
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-sp-admin-hover border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'
                  }`}
                  style={mainPlatform === p.id ? { background: p.color } : {}}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
            <input
              value={mainHandle}
              onChange={(e) => setMainHandle(e.target.value)}
              placeholder={`Handle en ${PLATFORMS.find((p) => p.id === mainPlatform)?.label ?? ''} (sin @)`}
              className={INPUT}
            />
          </div>

          {/* Plataformas secundarias */}
          <div>
            <label className={LABEL}>Plataformas secundarias</label>
            <div className="space-y-2">
              {secondaries.map((sec, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {PLATFORMS.filter((p) => p.id !== mainPlatform).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSecondaries((prev) => prev.map((s, idx) => idx === i ? { ...s, platform: p.id } : s))}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                          sec.platform === p.id
                            ? 'text-white border-transparent'
                            : 'bg-sp-admin-hover border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'
                        }`}
                        style={sec.platform === p.id ? { background: PLATFORMS.find((pl) => pl.id === p.id)?.color } : {}}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={sec.handle}
                    onChange={(e) => setSecondaries((prev) => prev.map((s, idx) => idx === i ? { ...s, handle: e.target.value } : s))}
                    placeholder="Handle"
                    className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-2 py-1.5 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 w-32 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => setSecondaries((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
                  >×</button>
                </div>
              ))}
              {secondaries.length < 3 && availableSecondaryPlatforms.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = availableSecondaryPlatforms[0];
                    if (!next) return;
                    setSecondaries((prev) => [...prev, { platform: next.id, handle: '' }]);
                  }}
                  className="text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity"
                >
                  + Añadir plataforma secundaria
                </button>
              )}
            </div>
          </div>

          {/* País */}
          <div>
            <label className={LABEL}>País</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCountry(country === c.code ? '' : c.code)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    country === c.code
                      ? 'bg-sp-admin-accent text-white border-sp-admin-accent'
                      : 'bg-sp-admin-hover border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'
                  }`}
                >
                  {flag(c.code)} {c.code}
                </button>
              ))}
            </div>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="O escribe ISO-2 (ej: DE)"
              maxLength={2}
              className="w-28 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-1.5 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50"
            />
          </div>

          {/* Sectores */}
          <div>
            <label className={LABEL}>Sectores / categorías</label>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSector(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    sectors.has(s.id)
                      ? 'bg-sp-admin-accent text-white border-sp-admin-accent'
                      : 'bg-sp-admin-hover border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Juego / categoría */}
          <div>
            <label className={LABEL}>Juego / categoría principal</label>
            <input value={game} onChange={(e) => setGame(e.target.value)} placeholder="CS2, Valorant, Casino…" className={INPUT} />
          </div>

          {/* Contactos */}
          <div>
            <label className={LABEL}>Contacto (hasta 2)</label>
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex gap-2">
                  {/* Tipo */}
                  <div className="flex gap-1 shrink-0">
                    {CONTACT_TYPES.map((ct) => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => updateContact(i, 'type', ct.id)}
                        className={`px-2 py-1.5 rounded text-[10px] font-bold border transition-all ${
                          c.type === ct.id
                            ? 'bg-sp-admin-accent text-white border-sp-admin-accent'
                            : 'bg-sp-admin-hover border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'
                        }`}
                        title={ct.label}
                      >
                        {ct.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  <input
                    value={c.value}
                    onChange={(e) => updateContact(i, 'value', e.target.value)}
                    placeholder={CONTACT_TYPES.find((ct) => ct.id === c.type)?.placeholder ?? ''}
                    className="flex-1 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-1.5 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50"
                  />
                  {contacts.length > 1 && (
                    <button type="button" onClick={() => setContacts((p) => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 shrink-0">×</button>
                  )}
                </div>
              ))}
              {contacts.length < 2 && (
                <button type="button" onClick={addContact} className="text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity">
                  + Añadir otro contacto
                </button>
              )}
            </div>
          </div>

          {/* Estado + Visibilidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Estado</label>
              <div className="flex gap-2">
                {(['active', 'inactive'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      status === s
                        ? s === 'active' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-400 text-white border-slate-400'
                        : 'bg-sp-admin-hover border-sp-admin-border text-sp-admin-muted'
                    }`}
                  >
                    {s === 'active' ? 'Activo' : 'Inactivo'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={LABEL}>Visibilidad</label>
              <div className="flex gap-2">
                {(['internal', 'public'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      visibility === v
                        ? 'bg-sp-admin-accent text-white border-sp-admin-accent'
                        : 'bg-sp-admin-hover border-sp-admin-border text-sp-admin-muted'
                    }`}
                  >
                    {v === 'internal' ? 'Interno' : 'Público'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-sp-admin-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-sp-admin-border text-[13px] font-medium text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Creando…' : '+ Añadir talento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
