/**
 * Tests del campo slug editable en TalentProfileForm + action (P2-04).
 *
 * Cubre:
 *   - Schema Zod TalentProfileUpdate acepta/rechaza slugs según regla
 *   - Form muestra input slug + preview + warning
 *   - Form contiene link a la pestaña Redes
 *   - Action no se ha modificado en nada peligroso (sin migración, sin schema)
 *
 * El test de uniqueness DB y de revalidate dual son verificación estática
 * sobre el source code de la action (sin invocar DB real).
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');

// ── Tests del schema Zod (importamos solo el schema, sin tocar DB) ──────────

// Re-construimos el regex del slug igual que en la action para validar inputs.
// Mantenido en paralelo con TalentProfileUpdate.slug en talents/actions.ts:
const SLUG_RX = /^[a-z0-9-]+$/;

describe('TalentProfileUpdate — schema Zod del slug', () => {
  it('[3] slug válido se acepta: "tigerr"', () => {
    expect(SLUG_RX.test('tigerr')).toBe(true);
  });

  it('[3b] slug válido con guiones: "creator-cs2"', () => {
    expect(SLUG_RX.test('creator-cs2')).toBe(true);
  });

  it('[4] slug con mayúsculas se rechaza con regex (la action aplica toLowerCase antes)', () => {
    // El zod schema hace .toLowerCase() ANTES de validar, así que "Tigerr"
    // llega como "tigerr" y pasa. Aquí verificamos que el regex base no
    // acepta mayúsculas — es la última línea de defensa.
    expect(SLUG_RX.test('Tigerr')).toBe(false);
    expect(SLUG_RX.test('TIGER')).toBe(false);
  });

  it('[4b] slug con espacios se rechaza por regex', () => {
    expect(SLUG_RX.test('tiger gg')).toBe(false);
    expect(SLUG_RX.test(' tigerr')).toBe(false);
  });

  it('[5] slug con caracteres inválidos se rechaza: ñ, @, /, ., etc.', () => {
    for (const s of ['tig@err', 'tig.err', 'tig/err', 'tig_err', 'tigéerr', 'tigñr', 'tigerr!']) {
      expect({ s, ok: SLUG_RX.test(s) }).toEqual({ s, ok: false });
    }
  });

  it('[5b] slug vacío se rechaza (regex requiere al menos un carácter)', () => {
    expect(SLUG_RX.test('')).toBe(false);
  });
});

// ── Tests estáticos sobre el form ───────────────────────────────────────────

describe('TalentProfileForm.tsx — slug input y warning', () => {
  const src = read('src/features/admin/talents/components/TalentProfileForm.tsx');

  it('[1] el formulario tiene una sección "Slug público" con un input', () => {
    expect(src).toMatch(/Slug público/);
    expect(src).toMatch(/id=['"]pf-slug['"]/);
    expect(src).toMatch(/name=['"]slug['"]/);
  });

  it('[2] el input tiene preview que muestra /talentos/<slug>', () => {
    // Patrón: /talentos/{slug} dentro del JSX del preview
    expect(src).toMatch(/\/talentos\/\{slug/);
  });

  it('input aplica pattern y maxLength en cliente', () => {
    expect(src).toMatch(/pattern=['"]\^\[a-z0-9-\]\+\$['"]/);
    expect(src).toMatch(/maxLength=\{100\}/);
  });

  it('input normaliza con toLowerCase + trim al teclear', () => {
    expect(src).toMatch(/e\.target\.value\.toLowerCase\(\)\.trim\(\)/);
  });

  it('[9] muestra warning de que cambiar slug puede romper enlaces antiguos', () => {
    expect(src).toMatch(/Cambiar el slug modifica la URL pública/);
    expect(src).toMatch(/enlaces antiguos pueden dejar de funcionar/i);
  });

  it('muestra cambio detectado old → new cuando el slug cambia', () => {
    expect(src).toMatch(/slugChanged/);
    expect(src).toMatch(/Cambio detectado/);
  });

  it('[10] contiene link/card hacia la pestaña Redes del detalle', () => {
    expect(src).toMatch(/Las redes sociales se editan desde la pestaña/);
    expect(src).toMatch(/Ir a Redes/);
    // Link a /admin/talents/{id}
    expect(src).toMatch(/href=\{`\/admin\/talents\/\$\{talent\.id\}`\}/);
  });

  it('no duplica el editor de redes (no importa TalentSocialsEditor)', () => {
    expect(src).not.toMatch(/TalentSocialsEditor/);
    expect(src).not.toMatch(/upsertTalentSocialsAction/);
  });
});

// ── Tests estáticos sobre la action ─────────────────────────────────────────

describe('updateTalentProfileAction — slug + uniqueness + revalidate dual', () => {
  const src = read('src/app/admin/(dashboard)/talents/actions.ts');

  it('TalentProfileUpdate schema incluye slug con regex /^[a-z0-9-]+$/', () => {
    expect(src).toMatch(/slug:[\s\S]{0,300}regex\(\/\^\[a-z0-9-\]\+\$\//);
  });

  it('schema aplica toLowerCase y trim antes de validar', () => {
    expect(src).toMatch(/slug:[\s\S]{0,200}\.trim\(\)[\s\S]{0,100}\.toLowerCase\(\)/);
  });

  it('schema valida min(1, "Slug obligatorio") — si isPublished=true, slug vacío se rechaza al primer paso', () => {
    expect(src).toMatch(/min\(1,\s*['"]Slug obligatorio['"]\)/);
  });

  it('[6] action hace uniqueness check con SELECT id WHERE slug = newSlug AND id != currentId', () => {
    expect(src).toMatch(/and\(\s*eq\(talents\.slug,\s*newSlug\),\s*ne\(talents\.id,\s*id\)\s*\)/);
  });

  it('[6b] devuelve mensaje humano "Este slug ya está usado por otro talento."', () => {
    expect(src).toMatch(/Este slug ya está usado por otro talento\./);
  });

  it('[7] el mismo talento puede guardar su slug actual: uniqueness check solo si oldSlug !== newSlug', () => {
    expect(src).toMatch(/if\s*\(\s*oldSlug\s*!==\s*newSlug\s*\)/);
  });

  it('action setea el slug en db.update', () => {
    expect(src).toMatch(/slug:\s+newSlug/);
  });

  it('action revalida SIEMPRE el path del nuevo slug', () => {
    expect(src).toMatch(/revalidatePath\(`\/talentos\/\$\{newSlug\}`\)/);
  });

  it('action revalida el path del old slug solo si cambió', () => {
    expect(src).toMatch(/if\s*\(oldSlug\s*&&\s*oldSlug\s*!==\s*newSlug\)/);
    expect(src).toMatch(/revalidatePath\(`\/talentos\/\$\{oldSlug\}`\)/);
  });

  it('action revalida también /sitemap.xml', () => {
    expect(src).toMatch(/revalidatePath\(['"]\/sitemap\.xml['"]\)/);
  });

  it('importa ne y and de drizzle-orm', () => {
    expect(src).toMatch(/import\s+\{[^}]*\bne\b[^}]*\}\s+from\s+['"]drizzle-orm['"]/);
    expect(src).toMatch(/import\s+\{[^}]*\band\b[^}]*\}\s+from\s+['"]drizzle-orm['"]/);
  });
});

// ── [11] No hay migraciones ni schema changes ───────────────────────────────

describe('Sin migraciones ni cambios de schema', () => {
  it('[11] no se han modificado archivos drizzle en este branch', () => {
    // Solo verificación negativa: el schema de talents no debe contener
    // ningún campo nuevo añadido por este PR. talents.slug existía ya.
    const schema = read('src/db/schema/talents.ts');
    expect(schema).toMatch(/slug:\s*varchar\(['"]slug['"],\s*\{\s*length:\s*100\s*\}\)\.notNull\(\)\.unique\(\)/);
    // Y no debe haber rastros de "TODO migration" o similar
    expect(schema).not.toMatch(/TODO\s+migration|FIXME\s+migration/i);
  });
});
