'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';

export function StudioAgencyRoster({ roster }: { roster: { id: number; name: string; photoUrl: string | null; game: string; status: string }[] }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(12);
  const visible = roster.filter((talent) => `${talent.name} ${talent.game}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  return <section className="studio-agency-roster"><div className="studio-section-title"><div><p className="studio-eyebrow">MISMA BASE / SIN DUPLICAR FICHAS</p><h2>Los talentos de SocialPro.</h2></div><span className="studio-badge">{roster.length} fichas CRM</span></div>
    <label className="studio-search"><Search size={17} /><input type="search" aria-label="Buscar talento en Studio" placeholder="Buscar por nombre o juego…" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(12); }} /></label>
    <div className="studio-roster-grid">{visible.slice(0, limit).map((talent) => <Link href={`/admin/talents/${talent.id}`} key={talent.id} className="studio-roster-card">{talent.photoUrl ? <Image src={talent.photoUrl} alt="" width={64} height={64} unoptimized /> : <span className="studio-roster-initial">{talent.name.slice(0, 1)}</span>}<div><strong>{talent.name}</strong><small>{talent.game}</small></div><ArrowUpRight size={16} /></Link>)}</div>
    {visible.length === 0 && <p>No hay talentos con esa búsqueda.</p>}
    {visible.length > limit && <button className="studio-secondary" type="button" onClick={() => setLimit(limit + 12)}>Ver más talentos ({visible.length - limit})</button>}
    <p className="studio-muted">Una ficha del CRM no crea una cuenta ni concede acceso. Asigna el talento mediante invitación a su correo verificado.</p>
  </section>;
}
