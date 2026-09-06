import { StudioLoginForm } from '@/features/studio/StudioLoginForm';
export default function StudioLoginPage() {
  return (
    <div className="studio-login">
      <div className="studio-login-card">
        <p className="studio-wordmark">
          SOCIAL<span>PRO</span>
          <small>STUDIO</small>
        </p>
        <h1>Tu talento tiene un espacio.</h1>
        <p>Entra con tu cuenta de SocialPro. La agencia conserva su acceso al CRM; cada creador ve únicamente su espacio asignado.</p>
        <StudioLoginForm />
      </div>
    </div>
  );
}
