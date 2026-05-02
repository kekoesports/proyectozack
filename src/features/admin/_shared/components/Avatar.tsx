import Image from 'next/image';

const GRADIENTS = [
  ['#f5632a', '#e03070'], // orange → pink
  ['#e03070', '#8b3aad'], // pink → purple
  ['#8b3aad', '#5b9bd5'], // purple → blue
  ['#5b9bd5', '#53fc18'], // blue → lime
  ['#c42880', '#5b9bd5'], // dpink → blue
  ['#f5632a', '#8b3aad'], // orange → purple
] as const satisfies ReadonlyArray<readonly [string, string]>;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((p) => p.charAt(0).toUpperCase()).join('');
}

export function gradientForUser(userId: string): readonly [string, string] {
  return GRADIENTS[hashString(userId) % GRADIENTS.length] ?? GRADIENTS[0];
}

type AvatarProps = {
  readonly userId: string;
  readonly name: string;
  readonly photoUrl?: string | null;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly highlight?: boolean;
};

const SIZE: Record<NonNullable<AvatarProps['size']>, { px: number; cls: string; text: string }> = {
  sm: { px: 28, cls: 'w-7 h-7',   text: 'text-[10px]' },
  md: { px: 40, cls: 'w-10 h-10', text: 'text-xs' },
  lg: { px: 56, cls: 'w-14 h-14', text: 'text-base' },
};

/**
 * Avatar con foto o iniciales sobre gradiente determinista derivado del userId.
 *
 * @kind server
 * @feature admin/_shared
 * @example
 * ```tsx
 * <Avatar userId="u_123" name="Zack Nani" size="md" />
 * ```
 */
export function Avatar({ userId, name, photoUrl, size = 'md', highlight = false }: AvatarProps): React.ReactElement {
  const [c1, c2] = gradientForUser(userId);
  const { px, cls, text } = SIZE[size];
  const ring = highlight ? 'ring-2 ring-offset-2 ring-offset-sp-admin-bg ring-sp-admin-accent' : '';

  return (
    <div
      className={`${cls} ${ring} rounded-full overflow-hidden flex items-center justify-center shrink-0`}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      aria-label={name}
    >
      {photoUrl ? (
        <Image src={photoUrl} alt={name} width={px} height={px} className="object-cover w-full h-full" />
      ) : (
        <span className={`font-display font-black uppercase text-white/90 ${text}`}>{initialsOf(name)}</span>
      )}
    </div>
  );
}
