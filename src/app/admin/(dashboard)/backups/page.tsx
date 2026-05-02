import { requireRole } from '@/lib/auth-guard';
import { listBackupsAction } from './backup-actions';
import { BackupsManager } from '@/features/admin/backups/BackupsManager';
import { env } from '@/lib/env';

export const metadata = { title: 'Backups | Admin' };

export default async function BackupsPage(): Promise<React.ReactElement> {
  await requireRole('admin', '/admin/login');

  const result = await listBackupsAction();
  const files  = result.success ? result.files : [];
  const error  = result.success ? null : result.error;

  const isConfigured = !!(
    env.GOOGLE_DRIVE_BACKUP_FOLDER_ID &&
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );

  return (
    <BackupsManager
      files={files}
      initialError={error}
      isConfigured={isConfigured}
    />
  );
}
