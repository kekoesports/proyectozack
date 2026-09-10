import 'server-only';
import { TikTokMetadata, type AgencyVideo } from '@/lib/schemas/agencyVideo';

// Editorial selection, not an automatically refreshed account feed.
const POSTS = [
  { id: '7683853921047055648', title: '«Haz algo viral»', subtitle: 'Detrás de cada idea hay mucho más.' },
  { id: '7682825984642436384', title: 'Talento, conoce a tu equipo', subtitle: 'Bienvenido a SocialPro.' },
  { id: '7682386125444353312', title: 'Algo se está moviendo', subtitle: 'Esto solo acaba de empezar.' },
] as const;

export async function getAgencyVideos(): Promise<AgencyVideo[]> {
  return Promise.all(POSTS.map(async post => {
    const url = `https://www.tiktok.com/@socialproagency/video/${post.id}`;
    let thumbnail: string | null = null;
    try {
      const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        const parsed = TikTokMetadata.safeParse(await response.json());
        if (parsed.success) thumbnail = parsed.data.thumbnail_url;
      }
    } catch {
      // An unavailable social platform must not take down the homepage.
    }
    return { ...post, url, thumbnail };
  }));
}
