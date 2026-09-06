import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { StudioAccessForm } from '@/features/studio/StudioAccessForm';
import { StudioVerifyEmail } from '@/features/studio/StudioVerifyEmail';
export default async function StudioAccessPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="studio-login">
      <div className="studio-login-card">
        <p className="studio-eyebrow">SOCIALPRO STUDIO / SOLO POR INVITACIÓN</p>
        <h1>Un espacio para lo que viene.</h1>
        {session && !session.user.emailVerified ? (
          <StudioVerifyEmail email={session.user.email} />
        ) : (
          <StudioAccessForm authenticated={Boolean(session)} />
        )}
      </div>
    </div>
  );
}
