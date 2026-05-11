import { NewsArticleBody } from '@/features/news/components/NewsArticleBody';
import { MatchContextBlock } from './MatchContextBlock';
import { RosterBlock } from './RosterBlock';
import { EditorialQuoteBlock } from './EditorialQuoteBlock';
import { ArticleEmbedBlock } from './ArticleEmbedBlock';
import type { PostBlocks } from './types';

/**
 * Renderiza el body de la noticia entremezclado con bloques visuales según
 * la secuencia `blocks.layout`. Splittea `bodyMd` por `## H2` y mapea cada
 * sección por su título (o `null` = lead = chunk antes del primer H2).
 *
 * Si una sección referenciada no existe en bodyMd, se ignora silently. Si
 * el bloque referenciado no existe en `blocks`, se ignora también — esto
 * permite definir layouts genéricos sin obligar a tener todos los blocks.
 */
type Props = {
  readonly bodyMd: string;
  readonly blocks: PostBlocks;
};

function splitSectionsByH2(bodyMd: string): Map<string | null, string> {
  const out = new Map<string | null, string>();
  const parts = bodyMd.split(/\n## /);
  if (parts.length > 0 && parts[0] != null) {
    out.set(null, parts[0]);
  }
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (p == null) continue;
    const newlineIdx = p.indexOf('\n');
    const title = (newlineIdx === -1 ? p : p.slice(0, newlineIdx)).trim();
    out.set(title, '## ' + p);
  }
  return out;
}

export function InterleavedArticleBody({ bodyMd, blocks }: Props) {
  if (!blocks.layout || blocks.layout.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <NewsArticleBody bodyMd={bodyMd} />
      </section>
    );
  }

  const sections = splitSectionsByH2(bodyMd);

  return (
    <>
      {blocks.layout.map((slot, i) => {
        switch (slot.kind) {
          case 'section': {
            const content = sections.get(slot.title);
            if (!content) return null;
            const isLead = slot.title === null;
            return (
              <section
                key={i}
                className={`max-w-3xl mx-auto px-5 md:px-8 ${isLead ? 'pt-8 md:pt-10' : 'pt-2'}`}
              >
                <NewsArticleBody bodyMd={content} />
              </section>
            );
          }
          case 'matchContext':
            if (!blocks.matchContext) return null;
            return <MatchContextBlock key={i} match={blocks.matchContext} />;
          case 'quote': {
            const q = blocks.quotes?.[slot.index ?? 0];
            if (!q) return null;
            return <EditorialQuoteBlock key={i} quote={q} />;
          }
          case 'embed': {
            const e = blocks.embeds?.[slot.index ?? 0];
            if (!e) return null;
            return <ArticleEmbedBlock key={i} embed={e} />;
          }
          case 'roster':
            if (!blocks.roster) return null;
            return <RosterBlock key={i} roster={blocks.roster} />;
        }
      })}
    </>
  );
}
