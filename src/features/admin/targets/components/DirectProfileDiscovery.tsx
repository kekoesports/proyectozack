'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';

import {
  importInstagramProfileAction,
  importKickProfileAction,
  lookupKickProfileAction,
  type DirectProfilePreview,
} from '@/app/admin/(dashboard)/targets/discovery-actions';

const INPUT_CLASS = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2.5 text-sm text-sp-admin-text';

export function DirectProfileDiscovery({ platform }: { readonly platform: 'instagram' | 'kick' }): React.ReactElement {
  return platform === 'kick' ? <KickDiscovery /> : <InstagramDiscovery />;
}

function KickDiscovery(): React.ReactElement {
  const [slug, setSlug] = useState('');
  const [profile, setProfile] = useState<DirectProfilePreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lookup = (): void => {
    setMessage(null);
    startTransition(async () => {
      const response = await lookupKickProfileAction(slug);
      setProfile(response.profile);
      setMessage(response.error);
    });
  };

  const save = (): void => {
    startTransition(async () => {
      const response = await importKickProfileAction(slug);
      setMessage(response.error ?? `${response.inserted} lead nuevo y ${response.updated} perfil actualizado.`);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-sp-admin-muted">Busca un canal concreto por su usuario. Kick se consulta en tiempo real y el CRM conserva la información comercial existente si ya estaba guardado.</p>
      <div className="flex max-w-xl gap-2">
        <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="usuario de Kick" className={`${INPUT_CLASS} flex-1`} />
        <button type="button" onClick={lookup} disabled={isPending || slug.trim().length < 2} className="rounded-lg bg-[#53fc18] px-4 py-2 text-xs font-bold text-black disabled:opacity-40">Comprobar perfil</button>
      </div>
      {message && <p className="text-xs text-sp-admin-muted">{message}</p>}
      {profile && (
        <article className="flex max-w-2xl gap-4 rounded-xl border border-sp-admin-border bg-sp-admin-bg/40 p-4">
          {profile.profilePicUrl ? <Image src={profile.profilePicUrl} alt="" width={56} height={56} unoptimized className="h-14 w-14 rounded-full object-cover" /> : <div className="h-14 w-14 rounded-full bg-sp-admin-hover" />}
          <div className="min-w-0 flex-1">
            <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="font-bold text-sp-admin-text hover:text-[#53fc18]">{profile.fullName}</a>
            <p className="mt-1 text-xs text-sp-admin-muted">{profile.followers.toLocaleString('es-ES')} seguidores · {profile.country ?? 'país sin declarar'}</p>
            <p className="mt-1 text-[11px] text-sp-admin-muted">{profile.categories.join(' · ') || 'Sin categorías recientes'}</p>
            <button type="button" onClick={save} disabled={isPending} className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">Añadir a Leads CC</button>
          </div>
        </article>
      )}
    </div>
  );
}

function InstagramDiscovery(): React.ReactElement {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [followers, setFollowers] = useState(0);
  const [countryCode, setCountryCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = (): void => {
    setMessage(null);
    startTransition(async () => {
      const response = await importInstagramProfileAction({
        username,
        fullName: fullName || undefined,
        followers,
        countryCode: countryCode || undefined,
        contactEmail: contactEmail || undefined,
      });
      setMessage(response.error ?? `${response.inserted} lead nuevo y ${response.updated} perfil actualizado.`);
      if (!response.error) setUsername('');
    });
  };

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
        Instagram no ofrece búsqueda pública general de perfiles mediante la API disponible. Hasta conectar una cuenta profesional de Meta, se incorporan perfiles concretos para verificación; no se usan scrapers ni se aprueban automáticamente.
      </p>
      <div className="grid gap-3 lg:grid-cols-5">
        <Field label="Usuario"><input value={username} onChange={(event) => setUsername(event.target.value.replace(/^@/, ''))} placeholder="usuario" className={INPUT_CLASS} /></Field>
        <Field label="Nombre"><input value={fullName} onChange={(event) => setFullName(event.target.value)} className={INPUT_CLASS} /></Field>
        <Field label="Seguidores"><input type="number" min={0} value={followers} onChange={(event) => setFollowers(Number(event.target.value))} className={INPUT_CLASS} /></Field>
        <Field label="País"><input value={countryCode} maxLength={2} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} placeholder="ES" className={INPUT_CLASS} /></Field>
        <Field label="Email"><input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className={INPUT_CLASS} /></Field>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={isPending || username.trim().length === 0} className="rounded-lg bg-gradient-to-r from-pink-600 to-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Añadir perfil</button>
        {message && <p className="text-xs text-sp-admin-muted">{message}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }): React.ReactElement {
  return <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">{label}</span>{children}</label>;
}
