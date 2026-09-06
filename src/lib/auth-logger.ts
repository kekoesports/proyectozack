/** Better Auth errors may contain Drizzle query parameters (including session tokens).
 * Never forward library messages or error arguments to application logs.
 */
export function logAuthDiagnostic(level: string): void {
  if (level === 'error')
    console.error('[auth] authentication_error; sensitive details suppressed');
  else if (level === 'warn')
    console.warn('[auth] authentication_warning; sensitive details suppressed');
}
