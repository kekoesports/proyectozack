/**
 * Almacenamiento local.
 *
 * El grueso de estas pruebas no valida que guardar un fichero funcione —eso es
 * lo fácil— sino que no se pueda escribir fuera del directorio, que un fichero
 * privado no sea adivinable y que una escritura interrumpida no deje basura
 * con aspecto de fichero válido.
 */

jest.mock('server-only', () => ({}));

import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalStorageProvider } from '@/lib/storage/local-provider';
import { assertClaveValida, nuevaClave, sha256 } from '@/lib/storage/keys';
import { StorageError } from '@/lib/storage/types';

let raiz: string;
let provider: LocalStorageProvider;

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'storage-'));
  provider = new LocalStorageProvider({
    publicRoot: join(raiz, 'public'),
    privateRoot: join(raiz, 'private'),
    publicUrlBase: 'https://socialpro.es/files',
  });
});

afterEach(() => {
  rmSync(raiz, { recursive: true, force: true });
});

const pdf = (texto = 'contenido') => Buffer.from(texto);

describe('claves', () => {
  it('la clave no se deriva del nombre que envía el usuario', () => {
    const k = nuevaClave({ filename: 'factura secreta.pdf', contentType: 'application/pdf' });
    // Solo sobrevive la extensión: ni el nombre ni los espacios.
    expect(k).toMatch(/^misc\/[0-9a-f-]{36}\.pdf$/);
    expect(k).not.toContain('secreta');
  });

  it('rechaza una extensión no admitida', () => {
    expect(() => nuevaClave({ filename: 'x.exe', contentType: 'application/pdf' }))
      .toThrow(StorageError);
  });

  it('rechaza que el MIME no corresponda a la extensión', () => {
    // Un .pdf declarado como imagen es exactamente lo que hace un atacante.
    expect(() => nuevaClave({ filename: 'x.pdf', contentType: 'image/png' }))
      .toThrow(/no corresponde/);
  });

  it.each([
    '../fuera.pdf',
    'a/../../fuera.pdf',
    '/absoluta.pdf',
    'con\\barra.pdf',
    'doble//barra.pdf',
    'nulo\0.pdf',
  ])('rechaza la clave %p', (clave) => {
    expect(() => assertClaveValida(clave)).toThrow(StorageError);
  });
});

describe('subida y lectura', () => {
  it('guarda, calcula checksum y vuelve a leer', async () => {
    const datos = pdf('hola mundo');
    const obj = await provider.upload({
      filename: 'doc.pdf', data: datos, contentType: 'application/pdf',
      visibility: 'private', prefix: 'invoices',
    });

    expect(obj.checksum).toBe(sha256(datos));
    expect(obj.size).toBe(datos.byteLength);
    expect(obj.storageKey).toMatch(/^invoices\//);

    const stream = await provider.openReadStream(obj.storageKey);
    const leido = Buffer.from(await new Response(stream).arrayBuffer());
    expect(leido.equals(datos)).toBe(true);
  });

  it('un fichero privado NO se guarda bajo la raíz pública', async () => {
    const obj = await provider.upload({
      filename: 'x.pdf', data: pdf(), contentType: 'application/pdf', visibility: 'private',
    });
    expect(existsSync(join(raiz, 'private', obj.storageKey))).toBe(true);
    // Lo importante: no está donde el proxy podría servirlo.
    expect(existsSync(join(raiz, 'public', obj.storageKey))).toBe(false);
    expect(obj.publicUrl).toBeNull();
  });

  it('un fichero público sí tiene URL', async () => {
    const obj = await provider.upload({
      filename: 'foto.png', data: pdf(), contentType: 'image/png', visibility: 'public',
    });
    expect(obj.publicUrl).toBe(`https://socialpro.es/files/${obj.storageKey}`);
  });

  it('rechaza un fichero por encima del máximo', async () => {
    const enorme = Buffer.alloc(51 * 1024 * 1024);
    await expect(provider.upload({
      filename: 'x.pdf', data: enorme, contentType: 'application/pdf', visibility: 'private',
    })).rejects.toThrow(/máximo/);
  });

  it('no deja temporales tras una subida correcta', async () => {
    const obj = await provider.upload({
      filename: 'x.pdf', data: pdf(), contentType: 'application/pdf',
      visibility: 'private', prefix: 'invoices',
    });
    const dir = join(raiz, 'private', 'invoices');
    const sobrantes = readdirSync(dir).filter((f) => f.endsWith('.tmp'));
    expect(sobrantes).toEqual([]);
    expect(readFileSync(join(raiz, 'private', obj.storageKey)).length).toBeGreaterThan(0);
  });

  it('dos subidas del mismo fichero no colisionan', async () => {
    const a = await provider.upload({ filename: 'x.pdf', data: pdf('a'), contentType: 'application/pdf', visibility: 'private' });
    const b = await provider.upload({ filename: 'x.pdf', data: pdf('b'), contentType: 'application/pdf', visibility: 'private' });
    expect(a.storageKey).not.toBe(b.storageKey);
  });
});

describe('existencia y borrado', () => {
  it('exists distingue lo que hay de lo que no', async () => {
    const obj = await provider.upload({
      filename: 'x.pdf', data: pdf(), contentType: 'application/pdf', visibility: 'private',
    });
    expect(await provider.exists(obj.storageKey)).toBe(true);
    expect(await provider.exists('misc/00000000-0000-4000-8000-000000000000.pdf')).toBe(false);
  });

  it('borrar algo que no existe no es un error', async () => {
    await expect(provider.delete('misc/00000000-0000-4000-8000-000000000000.pdf'))
      .resolves.toBeUndefined();
  });

  it('borra de verdad', async () => {
    const obj = await provider.upload({
      filename: 'x.pdf', data: pdf(), contentType: 'application/pdf', visibility: 'private',
    });
    await provider.delete(obj.storageKey);
    expect(await provider.exists(obj.storageKey)).toBe(false);
  });

  it('leer algo inexistente da not_found, no un error genérico', async () => {
    await expect(provider.openReadStream('misc/00000000-0000-4000-8000-000000000000.pdf'))
      .rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('recorrido de rutas', () => {
  it.each(['../../../etc/passwd', 'invoices/../../fuera.pdf'])(
    'no permite leer %p',
    async (clave) => {
      await expect(provider.openReadStream(clave)).rejects.toThrow(StorageError);
    },
  );

  it('no permite construir una URL pública con una clave inválida', () => {
    expect(() => provider.getPublicUrl('../secreto.pdf')).toThrow(StorageError);
  });
});
