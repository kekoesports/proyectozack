// Static map: normalised brand slug → local public asset.
// Normalisation: lowercase + strip non-alphanumeric chars.
// e.g. "Skin Club" → "skinclub", "1xBET" → "1xbet", "CS:GO Skins" → "csgoskins".
const BRAND_ASSET_MAP: Readonly<Record<string, string>> = {
  '1win':          '/images/brands/1win.png',
  '1xbet':         '/images/brands/1xbet.png',
  'clashgg':       '/images/brands/clashgg.png',
  'csdrop':        '/images/brands/csdrop.png',
  'csgoskins':     '/images/brands/csgoskins.png',
  'emma':          '/images/brands/emma.png',
  'empiredrop':    '/images/brands/empiredrop.png',
  'evoplay':       '/images/brands/evoplay.png',
  'ggdrop':        '/images/brands/ggdrop.png',
  'hellcase':      '/images/brands/hellcase.png',
  'jugabet':       '/images/brands/jugabet.svg',
  'keydrop':       '/images/brands/keydrop.png',
  'kick':          '/images/brands/kick.png',
  'pccomponentes': '/images/brands/pccomponentes.png',
  'pinup':         '/images/brands/pinup.png',
  'prozis':        '/images/brands/prozis.png',
  'razer':         '/images/brands/razer.png',
  'skinclub':      '/images/brands/skinclub.png',
  'skinplace':     '/images/brands/skinplace.png',
  'skinsmonkey':   '/images/brands/skinsmonkey.png',
  'yosports':      '/images/brands/yosports.png',
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Devuelve la ruta local del logo de una marca si existe en `/public/images/brands/`.
 * Normaliza el nombre (minúsculas + elimina no-alfanuméricos) antes de buscar.
 * Usable en servidor y cliente (pure function, sin I/O).
 *
 * @returns ruta absoluta desde la raíz pública, o `null` si no hay asset local.
 */
export function resolveBrandLogo(brandName: string | null | undefined): string | null {
  if (!brandName) return null;
  return BRAND_ASSET_MAP[slugify(brandName)] ?? null;
}
