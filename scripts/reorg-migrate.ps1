# scripts/reorg-migrate.ps1
# One-shot script to move components from src/components/{admin,blog,brand,...}
# to src/features/<feature>/components/ and rewrite imports across src/ and e2e/.
#
# Idempotent: if a source no longer exists, the move is skipped silently.
# Use case: re-runnable in case of partial application.

$ErrorActionPreference = 'Stop'

# UTF-8 no-BOM writer that preserves CRLF line endings.
function Write-FileUtf8NoBom {
  param([string]$Path, [string]$Content)
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Replace-ImportPath {
  param([string]$Old, [string]$New)
  $files = Get-ChildItem -Recurse -Include *.ts,*.tsx -Path src,e2e -ErrorAction SilentlyContinue
  $touched = 0
  foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    if ($content.Contains($Old)) {
      $newContent = $content.Replace($Old, $New)
      Write-FileUtf8NoBom -Path $f.FullName -Content $newContent
      $touched++
    }
  }
  if ($touched -gt 0) {
    Write-Host ("  imports: '{0}' -> '{1}' touched {2} files" -f $Old, $New, $touched)
  }
}

function Move-Component {
  param([string]$Source, [string]$Dest, [string]$OldImport, [string]$NewImport)
  if (-not (Test-Path $Source)) {
    Write-Host ("  SKIP missing: {0}" -f $Source)
    return
  }
  $destDir = Split-Path $Dest -Parent
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  if (Test-Path $Dest) {
    Write-Host ("  WARN dest exists, removing: {0}" -f $Dest)
    Remove-Item -Force $Dest
  }
  Move-Item -Path $Source -Destination $Dest
  Replace-ImportPath -Old $OldImport -New $NewImport
}

