/** Reserved routing markers, not subject tags: an own announcement may mention prensa. */
export function isPressOutreach(post: { readonly slug: string; readonly tags: readonly string[] }): boolean {
  return post.tags.includes('press-outreach')
    || post.slug.startsWith('prensa-')
    || (post.tags.includes('prensa') && post.tags.includes('adaptacion-editorial'));
}
