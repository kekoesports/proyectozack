'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { ArchitectureView } from './ArchitectureView';
import { CommandCenter } from './CommandCenter';
import { DealDetail } from './DealDetail';
import { DealsPipeline } from './DealsPipeline';
import { PanelSidebar } from './PanelSidebar';
import type { KekoPilotPanelData, PanelView } from './data';
import { VIEW_LABELS } from './data';
import styles from './panel.module.css';

type KekoPilotPanelProps = { readonly data: KekoPilotPanelData };

function firstDealId(data: KekoPilotPanelData): string {
  return data.pipeline.stages.flatMap((stage) => stage.deals)[0]?.id ?? '';
}

export function KekoPilotPanel({ data }: KekoPilotPanelProps) {
  const [view, setView] = useState<PanelView>('command');
  const [lightTheme, setLightTheme] = useState(false);
  const [activeDealId, setActiveDealId] = useState(() => firstDealId(data));
  const [searchQuery, setSearchQuery] = useState('');
  const activeDetail = data.dealDetails[activeDealId];

  const heading = useMemo(() => {
    if (view === 'deal' && activeDetail) {
      return {
        crumb: `${data.workspace.name} · deals · ${activeDetail.deal.ref}`,
        title: `${activeDetail.deal.creator} × ${activeDetail.deal.brand}`,
      };
    }
    if (view === 'pipeline') {
      return { crumb: `${data.workspace.name} · deals`, title: `Pipeline · ${data.counts.deals} deals` };
    }
    if (view === 'architecture') return { crumb: 'Documentación', title: 'Arquitectura, roles y flujos' };
    return { crumb: `${data.workspace.name} · operación`, title: 'Command Center' };
  }, [activeDetail, data.counts.deals, data.workspace.name, view]);

  const openDeal = (dealId: string) => {
    setActiveDealId(dealId);
    setView('deal');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('[data-kp-search]')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={styles.app} data-theme={lightTheme ? 'light' : 'dark'}>
      <a className={styles.skipLink} href="#kp-panel-main">Saltar al contenido</a>
      <header className={styles.prototypeBar}>
        <span>Panel · SocialPro · actualizado {data.generatedAt}</span>
        <nav aria-label="Vistas del panel">
          {VIEW_LABELS.map((item) => (
            <button aria-pressed={view === item.id} key={item.id} onClick={() => setView(item.id)} type="button">{item.label}</button>
          ))}
        </nav>
        <button className={styles.themeToggle} onClick={() => setLightTheme((current) => !current)} type="button">
          {lightTheme ? 'Claro' : 'Oscuro'}
        </button>
      </header>

      <div className={styles.shell}>
        <PanelSidebar activeView={view} counts={data.counts} onViewChange={setView} user={data.user} workspace={data.workspace} />
        <main className={styles.main} id="kp-panel-main">
          <header className={styles.topbar}>
            <div className={styles.pageTitle}><span>{heading.crumb}</span><h1>{heading.title}</h1></div>
            <div className={styles.topActions}>
              <label className={styles.searchBox}>
                <Search aria-hidden="true" size={14} />
                <span className="sr-only">Buscar en esta vista</span>
                <input
                  data-kp-search
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar"
                  type="search"
                  value={searchQuery}
                />
                <kbd>⌘K</kbd>
              </label>
              <Link className={styles.approvalsButton} href="/admin/agents/approvals"><i aria-hidden="true" />{data.counts.approvals} aprobaciones</Link>
              <Link className={styles.zackButton} href="/admin/asistente">Zack Operaciones <kbd>⌘J</kbd></Link>
            </div>
          </header>

          {view === 'command' ? <CommandCenter data={data} searchQuery={searchQuery} /> : null}
          {view === 'pipeline' ? <DealsPipeline activeDealId={activeDealId} data={data.pipeline} onOpenDeal={openDeal} searchQuery={searchQuery} /> : null}
          {view === 'deal' && activeDetail ? <DealDetail detail={activeDetail} /> : null}
          {view === 'deal' && !activeDetail ? <p className={styles.empty}>No hay deals visibles para abrir.</p> : null}
          {view === 'architecture' ? <ArchitectureView /> : null}
        </main>
      </div>
    </div>
  );
}
