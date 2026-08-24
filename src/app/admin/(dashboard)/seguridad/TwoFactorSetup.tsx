'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';

type SetupResponse = {
  readonly totpURI: string;
  readonly backupCodes: readonly string[];
};

function responseMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const candidate = data as { message?: unknown; error?: unknown };
  if (typeof candidate.message === 'string') return candidate.message;
  if (typeof candidate.error === 'string') return candidate.error;
  return fallback;
}

export function TwoFactorSetup(props: {
  readonly email: string;
  readonly initiallyEnabled: boolean;
}): React.ReactElement {
  const [enabled, setEnabled] = useState(props.initiallyEnabled);
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const manualSecret = useMemo(() => {
    if (!setup) return '';
    try {
      return new URL(setup.totpURI).searchParams.get('secret') ?? '';
    } catch {
      return '';
    }
  }, [setup]);

  useEffect(() => {
    if (!setup) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(setup.totpURI, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    }).catch(() => {
      if (!cancelled) setError('No se pudo generar el QR. Usa la clave manual.');
    });
    return () => { cancelled = true; };
  }, [setup]);

  const beginSetup = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/auth/two-factor/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, issuer: 'SocialPro CRM' }),
      });
      const data = await response.json().catch(() => null) as SetupResponse | null;
      if (!response.ok || !data?.totpURI || !Array.isArray(data.backupCodes)) {
        setError(responseMessage(data, 'No se pudo iniciar la configuración. Comprueba tu contraseña.'));
        return;
      }
      setPassword('');
      setSetup(data);
      setNotice('Escanea el QR y confirma un código para terminar. El 2FA todavía no está activo.');
    } catch {
      setError('No se pudo conectar con el servicio de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const finishSetup = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/two-factor/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode.trim(), trustDevice: false }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(responseMessage(data, 'Código incorrecto. Espera al siguiente código y vuelve a intentarlo.'));
        return;
      }
      setEnabled(true);
      setVerificationCode('');
      setNotice('Verificación en dos pasos activada. Guarda ahora los códigos de recuperación.');
    } catch {
      setError('No se pudo verificar el código.');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async (): Promise<void> => {
    if (!setup) return;
    await navigator.clipboard.writeText(setup.backupCodes.join('\n'));
    setNotice('Códigos copiados. Guárdalos fuera del CRM.');
  };

  const downloadBackupCodes = (): void => {
    if (!setup) return;
    const contents = [
      'SocialPro CRM — códigos de recuperación 2FA',
      `Cuenta: ${props.email}`,
      '',
      ...setup.backupCodes,
      '',
      'Cada código solo puede utilizarse una vez.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'socialpro-codigos-recuperacion.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (enabled && !setup) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">✓</span>
          <div>
            <h2 className="font-semibold text-emerald-500">Verificación en dos pasos activa</h2>
            <p className="text-sm text-sp-admin-muted mt-1">
              En cada inicio de sesión se pedirá un código de tu aplicación de autenticación.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sp-border bg-sp-admin-card p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Aplicación de autenticación</h2>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${enabled ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
            {enabled ? 'Activa' : 'Pendiente'}
          </span>
        </div>
        <p className="text-sm text-sp-admin-muted mt-1">
          Compatible con Google Authenticator, Microsoft Authenticator, 1Password y otras aplicaciones TOTP.
        </p>
      </div>

      {!setup ? (
        <form onSubmit={(event) => { void beginSetup(event); }} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Confirma tu contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              minLength={12}
              className="w-full rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-2.5 text-sm outline-none focus:border-sp-orange"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-sp-orange px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Preparando...' : 'Configurar 2FA'}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-[260px_1fr] items-start">
            <div className="rounded-xl bg-white p-2 w-fit min-h-[256px] min-w-[256px] flex items-center justify-center">
              {qrDataUrl
                ? <Image src={qrDataUrl} width={240} height={240} unoptimized alt="Código QR para configurar 2FA" />
                : <span className="text-sm text-gray-500">Generando QR…</span>}
            </div>
            <div className="space-y-4">
              <ol className="space-y-2 text-sm text-sp-admin-muted">
                <li>1. Abre tu aplicación de autenticación.</li>
                <li>2. Añade una cuenta y escanea el QR.</li>
                <li>3. Escribe debajo el código de 6 dígitos.</li>
              </ol>
              {manualSecret && (
                <div>
                  <p className="text-xs font-semibold text-sp-admin-muted mb-1">Clave manual</p>
                  <code className="block break-all rounded-lg bg-sp-admin-bg px-3 py-2 text-xs select-all">{manualSecret}</code>
                </div>
              )}
              <form onSubmit={(event) => { void finishSetup(event); }} className="space-y-3">
                <input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  className="w-full max-w-[220px] rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-sp-orange"
                />
                {!enabled && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="block rounded-lg bg-sp-orange px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? 'Verificando...' : 'Activar 2FA'}
                  </button>
                )}
              </form>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <h3 className="text-sm font-semibold">Códigos de recuperación</h3>
            <p className="text-xs text-sp-admin-muted mt-1">
              Guárdalos en un gestor de contraseñas. Cada código funciona una sola vez.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-5">
              {setup.backupCodes.map((backupCode) => (
                <span key={backupCode} className="rounded bg-sp-admin-bg px-2 py-1.5 text-center select-all">{backupCode}</span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => { void copyBackupCodes(); }} className="rounded-lg border border-sp-border px-3 py-2 text-xs font-semibold">
                Copiar códigos
              </button>
              <button type="button" onClick={downloadBackupCodes} className="rounded-lg border border-sp-border px-3 py-2 text-xs font-semibold">
                Descargar copia
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && <p className="text-sm text-emerald-500">{notice}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
