'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

export interface FilterField {
  name: string;
  label: string;
  icon?: ReactNode;
  options: { value: string; label: string }[];
  /** Currently applied value; empty string means "any". */
  value?: string;
  /** Label of the empty option, e.g. "All neighborhoods". */
  anyLabel: string;
}

/**
 * Filter toolbar (PAGE-LAYOUTS.md §Shared frame): a GET form whose selects
 * submit on change, so every applied filter is in the URL, Back restores the
 * previous result set, and the page still works without JavaScript through
 * the Apply button. Desktop shows one row of icon-led fields; phones show a
 * two-column grid of the same controls, no separate sheet needed.
 */
export default function FilterBar({
  action,
  fields,
  hidden = {},
  resetHref,
  label = 'Filters',
}: {
  action: string;
  fields: FilterField[];
  /** Params to carry through (e.g. the search query). */
  hidden?: Record<string, string | undefined>;
  resetHref: string;
  label?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const applied = fields.some((f) => f.value);

  return (
    <form
      ref={formRef}
      action={action}
      method="get"
      aria-label={label}
      className="border-y border-paper-edge py-3 md:flex md:items-stretch md:gap-0 md:py-0"
    >
      {Object.entries(hidden).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-1 md:divide-x md:divide-paper-edge">
        {fields.map((field) => {
          const id = `filter-${field.name}`;
          return (
            <div key={field.name} className="relative min-w-0 rounded-card border border-paper-edge md:flex-1 md:rounded-none md:border-0">
              <label htmlFor={id} className="flex items-center gap-2 px-3 pt-2 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft md:pt-3">
                {field.icon ? <span className="text-ink" aria-hidden="true">{field.icon}</span> : null}
                {field.label}
              </label>
              <select
                id={id}
                name={field.name}
                defaultValue={field.value ?? ''}
                onChange={() => formRef.current?.requestSubmit()}
                className="block h-10 w-full appearance-none bg-transparent px-3 pr-8 text-[15px] font-semibold text-ink md:h-11"
              >
                <option value="">{field.anyLabel}</option>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute bottom-3 right-3 text-ink" aria-hidden="true">
                ▾
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 md:mt-0 md:border-l md:border-paper-edge md:pl-4">
        <button type="submit" className="inline-flex min-h-11 items-center px-2 text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
          Apply
        </button>
        {applied ? (
          <Link href={resetHref} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-semibold text-ink-soft underline-offset-[0.2em] hover:underline">
            <span aria-hidden="true">↺</span> Reset filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}
