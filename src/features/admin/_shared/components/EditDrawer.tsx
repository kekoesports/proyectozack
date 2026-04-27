'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-client';
import { X } from 'lucide-react';

type EditDrawerProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
};

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Drawer lateral genérico para editar entidades, con focus trap, restore focus al cerrar y animación motion.
 *
 * @kind client
 * @feature admin/_shared
 * @example
 * ```tsx
 * <EditDrawer isOpen={isOpen} onClose={close} title="Editar marca" footer={<SubmitButton />}>
 *   <BrandForm />
 * </EditDrawer>
 * ```
 */
export function EditDrawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: EditDrawerProps): ReactNode {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const titleId = 'edit-drawer-title';

  // Save previous focus and restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      // Move focus to first focusable element inside drawer
      const frame = requestAnimationFrame(() => {
        if (panelRef.current) {
          const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
          const firstFocusable = focusable[0];
          if (firstFocusable !== undefined) {
            firstFocusable.focus();
          } else {
            panelRef.current.focus();
          }
        }
      });
      return () => cancelAnimationFrame(frame);
    }
    // Restore focus when drawer closes
    if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
    }
    previousFocusRef.current = null;
    return undefined;
  }, [isOpen]);

  // ESC key closes drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap on Tab
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (first === undefined || last === undefined) return;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            key="backdrop"
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed right-0 top-0 h-full max-w-lg w-full bg-sp-admin-card border-l border-sp-admin-border z-50 flex flex-col outline-none"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border">
              <h2
                id={titleId}
                className="text-sp-admin-text font-semibold text-lg"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-sp-admin-muted hover:text-sp-admin-text transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-sp-admin-border flex gap-3 justify-end">
                {footer}
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
