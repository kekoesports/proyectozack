'use client';

import { useMemo, useState } from 'react';
import type { CrmTask, CrmTaskPriority } from '@/types';

type Props = {
  readonly tasks: readonly CrmTask[];
  readonly onOpenAction: (task: CrmTask) => void;
};

const PRIORITY_DOT: Record<CrmTaskPriority, string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-500',
  baja: 'bg-slate-500',
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildGrid(month: Date): { days: Date[]; offsetStart: number } {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  // Lunes = 1, Domingo = 0; queremos lunes-first.
  const startDow = (first.getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = 1; i <= last.getDate(); i++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), i));
  }
  return { days, offsetStart: startDow };
}

/**
 * Vista calendario mensual (lunes-first) con tareas posicionadas por dueDate y dot por prioridad.
 *
 * @kind client
 * @feature admin/tasks
 * @route /admin/tareas
 */
export function TaskCalendar({ tasks, onOpenAction }: Props): React.ReactElement {
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { days, offsetStart } = useMemo(() => buildGrid(cursor), [cursor]);
  const todayIso = isoDate(new Date());

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CrmTask[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const arr = map.get(t.dueDate) ?? [];
      arr.push(t);
      map.set(t.dueDate, arr);
    }
    return map;
  }, [tasks]);

  const unscheduled = useMemo(() => tasks.filter((t) => !t.dueDate), [tasks]);

  const goPrev = (): void => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext = (): void => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const goToday = (): void => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} className="px-2 py-1 rounded-lg border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text cursor-pointer">‹</button>
          <button type="button" onClick={goToday} className="px-3 py-1 rounded-lg text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover cursor-pointer">Hoy</button>
          <button type="button" onClick={goNext} className="px-2 py-1 rounded-lg border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text cursor-pointer">›</button>
          <h3 className="ml-2 font-display text-xl font-black uppercase text-sp-admin-text">{formatMonthYear(cursor)}</h3>
        </div>
        <p className="text-xs text-sp-admin-muted">{tasks.length} tareas en total</p>
      </div>

      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
        <div className="grid grid-cols-7 border-b border-sp-admin-border bg-sp-admin-bg/50">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[minmax(110px,1fr)]">
          {Array.from({ length: offsetStart }).map((_, i) => (
            <div key={`pad-${i}`} className="border-r border-b border-sp-admin-border/40 bg-sp-admin-bg/20" />
          ))}
          {days.map((d) => {
            const iso = isoDate(d);
            const items = tasksByDay.get(iso) ?? [];
            const isToday = iso === todayIso;
            return (
              <div key={iso} className={`border-r border-b border-sp-admin-border/40 p-1.5 ${isToday ? 'bg-sp-admin-accent/5' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold tabular-nums ${isToday ? 'text-sp-admin-accent' : 'text-sp-admin-muted'}`}>
                    {d.getDate()}
                  </span>
                  {items.length > 0 && (
                    <span className="text-[9px] tabular-nums text-sp-admin-muted">{items.length}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onOpenAction(t)}
                      className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate ${t.status === 'completada' ? 'line-through text-sp-admin-muted bg-sp-admin-bg' : 'text-sp-admin-text bg-sp-admin-bg hover:bg-sp-admin-hover'} cursor-pointer`}
                      title={t.title}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${PRIORITY_DOT[t.priority]}`} />
                      {t.title}
                    </button>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[9px] text-sp-admin-muted px-1">+{items.length - 3} más</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-4">
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-3">
            Sin fecha ({unscheduled.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpenAction(t)}
                className="px-2 py-1 rounded-lg bg-sp-admin-bg border border-sp-admin-border text-xs text-sp-admin-text hover:border-sp-admin-accent/50 cursor-pointer"
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${PRIORITY_DOT[t.priority]}`} />
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
