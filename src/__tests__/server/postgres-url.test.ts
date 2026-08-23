import { normalizePostgresSslMode } from '@/lib/postgres-url';

describe('normalizePostgresSslMode', () => {
  it.each(['prefer', 'require', 'verify-ca'])(
    'convierte sslmode=%s en verify-full',
    (mode) => {
      const result = normalizePostgresSslMode(
        `postgresql://user:secret@db.example.com/socialpro?sslmode=${mode}`,
      );

      expect(new URL(result).searchParams.get('sslmode')).toBe('verify-full');
    },
  );

  it('no toca la URL local del PostgreSQL del VPS', () => {
    const value = 'postgresql://socialpro@postgres:5432/socialpro';
    expect(normalizePostgresSslMode(value)).toBe(value);
  });

  it.each(['disable', 'allow', 'verify-full'])(
    'respeta sslmode=%s cuando ya tiene semántica explícita',
    (mode) => {
      const value = `postgresql://user@db.example.com/socialpro?sslmode=${mode}`;
      expect(normalizePostgresSslMode(value)).toBe(value);
    },
  );

  it('respeta la compatibilidad libpq solicitada expresamente', () => {
    const value = 'postgresql://user@db.example.com/socialpro?uselibpqcompat=true&sslmode=require';
    expect(normalizePostgresSslMode(value)).toBe(value);
  });
});
