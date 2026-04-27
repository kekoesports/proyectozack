import { BellIcon, SettingsIcon } from './SidebarIcons';
import { GlobalSearch } from './search/GlobalSearch';

export function AdminHeader(): React.ReactElement {
  return (
    <header className="sticky top-0 z-30 h-16 bg-sp-admin-bg/95 backdrop-blur border-b border-sp-admin-border flex items-center gap-3 px-4 md:px-6">
      <GlobalSearch />

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          aria-label="Notificaciones"
        >
          <span className="w-5 h-5 block"><BellIcon /></span>
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          aria-label="Ajustes"
        >
          <span className="w-5 h-5 block"><SettingsIcon /></span>
        </button>
      </div>
    </header>
  );
}
