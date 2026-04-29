'use client';

import * as XLSX from 'xlsx';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';
import { TALENT_VERTICAL_LABELS } from '@/lib/schemas/talentBusiness';

const ORANGE  = 'FFf5632a';
const WHITE   = 'FFFFFFFF';
const DARK    = 'FF16161f';
const GRAY_BG = 'FFf5f5f8';
const GRAY2   = 'FFe2e2ec';

const STATUS_LABELS: Record<string, string> = {
  active:    'Activo',
  available: 'Disponible',
  inactive:  'Inactivo',
};

function cellStyle(bold = false, bg = WHITE, color = DARK, fontSize = 10) {
  return {
    font: { name: 'Calibri', sz: fontSize, bold, color: { rgb: color } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: false },
    border: {
      top:    { style: 'thin', color: { rgb: GRAY2 } },
      bottom: { style: 'thin', color: { rgb: GRAY2 } },
      left:   { style: 'thin', color: { rgb: GRAY2 } },
      right:  { style: 'thin', color: { rgb: GRAY2 } },
    },
  };
}

export function exportTalentsToExcel(
  creators: readonly AdminRosterRow[],
  verticalsByTalent: Readonly<Record<number, readonly TalentVertical[]>>,
): void {
  const headers = [
    'Nombre', 'Estado', 'País', 'Juego / Categoría', 'Sectores', 'Visibilidad',
    'Twitch Handle', 'Twitch Followers', 'Twitch CCV',
    'YouTube Handle', 'YouTube Subs', 'YouTube Avg Views',
    'Instagram', 'IG Followers',
    'TikTok', 'TikTok Followers',
    'Kick', 'Kick Followers',
    'Twitter / X',
  ];

  const rows = creators.map((c) => {
    const getSocial = (platform: string) => c.socials.find((s) => s.platform.toLowerCase() === platform);
    const tw  = getSocial('twitch');
    const yt  = getSocial('youtube');
    const ig  = getSocial('instagram');
    const tt  = getSocial('tiktok');
    const ki  = getSocial('kick');
    const tx  = getSocial('twitter');
    const vtx = (verticalsByTalent[c.id] ?? []).map((v) => TALENT_VERTICAL_LABELS[v] ?? v).join(', ');

    return [
      c.name,
      STATUS_LABELS[c.status] ?? c.status,
      c.creatorCountry ?? '',
      c.game ?? '',
      vtx,
      c.visibility === 'public' ? 'Público' : 'Interno',
      tw?.handle ?? '',  tw?.followersDisplay ?? '',  tw?.avgViewers ?? '',
      yt?.handle ?? '',  yt?.followersDisplay ?? '',  yt?.avgViewers ?? '',
      ig?.handle ?? '',  ig?.followersDisplay ?? '',
      tt?.handle ?? '',  tt?.followersDisplay ?? '',
      ki?.handle ?? '',  ki?.followersDisplay ?? '',
      tx?.handle ?? '',
    ];
  });

  const wsData = [headers, ...rows];
  const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 22 }, { wch: 12 }, { wch: 7  }, { wch: 18 }, { wch: 30 }, { wch: 10 },
    { wch: 22 }, { wch: 12 }, { wch: 10 },
    { wch: 22 }, { wch: 12 }, { wch: 12 },
    { wch: 22 }, { wch: 12 },
    { wch: 20 }, { wch: 12 },
    { wch: 20 }, { wch: 12 },
    { wch: 22 },
  ];
  ws['!rows'] = [{ hpt: 22 }, ...rows.map(() => ({ hpt: 18 }))];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const numCols = headers.length;
  const numRows = rows.length + 1;
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      if (r === 0) {
        ws[addr].s = cellStyle(true, ORANGE, WHITE, 11);
      } else {
        ws[addr].s = cellStyle(false, r % 2 === 0 ? GRAY_BG : WHITE, DARK, 10);
      }
    }
  }

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: 'Roster SocialPro', Subject: 'SocialPro Agency', Author: 'SocialPro CRM', CreatedDate: new Date() };
  XLSX.utils.book_append_sheet(wb, ws, 'Influencers');

  // Segunda hoja — resumen
  const active    = creators.filter((c) => c.status === 'active').length;
  const available = creators.filter((c) => c.status === 'available').length;
  const inactive  = creators.filter((c) => c.status === 'inactive').length;
  const summaryData = [
    ['SOCIALPRO — Roster de Influencers', ''],
    ['', ''],
    ['Fecha de exportación', new Date().toLocaleDateString('es-ES')],
    ['Total influencers',    creators.length],
    ['', ''],
    ['Activos',              active],
    ['Disponibles',          available],
    ['Inactivos',            inactive],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 20 }];

  // Estilo cabecera del resumen
  const rS = wsSummary['A1'];
  if (rS) rS.s = cellStyle(true, ORANGE, WHITE, 13);

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `SocialPro_Influencers_${date}.xlsx`, { bookType: 'xlsx', type: 'binary', cellStyles: true });
}
