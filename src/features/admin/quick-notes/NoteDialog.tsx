'use client';
import { Dialog } from '@base-ui/react/dialog';
import type { ReactNode, RefObject } from 'react';

export function NoteDialog({
  open,
  onOpenChange,
  title,
  children,
  finalFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  finalFocus?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-black/40" />
        <Dialog.Popup
          {...(finalFocus ? { finalFocus } : {})}
          className="fixed bottom-3 right-3 z-[71] max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 text-sp-admin-text shadow-2xl outline-none sm:bottom-5 sm:right-5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              className="rounded-lg px-3 py-2 hover:bg-sp-admin-hover"
              aria-label="Cerrar panel"
            >
              ×
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Notas internas y tareas de SocialPro.
          </Dialog.Description>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export const noteInput =
  'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text';
export const noteButton =
  'rounded-lg bg-sp-admin-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';
export const noteSecondary =
  'rounded-lg border border-sp-admin-border px-3 py-2 text-sm hover:bg-sp-admin-hover disabled:opacity-50';
