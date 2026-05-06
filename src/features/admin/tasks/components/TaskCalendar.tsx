'use client';

import { useMemo, useState, useTransition } from 'react';
import type { CrmEvent, CrmTask, CrmTaskPriority } from '@/types';
import { EventModal } from './EventModal';
import { deleteEventAction } from '@/app/admin/(dashboard)/tareas/event-actions';

type UserOption = { readonly id: string; readonly name: string };

type Props = {
  readonly tasks:         readonly CrmTask[];
  readonly events?:       readonly CrmEvent[];
  readonly users:         readonly UserOption[];
  readonly currentUserId: string;
  readonly onOpenAction:  (task: CrmTask) => void;
};

// ── Helpers ────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<CrmTaskPriority, string> = {
  alta:  'bg-red-500/20 border-red-400 text-red-600 dark:text-red-400',
  media: 'bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-400',
  baja:  'bg-slate-500/10 border-slate-300 text-sp-admin-muted',
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Construye las semanas del mes como arrays de 7 fechas ISO. */
function buildWeeks(month: Date): string[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last  = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // lunes = 0

  const allDays: string[] = [];
  // Padding días del mes anterior
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(first); d.setDate(d.getDate() - i - 1);
    allDays.push(isoDate(d));
  }
  // Días del mes
  for (let i = 1; i <= last.getDate(); i++) {
    allDays.push(isoDate(new Date(month.getFullYear(), month.getMonth(), i)));
  }
  // Padding días del mes siguiente para completar semanas
  const remainder = allDays.length % 7;
  if (remainder !== 0) {
    const toAdd = 7 - remainder;
    for (let i = 1; i <= toAdd; i++) {
      const d = new Date(last); d.setDate(d.getDate() + i);
      allDays.push(isoDate(d));
    }
  }

  const weeks: string[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  return weeks;
}

// ── Span computation ──────────────────────────────────────────────────

type SpanItem = {
  readonly key:      string;
  readonly title:    string;
  readonly colStart: number;  // 1–7
  readonly colSpan:  number;
  readonly lane:     number;
  readonly cls:      string;
  readonly isEvent:  boolean;
  readonly task:     CrmTask | undefined;
  readonly event:    CrmEvent | undefined;
};

function computeSpans(
  tasks:    readonly CrmTask[],
  events:   readonly CrmEvent[],
  weekDays: readonly string[],
): SpanItem[] {
  const weekStart = weekDays[0] ?? '';
  const weekEnd   = weekDays[6] ?? '';

  type RawSpan = {
    key: string; title: string; start: string; end: string;
    cls: string; isEvent: boolean; task?: CrmTask; event?: CrmEvent;
  };

  const raw: RawSpan[] = [];

  // Multi-day tasks (startDate AND dueDate, spanning more than 1 day)
  for (const t of tasks) {
    const s = t.startDate;
    const e = t.dueDate;
    if (!s || !e || s === e) continue;
    if (e < weekStart || s > weekEnd) continue;
    raw.push({
      key: `task-${t.id}`, title: t.title, start: s, end: e,
      cls: t.status === 'completada'
        ? 'bg-sp-admin-bg border border-sp-admin-border text-sp-admin-muted line-through'
        : PRIORITY_COLOR[t.priority],
      isEvent: false, task: t,
    });
  }

  // Events (always show as spans)
  for (const ev of events) {
    const s = isoDate(ev.startAt);
    const e = ev.endAt ? isoDate(ev.endAt) : s;
    if (e < weekStart || s > weekEnd) continue;
    raw.push({
      key: `event-${ev.id}`, title: ev.title, start: s, end: e,
      cls: 'bg-blue-500/20 border border-blue-400 text-blue-700 dark:text-blue-400',
      isEvent: true, event: ev,
    });
  }

  // Sort by start then by duration (longer first)
  raw.sort((a, b) =>
    a.start.localeCompare(b.start) || (b.end.localeCompare(a.end)),
  );

  // Lane assignment (greedy)
  const laneEndCols: number[] = [];
  const result: SpanItem[] = [];

  for (const item of raw) {
    const colStart = item.start < weekStart
      ? 1
      : weekDays.indexOf(item.start) + 1;
    const colEnd = item.end > weekEnd
      ? 7
      : weekDays.indexOf(item.end) + 1;
    const colSpan = Math.max(1, colEnd - colStart + 1);

    let lane = 0;
    while (lane < laneEndCols.length && (laneEndCols[lane] ?? 0) >= colStart) {
      lane++;
    }
    laneEndCols[lane] = colEnd;

    result.push({ key: item.key, title: item.title, colStart, colSpan, lane, cls: item.cls, isEvent: item.isEvent, task: item.task, event: item.event });
  }

  return result;
}

