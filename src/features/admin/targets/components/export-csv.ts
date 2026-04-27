import type { Target } from '@/types';

const HEADERS = ['id', 'username', 'platform', 'followers', 'status', 'notes', 'profileUrl', 'createdAt'] as const;

/**
 * Exporta una lista de targets a CSV con BOM UTF-8 implícito y descarga el fichero en cliente.
 * Escapa comas, saltos de línea y comillas según RFC 4180.
 *
 * @feature admin/targets
 */
export function exportTargetsCSV(rows: Target[]): void {
  const lines = [
    HEADERS.join(','),
    ...rows.map((t) =>
      HEADERS
        .map((h) => {
          const val = t[h as keyof Target] ?? '';
          const s = String(val);
          return s.includes(',') || s.includes('\n') || s.includes('"')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `targets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
