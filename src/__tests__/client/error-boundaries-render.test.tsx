/**
 * Tests de render con RTL para los error boundaries.
 *
 * Garantiza el comportamiento runtime:
 *   - El mensaje al usuario es amigable y NO contiene `error.message` ni stack.
 *   - El `error.digest` se muestra como Ref si está presente.
 *   - El botón Reintentar dispara `reset()`.
 *   - Console.error solo loggea metadata segura.
 *
 * NO se testea global-error.tsx en RTL porque renderiza <html>/<body>
 * (su comportamiento clave queda cubierto por el test estático).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppError from '@/app/error';
import AdminError from '@/app/admin/(dashboard)/error';

type ErrorBoundary = typeof AppError;

const errorWithDigest = (digest = 'abc123def') => {
  const e = new Error('TEXTO SECRETO QUE NUNCA DEBE APARECER EN UI');
  // @ts-expect-error -- digest es un campo no estándar del tipo Error añadido por Next.js
  e.digest = digest;
  return e as Error & { digest?: string };
};

const errorWithoutDigest = () => {
  return new Error('OTRO SECRETO QUE NUNCA DEBE APARECER') as Error & { digest?: string };
};

describe.each([
  ['app/error.tsx', AppError as ErrorBoundary],
  ['admin/(dashboard)/error.tsx', AdminError as ErrorBoundary],
])('Error boundary %s — render', (_label, Boundary) => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('NUNCA renderiza error.message en la UI', () => {
    const { container } = render(<Boundary error={errorWithDigest()} reset={jest.fn()} />);
    expect(container.textContent).not.toContain('TEXTO SECRETO');
  });

  it('NUNCA renderiza error.stack en la UI', () => {
    const err = errorWithDigest();
    err.stack = 'at SECRET_STACK_FRAME (./file.ts:42:13)';
    const { container } = render(<Boundary error={err} reset={jest.fn()} />);
    expect(container.textContent).not.toContain('SECRET_STACK_FRAME');
    expect(container.textContent).not.toContain('./file.ts');
  });

  it('muestra `Ref: <digest>` cuando el digest está presente', () => {
    render(<Boundary error={errorWithDigest('digest-test-xyz')} reset={jest.fn()} />);
    expect(screen.getByText(/Ref:\s*digest-test-xyz/)).toBeInTheDocument();
  });

  it('NO muestra el bloque Ref cuando el digest es undefined', () => {
    const { container } = render(<Boundary error={errorWithoutDigest()} reset={jest.fn()} />);
    expect(container.textContent).not.toMatch(/Ref:/);
  });

  it('el botón Reintentar dispara reset()', async () => {
    const user = userEvent.setup();
    const reset = jest.fn();
    render(<Boundary error={errorWithDigest()} reset={reset} />);
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('console.error solo recibe metadata segura (no error.message ni stack completos)', () => {
    const err = errorWithDigest('safe-digest');
    err.stack = 'at SECRET (./x.ts:1:1)';
    render(<Boundary error={err} reset={jest.fn()} />);
    // El primer arg es el tag, el segundo es un objeto con name + digest.
    for (const call of consoleSpy.mock.calls) {
      const argsStr = (call as unknown[]).map((a) => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      expect(argsStr).not.toContain('TEXTO SECRETO');
      expect(argsStr).not.toContain('SECRET');
      expect(argsStr).not.toContain('./x.ts');
    }
  });
});
