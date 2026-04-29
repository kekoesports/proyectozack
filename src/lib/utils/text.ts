const META_DESCRIPTION_MAX = 155;
const META_TITLE_MAX = 55;

export function truncateMetaDescription(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text.length > META_DESCRIPTION_MAX
    ? text.slice(0, META_DESCRIPTION_MAX).trimEnd() + '…'
    : text;
}

export function truncateMetaTitle(text: string): string {
  return text.length > META_TITLE_MAX
    ? text.slice(0, META_TITLE_MAX).trimEnd() + '…'
    : text;
}
