'use client';

import { useState, useTransition } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { bulkUpdateSortOrderAction } from '@/app/admin/(dashboard)/talents/actions';
import type { AdminRosterRow } from '@/lib/queries/talents';

type Props = {
  readonly initialItems: readonly AdminRosterRow[];
  readonly onDone: () => void;
};

/**
 * Grid sortable de talents para reordenar mediante drag-and-drop.
 * Guarda el orden en batch al pulsar "Guardar orden".
 *
 * @kind client
 * @feature admin/talents
 */
export function SortableCardGrid({ initialItems, onDone }: Props): React.JSX.Element {
  const [items, setItems]          = useState([...initialItems].sort((a, b) => a.sortOrder - b.sortOrder));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]          = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    setItems((prev) => arrayMove(prev, oldIdx, newIdx));
    setSaved(false);
  }

  function handleSave(): void {
    startTransition(async () => {
      await bulkUpdateSortOrderAction(
        items.map((item, idx) => ({ id: item.id, sortOrder: idx + 1 })),
      );
      setSaved(true);
      setTimeout(onDone, 600);
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar del modo ordenar */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[12px] text-sp-admin-muted">
          Arrastra las cards para reordenar · {items.length} talentos
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {saved && <span className="text-[12px] text-emerald-600 font-semibold">✓ Guardado</span>}
          <button
            type="button"
            onClick={onDone}
            disabled={isPending}
            className="h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar orden'}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {items.map((creator, idx) => (
              <SortableCard key={creator.id} creator={creator} position={idx + 1} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ── Sortable card ─────────────────────────────────────────────────────

type CardProps = {
  readonly creator:  AdminRosterRow;
  readonly position: number;
};

function SortableCard({ creator, position }: CardProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: creator.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
      }}
      className={`relative rounded-xl overflow-hidden bg-sp-admin-card shadow-[0_1px_4px_rgba(0,0,0,0.07)] select-none ${isDragging ? 'shadow-2xl ring-2 ring-sp-admin-accent/50 scale-[1.03]' : ''}`}
    >
      {/* Capa de drag — cubre toda la card */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
        aria-label={`Arrastrar ${creator.name}`}
      />

      {/* Nº de posición */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none">
        <span className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-[9px] font-bold text-white/90 tabular-nums">
          {position}
        </span>
      </div>

      {/* Icono de agarre */}
      <div className="absolute top-2 right-2 z-20 pointer-events-none">
        <div className="w-5 h-5 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <svg width="8" height="10" viewBox="0 0 8 10" fill="white" fillOpacity="0.85" aria-hidden>
            <circle cx="2" cy="2" r="1" /><circle cx="6" cy="2" r="1" />
            <circle cx="2" cy="5" r="1" /><circle cx="6" cy="5" r="1" />
            <circle cx="2" cy="8" r="1" /><circle cx="6" cy="8" r="1" />
          </svg>
        </div>
      </div>

      {/* Foto */}
      <div
        className="aspect-square w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${creator.gradientC1}, ${creator.gradientC2})` }}
      >
        {creator.photoUrl ? (
          <Image
            src={creator.photoUrl}
            alt={creator.name}
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-3xl font-black text-white/90 select-none">{creator.initials}</span>
          </div>
        )}
      </div>

      {/* Nombre */}
      <div className="px-2.5 py-2">
        <p className="font-bold text-[12px] text-sp-admin-text truncate">{creator.name}</p>
        <p className="text-[10px] text-sp-admin-muted truncate">{creator.role}</p>
      </div>
    </div>
  );
}
