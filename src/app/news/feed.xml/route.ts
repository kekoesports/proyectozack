import { getNewsPosts } from '@/lib/queries/posts';
import { absoluteUrl } from '@/lib/site-url';
import { deriveNewsCategory } from '@/lib/utils/news';

export async function GET(): Promise<Response> {
  const posts = await getNewsPosts();

  const newsUrl = absoluteUrl('/news');
  const logoUrl = absoluteUrl('/logo.png');
  const feedUrl = absoluteUrl('/news/feed.xml');

  const items = posts
    .map((post) => {
      const link = absoluteUrl(`/news/${post.slug}`);
      const cat = deriveNewsCategory(post.slug, post.title);
      const cover = post.coverUrl ? absoluteUrl(post.coverUrl) : null;
      const enclosure = cover
        ? `\n      <enclosure url="${cover}" type="image/jpeg" length="0"/>`
        : '';
      const mediaContent = cover
        ? `\n      <media:content url="${cover}" medium="image"/>`
        : '';
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${post.publishedAt ? new Date(post.publishedAt).toUTCString() : ''}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      <author><![CDATA[${post.author}]]></author>
      <category><![CDATA[${cat.label}]]></category>${enclosure}${mediaContent}
    </item>`;
    })
    .join('');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>SocialPro News</title>
    <link>${newsUrl}</link>
    <description>Editorial esports y CS2: actualidad, análisis competitivo, creators y comunidad</description>
    <language>es</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${logoUrl}</url>
      <title>SocialPro News</title>
      <link>${newsUrl}</link>
    </image>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
    },
  });
}