# Manifest: each entry is (sourcePath, destPath).
# Import paths are derived by stripping the .tsx/.ts extension.
$manifest = @(
  # cases
  @{ Source='src/components/sections/CaseCard.tsx'; Dest='src/features/cases/components/CaseCard.tsx' },

  # blog
  @{ Source='src/components/blog/BlogCard.tsx'; Dest='src/features/blog/components/BlogCard.tsx' },
  @{ Source='src/components/blog/TalentMiniCard.tsx'; Dest='src/features/blog/components/TalentMiniCard.tsx' },

  # talent-stats-public (from components/stats/)
  @{ Source='src/components/stats/KpiCards.tsx'; Dest='src/features/talent-stats-public/components/KpiCards.tsx' },
  @{ Source='src/components/stats/StatsTableRow.tsx'; Dest='src/features/talent-stats-public/components/StatsTableRow.tsx' },
  @{ Source='src/components/stats/StatsView.tsx'; Dest='src/features/talent-stats-public/components/StatsView.tsx' },

  # creator-codes (from components/creadores/)
  @{ Source='src/components/creadores/CountdownTimer.tsx'; Dest='src/features/creator-codes/components/CountdownTimer.tsx' },
  @{ Source='src/components/creadores/CreatorHero.tsx'; Dest='src/features/creator-codes/components/CreatorHero.tsx' },
  @{ Source='src/components/creadores/GiveawayCard.tsx'; Dest='src/features/creator-codes/components/GiveawayCard.tsx' },
  @{ Source='src/components/creadores/GiveawayGrid.tsx'; Dest='src/features/creator-codes/components/GiveawayGrid.tsx' },
  @{ Source='src/components/creadores/UnboxReveal.tsx'; Dest='src/features/creator-codes/components/UnboxReveal.tsx' },

  # contact (from sections)
  @{ Source='src/components/sections/ContactSection.tsx'; Dest='src/features/contact/components/ContactSection.tsx' },
  @{ Source='src/components/sections/CreatorApplyForm.tsx'; Dest='src/features/contact/components/CreatorApplyForm.tsx' },

  # talents-public (from sections)
  @{ Source='src/components/sections/TalentCard.tsx'; Dest='src/features/talents-public/components/TalentCard.tsx' },
  @{ Source='src/components/sections/TalentGrid.tsx'; Dest='src/features/talents-public/components/TalentGrid.tsx' },
  @{ Source='src/components/sections/TalentModal.tsx'; Dest='src/features/talents-public/components/TalentModal.tsx' },

  # marketing-site (rest of sections)
  @{ Source='src/components/sections/Hero.tsx'; Dest='src/features/marketing-site/components/Hero.tsx' },
  @{ Source='src/components/sections/Marquee.tsx'; Dest='src/features/marketing-site/components/Marquee.tsx' },
  @{ Source='src/components/sections/BrandsCarousel.tsx'; Dest='src/features/marketing-site/components/BrandsCarousel.tsx' },
  @{ Source='src/components/sections/MetricsSection.tsx'; Dest='src/features/marketing-site/components/MetricsSection.tsx' },
  @{ Source='src/components/sections/ServicesSection.tsx'; Dest='src/features/marketing-site/components/ServicesSection.tsx' },
  @{ Source='src/components/sections/CollabsSection.tsx'; Dest='src/features/marketing-site/components/CollabsSection.tsx' },
  @{ Source='src/components/sections/CtaSection.tsx'; Dest='src/features/marketing-site/components/CtaSection.tsx' },
  @{ Source='src/components/sections/FaqSection.tsx'; Dest='src/features/marketing-site/components/FaqSection.tsx' },
  @{ Source='src/components/sections/AboutSection.tsx'; Dest='src/features/marketing-site/components/AboutSection.tsx' },
  @{ Source='src/components/sections/AboutCard.tsx'; Dest='src/features/marketing-site/components/AboutCard.tsx' },
  @{ Source='src/components/sections/TeamGrid.tsx'; Dest='src/features/marketing-site/components/TeamGrid.tsx' },
  @{ Source='src/components/sections/TeamCard.tsx'; Dest='src/features/marketing-site/components/TeamCard.tsx' },
  @{ Source='src/components/sections/PortfolioSection.tsx'; Dest='src/features/marketing-site/components/PortfolioSection.tsx' },
  @{ Source='src/components/sections/PortfolioGrid.tsx'; Dest='src/features/marketing-site/components/PortfolioGrid.tsx' },
  @{ Source='src/components/sections/CasesSection.tsx'; Dest='src/features/marketing-site/components/CasesSection.tsx' },
  @{ Source='src/components/sections/TalentSection.tsx'; Dest='src/features/marketing-site/components/TalentSection.tsx' },

  # giveaways (16) + sorteos (1)
  @{ Source='src/components/giveaways/BrandsSidebar.tsx'; Dest='src/features/giveaways/components/BrandsSidebar.tsx' },
  @{ Source='src/components/giveaways/CategorySortBar.tsx'; Dest='src/features/giveaways/components/CategorySortBar.tsx' },
  @{ Source='src/components/giveaways/CodeCard.tsx'; Dest='src/features/giveaways/components/CodeCard.tsx' },
  @{ Source='src/components/giveaways/CreatorCarousel.tsx'; Dest='src/features/giveaways/components/CreatorCarousel.tsx' },
  @{ Source='src/components/giveaways/CreatorsSidebar.tsx'; Dest='src/features/giveaways/components/CreatorsSidebar.tsx' },
  @{ Source='src/components/giveaways/FeaturedCodesSection.tsx'; Dest='src/features/giveaways/components/FeaturedCodesSection.tsx' },
  @{ Source='src/components/giveaways/FiltersBar.tsx'; Dest='src/features/giveaways/components/FiltersBar.tsx' },
  @{ Source='src/components/giveaways/GiveawayCarousel.tsx'; Dest='src/features/giveaways/components/GiveawayCarousel.tsx' },
  @{ Source='src/components/giveaways/GiveawayHubCard.tsx'; Dest='src/features/giveaways/components/GiveawayHubCard.tsx' },
  @{ Source='src/components/giveaways/GiveawaySection.tsx'; Dest='src/features/giveaways/components/GiveawaySection.tsx' },
  @{ Source='src/components/giveaways/GiveawaysHub.tsx'; Dest='src/features/giveaways/components/GiveawaysHub.tsx' },
  @{ Source='src/components/giveaways/GiveawaySidebarPanel.tsx'; Dest='src/features/giveaways/components/GiveawaySidebarPanel.tsx' },
  @{ Source='src/components/giveaways/HeroSection.tsx'; Dest='src/features/giveaways/components/HeroSection.tsx' },
  @{ Source='src/components/giveaways/RecentWinners.tsx'; Dest='src/features/giveaways/components/RecentWinners.tsx' },
  @{ Source='src/components/giveaways/StatsBar.tsx'; Dest='src/features/giveaways/components/StatsBar.tsx' },
  @{ Source='src/components/giveaways/TopWinners.tsx'; Dest='src/features/giveaways/components/TopWinners.tsx' },
  @{ Source='src/components/sorteos/SorteoCard.tsx'; Dest='src/features/giveaways/components/SorteoCard.tsx' },

  # brand-portal (from components/brand/)
  @{ Source='src/components/brand/BrandTalentCard.tsx'; Dest='src/features/brand-portal/components/BrandTalentCard.tsx' },
  @{ Source='src/components/brand/BrandTalentFichaClient.tsx'; Dest='src/features/brand-portal/components/BrandTalentFichaClient.tsx' },
  @{ Source='src/components/brand/EmptyState.tsx'; Dest='src/features/brand-portal/components/EmptyState.tsx' },
  @{ Source='src/components/brand/FilterChips.tsx'; Dest='src/features/brand-portal/components/FilterChips.tsx' },
  @{ Source='src/components/brand/ProposalModal.tsx'; Dest='src/features/brand-portal/components/ProposalModal.tsx' },
  @{ Source='src/components/brand/targets/BrandTargetsSpreadsheet.tsx'; Dest='src/features/brand-portal/components/BrandTargetsSpreadsheet.tsx' },

  # admin/_shared (8 ui + 6 chrome)
  @{ Source='src/components/admin/ui/AlertList.tsx'; Dest='src/features/admin/_shared/components/AlertList.tsx' },
  @{ Source='src/components/admin/ui/EditDrawer.tsx'; Dest='src/features/admin/_shared/components/EditDrawer.tsx' },
  @{ Source='src/components/admin/ui/EmptyState.tsx'; Dest='src/features/admin/_shared/components/EmptyState.tsx' },
  @{ Source='src/components/admin/ui/FilterBar.tsx'; Dest='src/features/admin/_shared/components/FilterBar.tsx' },
  @{ Source='src/components/admin/ui/KpiCard.tsx'; Dest='src/features/admin/_shared/components/KpiCard.tsx' },
  @{ Source='src/components/admin/ui/Skeleton.tsx'; Dest='src/features/admin/_shared/components/Skeleton.tsx' },
  @{ Source='src/components/admin/ui/StateBadge.tsx'; Dest='src/features/admin/_shared/components/StateBadge.tsx' },
  @{ Source='src/components/admin/ui/useEditDrawer.ts'; Dest='src/features/admin/_shared/components/useEditDrawer.ts' },
  @{ Source='src/components/admin/AdminHeader.tsx'; Dest='src/features/admin/_shared/components/AdminHeader.tsx' },
  @{ Source='src/components/admin/AdminSidebar.tsx'; Dest='src/features/admin/_shared/components/AdminSidebar.tsx' },
  @{ Source='src/components/admin/Avatar.tsx'; Dest='src/features/admin/_shared/components/Avatar.tsx' },
  @{ Source='src/components/admin/MetricsChart.tsx'; Dest='src/features/admin/_shared/components/MetricsChart.tsx' },
  @{ Source='src/components/admin/SidebarIcons.tsx'; Dest='src/features/admin/_shared/components/SidebarIcons.tsx' },
  @{ Source='src/components/admin/search/GlobalSearch.tsx'; Dest='src/features/admin/_shared/components/GlobalSearch.tsx' },

  # admin/dashboard
  @{ Source='src/components/admin/dashboard/ActiveCampaignsWidget.tsx'; Dest='src/features/admin/dashboard/components/ActiveCampaignsWidget.tsx' },
  @{ Source='src/components/admin/dashboard/AlertsWidget.tsx'; Dest='src/features/admin/dashboard/components/AlertsWidget.tsx' },
  @{ Source='src/components/admin/dashboard/PendingPaymentsWidget.tsx'; Dest='src/features/admin/dashboard/components/PendingPaymentsWidget.tsx' },
  @{ Source='src/components/admin/dashboard/RevenueMonthWidget.tsx'; Dest='src/features/admin/dashboard/components/RevenueMonthWidget.tsx' },
  @{ Source='src/components/admin/dashboard/RevenueTrendChart.tsx'; Dest='src/features/admin/dashboard/components/RevenueTrendChart.tsx' },
  @{ Source='src/components/admin/dashboard/StaleStatsWidget.tsx'; Dest='src/features/admin/dashboard/components/StaleStatsWidget.tsx' },
  @{ Source='src/components/admin/dashboard/UpcomingFollowupsWidget.tsx'; Dest='src/features/admin/dashboard/components/UpcomingFollowupsWidget.tsx' },
  @{ Source='src/components/admin/dashboard/UrgentTasksWidget.tsx'; Dest='src/features/admin/dashboard/components/UrgentTasksWidget.tsx' },

  # admin/talents
  @{ Source='src/components/admin/talents/InfluencerCardsView.tsx'; Dest='src/features/admin/talents/components/InfluencerCardsView.tsx' },
  @{ Source='src/components/admin/talents/InfluencerImport.tsx'; Dest='src/features/admin/talents/components/InfluencerImport.tsx' },
  @{ Source='src/components/admin/talents/RosterSpreadsheet.tsx'; Dest='src/features/admin/talents/components/RosterSpreadsheet.tsx' },
  @{ Source='src/components/admin/talents/TalentBusinessForm.tsx'; Dest='src/features/admin/talents/components/TalentBusinessForm.tsx' },
  @{ Source='src/components/admin/talents/TalentCampaignsTab.tsx'; Dest='src/features/admin/talents/components/TalentCampaignsTab.tsx' },
  @{ Source='src/components/admin/talents/TalentGeoFiles.tsx'; Dest='src/features/admin/talents/components/TalentGeoFiles.tsx' },
  @{ Source='src/components/admin/talents/TalentPhotoCard.tsx'; Dest='src/features/admin/talents/components/TalentPhotoCard.tsx' },
  @{ Source='src/components/admin/talents/TalentProfileTabs.tsx'; Dest='src/features/admin/talents/components/TalentProfileTabs.tsx' },
  @{ Source='src/components/admin/talents/TalentStatsByPlatform.tsx'; Dest='src/features/admin/talents/components/TalentStatsByPlatform.tsx' },

  # admin/brands
  @{ Source='src/components/admin/brands/BrandCampaignsTab.tsx'; Dest='src/features/admin/brands/components/BrandCampaignsTab.tsx' },
  @{ Source='src/components/admin/brands/BrandContactForm.tsx'; Dest='src/features/admin/brands/components/BrandContactForm.tsx' },
  @{ Source='src/components/admin/brands/BrandFollowupForm.tsx'; Dest='src/features/admin/brands/components/BrandFollowupForm.tsx' },
  @{ Source='src/components/admin/brands/BrandFormDrawer.tsx'; Dest='src/features/admin/brands/components/BrandFormDrawer.tsx' },
  @{ Source='src/components/admin/brands/BrandsCrmManager.tsx'; Dest='src/features/admin/brands/components/BrandsCrmManager.tsx' },
  @{ Source='src/components/admin/brands/BrandsTabs.tsx'; Dest='src/features/admin/brands/components/BrandsTabs.tsx' },
  @{ Source='src/components/admin/brands/invite-form.tsx'; Dest='src/features/admin/brands/components/invite-form.tsx' },

  # admin/campaigns
  @{ Source='src/components/admin/campaigns/CampaignDetailTabs.tsx'; Dest='src/features/admin/campaigns/components/CampaignDetailTabs.tsx' },
  @{ Source='src/components/admin/campaigns/CampaignDrawer.tsx'; Dest='src/features/admin/campaigns/components/CampaignDrawer.tsx' },
  @{ Source='src/components/admin/campaigns/CampaignFiles.tsx'; Dest='src/features/admin/campaigns/components/CampaignFiles.tsx' },
  @{ Source='src/components/admin/campaigns/CampaignFilters.tsx'; Dest='src/features/admin/campaigns/components/CampaignFilters.tsx' },
  @{ Source='src/components/admin/campaigns/CampaignPayments.tsx'; Dest='src/features/admin/campaigns/components/CampaignPayments.tsx' },
  @{ Source='src/components/admin/campaigns/CampaignsList.tsx'; Dest='src/features/admin/campaigns/components/CampaignsList.tsx' },
  @{ Source='src/components/admin/campaigns/CampaignSummaryCard.tsx'; Dest='src/features/admin/campaigns/components/CampaignSummaryCard.tsx' },

  # admin/invoices
  @{ Source='src/components/admin/invoices/ColumnMappingModal.tsx'; Dest='src/features/admin/invoices/components/ColumnMappingModal.tsx' },
  @{ Source='src/components/admin/invoices/FiscalExports.tsx'; Dest='src/features/admin/invoices/components/FiscalExports.tsx' },
  @{ Source='src/components/admin/invoices/ImportInbox.tsx'; Dest='src/features/admin/invoices/components/ImportInbox.tsx' },
  @{ Source='src/components/admin/invoices/InvoiceCategoryField.tsx'; Dest='src/features/admin/invoices/components/InvoiceCategoryField.tsx' },
  @{ Source='src/components/admin/invoices/InvoiceDrawer.tsx'; Dest='src/features/admin/invoices/components/InvoiceDrawer.tsx' },
  @{ Source='src/components/admin/invoices/InvoiceFileFields.tsx'; Dest='src/features/admin/invoices/components/InvoiceFileFields.tsx' },
  @{ Source='src/components/admin/invoices/InvoicesManager.tsx'; Dest='src/features/admin/invoices/components/InvoicesManager.tsx' },

  # admin/pnl
  @{ Source='src/components/admin/pnl/PnLBreakdownTable.tsx'; Dest='src/features/admin/pnl/components/PnLBreakdownTable.tsx' },
  @{ Source='src/components/admin/pnl/PnLCategoryList.tsx'; Dest='src/features/admin/pnl/components/PnLCategoryList.tsx' },
  @{ Source='src/components/admin/pnl/PnLFilters.tsx'; Dest='src/features/admin/pnl/components/PnLFilters.tsx' },
  @{ Source='src/components/admin/pnl/PnLOverviewCards.tsx'; Dest='src/features/admin/pnl/components/PnLOverviewCards.tsx' },

  # admin/tasks
  @{ Source='src/components/admin/tasks/PriorityBadge.tsx'; Dest='src/features/admin/tasks/components/PriorityBadge.tsx' },
  @{ Source='src/components/admin/tasks/RecurrenceBadge.tsx'; Dest='src/features/admin/tasks/components/RecurrenceBadge.tsx' },
  @{ Source='src/components/admin/tasks/RelatedSelector.tsx'; Dest='src/features/admin/tasks/components/RelatedSelector.tsx' },
  @{ Source='src/components/admin/tasks/RolledOverBanner.tsx'; Dest='src/features/admin/tasks/components/RolledOverBanner.tsx' },
  @{ Source='src/components/admin/tasks/TaskCalendar.tsx'; Dest='src/features/admin/tasks/components/TaskCalendar.tsx' },
  @{ Source='src/components/admin/tasks/TaskKanban.tsx'; Dest='src/features/admin/tasks/components/TaskKanban.tsx' },
  @{ Source='src/components/admin/tasks/TaskList.tsx'; Dest='src/features/admin/tasks/components/TaskList.tsx' },
  @{ Source='src/components/admin/tasks/TaskModal.tsx'; Dest='src/features/admin/tasks/components/TaskModal.tsx' },
  @{ Source='src/components/admin/tasks/TaskStatusBadge.tsx'; Dest='src/features/admin/tasks/components/TaskStatusBadge.tsx' },
  @{ Source='src/components/admin/tasks/TaskTemplatesManager.tsx'; Dest='src/features/admin/tasks/components/TaskTemplatesManager.tsx' },
  @{ Source='src/components/admin/tasks/TaskWorkspace.tsx'; Dest='src/features/admin/tasks/components/TaskWorkspace.tsx' },

  # admin/targets (incl. utility files)
  @{ Source='src/components/admin/targets/export-csv.ts'; Dest='src/features/admin/targets/components/export-csv.ts' },
  @{ Source='src/components/admin/targets/targets-constants.ts'; Dest='src/features/admin/targets/components/targets-constants.ts' },
  @{ Source='src/components/admin/targets/TargetsDiagnostics.tsx'; Dest='src/features/admin/targets/components/TargetsDiagnostics.tsx' },
  @{ Source='src/components/admin/targets/TargetsEmptyState.tsx'; Dest='src/features/admin/targets/components/TargetsEmptyState.tsx' },
  @{ Source='src/components/admin/targets/TargetsSpreadsheet.tsx'; Dest='src/features/admin/targets/components/TargetsSpreadsheet.tsx' },
  @{ Source='src/components/admin/targets/ThSortable.tsx'; Dest='src/features/admin/targets/components/ThSortable.tsx' },
  @{ Source='src/components/admin/targets/TwitchSearch.tsx'; Dest='src/features/admin/targets/components/TwitchSearch.tsx' },
  @{ Source='src/components/admin/targets/YouTubeSearch.tsx'; Dest='src/features/admin/targets/components/YouTubeSearch.tsx' },

  # admin/files
  @{ Source='src/components/admin/files/FilesList.tsx'; Dest='src/features/admin/files/components/FilesList.tsx' },
  @{ Source='src/components/admin/files/FileUploadButton.tsx'; Dest='src/features/admin/files/components/FileUploadButton.tsx' },

  # admin/equipo
  @{ Source='src/components/admin/equipo/InviteStaffForm.tsx'; Dest='src/features/admin/equipo/components/InviteStaffForm.tsx' },
  @{ Source='src/components/admin/equipo/UploadForm.tsx'; Dest='src/features/admin/equipo/components/UploadForm.tsx' },

  # admin/stats
  @{ Source='src/components/admin/stats/GeoEditor.tsx'; Dest='src/features/admin/stats/components/GeoEditor.tsx' },
  @{ Source='src/components/admin/stats/RankingTable.tsx'; Dest='src/features/admin/stats/components/RankingTable.tsx' },
  @{ Source='src/components/admin/stats/ShareLinkPanel.tsx'; Dest='src/features/admin/stats/components/ShareLinkPanel.tsx' },
  @{ Source='src/components/admin/stats/StatsExportPanel.tsx'; Dest='src/features/admin/stats/components/StatsExportPanel.tsx' },
  @{ Source='src/components/admin/stats/StatsImportPanel.tsx'; Dest='src/features/admin/stats/components/StatsImportPanel.tsx' },
  @{ Source='src/components/admin/stats/StatsTable.tsx'; Dest='src/features/admin/stats/components/StatsTable.tsx' },

  # admin/analytics
  @{ Source='src/components/admin/analytics/GrowthReport.tsx'; Dest='src/features/admin/analytics/components/GrowthReport.tsx' }
)

