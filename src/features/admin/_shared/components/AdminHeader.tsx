import { BellIcon, SettingsIcon } from './SidebarIcons';
import { GlobalSearch } from './GlobalSearch';

/**
 * Topbar del layout admin con búsqueda global (Cmd/Ctrl+K) y atajos de notificaciones/ajustes.
 *
 * @kind server
 * @feature admin/_shared
 * @example
 * ```tsx
 * <AdminHeader />
 * ```
 */
export function AdminHeader(): React.ReactElement {
  return (
    <header className="sticky top-0 z-30 h-16 bg-sp-admin-bg/95 backdrop-blur border-b border-sp-admin-border flex items-center gap-3 px-4 md:px-6">
      <GlobalSearch />
      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          aria-label="Notificaciones"
        >
          <span className="w-4 h-4 block"><BellIcon /></span>
        </button>
        <button
          type="button"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          aria-label="Configuración"
        >
          <span className="w-4 h-4 block"><SettingsIcon /></span>
        </button>
      </div>
    </header>
  );
}
