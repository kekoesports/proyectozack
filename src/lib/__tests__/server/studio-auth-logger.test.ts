import { logAuthDiagnostic } from '@/lib/auth-logger';

test('auth diagnostics never interpolate library errors or query parameters', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    // Library callbacks can carry extra runtime arguments; this logger ignores all of them.
    Reflect.apply(logAuthDiagnostic, undefined, ['error', 'fixture-token', { params: ['fixture-token'] }]);
    expect(spy).toHaveBeenCalledWith('[auth] authentication_error; sensitive details suppressed');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('fixture-token');
  } finally { spy.mockRestore(); }
});