Write-Host ("Manifest entries: {0}" -f $manifest.Count)
Write-Host ""

$idx = 0
foreach ($entry in $manifest) {
  $idx++
  $src = $entry.Source
  $dst = $entry.Dest
  # Old import path: drop the 'src/' prefix and the '.tsx'/'.ts' extension; prepend '@/'
  $oldImport = '@/' + ($src -replace '^src/','' -replace '\.tsx$','' -replace '\.ts$','')
  $newImport = '@/' + ($dst -replace '^src/','' -replace '\.tsx$','' -replace '\.ts$','')
  Write-Host ("[{0}/{1}] {2} -> {3}" -f $idx, $manifest.Count, $src, $dst)
  Move-Component -Source $src -Dest $dst -OldImport $oldImport -NewImport $newImport
}

# Clean up empty source dirs (admin/, sections/, etc. should be empty now)
$cleanupDirs = @(
  'src/components/admin/dashboard',
  'src/components/admin/talents',
  'src/components/admin/brands',
  'src/components/admin/campaigns',
  'src/components/admin/invoices',
  'src/components/admin/pnl',
  'src/components/admin/tasks',
  'src/components/admin/targets',
  'src/components/admin/files',
  'src/components/admin/equipo',
  'src/components/admin/stats',
  'src/components/admin/analytics',
  'src/components/admin/search',
  'src/components/admin/ui',
  'src/components/admin',
  'src/components/blog',
  'src/components/brand/targets',
  'src/components/brand',
  'src/components/creadores',
  'src/components/giveaways',
  'src/components/sections',
  'src/components/sorteos',
  'src/components/stats'
)
Write-Host ""
Write-Host "Cleaning up empty source directories..."
foreach ($d in $cleanupDirs) {
  if (Test-Path $d) {
    $remaining = Get-ChildItem -Path $d -Recurse -File -ErrorAction SilentlyContinue
    if ($null -eq $remaining -or $remaining.Count -eq 0) {
      Remove-Item -Recurse -Force $d
      Write-Host ("  removed empty: {0}" -f $d)
    } else {
      Write-Host ("  KEPT (still has files): {0} -> {1} files" -f $d, $remaining.Count)
      foreach ($r in $remaining) {
        Write-Host ("    - {0}" -f $r.FullName.Replace((Get-Location).Path + '\',''))
      }
    }
  }
}

Write-Host ""
Write-Host "Done."
