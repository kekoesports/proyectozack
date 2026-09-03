import Link from 'next/link';
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CheckSquare2,
  CircleGauge,
  Euro,
  FileText,
  Link2,
  Mail,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NavigationItem, PanelCounts, PanelView } from './data';
import { NAVIGATION } from './data';
import styles from './panel.module.css';

const ICONS: Record<NavigationItem['icon'], LucideIcon> = {
  gauge: CircleGauge,
  briefcase: BriefcaseBusiness,
  user: UserRound,
  search: Search,
  mail: Mail,
  tasks: CheckSquare2,
  file: FileText,
  workflow: Workflow,
  bot: Bot,
  chart: BarChart3,
  euro: Euro,
  link: Link2,
  users: UsersRound,
  shield: ShieldCheck,
  settings: Settings2,
};

type PanelSidebarProps = {
  readonly activeView: PanelView;
  readonly counts: PanelCounts;
  readonly onViewChange: (view: PanelView) => void;
  readonly user: { readonly name: string; readonly role: string; readonly initials: string };
  readonly workspace: { readonly name: string; readonly meta: string; readonly initials: string };
};

export function PanelSidebar({ activeView, counts, onViewChange, user, workspace }: PanelSidebarProps) {
  const activeLabel = activeView === 'pipeline' || activeView === 'deal' ? 'Deals' : 'Command Center';

  return (
    <aside className={styles.sidebar} aria-label="Navegación del workspace">
      <div className={styles.workspaceBlock}>
        <strong className={styles.brand}>KEKO<span>PILOT</span></strong>
        <Link className={styles.workspace} href="/admin" aria-label="Abrir panel principal de SocialPro">
          <span className={styles.workspaceAvatar}>{workspace.initials}</span>
          <span className={styles.workspaceCopy}>
            <strong>{workspace.name}</strong>
            <small>{workspace.meta}</small>
          </span>
          <span className={styles.workspaceChevron} aria-hidden="true">→</span>
        </Link>
      </div>

      <nav className={styles.sidebarNav}>
        {NAVIGATION.map((group) => (
          <div className={styles.navGroup} key={group.title}>
            <span className={styles.navGroupTitle}>{group.title}</span>
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const isActive = item.label === activeLabel;
              const badge = item.badgeKey ? counts[item.badgeKey] : 0;
              const targetView = item.view;
              const content = <><Icon aria-hidden="true" size={15} strokeWidth={1.7} /><span>{item.label}</span>{badge > 0 ? <small>{badge}</small> : null}</>;
              return targetView ? (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={styles.navItem}
                  data-active={isActive ? 'true' : undefined}
                  key={item.label}
                  onClick={() => onViewChange(targetView)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <Link className={styles.navItem} href={item.href ?? '/admin'} key={item.label}>{content}</Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.userBlock}>
        <span>{user.initials}</span>
        <div><strong>{user.name}</strong><small>{user.role.replaceAll('_', ' ')}</small></div>
      </div>
    </aside>
  );
}
