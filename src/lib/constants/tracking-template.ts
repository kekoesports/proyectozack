/**
 * URL de la plantilla maestra "Jolu - KD" para seguimiento de tratos.
 *
 * El usuario la duplica manualmente en su Google Drive, la comparte como
 * "cualquiera con el enlace" y pega el link en el drawer del trato.
 *
 * Se mantiene como constante TypeScript (no env var) porque:
 *   - No es secreto — es una plantilla pública de lectura.
 *   - No requiere rotación.
 *   - Debe versionarse con el código para que el botón "Abrir plantilla
 *     de referencia" siempre apunte a la versión canónica en cada deploy.
 */
export const TRACKING_TEMPLATE_URL =
  'https://docs.google.com/spreadsheets/d/1TAT7kpcFBhb-MfED-P5QQ72Z7EyndCRMKNKAZ-Bd07k/edit?gid=1857713850#gid=1857713850';
