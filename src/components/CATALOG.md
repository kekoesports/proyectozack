# Component Catalog — SocialPro

> **Manifest autogenerado** por `npm run catalog`. Lista canónica de todos
> los componentes en `src/`. Las reglas de ubicación viven en
> `AGENTS.md` sección "Component Conventions".

## Cómo leer este catálogo

| Columna | Significado |
|---|---|
| **Componente** | Nombre del export PascalCase (deriva del archivo). |
| **Path** | Ruta relativa desde el root del repo. |
| **Kind** | `server` (default) o `client` (`'use client'` detectado). |
| **LOC** | Líneas. ⚠️ >300 (objetivo) · 🚨 >500 (hard limit). |
| **Descripción** | Primera línea del bloque TSDoc del export. |

## Estado

- **Total componentes:** 184
- **Componentes >300 LOC:** 9 ⚠️
- **Componentes >500 LOC:** 0 ✅
- **Generado:** 2026-04-27T16:21:33.915Z

> **Cómo se descubre un componente para un LLM:**
> 1. Busca por nombre en la columna "Componente".
> 2. Lee el README de la feature (`src/features/<f>/README.md`).
> 3. Lee el TSDoc del componente.
> 4. Solo entonces abre el `.tsx`.

## Tabla de componentes

### UI primitives (`src/components/ui/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `button` | `src/components/ui/button.tsx` | client | 72 | Botón shadcn-style con variantes (`variant`, `size`) gestionadas por `cva`. |
| `DeleteButton` | `src/components/ui/DeleteButton.tsx` | client | 31 | Botón "Eliminar" con `confirm()` nativo. Pensado para formularios de admin |
| `FadeInOnScroll` | `src/components/ui/FadeInOnScroll.tsx` | client | 45 | Fades+slides the subtree in once when scrolled into view. Driven by a |
| `FilterTabs` | `src/components/ui/FilterTabs.tsx` | client | 65 | Tabs de filtro con indicador animado (gradient pill) que se desplaza entre |
| `GradientText` | `src/components/ui/GradientText.tsx` | server | 27 | Span que aplica el gradiente de marca al texto vía la clase `.gradient-text` |
| `SectionHeading` | `src/components/ui/SectionHeading.tsx` | server | 29 | Encabezado `<h2>` con la tipografía display de la marca para títulos de |
| `SectionTag` | `src/components/ui/SectionTag.tsx` | client | 42 | Etiqueta de sección (eyebrow) en uppercase + naranja de marca, con |
| `SocialIcon` | `src/components/ui/SocialIcon.tsx` | server | 48 | Icono SVG inline para una red social. Resuelve `type` a un path conocido |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | server | 35 | Badge de estado (`active` / `available` / `inactive`) con color y label en |
| `tooltip` | `src/components/ui/tooltip.tsx` | client | 83 | Tooltip shadcn-style sobre `@base-ui/react/tooltip`. Se usa junto con |

