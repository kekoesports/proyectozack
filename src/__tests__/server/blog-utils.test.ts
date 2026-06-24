import { deriveCategory, detectBrand, readTime } from '@/lib/utils/blog';
import { escapeHtml, renderInline, linkifyInternal } from '@/lib/utils/blog-renderer';

describe('deriveCategory', () => {
  it('post CS2 con "streamer" en slug → esports, no youtube', () => {
    const cat = deriveCategory(
      'cuanto-cobra-streamer-cs2-patrocinio-2026',
      '¿Cuánto cobra un streamer de CS2 por una integración en 2026?',
    );
    expect(cat.slug).toBe('esports');
  });

  it('post con "igaming" en slug → igaming', () => {
    expect(deriveCategory('trackeo-ftds-campanas-igaming-influencers-metodologia', 'Título').slug).toBe('igaming');
  });

  it('post con "youtube" puro en slug → youtube', () => {
    expect(deriveCategory('crecer-en-youtube-gaming', 'Título').slug).toBe('youtube');
  });

  it('post con "activacion" → caso-exito', () => {
    expect(deriveCategory('activacion-razer-socialpro', 'Título').slug).toBe('caso-exito');
  });

  it('post con "guia" → guia', () => {
    expect(deriveCategory('guia-marketing-gaming', 'Título').slug).toBe('guia');
  });

  it('post con "tendencia" → tendencias', () => {
    expect(deriveCategory('tendencias-gaming-2026', 'Título').slug).toBe('tendencias');
  });

  it('post genérico → noticias (fallback)', () => {
    expect(deriveCategory('nuevo-partnership-socialpro', 'Noticia sin categoría clara').slug).toBe('noticias');
  });

  it('streamer sin cs2 ni esports → youtube', () => {
    expect(deriveCategory('los-mejores-streamers-twitch-2026', 'Título').slug).toBe('youtube');
  });

  it('post con "esports" en slug → esports (aunque tenga año)', () => {
    expect(deriveCategory('torneo-esports-gaming-2026', 'Título').slug).toBe('esports');
  });
});

describe('detectBrand', () => {
  it('detecta 1win desde slug', () => {
    const brand = detectBrand('socialpro-x-1win-cs2-340-ftds', 'Título sin marca');
    expect(brand).not.toBeNull();
    expect(brand?.name).toBe('1WIN');
  });

  it('detecta razer desde title', () => {
    const brand = detectBrand('caso-exito-campaña', 'Campaña Razer × SocialPro');
    expect(brand).not.toBeNull();
    expect(brand?.slug).toBe('razer');
  });

  it('devuelve null cuando no hay marca', () => {
    expect(detectBrand('post-sin-marca', 'Artículo sin marca conocida')).toBeNull();
  });

  it('detecta keydrop', () => {
    expect(detectBrand('keydrop-campaign-2026', 'Título')).not.toBeNull();
  });

  it('detecta hellcase desde slug', () => {
    expect(detectBrand('hellcase-activation-streamers', 'Título')).not.toBeNull();
  });
});

describe('readTime', () => {
  it('texto vacío → 1 min', () => {
    expect(readTime('')).toBe(1);
  });

  it('texto de 400 palabras → 2 min', () => {
    const text = Array(400).fill('palabra').join(' ');
    expect(readTime(text)).toBe(2);
  });

  it('texto de 200 palabras → 1 min', () => {
    const text = Array(200).fill('palabra').join(' ');
    expect(readTime(text)).toBe(1);
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres especiales', () => {
    expect(escapeHtml('<b>hola & "mundo"</b>')).toBe('&lt;b&gt;hola &amp; &quot;mundo&quot;&lt;/b&gt;');
  });
});

describe('renderInline', () => {
  it('convierte **bold** a strong', () => {
    expect(renderInline('**texto**')).toContain('<strong');
  });

  it('convierte [link](/ruta) a anchor interno', () => {
    const html = renderInline('[ver más](/casos)');
    expect(html).toContain('href="/casos"');
    expect(html).toContain('ver más');
  });
});

describe('linkifyInternal', () => {
  it('convierte socialpro.es/casos a link interno', () => {
    const html = linkifyInternal('visita socialpro.es/casos para más info');
    expect(html).toContain('href="/casos"');
  });

  it('no linkifica URLs de terceros', () => {
    const html = linkifyInternal('visita google.com para buscar');
    expect(html).not.toContain('<a');
  });
});
