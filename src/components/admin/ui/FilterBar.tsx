import type { ReactNode, ChangeEventHandler } from 'react';

// ── Sub-component types ───────────────────────────────────────────────────────

type SelectOption = {
  readonly value: string;
  readonly label: string;
};

type SelectProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLSelectElement>;
  readonly options: readonly SelectOption[];
  readonly id?: string;
};

type SearchProps = {
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
  readonly placeholder?: string;
  readonly id?: string;
};

type ResetProps = {
  readonly active: boolean;
  readonly onReset: () => void;
  readonly label?: string;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterBarSelect({ label, value, onChange, options, id }: SelectProps): React.ReactElement {
  return (
    <label className="flex flex-col gap-1 min-w-0" htmlFor={id}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-sp-admin-muted">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="rounded-md border border-sp-admin-border bg-sp-admin-bg px-2.5 py-1.5 text-xs text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-admin-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterBarSearch({
  value,
  onChange,
  placeholder = 'Buscar…',
  id,
}: SearchProps): React.ReactElement {
  return (
    <label className="flex flex-col gap-1 min-w-0" htmlFor={id}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-sp-admin-muted">
        Buscar
      </span>
      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sp-admin-muted"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="rounded-md border border-sp-admin-border bg-sp-admin-bg pl-7 pr-2.5 py-1.5 text-xs text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:ring-1 focus:ring-sp-admin-accent"
        />
      </div>
    </label>
  );
}

function FilterBarReset({
  active,
  onReset,
  label = 'Limpiar filtros',
}: ResetProps): React.ReactElement | null {
  if (!active) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="self-end rounded-md px-3 py-1.5 text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors"
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type FilterBarProps = {
  readonly children: ReactNode;
};

export function FilterBar({ children }: FilterBarProps): React.ReactElement {
  return (
    <div className="bg-sp-admin-card border border-sp-admin-border rounded-lg px-4 py-3">
      <div className="flex flex-wrap items-end gap-3 overflow-x-auto">{children}</div>
    </div>
  );
}

FilterBar.Select = FilterBarSelect;
FilterBar.Search = FilterBarSearch;
FilterBar.Reset = FilterBarReset;
