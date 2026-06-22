const s = { width: '100%', height: '100%', viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/**
 * Set de iconos SVG inline (20×20, stroke currentColor) usados por el sidebar y la topbar del admin.
 *
 * Cada export es un icono autónomo (Dashboard, Talent, Case, Brand, Analytics, Team, Bell, Search, etc.)
 * pensado para envolverse en un wrapper con tamaño fijo (`w-5 h-5`).
 *
 * @kind server
 * @feature admin/_shared
 * @example
 * ```tsx
 * <span className="w-5 h-5 block"><DashboardIcon /></span>
 * ```
 */
export function DashboardIcon() {
  return (
    <svg {...s}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  );
}

export function TalentIcon() {
  return (
    <svg {...s}>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  );
}

export function CaseIcon() {
  return (
    <svg {...s}>
      <path d="M7 3h6l2 3H5l2-3z" />
      <rect x="3" y="6" width="14" height="11" rx="2" />
      <path d="M8 10h4" />
    </svg>
  );
}

export function BrandIcon() {
  return (
    <svg {...s}>
      <rect x="3" y="5" width="14" height="12" rx="2" />
      <path d="M7 5V3h6v2" />
      <path d="M3 10h14" />
    </svg>
  );
}

export function AnalyticsIcon() {
  return (
    <svg {...s}>
      <path d="M3 17V10l4 3 4-7 4 4 2-3" />
      <line x1="3" y1="17" x2="17" y2="17" />
    </svg>
  );
}

export function TeamIcon() {
  return (
    <svg {...s}>
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="13" cy="7" r="2.5" />
      <path d="M1 17c0-2.8 2.2-5 5-5h2" />
      <path d="M11 12h2c2.8 0 5 2.2 5 5" />
    </svg>
  );
}

export function GiveawayIcon() {
  return (
    <svg {...s}>
      <path d="M10 2a2 2 0 0 1 4 0v2h3a2 2 0 0 1 2 2v2H5V6a2 2 0 0 1 2-2h3V2z" />
      <rect x="5" y="8" width="14" height="10" rx="2" />
      <path d="M12 8v10" />
    </svg>
  );
}

export function ContactIcon() {
  return (
    <svg {...s}>
      <rect x="2" y="4" width="16" height="12" rx="2" />
      <path d="M2 7l8 5 8-5" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg {...s}>
      <rect x="3" y="12" width="3" height="5" rx="0.5" />
      <rect x="8.5" y="7" width="3" height="10" rx="0.5" />
      <rect x="14" y="3" width="3" height="14" rx="0.5" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg {...s}>
      <path d="M10 2l2.5 5.5L18 8.5l-4 4 1 5.5L10 15.5 5 18l1-5.5-4-4 5.5-1z" />
    </svg>
  );
}

export function StatsIcon() {
  return (
    <svg {...s}>
      <polyline points="3 17 8 12 12 15 17 8" />
      <line x1="3" y1="17" x2="17" y2="17" />
      <circle cx="8" cy="12" r="1" />
      <circle cx="12" cy="15" r="1" />
      <circle cx="17" cy="8" r="1" />
    </svg>
  );
}

export function TasksIcon() {
  return (
    <svg {...s}>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M7 9l2 2 4-4" />
      <line x1="7" y1="14" x2="13" y2="14" />
    </svg>
  );
}

export function MyWeekIcon() {
  return (
    <svg {...s}>
      <rect x="3" y="5" width="14" height="12" rx="2" />
      <line x1="3" y1="9" x2="17" y2="9" />
      <line x1="7" y1="3" x2="7" y2="6" />
      <line x1="13" y1="3" x2="13" y2="6" />
      <circle cx="10" cy="13" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TargetsIcon() {
  return (
    <svg {...s}>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3.5" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="10" y1="16" x2="10" y2="19" />
      <line x1="1" y1="10" x2="4" y2="10" />
      <line x1="16" y1="10" x2="19" y2="10" />
    </svg>
  );
}

export function InvoiceIcon() {
  return (
    <svg {...s}>
      <path d="M5 2h8l3 3v13l-2-1.5L12 18l-2-1.5L8 18l-2-1.5L4 18V2z" />
      <line x1="7" y1="7" x2="14" y2="7" />
      <line x1="7" y1="10" x2="14" y2="10" />
      <line x1="7" y1="13" x2="11" y2="13" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg {...s}>
      <path d="M10 3a4 4 0 0 0-4 4v3.5L4.5 14h11L14 10.5V7a4 4 0 0 0-4-4z" />
      <path d="M8.5 17a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...s}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 1.5v2.5M10 16v2.5M3.5 3.5l1.8 1.8M14.7 14.7l1.8 1.8M1.5 10h2.5M16 10h2.5M3.5 16.5l1.8-1.8M14.7 5.3l1.8-1.8" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg {...s}>
      <circle cx="9" cy="9" r="5.5" />
      <line x1="17" y1="17" x2="13" y2="13" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg {...s}>
      <polyline points="5 8 10 13 15 8" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg {...s}>
      <circle cx="5" cy="10" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg {...s}>
      <circle cx="10" cy="10" r="3.5" />
      <line x1="10" y1="2" x2="10" y2="4.5" />
      <line x1="10" y1="15.5" x2="10" y2="18" />
      <line x1="2" y1="10" x2="4.5" y2="10" />
      <line x1="15.5" y1="10" x2="18" y2="10" />
      <line x1="4.2" y1="4.2" x2="5.9" y2="5.9" />
      <line x1="14.1" y1="14.1" x2="15.8" y2="15.8" />
      <line x1="4.2" y1="15.8" x2="5.9" y2="14.1" />
      <line x1="14.1" y1="5.9" x2="15.8" y2="4.2" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg {...s}>
      <path d="M15.5 10A6.5 6.5 0 1 1 10 4.5a5 5 0 0 0 5.5 5.5z" />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg {...s}>
      <path d="M8 4H4v12h4" />
      <path d="M14 6l3 4-3 4" />
      <line x1="17" y1="10" x2="8" y2="10" />
    </svg>
  );
}

export function CampaignIcon() {
  return (
    <svg {...s}>
      <rect x="2" y="7" width="16" height="11" rx="2" />
      <path d="M6 7V5a4 4 0 0 1 8 0v2" />
      <line x1="10" y1="11" x2="10" y2="14" />
      <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DealsIcon() {
  return (
    <svg {...s}>
      <path d="M12 3l1.5 4.5h4.5l-3.5 2.5 1.5 4.5L12 12l-4 2.5 1.5-4.5L6 7.5h4.5z" />
    </svg>
  );
}

export function BackupIcon() {
  return (
    <svg {...s}>
      <path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

export function NewsIcon() {
  return (
    <svg {...s}>
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <line x1="7" y1="7" x2="13" y2="7" />
      <line x1="7" y1="10" x2="13" y2="10" />
      <line x1="7" y1="13" x2="10" y2="13" />
    </svg>
  );
}

export function ExpenseIcon() {
  return (
    <svg {...s}>
      <rect x="2" y="5" width="16" height="12" rx="2" />
      <path d="M2 9h16" />
      <path d="M6 13h4" />
      <circle cx="14" cy="13" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AiIcon() {
  return (
    <svg {...s}>
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10h2l1-3 2 6 1-3h2" />
    </svg>
  );
}

export function LiveIcon() {
  return (
    <svg {...s}>
      <circle cx="10" cy="10" r="3" />
      <path d="M5 10a5 5 0 0 1 10 0" />
      <path d="M2 10a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function ContractIcon() {
  return (
    <svg {...s}>
      <path d="M5 2h8l3 3v13H4V2z" />
      <path d="M13 2v3h3" />
      <line x1="7" y1="8"  x2="13" y2="8"  />
      <line x1="7" y1="11" x2="13" y2="11" />
      <line x1="7" y1="14" x2="10" y2="14" />
    </svg>
  );
}
