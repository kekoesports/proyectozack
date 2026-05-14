'use client';

import { useState, useTransition } from 'react';
import { upsertBrandAction, deleteBrandAction } from './brand-actions';
import type { BrandCatalogEntry } from './brand-actions';

const CATEGORIES = [
  { value: '',          label: 'Sin categoría' },
  { value: 'casino',    label: 'Casino' },
  { value: 'apuestas',  label: 'Apuestas' },
  { value: 'skins_cs2', label: 'Skins CS2' },
  { value: 'gaming',    label: 'Gaming' },
  { value: 'otros',     label: 'Otros' },
];

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';

type FormState = {
  id?:         number;
  name:        string;
  logoUrl:     string;
  defaultUrl:  string;
  category:    string;
  sortOrder:   number;
};

const EMPTY: FormState = { name: '', logoUrl: '', defaultUrl: '', category: '', sortOrder: 0 };

export function BrandCatalogManager({ brands: initial }: { brands: BrandCatalogEntry[] }) {
  const [brands, setBrands] = useState(initial);
  const [form, setForm]     = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [error, setError]   = useState('');
  const [isPending, start]  = useTransition();

  function edit(b: BrandCatalogEntry) {
    setForm({ id: b.id, name: b.name, logoUrl: b.logoUrl ?? '', defaultUrl: b.defaultUrl ?? '', category: b.category ?? '', sortOrder: b.sortOrder });
    setEditing(true);
    setError('');
  }

  function reset() {
    setForm(EMPTY);
    setEditing(false);
    setError('');
  }

  function handleSave() {
    setError('');
    start(async () => {
      const res = await upsertBrandAction({ ...form, isActive: true });
      if (!res.ok) { setError(res.error); return; }
      // Refetch
      const updated = await fetch(window.location.href).catch(() => null);
      if (updated) window.location.reload();
      else reset();
    });
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar "${name}" del catálogo?`)) return;
    start(async () => {
      await deleteBrandAction(id);
      setBrands(prev => prev.filter(b => b.id !== id));
    });
  }

  const CL = 'block text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1';

  return (
    <div className="space-y-6">

      {/* Formulario */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
        <h3 className="text-sm font-bold text-sp-admin-text mb-4">{editing ? 'Editar marca' : 'Nueva marca'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={CL}>Nombre *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="SkinClub" className={inputCls} />
          </div>
          <div>
            <label className={CL}>Categoría</label>
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className={inputCls}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={CL}>URL del logo</label>
            <div className="flex gap-2 items-center">
              <input value={form.logoUrl} onChange={e => setForm(f => ({...f, logoUrl: e.target.value}))} placeholder="https://i.imgur.com/..." className={inputCls} />
              {form.logoUrl && (
                <div className="w-10 h-10 rounded-lg border border-sp-admin-border bg-sp-admin-bg flex items-center justify-center overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.logoUrl} alt="preview" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                </div>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={CL}>URL por defecto (se pre-rellena al seleccionar)</label>
            <input value={form.defaultUrl} onChange={e => setForm(f => ({...f, defaultUrl: e.target.value}))} placeholder="https://l.skin.club/ref/..." className={inputCls} />
          </div>
          <div>
            <label className={CL}>Orden</label>
            <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({...f, sortOrder: parseInt(e.target.value) || 0}))} className={inputCls} min={0} />
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={handleSave} disabled={isPending || !form.name.trim()}
            className="px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Añadir marca'}
          </button>
          {editing && <button onClick={reset} className="px-4 py-2 rounded-lg border border-sp-admin-border text-sm text-sp-admin-muted hover:text-sp-admin-text transition-colors">Cancelar</button>}
        </div>
      </div>

      {/* Lista */}
      {brands.length === 0 ? (
        <p className="text-sm text-sp-admin-muted text-center py-8">No hay marcas. Añade la primera arriba.</p>
      ) : (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                {['Logo', 'Nombre', 'Categoría', 'URL por defecto', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-[10px] font-semibold text-sp-admin-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brands.map(b => (
                <tr key={b.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                  <td className="px-4 py-3 w-12">
                    {b.logoUrl ? (
                      <div className="w-8 h-8 rounded bg-sp-admin-bg border border-sp-admin-border flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.logoUrl} alt={b.name} className="w-full h-full object-contain p-0.5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-sp-admin-border/40 flex items-center justify-center text-[9px] text-sp-admin-muted font-bold">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-sp-admin-text">{b.name}</td>
                  <td className="px-4 py-3 text-sp-admin-muted text-xs">{b.category ?? '—'}</td>
                  <td className="px-4 py-3 text-sp-admin-muted text-xs max-w-[200px] truncate">{b.defaultUrl ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => edit(b)} className="text-xs text-sp-admin-accent hover:opacity-70 font-semibold transition-opacity">Editar</button>
                      <button onClick={() => handleDelete(b.id, b.name)} className="text-xs text-red-400 hover:opacity-70 transition-opacity">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
