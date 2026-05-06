'use client';

import { useState, useTransition } from 'react';
import { createEventAction } from '@/app/admin/(dashboard)/tareas/event-actions';

type UserOption = { readonly id: string; readonly name: string };

type Props = {
  readonly defaultDate?: string;
  readonly users: readonly UserOption[];
  readonly currentUserId: string;
  readonly onClose: () => void;
};

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';

export function EventModal({ defaultDate, users, currentUserId, onClose }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title,      setTitle]      = useState('');
  const [description,setDescription]= useState('');
  const [date,       setDate]       = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [startTime,  setStartTime]  = useState('09:00');
  const [endTime,    setEndTime]    = useState('');
  const [attendees,  setAttendees]  = useState<string[]>([]);

  const toggleAttendee = (id: string): void => {
    setAttendees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSubmit = (): void => {
    if (!title.trim()) { setError('El título es obligatorio'); return; }
    setError(null);
    startTransition(async () => {
      const res = await createEventAction({ title, description, date, startTime, endTime, attendees });
      if (res.error) setError(res.error);
      else onClose();
    });
  };

  const others = users.filter((u) => u.id !== currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-sp-admin-border bg-sp-admin-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sp-admin-border">
          <h2 className="text-base font-bold text-sp-admin-text">Nueva reunión</h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl cursor-pointer">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Ej: Reunión semanal de equipo"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Hora inicio</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Hora fin</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} placeholder="Opcional" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Orden del día, notas..."
            />
          </div>

          {others.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-sp-admin-muted mb-2">Asistentes del equipo</label>
              <div className="flex flex-wrap gap-2">
                {others.map((u) => {
                  const selected = attendees.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAttendee(u.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-sp-admin-accent text-white border-sp-admin-accent'
                          : 'bg-sp-admin-bg border-sp-admin-border text-sp-admin-text hover:border-sp-admin-accent/50'
                      }`}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-sp-admin-border flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-sp-admin-muted hover:text-sp-admin-text cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-full text-sm font-bold bg-sp-admin-accent text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {isPending ? 'Guardando…' : 'Crear reunión'}
          </button>
        </div>
      </div>
    </div>
  );
}
