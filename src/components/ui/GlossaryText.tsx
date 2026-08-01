import Link from 'next/link';
import { Fragment } from 'react';

import { GLOSSARY_TERMS, type GlossaryTerm } from '@/lib/glosario';

/**
 * Interlinking automático de términos del glosario en párrafos de landings.
 *
 * Reglas (según brief SEO+GEO 2026-07 Fase 3):
 * - Máximo 1 enlace por término por render (evita saturar el párrafo).
 * - Coincidencia con `\b` word boundary + case-insensitive.
 * - Preserva el case original del texto encontrado.
 * - Se puede excluir un slug específico via `excludeSlug` (se usa dentro de la
 *   propia ficha del término para no auto-enlazarse).
 * - Palabras de 2 chars o menos no matchean (evita falsos positivos con
 *   siglas comunes en otros contextos). Todas las siglas del glosario tienen
 *   3+ caracteres.
 *
 * Usar solo en STRINGS PUROS (no JSX). Si necesitas mezclar links propios
 * con auto-links, invoca el helper a mano por segmentos.
 */

type Props = {
  readonly children: string;
  readonly excludeSlug?: string;
  /** Clase CSS para los enlaces generados. Default: subrayado sutil naranja al hover. */
  readonly linkClassName?: string;
};

const DEFAULT_LINK_CLASS =
  'text-current underline underline-offset-2 decoration-sp-orange/40 hover:decoration-sp-orange transition-colors';

/**
 * Devuelve los términos candidatos ordenados por longitud descendente. Esto
 * evita que `case` (dentro de `case opening`) matchee antes que `case opening`.
 */
function candidatesFor(excludeSlug: string | undefined): readonly GlossaryTerm[] {
  const pool = excludeSlug ? GLOSSARY_TERMS.filter((t) => t.slug !== excludeSlug) : GLOSSARY_TERMS;
  // Prioriza matches largos (por término completo) antes que cortos (por sigla).
  return [...pool].sort((a, b) => b.name.length - a.name.length);
}

/**
 * Escapa caracteres de regex en un string arbitrario.
 * Se usa para construir el patrón por nombre de término.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Encuentra la primera ocurrencia case-insensitive del `needle` en `haystack`
 * respetando word boundaries. Devuelve `null` si no aparece.
 */
function findFirst(haystack: string, needle: string): { start: number; end: number } | null {
  const pattern = new RegExp(`\\b${escapeRegex(needle)}\\b`, 'i');
  const m = pattern.exec(haystack);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length };
}

export function GlossaryText({
  children,
  excludeSlug,
  linkClassName = DEFAULT_LINK_CLASS,
}: Props): React.JSX.Element {
  const text = children;
  if (!text || text.length < 4) return <>{text}</>;

  const candidates = candidatesFor(excludeSlug);

  // Marks: para cada término encontrado, guardamos [start, end, term].
  // Solo aceptamos marks que no solapen con otros ya aceptados.
  type Mark = { start: number; end: number; term: GlossaryTerm };
  const marks: Mark[] = [];

  for (const term of candidates) {
    // Consideramos el name principal + alternateNames.
    const needles = [term.name, ...(term.alternateName ?? [])];
    let found: { start: number; end: number } | null = null;
    for (const n of needles) {
      if (n.length < 3) continue; // no enlazar palabras de 1-2 chars
      const hit = findFirst(text, n);
      if (hit) { found = hit; break; }
    }
    if (!found) continue;

    // Solapamiento con marks previos: descartar.
    const match = found;
    const overlaps = marks.some(
      (m) => !(match.end <= m.start || match.start >= m.end),
    );
    if (overlaps) continue;

    marks.push({ ...match, term });
  }

  if (marks.length === 0) return <>{text}</>;

  // Ordenar por start ascendente y construir el árbol de nodos.
  marks.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start > cursor) nodes.push(text.slice(cursor, m.start));
    const displayed = text.slice(m.start, m.end);
    nodes.push(
      <Link
        key={`${m.term.slug}-${m.start}`}
        href={`/recursos/glosario/${m.term.slug}`}
        className={linkClassName}
      >
        {displayed}
      </Link>,
    );
    cursor = m.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return (
    <>
      {nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)}
    </>
  );
}
