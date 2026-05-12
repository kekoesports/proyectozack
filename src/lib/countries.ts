export const COUNTRIES = [
  { code: 'ES', label: 'España',             flag: '🇪🇸' },
  { code: 'AR', label: 'Argentina',          flag: '🇦🇷' },
  { code: 'MX', label: 'México',             flag: '🇲🇽' },
  { code: 'CL', label: 'Chile',              flag: '🇨🇱' },
  { code: 'CO', label: 'Colombia',           flag: '🇨🇴' },
  { code: 'PE', label: 'Perú',               flag: '🇵🇪' },
  { code: 'BR', label: 'Brasil',             flag: '🇧🇷' },
  { code: 'UY', label: 'Uruguay',            flag: '🇺🇾' },
  { code: 'VE', label: 'Venezuela',          flag: '🇻🇪' },
  { code: 'EC', label: 'Ecuador',            flag: '🇪🇨' },
  { code: 'PY', label: 'Paraguay',           flag: '🇵🇾' },
  { code: 'BO', label: 'Bolivia',            flag: '🇧🇴' },
  { code: 'CR', label: 'Costa Rica',         flag: '🇨🇷' },
  { code: 'DO', label: 'Rep. Dominicana',    flag: '🇩🇴' },
  { code: 'GT', label: 'Guatemala',          flag: '🇬🇹' },
  { code: 'PA', label: 'Panamá',             flag: '🇵🇦' },
  { code: 'US', label: 'EEUU',               flag: '🇺🇸' },
  { code: 'GB', label: 'Reino Unido',        flag: '🇬🇧' },
  { code: 'FR', label: 'Francia',            flag: '🇫🇷' },
  { code: 'DE', label: 'Alemania',           flag: '🇩🇪' },
  { code: 'PT', label: 'Portugal',           flag: '🇵🇹' },
  { code: 'IT', label: 'Italia',             flag: '🇮🇹' },
  { code: 'TR', label: 'Turquía',            flag: '🇹🇷' },
  { code: 'PL', label: 'Polonia',            flag: '🇵🇱' },
  { code: 'MA', label: 'Marruecos',          flag: '🇲🇦' },
  { code: 'KR', label: 'Corea del Sur',      flag: '🇰🇷' },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['code'];

export function getCountryLabel(code: string): string | undefined {
  return COUNTRIES.find((c) => c.code === code)?.label;
}

export function getCountryFlag(code: string): string | undefined {
  return COUNTRIES.find((c) => c.code === code)?.flag;
}