// ── Sub-components ────────────────────────────────────────────────────

function SpanPill({
  span,
  onTask,
  onEvent,
}: {
  span: SpanItem;
  onTask: (t: CrmTask) => void;
  onEvent: (e: CrmEvent) => void;
}): React.ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => span.task ? onTask(span.task) : span.event && onEvent(span.event)}
      onKeyDown={(e) => e.key === 'Enter' && (span.task ? onTask(span.task) : span.event && onEvent(span.event))}
      className={`absolute h-[18px] rounded-sm border truncate px-1.5 flex items-center text-[9px] font-semibold cursor-pointer transition-opacity hover:opacity-80 ${span.cls}`}
      style={{
        top:   `${span.lane * 22 + 2}px`,
        left:  `calc(${(span.colStart - 1) / 7 * 100}% + 2px)`,
        width: `calc(${span.colSpan / 7 * 100}% - 4px)`,
      }}
      title={span.title}
    >
      {span.title}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

/**
 * Vista calendario mensual con tareas de rango multi-día, eventos/reuniones,
 * y click-to-create para nuevas reuniones.
 *
 * @kind client
 * @feature admin/tasks
 * @route /admin/tareas
 */
export function TaskCalendar({ tasks, events = [], users, currentUserId, onOpenAction }: Props): React.ReactElement {
  const [cursor,      setCursor]      = useState<Date>(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [newEventDay, setNewEventDay] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CrmEvent | null>(null);

  const weeks    = useMemo(() => buildWeeks(cursor), [cursor]);
  const todayIso = isoDate(new Date());
  const monthStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  // Single-day items per day (tasks with only dueDate, or same start=due)
  const singleByDay = useMemo(() => {
    const map = new Map<string, CrmTask[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      // If it's a multi-day span, don't show again as single
      if (t.startDate && t.startDate !== t.dueDate) continue;
      const arr = map.get(t.dueDate) ?? [];
      arr.push(t);
      map.set(t.dueDate, arr);
    }
    return map;
  }, [tasks]);

  // Single-day events per day (same start/end day)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CrmEvent[]>();
    for (const ev of events) {
      const s = isoDate(ev.startAt);
      const e = ev.endAt ? isoDate(ev.endAt) : s;
      if (s === e) {
        const arr = map.get(s) ?? [];
        arr.push(ev);
        map.set(s, arr);
      }
    }
    return map;
  }, [events]);

  const unscheduled = useMemo(() => tasks.filter((t) => !t.dueDate && !t.startDate), [tasks]);

  const goPrev  = (): void => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext  = (): void => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const goToday = (): void => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); };

  const isCurrentMonth = (iso: string): boolean => iso.startsWith(monthStr);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} className="px-2 py-1 rounded-lg border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text cursor-pointer">‹</button>
          <button type="button" onClick={goToday} className="px-3 py-1 rounded-lg text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover cursor-pointer">Hoy</button>
          <button type="button" onClick={goNext} className="px-2 py-1 rounded-lg border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text cursor-pointer">›</button>
          <h3 className="ml-2 font-display text-xl font-black uppercase text-sp-admin-text">{formatMonthYear(cursor)}</h3>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-sp-admin-muted hidden sm:block">{tasks.length} tareas · {events.length} reuniones</p>
          <button
            type="button"
            onClick={() => setNewEventDay(todayIso)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-600 dark:text-blue-400 text-[11px] font-semibold hover:bg-blue-500/20 cursor-pointer transition-colors"
          >
            + Reunión
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-sp-admin-border bg-sp-admin-bg/50">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted text-center">{d}</div>
          ))}
        </div>

        {/* Week rows */}
        <div className="divide-y divide-sp-admin-border/40">
          {weeks.map((week, wi) => {
            const spans    = computeSpans(tasks, events, week);
            const maxLane  = spans.length > 0 ? Math.max(...spans.map((s) => s.lane)) : -1;
            const spansH   = maxLane >= 0 ? (maxLane + 1) * 22 + 4 : 0;

            return (
              <div key={wi}>
                {/* Span pills overlay */}
                {spansH > 0 && (
                  <div className="relative grid grid-cols-7" style={{ height: `${spansH}px` }}>
                    {spans.map((span) => (
                      <SpanPill
                        key={span.key}
                        span={span}
                        onTask={onOpenAction}
                        onEvent={setActiveEvent}
                      />
                    ))}
                  </div>
                )}

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {week.map((iso) => {
                    const inMonth  = isCurrentMonth(iso);
                    const isToday  = iso === todayIso;
                    const dayTasks = singleByDay.get(iso) ?? [];
                    const dayEvs   = eventsByDay.get(iso) ?? [];
                    const dayNum   = parseInt(iso.slice(8), 10);
                    const allItems = dayTasks.length + dayEvs.length;

                    return (
                      <div
                        key={iso}
                        onClick={() => setNewEventDay(iso)}
                        className={`border-r border-sp-admin-border/40 p-1.5 min-h-[90px] cursor-pointer transition-colors ${
                          isToday   ? 'bg-sp-admin-accent/5' :
                          !inMonth  ? 'bg-sp-admin-bg/30'   : 'hover:bg-sp-admin-hover/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold tabular-nums ${
                            isToday   ? 'text-sp-admin-accent' :
                            !inMonth  ? 'text-sp-admin-muted/40' : 'text-sp-admin-muted'
                          }`}>{dayNum}</span>
                          {allItems > 0 && (
                            <span className="text-[9px] tabular-nums text-sp-admin-muted">{allItems}</span>
                          )}
                        </div>

                        <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                          {/* Single-day events */}
                          {dayEvs.slice(0, 2).map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => setActiveEvent(ev)}
                              className="w-full text-left text-[9px] px-1.5 py-0.5 rounded truncate bg-blue-500/15 border border-blue-400/30 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 cursor-pointer"
                              title={ev.title}
                            >
                              {formatTime(ev.startAt)} {ev.title}
                            </button>
                          ))}
                          {/* Single-day tasks */}
                          {dayTasks.slice(0, 3 - Math.min(dayEvs.length, 2)).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => onOpenAction(t)}
                              className={`w-full text-left text-[9px] px-1.5 py-0.5 rounded truncate border cursor-pointer ${t.status === 'completada' ? 'line-through text-sp-admin-muted bg-sp-admin-bg border-sp-admin-border/40' : `${PRIORITY_COLOR[t.priority]} hover:opacity-80`}`}
                              title={t.title}
                            >
                              {t.title}
                            </button>
                          ))}
                          {allItems > 3 && (
                            <p className="text-[9px] text-sp-admin-muted px-1">+{allItems - 3} más</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled tasks */}
      {unscheduled.length > 0 && (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-4">
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-3">Sin fecha ({unscheduled.length})</h4>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpenAction(t)}
                className={`px-2 py-1 rounded-lg border text-xs cursor-pointer ${PRIORITY_COLOR[t.priority]}`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New event modal */}
      {newEventDay !== null && (
        <EventModal
          defaultDate={newEventDay}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setNewEventDay(null)}
        />
      )}

      {/* Event detail popup */}
      {activeEvent !== null && (
        <EventDetailModal
          event={activeEvent}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setActiveEvent(null)}
        />
      )}
    </div>
  );
}

// ── Event detail popup ────────────────────────────────────────────────

function EventDetailModal({
  event,
  users,
  currentUserId,
  onClose,
}: {
  event: CrmEvent;
  users: readonly UserOption[];
  currentUserId: string;
  onClose: () => void;
}): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (): void => {
    startTransition(async () => {
      await deleteEventAction(event.id);
      onClose();
    });
  };

  const attendeeNames = event.attendees
    .map((uid) => users.find((u) => u.id === uid)?.name ?? uid)
    .join(', ');

  const isCreator = event.createdByUserId === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-sp-admin-border bg-sp-admin-card shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sp-admin-border">
          <h2 className="text-base font-bold text-sp-admin-text truncate">{event.title}</h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl cursor-pointer">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="text-sm text-sp-admin-text">
            <span className="font-semibold">
              {event.startAt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {' · '}
            {formatTime(event.startAt)}
            {event.endAt && ` – ${formatTime(event.endAt)}`}
          </div>
          {event.description && (
            <p className="text-sm text-sp-admin-muted">{event.description}</p>
          )}
          {attendeeNames && (
            <p className="text-xs text-sp-admin-muted">
              <span className="font-semibold">Asistentes:</span> {attendeeNames}
            </p>
          )}
        </div>
        {isCreator && (
          <div className="px-5 py-3 border-t border-sp-admin-border flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 cursor-pointer"
            >
              Eliminar reunión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
