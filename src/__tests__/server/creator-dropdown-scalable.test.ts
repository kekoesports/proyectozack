/**
 * Contratos estructurales del CreatorDropdown escalable a 15+ creadores.
 *
 * Verifica:
 *  - Umbral configurable (SEARCH_THRESHOLD) para mostrar buscador.
 *  - Filtrado por name/slug/sub via useMemo.
 *  - Wrapper .gp-dd-scroll para lista scrollable.
 *  - Estado vacío .gp-dd-empty cuando no hay resultados.
 *  - CSS que soporta scroll, input de búsqueda y empty state.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[creator-dropdown] escalable — component', () => {
  const src = read('src/features/giveaway-platform/components/CreatorDropdown.tsx');

  it('define constante SEARCH_THRESHOLD', () => {
    expect(src).toMatch(/const\s+SEARCH_THRESHOLD\s*=\s*\d+/);
  });

  it('renderiza input de búsqueda condicionalmente (showSearch)', () => {
    expect(src).toMatch(/showSearch\s*=\s*creators\.length\s*>=\s*SEARCH_THRESHOLD/);
    expect(src).toMatch(/showSearch\s*\?[\s\S]{0,400}gp-dd-search/);
  });

  it('filtra por name, slug y sub con useMemo', () => {
    expect(src).toMatch(/useMemo\(\(\)\s*=>\s*\{[\s\S]{0,400}filter/);
    expect(src).toMatch(/c\.name\.toLowerCase\(\)\.includes\(q\)/);
    expect(src).toMatch(/c\.slug\.toLowerCase\(\)\.includes\(q\)/);
    expect(src).toMatch(/c\.sub\.toLowerCase\(\)\.includes\(q\)/);
  });

  it('envuelve la lista en .gp-dd-scroll', () => {
    expect(src).toMatch(/className="gp-dd-scroll"/);
  });

  it('muestra empty state cuando filtered.length === 0', () => {
    expect(src).toMatch(/filtered\.length\s*===\s*0[\s\S]{0,200}gp-dd-empty/);
  });

  it('items son <button> con role=menuitem (a11y)', () => {
    expect(src).toMatch(/role="menuitem"/);
    expect(src).toMatch(/type="button"[\s\S]{0,200}gp-dd-item/);
  });

  it('cierra dropdown y resetea query en click fuera', () => {
    expect(src).toMatch(/setOpen\(false\);\s*setQuery\(''\);/);
  });
});

describe('[creator-dropdown] escalable — CSS', () => {
  const css = read('src/app/sorteos/plataforma/platform-dropdown.css');

  it('define .gp-dd-search con estilo de input', () => {
    expect(css).toMatch(/\.gp-dd-search\s*\{[\s\S]{0,300}background/);
  });

  it('define .gp-dd-scroll con max-height y overflow-y auto', () => {
    expect(css).toMatch(/\.gp-dd-scroll\s*\{[\s\S]{0,200}max-height/);
    expect(css).toMatch(/\.gp-dd-scroll\s*\{[\s\S]{0,200}overflow-y:\s*auto/);
  });

  it('define .gp-dd-empty con text-align center', () => {
    expect(css).toMatch(/\.gp-dd-empty\s*\{[\s\S]{0,200}text-align:\s*center/);
  });

  it('normaliza button.gp-dd-item para reset de estilos nativos', () => {
    expect(css).toMatch(/button\.gp-dd-item\s*\{[\s\S]{0,200}background:\s*transparent/);
  });
});
