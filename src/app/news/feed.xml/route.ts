import { getNewsPosts } from '@/lib/queries/posts';
import { absoluteUrl } from '@/lib/site-url';

export async function GET(): Promise<Response> {
  const posts = await getNewsPosts();

  const newsUrl = absoluteUrl('/news');
  const logoUrl = absoluteUrl('/logo.png');
  const feedUrl = absoluteUrl('/news/feed.xml');

  const items = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${absoluteUrl(`/news/${post.slug}`)}</link>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${post.publishedAt ? new Date(post.publishedAt).toUTCString() : ''}</pubDate>
      <guid isPermaLink="true">${absoluteUrl(`/news/${post.slug}`)}</guid>
      <author><![CDATA[${post.author}]]></author>
    </item>`,
    )
    .join('');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
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
