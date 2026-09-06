'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  StudioLogin,
  StudioSignup,
  StudioAuthResponse,
  StudioToken,
} from '@/lib/schemas/studio';

export function StudioLoginForm({
  inviteToken,
}: {
  inviteToken?: string | undefined;
}) {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudioLogin>({
    resolver: zodResolver(signup ? StudioSignup : StudioLogin),
    defaultValues: { email: '', password: '', name: '' },
  });
  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        void handleSubmit(async (data) => {
          setError('');
          if (signup && !data.name.trim()) {
            setError('Indica tu nombre.');
            return;
          }
          try {
            const response = await fetch(
              signup ? '/api/auth/sign-up/email' : '/api/auth/sign-in/email',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                  signup
                    ? data
                    : { email: data.email, password: data.password },
                ),
              },
            );
            if (!response.ok) {
              setError(
                'No se pudo acceder. Revisa tus datos y el estado de tu invitación.',
              );
              return;
            }
            const body: unknown = await response.json();
            const parsed = StudioAuthResponse.safeParse(body);
            if (!parsed.success) {
              setError('Respuesta no válida. Vuelve a intentarlo.');
              return;
            }
            if (parsed.data.twoFactorRedirect) {
              router.push('/admin/two-factor');
              return;
            }
            const token = StudioToken.safeParse(inviteToken);
            router.push(
              token.success ? `/studio/access#${token.data}` : '/studio',
            );
            router.refresh();
          } catch {
            setError('No se pudo conectar. Vuelve a intentarlo.');
          }
        })(event);
      }}
    >
      {signup && (
        <label>
          Tu nombre
          <input {...register('name')} autoComplete="name" />
        </label>
      )}
      <label>
        Correo de tu cuenta SocialPro
        <input {...register('email')} autoComplete="email" type="email" />
      </label>
      <p className="studio-error">{errors.email?.message}</p>
      <label>
        Contraseña
        <input
          {...register('password')}
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
        />
      </label>
      {signup && <small>Mínimo 12 caracteres.</small>}
      <p className="studio-error">{errors.password?.message}</p>
      <button className="studio-button" disabled={isSubmitting}>
        {isSubmitting
          ? 'Un momento…'
          : signup
            ? 'Crear mi cuenta'
            : 'Entrar a Studio'}
      </button>
      {inviteToken && (
        <button
          className="studio-text-button"
          type="button"
          onClick={() => setSignup(!signup)}
        >
          {signup
            ? 'Ya tengo cuenta'
            : 'Tengo invitación y necesito una cuenta'}
        </button>
      )}
      <p role="alert" className="studio-error">
        {error}
      </p>
      <Link href="/admin/forgot-password">He olvidado mi contraseña</Link>
    </form>
  );
}
