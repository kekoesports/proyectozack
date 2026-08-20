/**
 * Entorno de despliegue, independiente del proveedor.
 *
 * Antes esto se leía de `VERCEL_ENV`, y ahí estaba el peligro: fuera de Vercel
 * esa variable simplemente no existe, así que los guards que dependían de ella
 * no fallaban — dejaban de aplicarse. En la práctica eso significa migraciones
 * corriendo en preview y pings de IndexNow disparados desde staging, sin que
 * nada lo avise.
 *
 * `DEPLOY_ENV` manda; `VERCEL_ENV` queda como respaldo mientras producción siga
 * en Vercel. Cuando el cutover termine, se elimina el respaldo y esta función
 * se queda con una sola fuente.
 *
 * Sin ninguna de las dos, el valor es 'development': el más restrictivo para
 * los guards de este proyecto (no migra en preview, no hace ping a IndexNow).
 */

export type DeployEnv = 'production' | 'preview' | 'development';

const VALORES: readonly DeployEnv[] = ['production', 'preview', 'development'];

function leer(nombre: string): DeployEnv | null {
  const raw = process.env[nombre]?.trim().toLowerCase();
  if (!raw) return null;
  return VALORES.find((v) => v === raw) ?? null;
}

export function getDeployEnv(): DeployEnv {
  // Orden deliberado: lo propio primero, el proveedor después.
  return leer('DEPLOY_ENV') ?? leer('VERCEL_ENV') ?? 'development';
}

export function isProductionDeploy(): boolean {
  return getDeployEnv() === 'production';
}

export function isPreviewDeploy(): boolean {
  return getDeployEnv() === 'preview';
}

/**
 * Señala si el proceso corre en un entorno automatizado donde no deben
 * ejecutarse scripts destructivos: CI, un runner de despliegue o producción.
 *
 * Sustituye a la comprobación de `VERCEL === '1'`, que fuera de Vercel dejaba
 * de proteger nada.
 */
export function isAutomatedEnvironment(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.VERCEL === '1' ||
    process.env.DEPLOY_RUNNER === '1' ||
    process.env.NODE_ENV === 'production'
  );
}
