/**
 * Blog body renderer — custom markdown-like parser para posts.
 * Sin dependencias de librería de markdown.
 * Handles: ## h2, ### h3, #### h4, ---hr, - bullets, **bold**, *italic*,
 * [link](/path), socialpro.es/... autolinks, bold-lead paragraphs.
 */

import type { JSX } from 'react';

/** Escape HTML entities to prevent XSS before injecting into the DOM */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const INLINE_LINK_CLASS =
  'text-sp-orange font-medium underline decoration-sp-orange/35 underline-offset-[3px] hover:decoration-sp-orange transition-colors';

/**
 * Auto-linkify URLs propias en el cuerpo del post.
 * Input ya viene HTML-escaped — solo opera sobre texto plano seguro.
 */
export function linkifyInternal(html: string): string {
  const pattern = /(?:https?:\/\/)?(?:www\.)?socialpro\.es(\/[a-z0-9/_-]+)/gi;
  return html.replace(pattern, (_match, path: string) => {
    const cleanPath = path.replace(/[.,;:)]+$/, '');
    return `<a href="${cleanPath}" class="${INLINE_LINK_CLASS}">socialpro.es${cleanPath}</a>`;
  });
}

/** Convert **bold**, *italic*, and [label](/path) markdown to HTML (input is pre-escaped) */
export function renderInline(text: string): string {
  return linkifyInternal(
    escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-sp-dark">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((\/[^)\s]+)\)/g, `<a href="$2" class="${INLINE_LINK_CLASS}">$1</a>`),
  );
}

/** Render a single body paragraph — handles headings, hr, bullets, bold-lead, inline */
export function renderParagraph(text: string, key: number): JSX.Element | null {
  if (text.startsWith('## ')) {
    return (
      <h2 key={key} className="font-display text-2xl md:text-3xl font-black uppercase text-sp-dark mt-12 mb-3 pb-2 border-b border-sp-border">
        {text.slice(3)}
      </h2>
    );
  }
  if (text.startsWith('### ')) {
    return (
      <h3 key={key} className="font-display text-xl font-black uppercase text-sp-dark mt-8 mb-2">
        {text.slice(4)}
      </h3>
    );
  }
  if (text.startsWith('#### ')) {
    return (
      <h4 key={key} className="font-display text-base font-black uppercase text-sp-dark mt-6 mb-1.5">
        {text.slice(5)}
      </h4>
    );
  }
  // Horizontal rule
  if (text === '---') {
    return <hr key={key} className="my-10 border-t border-sp-border" />;
  }
  // Bullet list block
  if (text.includes('\n- ') || text.startsWith('- ')) {
    const items = text.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2));
    return (
      <ul key={key} className="space-y-2 my-4 pl-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sp-muted text-base leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sp-orange flex-shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          </li>
        ))}
      </ul>
    );
  }
  // Bold-lead paragraph: **Título.** resto del texto
  if (/^\*\*([^*]+)\*\*\s/.test(text)) {
    return (
      <p key={key} className="text-base text-sp-muted leading-relaxed pl-3 border-l-2 border-sp-orange/25"
         dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
    );
  }
  return (
    <p key={key} className="text-base text-sp-muted leading-relaxed"
       dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
  );
}
