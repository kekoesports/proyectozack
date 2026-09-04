'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { CheckCircle2, MessageSquareText, Moon, Search, Sun } from 'lucide-react';
import { CommandCenter } from './CommandCenter';
import { DealDetail } from './DealDetail';
import { DealsPipeline } from './DealsPipeline';
import { PanelSidebar } from './PanelSidebar';
import type { KekoPilotPanelData, PanelView } from './data';
import styles from './panel.module.css';

type KekoPilotPanelProps = { readonly data: KekoPilotPanelData };

type PanelStyle = CSSProperties & {
  readonly '--kp-panel-accent': string;
  readonly '--kp-panel-accent-ink': string;
};

function firstDealId(data: KekoPilotPanelData): string {
  return data.pipeline.stages.flatMap((stage) => stage.deals)[0]?.id ?? '';
}

function dealCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'deal' : 'deals'}`;
}

function approvalCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'aprobación' : 'aprobaciones'}`;
}

function agentCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'agente' : 'agentes'}`;
}

export function KekoPilotPanel({ data }: KekoPilotPanelProps) {
  const [view, setView] = useState<PanelView>('command');
  const [lightTheme, setLightTheme] = useState(true);
  const [activeDealId, setActiveDealId] = useState(() => firstDealId(data));
  const [searchQuery, setSearchQuery] = useState('');
  const activeDetail = data.dealDetails[activeDealId];
  const panelStyle: PanelStyle = {
    '--kp-panel-accent': data.branding.accentColor,
    '--kp-panel-accent-ink': data.branding.accentTextColor,
  };

  const heading = (() => {
    if (view === 'deal' && activeDetail) {
      return {
        crumb: `${data.workspace.name} · deals · ${activeDetail.deal.ref}`,
        title: `${activeDetail.deal.creator} × ${activeDetail.deal.brand}`,
      };
    }
    if (view === 'pipeline') {
      return { crumb: `${data.workspace.name} · deals`, title: `Pipeline · ${dealCountLabel(data.counts.deals)}` };
    }
    return { crumb: `${data.workspace.name} · operación`, title: 'Command Center' };
  })();

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
    <div
      className={styles.app}
      data-kp-panel-version="panel-v3"
      data-theme={lightTheme ? 'light' : 'dark'}
      style={panelStyle}
    >
      <a className={styles.skipLink} href="#kp-panel-main">Saltar al contenido</a>
      <div className={styles.shell}>
        <PanelSidebar activeView={view} branding={data.branding} counts={data.counts} onViewChange={setView} user={data.user} workspace={data.workspace} />
        <main className={styles.main} id="kp-panel-main">
          <header className={styles.topbar}>
            <div className={styles.pageTitle}><span>{heading.crumb}</span><h1>{heading.title}</h1></div>
            <div className={styles.topActions}>
              <span className={styles.systemStatus}>
                <i aria-hidden="true" />
                Sistema en línea · {agentCountLabel(data.counts.agents)}
              </span>
              <span className={styles.dataStatus} title={`Datos actualizados a las ${data.generatedAt}`}>
                <CheckCircle2 aria-hidden="true" size={14} />
                Actualizado {data.generatedAt}
              </span>
              {view !== 'deal' ? (
                <label className={styles.searchBox}>
                  <Search aria-hidden="true" size={14} />
                  <span className="sr-only">Buscar en esta vista</span>
                  <input
                    data-kp-search
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar en esta vista"
                    type="search"
                    value={searchQuery}
                  />
                  <kbd>Ctrl K</kbd>
                </label>
              ) : null}
              <Link className={styles.approvalsButton} href="/admin/agents/approvals"><i aria-hidden="true" />{approvalCountLabel(data.counts.approvals)}</Link>
              <Link aria-label={`Abrir ${data.branding.assistantName}`} className={styles.assistantButton} href="/admin/asistente">
                <MessageSquareText aria-hidden="true" size={14} />
                <span>{data.branding.assistantName}</span>
              </Link>
              <button
                aria-label={lightTheme ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
                className={styles.themeToggle}
                onClick={() => setLightTheme((current) => !current)}
                type="button"
              >
                {lightTheme ? <Moon aria-hidden="true" size={14} /> : <Sun aria-hidden="true" size={14} />}
                <span>{lightTheme ? 'Oscuro' : 'Claro'}</span>
              </button>
            </div>
          </header>

          {view === 'command' ? <CommandCenter data={data} searchQuery={searchQuery} /> : null}
          {view === 'pipeline' ? <DealsPipeline activeDealId={activeDealId} data={data.pipeline} onOpenDeal={openDeal} searchQuery={searchQuery} /> : null}
          {view === 'deal' && activeDetail ? <DealDetail detail={activeDetail} /> : null}
          {view === 'deal' && !activeDetail ? <p className={styles.empty}>No hay deals visibles para abrir.</p> : null}
        </main>
      </div>
    </div>
  );
}
