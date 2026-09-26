'use client';

import { useRef } from 'react';
import { CalendarIcon } from '@/components/Icons';

/**
 * A native date input that behaves like a calendar button.
 *
 * Browsers only open the date picker from a small control at one end of the
 * field, and on desktop the rest of the field is a set of editable segments.
 * Here the calendar icon is a real button, and a click anywhere on the field
 * opens the picker too (`showPicker()`, with plain focus as the fallback).
 * The picker never offers a day before `min`, which callers set to today.
 */
export default function DateField({
  id,
  name,
  value,
  defaultValue,
  min,
  max,
  required,
  disabled,
  onChange,
  className = 'field-input',
  iconClassName = 'text-ink-soft',
  label = 'Open calendar',
  autoSubmit = false,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  /** Applied to the input. Leave room on the left for the icon. */
  className?: string;
  iconClassName?: string;
  /** Accessible name of the calendar button. */
  label?: string;
  /** Submit the enclosing form as soon as a full date is picked. */
  autoSubmit?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function open() {
    const input = ref.current;
    if (!input || input.disabled) return;
    try {
      // Only allowed from a user gesture and not in every browser; fall back to focus.
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.focus();
    } catch {
      input.focus();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-label={label}
        className={`absolute left-0 top-0 flex h-full w-10 items-center justify-center rounded-l ${iconClassName} hover:text-ink disabled:opacity-50`}
      >
        <CalendarIcon size={16} />
      </button>
      <input
        ref={ref}
        id={id}
        name={name}
        type="date"
        value={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        onClick={open}
        onChange={(e) => {
          onChange?.(e.target.value);
          if (autoSubmit && e.target.value && e.target.form) e.target.form.requestSubmit();
        }}
        className={`${className} pl-10`}
      />
    </div>
  );
}
