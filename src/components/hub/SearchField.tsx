import { SearchIcon } from '@/components/Icons';

/**
 * Page-level search: a plain GET form so the query lives in the URL and Back
 * restores it. `hidden` carries the filters already applied so a new search
 * does not silently drop them.
 */
export default function SearchField({
  action,
  name = 'q',
  placeholder,
  label,
  defaultValue = '',
  hidden = {},
  tone = 'paper',
  buttonLabel = 'Search',
  id = 'page-search',
}: {
  action: string;
  name?: string;
  placeholder: string;
  label: string;
  defaultValue?: string;
  hidden?: Record<string, string | undefined>;
  tone?: 'paper' | 'ink';
  buttonLabel?: string;
  id?: string;
}) {
  const dark = tone === 'ink';
  return (
    <form action={action} method="get" role="search" aria-label={label} className="flex gap-2">
      {Object.entries(hidden).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative min-w-0 flex-1">
        <span className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-paper/70' : 'text-ink-soft'}`}>
          <SearchIcon size={18} />
        </span>
        <input
          id={id}
          name={name}
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          className={`field-input h-12 pl-11 md:h-14 md:text-base ${
            dark ? 'border-paper/60 bg-transparent text-paper placeholder:text-paper/60 focus:border-paper' : 'bg-paper'
          }`}
        />
      </div>
      <button type="submit" className={`${dark ? 'btn-reverse' : 'btn-primary'} shrink-0 px-4 md:h-14 md:px-6`}>
        <span className="hidden md:inline">{buttonLabel}</span>
        <span aria-hidden="true">→</span>
        <span className="sr-only md:hidden">{buttonLabel}</span>
      </button>
    </form>
  );
}
