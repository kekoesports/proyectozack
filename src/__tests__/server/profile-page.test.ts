/**
 * Contratos estructurales del perfil premium de usuario Steam en
 * /sorteos/plataforma/perfil.
 *
 * Verifica:
 *  - Página protegida (redirect si !userId).
 *  - Fetch en paralelo de balance/streak/profile/stats/transactions/redemptions.
 *  - Hero + 4 stat cards + settings form + inventario + transacciones.
 *  - Form action llama a updateProfile server action.
 *  - Zod schema valida Steam trade URL.
 *  - UserPill enlaza al perfil (no más data-todo).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[profile] page — auth y data flow', () => {
  const src = read('src/app/sorteos/perfil/page.tsx');

  it('redirige a /sorteos si no hay userId', () => {
    expect(src).toMatch(/if\s*\(!userId\)\s*\{[\s\S]{0,150}redirect\('\/sorteos'\)/);
  });

  it('fetches datos del perfil en paralelo (Promise.all)', () => {
    expect(src).toMatch(/Promise\.all\(\[[\s\S]{0,600}getCoinBalance\(userId\)[\s\S]{0,600}getUserStats\(userId\)[\s\S]{0,600}getUserRedemptions\(userId\)/);
  });

  it('robots noindex en metadata', () => {
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it('renderiza hero + stats + form + inventario + tx', () => {
    expect(src).toMatch(/gp-profile-hero/);
    expect(src).toMatch(/gp-profile-stats/);
    expect(src).toMatch(/<ProfileSettingsForm/);
    expect(src).toMatch(/gp-profile-inv/);
    expect(src).toMatch(/gp-profile-tx/);
  });
});

describe('[profile] update server action', () => {
  const src = read('src/features/giveaway-platform/actions/updateProfile.ts');

  it("usa 'use server' y arranca chequeando la sesión", () => {
    expect(src).toMatch(/^'use server';/);
    expect(src).toMatch(/auth\.api\.getSession/);
    expect(src).toMatch(/if\s*\(!userId\)\s*return\s*\{\s*ok:\s*false,\s*error:\s*'unauthenticated'/);
  });

  it('valida input con Zod safeParse (regla TS #5) tras normalizar el checkbox', () => {
    // La normalización del checkbox pasa el objeto ya masajeado a safeParse.
    expect(src).toMatch(/UpdateProfileSchema\.safeParse\(raw\)/);
    expect(src).toMatch(/return\s*\{\s*ok:\s*false,\s*fieldErrors/);
  });

  it('normaliza el toggle privado: hasPrivateField=1 + isPrivate ausente → false', () => {
    // Regla del checkbox HTML nativo: sin el flag no podemos distinguir
    // "desmarcado" de "no tocado". Con el flag, ausente = desmarcado.
    expect(src).toMatch(/raw\.hasPrivateField\s*===\s*'1'\s*&&\s*!\(\s*'isPrivate'\s+in\s+raw\s*\)/);
    expect(src).toMatch(/raw\.isPrivate\s*=\s*'false'/);
    // El flag se elimina antes del safeParse para no ensuciar el schema.
    expect(src).toMatch(/delete\s+raw\.hasPrivateField/);
  });

  it('regex Steam trade URL exige partner + token', () => {
    expect(src).toMatch(/steamcommunity\\\.com\\\/tradeoffer\\\/new/);
    expect(src).toMatch(/partner=\\d\+&token=/);
  });

  it('sanea vacíos a null antes de actualizar', () => {
    expect(src).toMatch(/steamTradeUrl\s*===\s*''\s*\?\s*null/);
  });

  it('kickUsername retirado del formulario (regresión 2026-07-10)', () => {
    // El input de "Usuario de Kick" se retiró — no había OAuth ni misiones.
    // El server action no debe aceptar ese campo desde formData ni tocar
    // la columna aunque el atacante lo mande.
    expect(src).not.toMatch(/kickUsername:\s*z\./);
    expect(src).not.toMatch(/patch\.kickUsername/);
  });

  it('revalida /sorteos/perfil tras el update', () => {
    expect(src).toMatch(/revalidatePath\('\/sorteos\/perfil'\)/);
  });
});

describe('[profile] settings form (client)', () => {
  const src = read('src/features/giveaway-platform/components/ProfileSettingsForm.tsx');

  it("es un 'use client' con useTransition", () => {
    expect(src).toMatch(/^'use client';/);
    expect(src).toMatch(/useTransition/);
  });

  it('form action apunta al server action updateProfile', () => {
    expect(src).toMatch(/updateProfile\(formData\)/);
    expect(src).toMatch(/<form\s+action=\{handleSubmit\}/);
  });

  it('inputs para trade URL y toggle privado (Kick retirado 2026-07-10)', () => {
    expect(src).toMatch(/name="steamTradeUrl"/);
    expect(src).toMatch(/name="isPrivate"[\s\S]{0,150}type="checkbox"/);
    // Regresión anti-Kick: el input y la prop del componente no deben reaparecer.
    expect(src).not.toMatch(/name="kickUsername"/);
    expect(src).not.toMatch(/initialKickUsername/);
  });

  it('form incluye hidden hasPrivateField para permitir desmarcar el toggle', () => {
    expect(src).toMatch(/<input[\s\S]{0,120}type="hidden"[\s\S]{0,120}name="hasPrivateField"[\s\S]{0,60}value="1"/);
  });
});

describe('[profile] UserPill enlaza al perfil', () => {
  const src = read('src/features/giveaway-platform/components/UserPill.tsx');

  it('usa <Link> hacia /sorteos/perfil', () => {
    expect(src).toMatch(/href="\/sorteos\/perfil"/);
  });

  it('elimina los data-todo del menú', () => {
    expect(src).not.toMatch(/data-todo=/);
  });
});

describe('[profile] queries', () => {
  const src = read('src/lib/queries/giveawayPlatform.ts');

  it('getUserStats agrega entriesTotal/Month + distinctCreators + redemptionsCount', () => {
    expect(src).toMatch(/export async function getUserStats/);
    expect(src).toMatch(/distinctCreators/);
    expect(src).toMatch(/redemptionsCount/);
    expect(src).toMatch(/count\(distinct\s+\$\{giveaways\.talentId\}\)/);
  });

  it('getPlayerProfile devuelve la fila player_profiles', () => {
    expect(src).toMatch(/export async function getPlayerProfile/);
    expect(src).toMatch(/db\.query\.playerProfiles\.findFirst/);
  });
});
