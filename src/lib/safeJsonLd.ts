/**
 * Stringify para inyectar JSON-LD via `dangerouslySetInnerHTML` sin permitir
 * que un valor con `</script>` (o `<!--`) rompa el script o introduzca HTML.
 * Reemplaza `<` por `<` en el output — preserva la semántica JSON pero
 * neutraliza cualquier substring que el parser HTML pueda interpretar como
 * cierre de tag o inicio de comentario.
 *
 * Uso:
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
