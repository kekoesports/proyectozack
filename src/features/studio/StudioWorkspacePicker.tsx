'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Search } from 'lucide-react';
import type { studioAgencyWorkspaces } from '@/lib/studio/agency';
import { StudioWorkspaceButton } from './StudioWorkspaceButton';

export function StudioWorkspacePicker({ roster }: { roster: Awaited<ReturnType<typeof studioAgencyWorkspaces>> }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(12);
  const visible = roster.filter((talent) => `${talent.name} ${talent.game}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  return <section id="creator-workspaces" className="studio-entry-picker">
    <div className="studio-section-title"><div><p className="studio-eyebrow">ELIGE PARA QUIÉN CREAR</p><h2>Espacios de creación.</h2></div><span className="studio-badge">{roster.length} talentos</span></div>
    <label className="studio-search"><Search size={18} /><input type="search" aria-label="Buscar creador" placeholder="Busca un creador o un juego…" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(12); }} /></label>
    <div className="studio-entry-grid">{visible.slice(0, limit).map((talent) => <article key={talent.id} className="studio-entry-creator">{talent.photoUrl ? <Image src={talent.photoUrl} alt="" width={80} height={80} unoptimized /> : <span className="studio-roster-initial">{talent.name.slice(0, 1)}</span>}<div><h3>{talent.name}</h3><p>{talent.game}</p></div><StudioWorkspaceButton talentId={talent.id} name={talent.name} /></article>)}</div>
    {visible.length === 0 && <p role="status">No hay creadores con esa búsqueda.</p>}
    {visible.length > limit && <button className="studio-secondary" type="button" onClick={() => setLimit(limit + 12)}>Ver más creadores ({visible.length - limit})</button>}
  </section>;
}
