/**
 * Verifica que SteamLoginButton genera el href con `?returnTo=` correcto.
 * - Con prop explícito: usa el prop.
 * - Sin prop: infiere del pathname + searchParams del renderer.
 * - El endpoint sanea el valor antes de guardarlo (tests en el helper),
 *   así que aquí sólo comprobamos que el botón LO PASA — no que sea
 *   seguro. La autoridad de sanitización es el servidor.
 */

import { render, screen } from '@testing-library/react';
import { SteamLoginButton } from '@/features/giveaway-platform/components/SteamLoginButton';

const mockPathname = jest.fn<string | null, []>();
const mockSearchParams = jest.fn<URLSearchParams | null, []>();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}));

function href(): string {
  const a = screen.getByRole('link', { name: /iniciar sesión con steam/i });
  return a.getAttribute('href') ?? '';
}

describe('SteamLoginButton — href con returnTo', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/sorteos');
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('usa el prop returnTo cuando se le pasa explícito', () => {
    render(<SteamLoginButton returnTo="/sorteos/zacketizor?tab=recompensas" />);
    expect(href()).toBe(
      '/api/auth/steam/login?returnTo=' +
        encodeURIComponent('/sorteos/zacketizor?tab=recompensas'),
    );
  });

  it('infiere pathname si no se pasa prop', () => {
    mockPathname.mockReturnValue('/sorteos/huasopeek');
    render(<SteamLoginButton />);
    expect(href()).toBe(
      '/api/auth/steam/login?returnTo=' + encodeURIComponent('/sorteos/huasopeek'),
    );
  });

  it('infiere pathname + query cuando hay searchParams', () => {
    mockPathname.mockReturnValue('/sorteos/zacketizor');
    mockSearchParams.mockReturnValue(new URLSearchParams('tab=recompensas&sort=fecha'));
    render(<SteamLoginButton />);
    expect(href()).toBe(
      '/api/auth/steam/login?returnTo=' +
        encodeURIComponent('/sorteos/zacketizor?tab=recompensas&sort=fecha'),
    );
  });

  it('prop explícita gana sobre lo inferido', () => {
    mockPathname.mockReturnValue('/sorteos/naow');
    render(<SteamLoginButton returnTo="/sorteos/perfil" />);
    expect(href()).toBe(
      '/api/auth/steam/login?returnTo=' + encodeURIComponent('/sorteos/perfil'),
    );
  });

  it('degrada a /sorteos cuando usePathname devuelve null (SSG / primer render)', () => {
    mockPathname.mockReturnValue(null);
    mockSearchParams.mockReturnValue(new URLSearchParams());
    render(<SteamLoginButton />);
    expect(href()).toBe(
      '/api/auth/steam/login?returnTo=' + encodeURIComponent('/sorteos'),
    );
  });

  it('el returnTo se URL-encodea correctamente (evita romper el parseo del server)', () => {
    render(<SteamLoginButton returnTo="/sorteos/perfil?section=inventario&sort=fecha" />);
    const raw = href();
    expect(raw).toContain('returnTo=');
    // El `&` interno del returnTo debe ir encodeado como %26 para no
    // parecer un segundo query param del endpoint.
    expect(raw).toContain('%26sort%3Dfecha');
  });

  it('renderiza el label accesible "Iniciar sesión con Steam"', () => {
    render(<SteamLoginButton />);
    expect(
      screen.getByRole('link', { name: /iniciar sesión con steam/i }),
    ).toBeInTheDocument();
  });

  it('aplica la clase de tamaño', () => {
    render(<SteamLoginButton size="lg" />);
    const link = screen.getByRole('link', { name: /iniciar sesión con steam/i });
    expect(link.className).toContain('gp-steam-login-lg');
  });

  it('propaga className adicional', () => {
    render(<SteamLoginButton className="custom-x" />);
    const link = screen.getByRole('link', { name: /iniciar sesión con steam/i });
    expect(link.className).toContain('custom-x');
  });
});
