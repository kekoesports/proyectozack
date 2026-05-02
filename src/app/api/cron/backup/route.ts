import { NextRequest, NextResponse } from 'next/server';
import { exportCrmData, serializeBackup, buildBackupFileName } from '@/lib/backup/export-data';
import { uploadToDrive } from '@/lib/backup/drive-upload';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { getDriveConfig } from '@/lib/backup/getDriveConfig';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel function max 60s

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  const cfg = getDriveConfig();
  if (!cfg.ok) return NextResponse.json({ error: cfg.error }, { status: 503 });

  try {
    // Determinar tipo según día de la semana (lunes = semanal)
    const isMonday = new Date().getDay() === 1;
    const type     = isMonday ? 'semanal' : 'diario';

    const data     = await exportCrmData();
    const json     = serializeBackup(data);
    const fileName = buildBackupFileName(type);

    const file = await uploadToDrive(fileName, json, 'application/json', cfg.config.folderId);

    console.log(`[backup] ✓ ${type} — ${file.name} (${data.meta.totalRows} registros)`);

    return NextResponse.json({
      success:    true,
      type,
      fileName:   file.name,
      fileId:     file.id,
      totalRows:  data.meta.totalRows,
      tables:     data.meta.tables.length,
      webViewLink: file.webViewLink,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[backup] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
