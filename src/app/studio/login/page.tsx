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
        <p>Crea vídeos, prepara ideas y organiza tu contenido. Entra con tu cuenta de SocialPro: como agencia podrás elegir un creador; como creador entrarás a tu espacio privado.</p>
        <StudioLoginForm />
      </div>
    </div>
  );
}
