'use client';

import { useState, useTransition } from 'react';
import { updateProfile, type UpdateProfileResult } from '@/features/giveaway-platform/actions/updateProfile';

interface Props {
  initialIsPrivate: boolean;
  initialSteamTradeUrl: string | null;
  initialKickUsername: string | null;
}

export function ProfileSettingsForm({ initialIsPrivate, initialSteamTradeUrl, initialKickUsername }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UpdateProfileResult | null>(null);

  function handleSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await updateProfile(formData);
      setResult(r);
    });
  }

  const errors = result && 'fieldErrors' in result ? result.fieldErrors : {};

  return (
    <form action={handleSubmit} className="gp-profile-form">
      <div className="gp-profile-field">
        <label htmlFor="pf-tradeurl">
          <b>Steam Trade URL</b>
          <span>Necesaria para enviar premios físicos digitales (skins).</span>
        </label>
        <input
          id="pf-tradeurl"
          name="steamTradeUrl"
          type="url"
          defaultValue={initialSteamTradeUrl ?? ''}
          placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…"
          spellCheck={false}
        />
        {errors.steamTradeUrl?.[0] ? (
          <span className="gp-profile-err">{errors.steamTradeUrl[0]}</span>
        ) : null}
      </div>

      <div className="gp-profile-field">
        <label htmlFor="pf-kick">
          <b>Usuario de Kick</b>
          <span>Vinculación opcional para misiones que requieren interacción en Kick.</span>
        </label>
        <input
          id="pf-kick"
          name="kickUsername"
          type="text"
          defaultValue={initialKickUsername ?? ''}
          placeholder="tuUsuario"
          spellCheck={false}
        />
        {errors.kickUsername?.[0] ? (
          <span className="gp-profile-err">{errors.kickUsername[0]}</span>
        ) : null}
      </div>

      <div className="gp-profile-field gp-profile-toggle">
        <label htmlFor="pf-private">
          <b>Perfil privado</b>
          <span>Si está activo, tu nombre aparece enmascarado en el ranking global (k*****).</span>
        </label>
        {/* Un checkbox HTML nativo no envía el campo cuando está desmarcado.
            Marcamos con un flag "hasPrivateField" que el server usa para
            interpretar la ausencia como false en lugar de "no tocar". */}
        <input type="hidden" name="hasPrivateField" value="1" />
        <input
          id="pf-private"
          name="isPrivate"
          type="checkbox"
          defaultChecked={initialIsPrivate}
          value="true"
        />
      </div>

      <div className="gp-profile-actions">
        <button type="submit" className="gp-btn gp-btn-primary" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {result?.ok ? <span className="gp-profile-ok">✔ Guardado</span> : null}
        {result && !result.ok && 'error' in result ? (
          <span className="gp-profile-err">
            {result.error === 'unauthenticated' ? 'Sesión expirada, vuelve a entrar' : 'No hay perfil vinculado a esta cuenta'}
          </span>
        ) : null}
      </div>
    </form>
  );
}
