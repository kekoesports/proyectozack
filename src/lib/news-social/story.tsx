import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { shorten } from './policy';

const fonts = Promise.all([
  readFile(path.join(process.cwd(), 'public/fonts/studio/BarlowCondensed-ExtraBold.ttf')),
  readFile(path.join(process.cwd(), 'public/fonts/studio/Inter-Regular.ttf')),
]);
const cache = new Map<string, Buffer>();

/** Local fonts/artwork only: no paid generation, tracking, or arbitrary remote image fetch. */
export async function renderNewsStory(post: { title: string; excerpt: string }): Promise<Buffer> {
  const key = JSON.stringify(post);
  const cached = cache.get(key);
  if (cached) return cached;
  const [display, body] = await fonts;
  const title = shorten(post.title, 150);
  const image = new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f7f4ef', color: '#17191d', padding: '200px 86px 230px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 90 }}>
        <div style={{ display: 'flex', fontFamily: 'Barlow', fontSize: 58, color: '#f5632a' }}>SOCIALPRO</div>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 23, letterSpacing: 3 }}>ACTUALIDAD</div>
      </div>
      <div style={{ display: 'flex', background: '#17191d', color: 'white', fontFamily: 'Inter', fontSize: 24, padding: '17px 25px', alignSelf: 'flex-start', borderRadius: 8 }}>CS2 · ESPORTS</div>
      <div style={{ display: 'flex', fontFamily: 'Barlow', fontSize: title.length > 105 ? 91 : 110, lineHeight: 1.02, textTransform: 'uppercase', marginTop: 42, letterSpacing: -1 }}>{title}</div>
      <div style={{ display: 'flex', height: 9, width: 170, background: 'linear-gradient(90deg, #f5632a, #e03070)', marginTop: 44, marginBottom: 40 }} />
      <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 32, lineHeight: 1.45 }}>{shorten(post.excerpt, 185)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', fontFamily: 'Inter' }}>
        <div style={{ display: 'flex', fontSize: 27, color: '#585858', marginTop: 40 }}>La noticia completa en nuestra web</div>
        <div style={{ display: 'flex', fontFamily: 'Barlow', fontSize: 54, marginTop: 14 }}>socialpro.es/news</div>
      </div>
    </div>,
    { width: 1080, height: 1920, fonts: [
      { name: 'Barlow', data: Uint8Array.from(display).buffer, weight: 800 },
      { name: 'Inter', data: Uint8Array.from(body).buffer, weight: 400 },
    ] },
  );
  // Instagram image publishing requires JPEG; ImageResponse itself returns PNG.
  const result = await sharp(Buffer.from(await image.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
  if (cache.size >= 16) { const oldest = cache.keys().next().value; if (oldest) cache.delete(oldest); }
  cache.set(key, result);
  return result;
}
