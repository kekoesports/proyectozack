// Quita el checker "fake transparency" del PNG del agente terrorista.
// La imagen origen tiene canal alpha pero 100% opaco: los píxeles del
// fondo son blanco (255,255,255) y gris claro (~230,230,230). Los pinto
// como transparentes con un margen de tolerancia + feather del alpha
// para suavizar bordes.
import sharp from 'sharp';

const IN = 'public/images/agents/terrorist-cs2.png';
const OUT = 'public/images/agents/terrorist-cs2.png';

async function main() {
  const src = sharp(IN);
  const meta = await src.metadata();
  if (!meta.width || !meta.height) throw new Error('metadata inválida');

  const { data, info } = await src.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) throw new Error('esperado RGBA');

  // Umbral: gris claro sin tinte (r≈g≈b y todos altos).
  // Fondo suele estar entre 240-255 → margen a 232 evita comerse el chaleco
  // gris claro (~180-210) del personaje.
  const MIN = 232;
  const MAX_DELTA = 10;    // canales balanceados (evita piel/tela con tinte)
  let stripped = 0;

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (r >= MIN && g >= MIN && b >= MIN) {
      const dRG = Math.abs(r - g);
      const dGB = Math.abs(g - b);
      const dRB = Math.abs(r - b);
      if (dRG <= MAX_DELTA && dGB <= MAX_DELTA && dRB <= MAX_DELTA) {
        out[i + 3] = 0;
        stripped++;
      }
    }
  }
  const total = width * height;
  console.log(`stripped ${stripped}/${total} px (${((stripped / total) * 100).toFixed(1)}%)`);

  // Feather: blur suave sólo del canal alpha para no dejar bordes duros.
  const rgba = await sharp(out, { raw: { width, height, channels: 4 } })
    .blur(0.6)   // suaviza levemente el borde del recorte
    .png({ compressionLevel: 9 })
    .toBuffer();

  const { size: origSize } = await import('node:fs').then((m) => m.promises.stat(IN));
  await import('node:fs').then((m) => m.promises.writeFile(OUT, rgba));
  const { size: newSize } = await import('node:fs').then((m) => m.promises.stat(OUT));
  console.log(`saved ${OUT}  ${(origSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
