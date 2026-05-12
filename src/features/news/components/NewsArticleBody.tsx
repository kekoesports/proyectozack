function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text: string): string {
  // Escape first to neutralise raw HTML, then re-introduce safe markup.
  let html = escapeHtml(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="text-white/85">$1</em>');
  // Internal links: [label](/path) — only same-origin paths to avoid open redirect
  html = html.replace(
    /\[([^\]]+)\]\((\/[^)\s]+)\)/g,
    '<a href="$2" class="text-white underline decoration-sp-pink/50 underline-offset-4 hover:decoration-sp-pink transition-colors">$1</a>',
  );
  return html;
}

/**
 * Normalise markdown so headings/dividers always start a new block,
 * even when the author didn't add a blank line before them.
 */
function normalizeBodyMd(md: string): string {
  return md
    // blank line before headings (## / ###)
    .replace(/([^\n])\n(#{1,6} )/g, '$1\n\n$2')
    // blank line before horizontal rules
    .replace(/([^\n])\n(---|\*\*\*|___)/g, '$1\n\n$2')
    // blank line before blockquotes
    .replace(/([^\n])\n(> )/g, '$1\n\n$2')
    // blank line before list items that follow a non-list line
    .replace(/([^-\n][^\n]*)\n([-*] )/g, '$1\n\n$2');
}

export function NewsArticleBody({ bodyMd }: { bodyMd: string }) {
  const blocks = normalizeBodyMd(bodyMd).split(/\n\n+/).filter((b) => b.trim().length > 0);

  return (
    <div className="news-prose space-y-5 text-white/70 text-[16px] md:text-[17px] leading-[1.75]">
      {blocks.map((raw, key) => {
        const block = raw.trim();
        if (block.startsWith('## ')) {
          return (
            <h2
              key={key}
              className="font-display text-2xl md:text-3xl font-black uppercase text-white tracking-tight mt-10 mb-3 pb-2 border-b border-white/[0.06]"
            >
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith('### ')) {
          return (
            <h3
              key={key}
              className="font-display text-xl font-black uppercase text-white tracking-tight mt-7 mb-2"
            >
              {block.slice(4)}
            </h3>
          );
        }
        if (block === '---' || block === '***' || block === '___') {
          return (
            <hr
              key={key}
              className="my-8 md:my-10 border-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
            />
          );
        }
        if (block.startsWith('> ')) {
          const quote = block.slice(2);
          return (
            <blockquote
              key={key}
              className="border-l-2 border-sp-orange/60 pl-5 py-1 italic text-white/80 text-lg leading-relaxed"
            >
              <span dangerouslySetInnerHTML={{ __html: renderInline(quote) }} />
            </blockquote>
          );
        }
        if (block.startsWith('- ')) {
          const items = block.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
          return (
            <ul key={key} className="space-y-2 my-2">
              {items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-white/70 leading-relaxed">
                  <span aria-hidden className="mt-2 flex-none w-1.5 h-1.5 rounded-full bg-sp-orange" />
                  <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={key}
            className="text-white/70 leading-[1.75]"
            dangerouslySetInnerHTML={{ __html: renderInline(block) }}
          />
        );
      })}
    </div>
  );
}
