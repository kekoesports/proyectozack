/**
 * Cron endpoint: backup diario automático a Google Drive.
 * Invocado por Vercel Cron (configurado en vercel.json).
 *
 * Auth: Bearer ${CRON_SECRET} o x-vercel-cron: 1
 */
import { NextRequest, NextResponse } from 'next/server';
import { exportCrmData, serializeBackup, buildBackupFileName } from '@/lib/backup/export-data';
import { uploadToDrive } from '@/lib/backup/drive-upload';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel function max 60s

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Autenticación del cron
  const authHeader       = req.headers.get('authorization');
  const vercelCronHeader = req.headers.get('x-vercel-cron');
  const cronSecret       = env.CRON_SECRET;

  const isVercelCron   = vercelCronHeader === '1';
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const folderId = env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!folderId) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_BACKUP_FOLDER_ID no configurado' }, { status: 503 });
  }

  try {
    // Determinar tipo según día de la semana (lunes = semanal)
    const isMonday = new Date().getDay() === 1;
    const type     = isMonday ? 'semanal' : 'diario';

    const data     = await exportCrmData();
    const json     = serializeBackup(data);
    const fileName = buildBackupFileName(type);

    const file = await uploadToDrive(fileName, json, 'application/json', folderId);

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
