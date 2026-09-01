import { PostCreateSchema } from '@/lib/schemas/posts';

const basePost = {
  title: 'Noticia de prueba válida',
  slug: 'noticia-de-prueba-valida',
  excerpt: 'Extracto suficientemente largo para validar.',
  bodyMd: '# Contenido',
  author: 'SocialPro',
  vertical: 'news',
  contentType: 'noticias',
  sortOrder: '0',
};

describe('formularios editoriales — imágenes', () => {
  it('normaliza campos de imagen vacíos a null para permitir borradores', () => {
    const parsed = PostCreateSchema.parse({
      ...basePost,
      status: 'draft',
      coverUrl: '',
      ogImageUrl: '',
    });

    expect(parsed.coverUrl).toBeNull();
    expect(parsed.ogImageUrl).toBeNull();
  });

  it('conserva URLs válidas de portada y social', () => {
    const parsed = PostCreateSchema.parse({
      ...basePost,
      status: 'published',
      coverUrl: 'https://media.example.com/news/cover.webp',
      ogImageUrl: 'https://media.example.com/news/social.webp',
    });

    expect(parsed.coverUrl).toBe('https://media.example.com/news/cover.webp');
    expect(parsed.ogImageUrl).toBe('https://media.example.com/news/social.webp');
  });
});
