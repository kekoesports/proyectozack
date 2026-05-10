/**
 * Tipos comunes para los templates editoriales de SocialPro News.
 *
 * Un template es una función pura `build<Format>Post(input): BuiltPost`
 * con types estrictos. El input fuerza qué slots editoriales son
 * obligatorios; el template construye un post completo (slug, title,
 * excerpt, bodyMd con estructura H2/H3, tags, sortOrder) sin que el
 * editor escriba markdown a mano.
 *
 * Reutilizable tanto en seeds (DB insert idempotente) como en el
 * pipeline futuro de admin CRUD: el formulario consumiría el mismo
 * input type, garantizando consistencia editorial automática.
 */
export type BuiltPost = {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly bodyMd: string;
  readonly coverUrl: string | null;
  readonly author: string;
  readonly publishedAt: Date;
  readonly sortOrder: number;
  readonly tags: readonly string[];
};

/**
 * Input mínimo común a todos los templates. Cada template extiende este
 * con los slots editoriales específicos del formato.
 */
export type TemplateBaseInput = {
  /** Slug kebab — debe ser único entre todos los posts. */
  readonly slug: string;
  /** Fecha real de publicación (para ordenamiento + schema). */
  readonly publishedAt: Date;
  /** Autor — Persona del staff o "SocialPro Editorial". */
  readonly author: string;
  /** Cover obligatoria si el formato la espera, null si genérico. */
  readonly coverUrl: string | null;
  /** sortOrder explícito (mayor = más destacado en hub). */
  readonly sortOrder: number;
  /**
   * Notas de revisión humana — datos sensibles que cambian rápido y
   * deben confirmarse antes de promocionar el post. Renderizan al final
   * del body como bloque visible para el editor en preview.
   */
  readonly reviewNotes?: readonly string[];
  /**
   * Tags adicionales más allá de los que el template añade por defecto.
   */
  readonly extraTags?: readonly string[];
};
