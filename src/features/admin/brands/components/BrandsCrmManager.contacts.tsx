'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteContactAction } from '@/app/admin/(dashboard)/brands/crm-actions';
import type { CrmBrandContact } from '@/types';
import { BrandContactForm } from '@/features/admin/brands/components/BrandContactForm';
import { BTN_GHOST } from './BrandsCrmManager.parts';

type ContactsListProps = {
  readonly brandId: number;
  readonly contacts: readonly CrmBrandContact[];
  readonly showAddForm: boolean;
  readonly isManager: boolean;
  readonly onToggleAdd: () => void;
};

export function ContactsList({ brandId, contacts, showAddForm, isManager, onToggleAdd }: ContactsListProps): React.ReactElement {
  const router = useRouter();

  const handleSuccess = (): void => {
    onToggleAdd();
    router.refresh();
  };

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-sp-admin-muted">
          Contactos ({contacts.length})
        </h4>
        <button type="button" onClick={onToggleAdd} className={BTN_GHOST}>
          {showAddForm ? 'Cancelar' : '+ Añadir contacto'}
        </button>
      </div>
      {showAddForm && (
        <BrandContactForm
          brandId={brandId}
          contact={null}
          isManager={isManager}
          onSuccess={handleSuccess}
          onCancel={onToggleAdd}
        />
      )}
      {contacts.length === 0 && !showAddForm ? (
        <p className="text-xs italic text-sp-admin-muted py-2">Sin contactos todavía.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} brandId={brandId} isManager={isManager} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactCard({
  contact,
  brandId,
  isManager,
}: {
  readonly contact: CrmBrandContact;
  readonly brandId: number;
  readonly isManager: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleEditSuccess = (): void => {
    setEditing(false);
    router.refresh();
  };

  if (editing) {
    return (
      <BrandContactForm
        brandId={brandId}
        contact={contact}
        isManager={isManager}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const onDelete = (): void => {
    if (!confirm(`¿Eliminar contacto "${contact.name}"?`)) return;
    startTransition(async () => {
      await deleteContactAction(contact.id, brandId);
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl bg-sp-admin-bg border border-sp-admin-border p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sp-admin-text text-sm">{contact.name}</p>
            {contact.isPrimary && (
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-sp-admin-accent text-sp-admin-bg">
                Principal
              </span>
            )}
          </div>
          {contact.role && <p className="text-xs text-sp-admin-muted">{contact.role}</p>}
          {contact.country && (
            <p className="text-[10px] text-sp-admin-muted/70 uppercase tracking-wider">{contact.country}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-2 py-1 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover cursor-pointer"
          >
            Editar
          </button>
          {!isManager && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="px-2 py-1 rounded text-[10px] font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
            >
              Borrar
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1 text-xs text-sp-admin-muted">
        {contact.email && <p>📧 {contact.email}</p>}
        {contact.phone && <p>📞 {contact.phone}</p>}
        {contact.telegram && <p>✈️ {contact.telegram}</p>}
        {contact.discord && <p>🎮 {contact.discord}</p>}
        {contact.whatsapp && <p>💬 {contact.whatsapp}</p>}
        {contact.linkedin && (
          <p>
            🔗{' '}
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-sp-admin-accent hover:underline"
            >
              LinkedIn
            </a>
          </p>
        )}
        {contact.notes && (
          <p className="mt-1 text-sp-admin-muted/80 italic line-clamp-2">{contact.notes}</p>
        )}
      </div>
    </div>
  );
}
