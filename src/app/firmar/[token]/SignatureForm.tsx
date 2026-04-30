'use client';

import { useActionState, useState } from 'react';
import { signContractAction } from './sign-action';

type Props = { readonly token: string; readonly signerName: string };

type SignState = { readonly error?: string; readonly success?: boolean };
const INIT: SignState = {};

export function SignatureForm({ token, signerName }: Props): React.ReactElement {
  const [state, formAction, isPending] = useActionState(signContractAction, INIT);
  const [confirmed, setConfirmed] = useState(false);

  if (state.success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-6 text-center">
        <p className="text-3xl mb-3">🎉</p>
        <p className="font-bold text-emerald-800 text-lg">¡Firmado correctamente!</p>
        <p className="text-sm text-emerald-600 mt-2">Tu firma ha quedado registrada. Puedes cerrar esta página.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
          Confirma tu nombre para firmar *
        </label>
        <input
          name="signedName"
          required
          defaultValue={signerName}
          placeholder="Escribe tu nombre completo"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-400 focus:bg-white transition-colors"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          name="accepted"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-orange-500 cursor-pointer shrink-0"
        />
        <span className="text-sm text-gray-600 leading-relaxed">
          He leído el contrato y acepto firmarlo electrónicamente. Entiendo que esta firma tiene validez legal
          y queda registrada junto con la fecha y mi dirección IP.
        </span>
      </label>

      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 font-medium">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !confirmed}
        className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: confirmed ? 'linear-gradient(135deg,#f5632a,#8b3aad)' : '#d1d5db' }}
      >
        {isPending ? 'Registrando firma…' : '✓ Firmar contrato'}
      </button>
    </form>
  );
}
