import { requirePermission } from '@/lib/permissions';
import { listBackupsAction } from './backup-actions';
import { BackupsManager } from '@/features/admin/backups/BackupsManager';
import { getDriveConfig } from '@/lib/backup/getDriveConfig';
import { getBackupHealthSummary } from '@/lib/queries/backupHealth';

export const metadata = { title: 'Backups | Admin' };

export default async function BackupsPage(): Promise<React.ReactElement> {
  await requirePermission('ajustes', 'read');

  const [result, vpsHealth] = await Promise.all([
    listBackupsAction(),
    getBackupHealthSummary(),
  ]);
  const isConfigured = getDriveConfig().ok;
  const files  = result.success ? result.files : [];
  const error  = result.success || !isConfigured ? null : result.error;

  return (
    <BackupsManager
      files={files}
      initialError={error}
      isConfigured={isConfigured}
      vpsHealth={vpsHealth}
    />
  );
}
