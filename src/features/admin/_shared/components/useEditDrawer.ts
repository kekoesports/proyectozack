'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type UseEditDrawerReturn = {
  readonly isOpen: boolean;
  readonly editId: string | null;
  readonly open: (id: string) => void;
  readonly close: () => void;
};

/**
 * Hook que sincroniza la apertura del `EditDrawer` con la URL (`?edit=<id>`) para que el estado sea compartible.
 *
 * @kind client
 * @feature admin/_shared
 * @example
 * ```tsx
 * const { isOpen, editId, open, close } = useEditDrawer();
 * ```
 */
export function useEditDrawer(paramName: string = 'edit'): UseEditDrawerReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get(paramName);
  const isOpen = editId !== null;

  const open = (id: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, id);
    router.push(`?${params.toString()}`);
  };

  const close = (): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    const query = params.toString();
    router.push(query ? `?${query}` : window.location.pathname);
  };

  return { isOpen, editId, open, close };
}
