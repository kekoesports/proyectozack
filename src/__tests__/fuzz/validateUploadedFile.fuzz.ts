import fc from 'fast-check';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

const PDF_OPTS = {
  maxBytes: 10_000_000,
  allowedMimes: ['application/pdf'] as const,
  allowedExts: ['.pdf'] as const,
};

function makeFile(bytes: number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('validateUploadedFile — fuzz', () => {
  it('arbitrary header bytes: PDF declared but non-PDF magic → rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 8, maxLength: 16 }),
        async (bytes) => {
          // Si por casualidad genera el magic PDF, lo descartamos
          const startsWithPdf =
            bytes[0] === PDF_MAGIC[0] &&
            bytes[1] === PDF_MAGIC[1] &&
            bytes[2] === PDF_MAGIC[2] &&
            bytes[3] === PDF_MAGIC[3] &&
            bytes[4] === PDF_MAGIC[4];
          if (startsWithPdf) return;
          const file = makeFile(bytes, 'doc.pdf', 'application/pdf');
          const r = await validateUploadedFile(file, PDF_OPTS);
          expect(r.ok).toBe(false);
          if (!r.ok) expect(r.reason).toBe('magic_bytes_mismatch');
        },
      ),
      { numRuns: 500 },
    );
  });

  it('arbitrary mime/ext combinations against PDF magic bytes: only correct combo passes', async () => {
    const mimes = fc.constantFrom('application/pdf', 'image/png', 'image/jpeg', 'text/plain');
    const exts = fc.constantFrom('.pdf', '.png', '.jpg', '.txt', '.exe', '');
    await fc.assert(
      fc.asyncProperty(mimes, exts, async (mime, ext) => {
        const file = makeFile(PDF_MAGIC.concat([0, 0, 0]), `file${ext}`, mime);
        const r = await validateUploadedFile(file, PDF_OPTS);
        const valid = mime === 'application/pdf' && ext === '.pdf';
        expect(r.ok).toBe(valid);
      }),
      { numRuns: 200 },
    );
  });

  it('arbitrary filenames never bypass extension check', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 100 }), async (name) => {
        const file = makeFile(PDF_MAGIC.concat([0, 0]), name, 'application/pdf');
        const r = await validateUploadedFile(file, PDF_OPTS);
        if (r.ok) {
          // Si pasa, el name DEBE terminar en .pdf (case-insensitive)
          const idx = name.lastIndexOf('.');
          const ext = idx >= 0 ? name.slice(idx).toLowerCase() : '';
          expect(ext).toBe('.pdf');
        }
      }),
      { numRuns: 1_000 },
    );
  });

  it('cross-type magic mismatch: PNG file declared as JPEG always rejected', async () => {
    const file = makeFile(PNG_MAGIC, 'photo.png', 'image/jpeg');
    const r = await validateUploadedFile(file, {
      maxBytes: 5_000_000,
      allowedMimes: ['image/jpeg'],
      allowedExts: ['.png'],
    });
    expect(r.ok).toBe(false);
  });

  it('JPEG file declared as PNG always rejected', async () => {
    const file = makeFile(JPEG_MAGIC, 'photo.jpg', 'image/png');
    const r = await validateUploadedFile(file, {
      maxBytes: 5_000_000,
      allowedMimes: ['image/png'],
      allowedExts: ['.jpg'],
    });
    expect(r.ok).toBe(false);
  });
});