### Layout / Chrome (`src/components/layout/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `Analytics` | `src/components/layout/Analytics.tsx` | client | 49 | Wrapper de Google Tag Manager. Inyecta el script GTM solo cuando hay un |
| `CookieConsent` | `src/components/layout/CookieConsent.tsx` | client | 99 | Banner de consentimiento de cookies. Persiste la decisión en localStorage |
| `Footer` | `src/components/layout/Footer.tsx` | server | 218 | Footer global de la web pública: stats strip, columnas de navegación, |
| `motion-features` | `src/components/layout/motion-features.ts` | server | 18 | Lazy-loaded motion feature bundle. |
| `MotionRoot` | `src/components/layout/MotionRoot.tsx` | client | 36 | App-wide motion provider. |
| `Nav` | `src/components/layout/Nav.tsx` | client | 213 | Barra de navegación pública sticky con barra de progreso de scroll, |
| `PortalSidebar` | `src/components/layout/PortalSidebar.tsx` | client | 220 | Sidebar compartida por los portales de admin y marcas. Colapsa a barra de |
| `PublicChrome` | `src/components/layout/PublicChrome.tsx` | client | 77 | Wrapper que decide si renderizar el chrome público (Nav + Footer + |
| `WhatsAppWidget` | `src/components/layout/WhatsAppWidget.tsx` | client | 57 | Botón flotante de WhatsApp (esquina inferior derecha) con tooltip on-hover |

### auth (`src/features/auth/components/`)

_vacío_

### blog (`src/features/blog/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `BlogCard` | `src/features/blog/components/BlogCard.tsx` | server | 93 | Card de un post del blog con thumbnail, título, excerpt y metadatos. |
| `TalentMiniCard` | `src/features/blog/components/TalentMiniCard.tsx` | server | 70 | Mini card compacta de talent embebida en posts del blog. |

### brand-portal (`src/features/brand-portal/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `BrandTalentCard` | `src/features/brand-portal/components/BrandTalentCard.tsx` | server | 75 | Card de catálogo de talents en el portal de marcas (vista server). |
| `BrandTalentFichaClient` | `src/features/brand-portal/components/BrandTalentFichaClient.tsx` | client | 39 | Cliente de la ficha de talent en el portal de marcas: gestiona apertura del modal de propuesta. |
| `BrandTargetsSpreadsheet` | `src/features/brand-portal/components/BrandTargetsSpreadsheet.tsx` | client | 251 | Spreadsheet editable de targets de la marca en el portal. |
| `EmptyState` | `src/features/brand-portal/components/EmptyState.tsx` | server | 34 | Empty state simple del portal de marcas con mensaje y CTA opcional. |
| `FilterChips` | `src/features/brand-portal/components/FilterChips.tsx` | client | 63 | Chips de filtros (platforms, tags) sincronizados con un searchParam para el catálogo de talents. |
| `ProposalModal` | `src/features/brand-portal/components/ProposalModal.tsx` | client | 148 | Modal para que una marca envíe una propuesta a un talent. |

### cases (`src/features/cases/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `CaseCard` | `src/features/cases/components/CaseCard.tsx` | client | 128 | Card de case study: logo de marca, título y métricas clave (alcance, |

### contact (`src/features/contact/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `ContactSection` | `src/features/contact/components/ContactSection.tsx` | client | 202 | Formulario completo de contacto para marcas y creadores: validación con |
| `CreatorApplyForm` | `src/features/contact/components/CreatorApplyForm.tsx` | client | 149 | Formulario de candidatura para creadores: nombre, email, plataforma, |
| `TYPES` | `src/features/contact/components/ContactSection.parts.tsx` | client | 221 | _pendiente TSDoc_ |

### creator-codes (`src/features/creator-codes/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `CountdownTimer` | `src/features/creator-codes/components/CountdownTimer.tsx` | client | 118 | Timer regresivo hasta el cierre de un giveaway; dispara onExpiredAction al expirar. |
| `CreatorHero` | `src/features/creator-codes/components/CreatorHero.tsx` | client | 140 | Hero de la página de un creador con avatar, nombre y socials. |
| `GiveawayCard` | `src/features/creator-codes/components/GiveawayCard.tsx` | client | 125 | Card individual de un giveaway en la página del creador. |
| `GiveawayGrid` | `src/features/creator-codes/components/GiveawayGrid.tsx` | client | 57 | Grid de giveaways del creador con un título de sección. |
| `UnboxReveal` | `src/features/creator-codes/components/UnboxReveal.tsx` | client | 147 | Animación de reveal tipo unboxing del código del creador. |

### giveaways (`src/features/giveaways/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `BrandsSidebar` | `src/features/giveaways/components/BrandsSidebar.tsx` | client | 173 | Sidebar con listado de marcas para filtrar el hub de giveaways. |
| `CategorySortBar` | `src/features/giveaways/components/CategorySortBar.tsx` | client | 85 | Barra de filtros por categoría y orden para el hub de giveaways. |
| `CodeCard` | `src/features/giveaways/components/CodeCard.tsx` | client | 201 | Card de un código de creador en el hub, con variante destacada. |
| `CreatorCarousel` | `src/features/giveaways/components/CreatorCarousel.tsx` | client | 155 | Carrusel horizontal de creadores para filtrar códigos en el hub. |
| `CreatorsSidebar` | `src/features/giveaways/components/CreatorsSidebar.tsx` | client | 245 | Resilient avatar: shows the photo when available, gracefully falls back to a |
| `FeaturedCodesSection` | `src/features/giveaways/components/FeaturedCodesSection.tsx` | client | 111 | Sección de códigos destacados en el hub de giveaways. |
| `FiltersBar` | `src/features/giveaways/components/FiltersBar.tsx` | client | 134 | Barra de filtros (búsqueda + chips) para el hub de giveaways. |
| `GiveawayCarousel` | `src/features/giveaways/components/GiveawayCarousel.tsx` | client | 79 | Carrusel horizontal de giveaways con título y subtítulo de sección. |
| `GiveawayHubCard` | `src/features/giveaways/components/GiveawayHubCard.tsx` | client | 157 | Card de un giveaway dentro del hub. |
| `GiveawaySection` | `src/features/giveaways/components/GiveawaySection.tsx` | client | 64 | Sección con tabs de giveaways activos y finalizados en el hub. |
| `GiveawaysHub` | `src/features/giveaways/components/GiveawaysHub.tsx` | client | 175 | Orquestador del hub principal de giveaways: combina filtros, secciones y sidebars. |
| `GiveawaySidebarPanel` | `src/features/giveaways/components/GiveawaySidebarPanel.tsx` | client | 163 | Panel lateral que lista giveaways con detalle y acciones. |
| `HeroSection` | `src/features/giveaways/components/HeroSection.tsx` | server | 117 | Hero del hub de giveaways con contadores agregados. |
| `RecentWinners` | `src/features/giveaways/components/RecentWinners.tsx` | client | 68 | Listado de ganadores recientes en el hub de giveaways. |
| `SorteoCard` | `src/features/giveaways/components/SorteoCard.tsx` | client | 173 | Card de un sorteo en la página pública /sorteos. |
| `StatsBar` | `src/features/giveaways/components/StatsBar.tsx` | server | 47 | Barra de stats agregadas (activos, valor total, finalizados, códigos) del hub. |
| `TopWinners` | `src/features/giveaways/components/TopWinners.tsx` | client | 60 | Ranking de top ganadores del hub de giveaways. |

### marketing-site (`src/features/marketing-site/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `AboutCard` | `src/features/marketing-site/components/AboutCard.tsx` | client | 41 | Tarjeta individual del bloque "Sobre SocialPro" con label en gradient y |
| `AboutSection` | `src/features/marketing-site/components/AboutSection.tsx` | server | 61 | Sección "Sobre SocialPro": copy editorial sobre la agencia + grid de |
| `BrandsCarousel` | `src/features/marketing-site/components/BrandsCarousel.tsx` | server | 63 | Carrusel marquee de logos de marcas que confían en SocialPro. Duplica el |
| `CasesSection` | `src/features/marketing-site/components/CasesSection.tsx` | server | 48 | Sección "Track Record": grid de case studies (`CaseCard`) con stagger |
| `CollabsSection` | `src/features/marketing-site/components/CollabsSection.tsx` | server | 102 | Bloque "Colaboradores Destacados": grid de partners adicionales con su |
| `CtaSection` | `src/features/marketing-site/components/CtaSection.tsx` | client | 74 | Final CTA. Animations are wired through controlled `animate=` (not |
| `FaqSection` | `src/features/marketing-site/components/FaqSection.tsx` | client | 151 | Acordeón de preguntas frecuentes con expand/collapse animado vía |
| `Hero` | `src/features/marketing-site/components/Hero.tsx` | client | 193 | Hero principal de la home: auras parallax animadas con motion + tipografía |
| `Marquee` | `src/features/marketing-site/components/Marquee.tsx` | server | 41 | Banda animada infinita con keywords del nicho gaming/esports |
| `MetricsSection` | `src/features/marketing-site/components/MetricsSection.tsx` | client | 108 | Bloque de KPIs animados (años, views/mes, campañas, FTDs, mercados, CTR) |
| `PortfolioGrid` | `src/features/marketing-site/components/PortfolioGrid.tsx` | client | 105 | Grid filtrable de items de portfolio (Todo / Thumbnails / Campañas). |
| `PortfolioSection` | `src/features/marketing-site/components/PortfolioSection.tsx` | server | 41 | Sección "Portfolio" — wrapper server-side con cabecera + `PortfolioGrid` |
| `ServicesSection` | `src/features/marketing-site/components/ServicesSection.tsx` | client | 201 | Sección con tabs (Marca / Creador) que alterna entre dos flujos de servicio. |
| `TalentSection` | `src/features/marketing-site/components/TalentSection.tsx` | server | 45 | Sección "Streamers y Creadores" — wrapper server-side que delega filtros |
| `TeamCard` | `src/features/marketing-site/components/TeamCard.tsx` | client | 57 | Tarjeta de miembro del equipo: foto (o gradiente fallback), nombre y rol. |
| `TeamGrid` | `src/features/marketing-site/components/TeamGrid.tsx` | server | 48 | Grid del equipo SocialPro con `TeamCard` por miembro y stagger en la |

### talent-stats-public (`src/features/talent-stats-public/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `KpiCards` | `src/features/talent-stats-public/components/KpiCards.tsx` | server | 46 | Cards de KPIs agregados (followers, engagement, etc.) en la vista pública de stats. |
| `StatsTableRow` | `src/features/talent-stats-public/components/StatsTableRow.tsx` | server | 65 | Fila de la tabla de plataformas en la vista pública de stats. |
| `StatsView` | `src/features/talent-stats-public/components/StatsView.tsx` | server | 61 | Vista pública por token con KPIs y tabla de plataformas para un talent. |

### talents-public (`src/features/talents-public/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `TalentCard` | `src/features/talents-public/components/TalentCard.tsx` | client | 91 | Card del roster público: foto/gradiente, nombre, badge de status y socials. |
| `TalentGrid` | `src/features/talents-public/components/TalentGrid.tsx` | client | 81 | Grid filtrable de talents (Todos / Twitch / YouTube). Mantiene el talent |
| `TalentModal` | `src/features/talents-public/components/TalentModal.tsx` | client | 214 | Modal de detalle del talent con focus trap, cierre por Escape/backdrop |

### admin/README.md (`src/features/admin/README.md/components/`)

_vacío_

### admin/_shared (`src/features/admin/_shared/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `AdminHeader` | `src/features/admin/_shared/components/AdminHeader.tsx` | server | 38 | Topbar del layout admin con búsqueda global (Cmd/Ctrl+K) y atajos de notificaciones/ajustes. |
| `AdminSidebar` | `src/features/admin/_shared/components/AdminSidebar.tsx` | client | 264 | Sidebar de navegación del admin con grupos (CRM/Operaciones/Finanzas/Más), menú móvil y bloque de usuario con logout. |
| `AlertList` | `src/features/admin/_shared/components/AlertList.tsx` | server | 139 | Lista de alertas operativas con tono coloreado (success/warning/danger/neutral/info) y enlace opcional. |
| `Avatar` | `src/features/admin/_shared/components/Avatar.tsx` | server | 73 | Avatar con foto o iniciales sobre gradiente determinista derivado del userId. |
| `DashboardIcon` | `src/features/admin/_shared/components/SidebarIcons.tsx` | server | 258 | Set de iconos SVG inline (20×20, stroke currentColor) usados por el sidebar y la topbar del admin. |
| `EditDrawer` | `src/features/admin/_shared/components/EditDrawer.tsx` | client | 173 | Drawer lateral genérico para editar entidades, con focus trap, restore focus al cerrar y animación motion. |
| `EmptyState` | `src/features/admin/_shared/components/EmptyState.tsx` | server | 50 | Estado vacío rico (icono, título, descripción y acción) con variantes `no-data` y `no-results`. |
| `FilterBar` | `src/features/admin/_shared/components/FilterBar.tsx` | server | 147 | Barra de filtros sticky con sub-componentes compuestos (Search, Select, Reset) para listados admin. |
| `GlobalSearch` | `src/features/admin/_shared/components/GlobalSearch.tsx` | client | 244 | Buscador global del admin (popover) con atajo Cmd/Ctrl+K y resultados agrupados (marcas, campañas, talents, facturas, tareas, contactos) vía búsqueda ILIKE. |
| `KpiCard` | `src/features/admin/_shared/components/KpiCard.tsx` | server | 94 | Card de KPI (título, valor, subtítulo y tono) opcionalmente clicable como enlace. |
| `MetricsChart` | `src/features/admin/_shared/components/MetricsChart.tsx` | client | 188 | Chart genérico (línea/barras) sobre recharts para visualizar series temporales por creador o plataforma. |
| `Skeleton` | `src/features/admin/_shared/components/Skeleton.tsx` | server | 81 | Skeleton de carga con variantes `text \| card \| row \| circle` y soporte para múltiples instancias vía `count`. |
| `StateBadge` | `src/features/admin/_shared/components/StateBadge.tsx` | server | 84 | Badge de estado coloreado por tono (success/warning/danger/neutral/info) con variantes `soft \| solid \| dot`. Usado para enums de estado (borrador, emitida, cobrada, etc.). |
| `useEditDrawer` | `src/features/admin/_shared/components/useEditDrawer.ts` | client | 44 | Hook que sincroniza la apertura del `EditDrawer` con la URL (`?edit=<id>`) para que el estado sea compartible. |

### admin/analytics (`src/features/admin/analytics/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `GrowthReport` | `src/features/admin/analytics/components/GrowthReport.tsx` | client | 130 | Reporte de crecimiento (growth) de un talent: agrupa snapshots por plataforma |

### admin/brands (`src/features/admin/brands/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `BrandCampaignsTab` | `src/features/admin/brands/components/BrandCampaignsTab.tsx` | client | 166 | Tab dentro del CRM de marcas que lista las campañas asociadas a una marca con su estado y resumen agregado. |
| `BrandContactForm` | `src/features/admin/brands/components/BrandContactForm.tsx` | client | 252 | Formulario de creación/edición de contactos asociados a una marca del CRM. |
| `BrandFollowupForm` | `src/features/admin/brands/components/BrandFollowupForm.tsx` | client | 292 | Formulario de creación/edición de follow-ups (seguimientos) sobre una marca del CRM. |
| `BrandFormDrawer` | `src/features/admin/brands/components/BrandFormDrawer.tsx` | client | 298 | Drawer lateral con el formulario CRUD de una marca del CRM (crear, editar, eliminar). |
| `BrandRow` | `src/features/admin/brands/components/BrandsCrmManager.brand-row.tsx` | client | 253 | _pendiente TSDoc_ |
| `BrandsCrmManager` | `src/features/admin/brands/components/BrandsCrmManager.tsx` | client | 289 | Orquestador principal del CRM de marcas: tabla de marcas con filas expandibles |
| `BrandsTabs` | `src/features/admin/brands/components/BrandsTabs.tsx` | client | 46 | Componente genérico de tabs controlado por estado local, usado en el detalle de una marca del CRM. |
| `ContactsList` | `src/features/admin/brands/components/BrandsCrmManager.contacts.tsx` | client | 159 | _pendiente TSDoc_ |
| `FollowupsList` | `src/features/admin/brands/components/BrandsCrmManager.followups.tsx` | client | 216 | _pendiente TSDoc_ |
| `InviteBrandForm` | `src/features/admin/brands/components/invite-form.tsx` | client | 37 | Formulario para invitar a un usuario al portal de marcas (envía email con link de alta). |
| `STATUS_LABELS` | `src/features/admin/brands/components/BrandFormDrawer.parts.tsx` | server | 31 | _pendiente TSDoc_ |
| `STATUS_LABELS` | `src/features/admin/brands/components/BrandsCrmManager.parts.tsx` | client | 131 | _pendiente TSDoc_ |

### admin/campaigns (`src/features/admin/campaigns/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `CampaignDetailTabs` | `src/features/admin/campaigns/components/CampaignDetailTabs.tsx` | client | 206 | Orquestador del detalle de una campaña: tabs (resumen / pagos / archivos) con estado activo controlado. |
| `CampaignDrawer` | `src/features/admin/campaigns/components/CampaignDrawer.tsx` | client | 58 | Drawer lateral con el formulario CRUD de una campaña (presupuesto previsto en EUR para marca/talent, no pagos reales). |
| `CampaignFiles` | `src/features/admin/campaigns/components/CampaignFiles.tsx` | client | 88 | Sección del detalle de campaña que lista, sube y elimina archivos asociados (contratos, briefs, assets). |
| `CampaignFilters` | `src/features/admin/campaigns/components/CampaignFilters.tsx` | client | 219 | Barra de filtros del listado de campañas (estado, marca, talent, rango de fechas, búsqueda). |
| `CampaignForm` | `src/features/admin/campaigns/components/CampaignDrawer.parts.tsx` | client | 480 ⚠️ | _pendiente TSDoc_ |
| `CampaignPayments` | `src/features/admin/campaigns/components/CampaignPayments.tsx` | client | 165 | Sección del detalle de campaña que muestra los pagos reales vinculados (invoices con `campaignId`). |
| `CampaignsList` | `src/features/admin/campaigns/components/CampaignsList.tsx` | client | 261 | Listado principal de campañas con filtros, ordenación y acceso al drawer de creación/edición. |
| `CampaignSummaryCard` | `src/features/admin/campaigns/components/CampaignSummaryCard.tsx` | server | 247 | Tarjeta de resumen de una campaña (importes en EUR, comisión = amountBrand - amountTalent, estado, fechas). |
| `FILE_TYPE_LABELS` | `src/features/admin/campaigns/components/CampaignFiles.parts.tsx` | client | 231 | _pendiente TSDoc_ |
| `STATUS_TONE` | `src/features/admin/campaigns/components/CampaignsList.parts.tsx` | client | 68 | _pendiente TSDoc_ |

### admin/dashboard (`src/features/admin/dashboard/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `ActiveCampaignsWidget` | `src/features/admin/dashboard/components/ActiveCampaignsWidget.tsx` | server | 24 | Widget KPI con el número de campañas activas, enlaza al listado filtrado. |
| `AlertsWidget` | `src/features/admin/dashboard/components/AlertsWidget.tsx` | server | 62 | Widget de alertas operativas: follow-ups vencidos y tareas urgentes con enlace al área correspondiente. |
| `PendingPaymentsWidget` | `src/features/admin/dashboard/components/PendingPaymentsWidget.tsx` | server | 42 | Widget con dos KPIs en grid: cobros pendientes de marcas (income) y pagos pendientes a creadores (expense). |
| `RevenueMonthWidget` | `src/features/admin/dashboard/components/RevenueMonthWidget.tsx` | server | 46 | Widget KPI con la facturación del mes en curso y delta porcentual frente al mes anterior. |
| `RevenueTrendChart` | `src/features/admin/dashboard/components/RevenueTrendChart.tsx` | client | 99 | Chart de tendencia mensual (área sobre recharts) con ingresos, gastos y neto del CRM. |
| `StaleStatsWidget` | `src/features/admin/dashboard/components/StaleStatsWidget.tsx` | server | 96 | Widget de creadores con stats desactualizadas (preview de 3 con fecha del último update y badge con el total). |
| `UpcomingFollowupsWidget` | `src/features/admin/dashboard/components/UpcomingFollowupsWidget.tsx` | server | 88 | Widget con los próximos follow-ups de marcas (fecha, canal y estado) y badge tonal según vencimiento. |
| `UrgentTasksWidget` | `src/features/admin/dashboard/components/UrgentTasksWidget.tsx` | server | 113 | Widget con tareas urgentes (alta prioridad o vencidas) con owner, due date relativo y badge tonal. |

### admin/equipo (`src/features/admin/equipo/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `InviteStaffForm` | `src/features/admin/equipo/components/InviteStaffForm.tsx` | client | 51 | Formulario para invitar un nuevo trabajador (rol staff) por email. Solo accesible a admins. |
| `UploadForm` | `src/features/admin/equipo/components/UploadForm.tsx` | client | 114 | Formulario para subir/actualizar la foto pública de un miembro del equipo. |

### admin/files (`src/features/admin/files/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `FilesList` | `src/features/admin/files/components/FilesList.tsx` | client | 108 | Listado de archivos polimórficos asociados a un talent. Permite descargar y, si el usuario es manager, |
| `FileUploadButton` | `src/features/admin/files/components/FileUploadButton.tsx` | client | 72 | Botón de upload reutilizable que dispara `onFile` con el `File` seleccionado. |

### admin/invoices (`src/features/admin/invoices/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `ColumnMappingModal` | `src/features/admin/invoices/components/ColumnMappingModal.tsx` | client | 268 | Modal del flujo de import de facturas que permite mapear columnas del fichero (CSV/XLSX) a campos canónicos. |
| `FIELD_LABEL` | `src/features/admin/invoices/components/ColumnMappingModal.parts.tsx` | client | 52 | _pendiente TSDoc_ |
| `FiscalExports` | `src/features/admin/invoices/components/FiscalExports.tsx` | client | 122 | Panel de exports fiscales por empresa, año y trimestre (genera ficheros descargables). |
| `ImportInbox` | `src/features/admin/invoices/components/ImportInbox.tsx` | client | 127 | Inbox del flujo de import de facturas: subida, mapeo de columnas, validación y commit a la base de datos. |
| `INPUT` | `src/features/admin/invoices/components/ImportInbox.parts.tsx` | client | 465 ⚠️ | _pendiente TSDoc_ |
| `InvoiceCategoryField` | `src/features/admin/invoices/components/InvoiceCategoryField.tsx` | client | 77 | Campo autocomplete de categoría de factura con sub-select condicional para herramientas IA específicas. |
| `InvoiceDrawer` | `src/features/admin/invoices/components/InvoiceDrawer.tsx` | client | 269 | Drawer lateral con el formulario CRUD de una factura (empresa, categoría, método de pago crypto/banco, ficheros). |
| `InvoiceFileFields` | `src/features/admin/invoices/components/InvoiceFileFields.tsx` | client | 75 | Campos de upload (factura + extracto bancario) que persisten en Vercel Blob y devuelven la URL al formulario. |
| `InvoicesManager` | `src/features/admin/invoices/components/InvoicesManager.tsx` | client | 211 | Orquestador de la gestión de facturas: listado, filtros y drawer de edición/creación. |
| `KIND_LABELS` | `src/features/admin/invoices/components/InvoicesManager.parts.tsx` | client | 148 | _pendiente TSDoc_ |

### admin/pnl (`src/features/admin/pnl/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `PnLBreakdownTable` | `src/features/admin/pnl/components/PnLBreakdownTable.tsx` | server | 66 | Tabla mensual del P&L con ingresos, gastos y resultado por mes (EUR). |
| `PnLCategoryList` | `src/features/admin/pnl/components/PnLCategoryList.tsx` | server | 58 | Lista de top categorías de gasto del P&L (importe agregado y % sobre el total). |
| `PnLFilters` | `src/features/admin/pnl/components/PnLFilters.tsx` | client | 117 | Filtros sticky del P&L (rango de fechas y empresas) con sincronización a la URL. |
| `PnLOverviewCards` | `src/features/admin/pnl/components/PnLOverviewCards.tsx` | server | 60 | Cabecera del P&L con 8 KPI cards (ingresos, gastos, beneficio, márgenes...) en EUR. |

### admin/stats (`src/features/admin/stats/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `BTN_PRIMARY` | `src/features/admin/stats/components/StatsImportPanel.parts.tsx` | client | 32 | _pendiente TSDoc_ |
| `GeoEditor` | `src/features/admin/stats/components/GeoEditor.tsx` | client | 148 | Editor modal de top GEOs (jsonb) y audience language para un talent. |
| `RankingTable` | `src/features/admin/stats/components/RankingTable.tsx` | server | 165 | Tabla de ranking de talents por followers (top creators). Muestra empty state cuando no hay snapshots. |
| `ShareLinkPanel` | `src/features/admin/stats/components/ShareLinkPanel.tsx` | client | 107 | Panel para crear y revocar share links públicos token-based de stats de un talent. |
| `StatsExportPanel` | `src/features/admin/stats/components/StatsExportPanel.tsx` | client | 283 | Panel para exportar snapshots de stats filtrando por talents y plataformas seleccionadas. |
| `StatsImportPanel` | `src/features/admin/stats/components/StatsImportPanel.tsx` | client | 282 | Panel de import de snapshots de stats desde un fichero. Permite previsualizar las filas, |
| `StatsTable` | `src/features/admin/stats/components/StatsTable.tsx` | client | 109 | Tabla de snapshots de stats por talent ordenable por rank o reach. |

### admin/talents (`src/features/admin/talents/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `GrowthCell` | `src/features/admin/talents/components/RosterSpreadsheet.parts.tsx` | client | 83 | _pendiente TSDoc_ |
| `InfluencerCardsView` | `src/features/admin/talents/components/InfluencerCardsView.tsx` | client | 157 | Vista en cards del roster de talents con foto, plataformas y verticales para el listado del admin. |
| `InfluencerImport` | `src/features/admin/talents/components/InfluencerImport.tsx` | client | 244 | Wizard de importación CSV de creadores: parser, preview, mapeo de columnas y subida masiva al roster. |
| `MatchedRowCard` | `src/features/admin/talents/components/InfluencerImport.preview.tsx` | client | 159 | _pendiente TSDoc_ |
| `MatchingStep` | `src/features/admin/talents/components/InfluencerImport.commit.tsx` | client | 381 ⚠️ | _pendiente TSDoc_ |
| `RosterSpreadsheet` | `src/features/admin/talents/components/RosterSpreadsheet.tsx` | client | 476 ⚠️ | Vista spreadsheet editable del roster de talents con edición inline y persistencia por celda. |
| `STATUS_TONE` | `src/features/admin/talents/components/InfluencerCardsView.parts.tsx` | client | 213 | _pendiente TSDoc_ |
| `TALENT_FIELDS` | `src/features/admin/talents/components/InfluencerImport.parts.tsx` | client | 199 | _pendiente TSDoc_ |
| `TalentBusinessForm` | `src/features/admin/talents/components/TalentBusinessForm.tsx` | client | 142 | Formulario de datos de negocio del talent (verticales, condiciones comerciales) usando server action de actualización. |
| `TalentCampaignsTab` | `src/features/admin/talents/components/TalentCampaignsTab.tsx` | client | 160 | Tab "Campañas" del perfil del talent con histórico de campañas y resumen agregado (totales, importes). |
| `TalentGeoFiles` | `src/features/admin/talents/components/TalentGeoFiles.tsx` | client | 204 | Sección de archivos GEO (audiencia por país) del talent con upload por plataforma y permisos de manager. |
| `TalentPhotoCard` | `src/features/admin/talents/components/TalentPhotoCard.tsx` | client | 257 | Card editora de la foto principal del talent (upload, preview, swap) usada en la galería de fotos del admin. |
| `TalentProfileTabs` | `src/features/admin/talents/components/TalentProfileTabs.tsx` | client | 253 | Tabs del perfil de un talent (Stats / GEO / Negocio / Histórico de campañas) con sincronización por query param. |
| `TalentStatsByPlatform` | `src/features/admin/talents/components/TalentStatsByPlatform.tsx` | client | 244 | Stats del talent agrupadas por plataforma (Twitch, YouTube, Instagram, TikTok, Kick) con histórico de snapshots. |
| `UploadStep` | `src/features/admin/talents/components/InfluencerImport.upload.tsx` | client | 168 | _pendiente TSDoc_ |

### admin/targets (`src/features/admin/targets/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `BATCH_LABELS` | `src/features/admin/targets/components/TargetsSpreadsheet.parts.tsx` | client | 332 ⚠️ | _pendiente TSDoc_ |
| `export-csv` | `src/features/admin/targets/components/export-csv.ts` | server | 34 | Exporta una lista de targets a CSV con BOM UTF-8 implícito y descarga el fichero en cliente. |
| `PLATFORMS` | `src/features/admin/targets/components/targets-constants.ts` | server | 62 | Constantes y tipos compartidos por la feature admin/targets: |
| `TargetRow` | `src/features/admin/targets/components/TargetsSpreadsheet.row.tsx` | client | 203 | _pendiente TSDoc_ |
| `TargetsDiagnostics` | `src/features/admin/targets/components/TargetsDiagnostics.tsx` | client | 121 | Panel de diagnóstico de calidad de datos de targets (duplicados, perfiles inválidos, métricas faltantes…). |
| `TargetsEmptyState` | `src/features/admin/targets/components/TargetsEmptyState.tsx` | client | 76 | Empty state para el listado de targets. Ofrece importar un CSV vía importCSVAction |
| `TargetsSpreadsheet` | `src/features/admin/targets/components/TargetsSpreadsheet.tsx` | client | 351 ⚠️ | Tabla editable tipo spreadsheet para gestionar targets de outreach (Twitch + YouTube). |
| `Th` | `src/features/admin/targets/components/ThSortable.tsx` | server | 44 | Encabezado `<th>` reutilizable, opcionalmente ordenable. Cuando `sortable` y `field` están definidos, |
| `TwitchSearch` | `src/features/admin/targets/components/TwitchSearch.tsx` | client | 144 | Buscador de canales en la API de Twitch que permite filtrar por idioma, juego y followers |
| `YouTubeSearch` | `src/features/admin/targets/components/YouTubeSearch.tsx` | client | 470 ⚠️ | Buscador avanzado de canales en la API de YouTube (idioma, país, suscriptores, palabras clave). |
| `YT_RED` | `src/features/admin/targets/components/YouTubeSearch.parts.tsx` | client | 103 | _pendiente TSDoc_ |

### admin/tasks (`src/features/admin/tasks/components/`)

| Componente | Path | Kind | LOC | Descripción |
|---|---|---|---:|---|
| `PriorityBadge` | `src/features/admin/tasks/components/PriorityBadge.tsx` | server | 35 | Badge visual con tono según prioridad de tarea (alta=danger, media=warning, baja=neutral). |
| `RecurrenceBadge` | `src/features/admin/tasks/components/RecurrenceBadge.tsx` | server | 23 | Badge que indica la frecuencia de recurrencia de una tarea (diaria, semanal, mensual…). |
| `RELATED_TYPE_LABELS` | `src/features/admin/tasks/components/TaskModal.parts.tsx` | client | 32 | _pendiente TSDoc_ |
| `RelatedSelector` | `src/features/admin/tasks/components/RelatedSelector.tsx` | client | 107 | Selector de entidad relacionada para una tarea (brand, talent, campaign, invoice o general). |
| `RolledOverBanner` | `src/features/admin/tasks/components/RolledOverBanner.tsx` | server | 26 | Banner que avisa al usuario de N tareas arrastradas (rolled-over) desde la semana anterior por el cron. |
| `STATUS_TABS` | `src/features/admin/tasks/components/TaskList.parts.tsx` | client | 382 ⚠️ | _pendiente TSDoc_ |
| `TaskCalendar` | `src/features/admin/tasks/components/TaskCalendar.tsx` | client | 160 | Vista calendario mensual (lunes-first) con tareas posicionadas por dueDate y dot por prioridad. |
| `TaskKanban` | `src/features/admin/tasks/components/TaskKanban.tsx` | client | 144 | Tablero kanban de tareas con columnas pendiente / en_progreso / completada. |
| `TaskList` | `src/features/admin/tasks/components/TaskList.tsx` | client | 232 | Vista lista de tareas con filtros (estado, prioridad, owner, categoría, búsqueda) y bulk actions. |
| `TaskModal` | `src/features/admin/tasks/components/TaskModal.tsx` | client | 303 ⚠️ | Modal CRUD de una tarea. Crea (task=null) o edita una tarea existente vía createTaskAction/updateTaskAction. |
| `TaskStatusBadge` | `src/features/admin/tasks/components/TaskStatusBadge.tsx` | server | 35 | Badge visual con tono según estado de tarea (pendiente=warning, en_progreso=info, completada=success). |
| `TaskTemplatesManager` | `src/features/admin/tasks/components/TaskTemplatesManager.tsx` | client | 235 | Gestor CRUD de plantillas de tareas recurrentes (las 18 plantillas que el cron semanal materializa). |
| `TaskWorkspace` | `src/features/admin/tasks/components/TaskWorkspace.tsx` | client | 113 | Orquestador del workspace de tareas: tabs entre lista / kanban / calendario y monta TaskModal. |
