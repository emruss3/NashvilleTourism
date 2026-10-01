'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { AVAILABILITY_LABEL, monthLabel, nextMonths, type AvailabilityView } from '@/lib/events/availability';
import type { AvailabilityRow, SpaceRow, VenueRow } from './rows';

type Status = AvailabilityRow['status'];
const CYCLE: Record<AvailabilityView, Status | null> = { ask: 'open', open: 'limited', limited: 'booked', booked: null };
const STYLE: Record<AvailabilityView, string> = {
  open: 'border-ink bg-paper text-ink',
  limited: 'border-ink bg-paper-sunk text-ink',
  booked: 'border-ink bg-ink text-paper',
  ask: 'border-dashed border-paper-edge bg-paper text-ink-soft',
};

/**
 * A month grid per space, twelve months out. Tap a month to cycle Ask →
 * Open → Limited → Booked → Ask; each tap saves. Below the grid, date
 * overrides: block or open a single day inside a month. Public pages show
 * the next three months; the brief greys a venue out for a month or day
 * where every space is booked.
 */
export default function AvailabilityEditor({ supabase, venue, spaces, rows, onChanged }: { supabase: SupabaseClient; venue: VenueRow; spaces: SpaceRow[]; rows: AvailabilityRow[]; onChanged: () => Promise<void> }) {
  const months = nextMonths(12);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [dayForm, setDayForm] = useState<{ spaceId: string; day: string; status: Status; note: string }>({ spaceId: spaces[0]?.id ?? '', day: '', status: 'booked', note: '' });

  function monthStatus(spaceId: string, month: string): AvailabilityView {
    return rows.find((r) => r.space_id === spaceId && r.month?.slice(0, 7) === month)?.status ?? 'ask';
  }

  async function cycle(space: SpaceRow, month: string) {
    const current = monthStatus(space.id, month);
    const next = CYCLE[current];
    const key = `${space.id}:${month}`;
    setBusy(key);
    setMessage('');
    const existing = rows.find((r) => r.space_id === space.id && r.month?.slice(0, 7) === month);
    const res = next === null
      ? existing
        ? await supabase.from('event_availability').delete().eq('id', existing.id)
        : { error: null }
      : await supabase.from('event_availability').upsert({ venue_id: venue.id, space_id: space.id, month: `${month}-01`, day: null, status: next }, { onConflict: 'space_id,month' });
    if (res.error) setMessage(`Not saved: ${res.error.message}`);
    setBusy(null);
    await onChanged();
  }

  async function saveDay(e: React.FormEvent) {
    e.preventDefault();
    if (!dayForm.spaceId || !dayForm.day) return;
    setBusy('day');
    setMessage('');
    const { error } = await supabase.from('event_availability').upsert({ venue_id: venue.id, space_id: dayForm.spaceId, month: null, day: dayForm.day, status: dayForm.status, note: dayForm.note.trim() || null }, { onConflict: 'space_id,day' });
    if (error) setMessage(`Not saved: ${error.message}`);
    setDayForm((f) => ({ ...f, day: '', note: '' }));
    setBusy(null);
    await onChanged();
  }

  async function removeDay(row: AvailabilityRow) {
    setBusy(row.id);
    const { error } = await supabase.from('event_availability').delete().eq('id', row.id);
    if (error) setMessage(`Not removed: ${error.message}`);
    setBusy(null);
    await onChanged();
  }

  if (!spaces.length) return <p className="text-[15px] text-ink-soft">Add a space first; availability is set per space.</p>;
  const dayRows = rows.filter((r) => r.day).sort((a, b) => (a.day ?? '').localeCompare(b.day ?? ''));

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[15px] text-ink-soft">Tap a month to cycle through Ask, Open, Limited and Booked. Ask is the default and means you have said nothing. Planners see the next three months; a month where every space is booked greys your venue out of briefs for that month.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-paper pr-3 text-left font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">
                  Space
                </th>
                {months.map((m) => (
                  <th key={m} scope="col" className="px-1 text-center font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink-soft">
                    {monthLabel(m)}
                    {m.endsWith('-01') ? <span className="block font-normal">{m.slice(0, 4)}</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spaces.map((s) => (
                <tr key={s.id}>
                  <th scope="row" className="sticky left-0 bg-paper pr-3 text-left font-semibold text-ink">
                    {s.name}
                    {!s.published ? <span className="block text-2xs font-normal text-ink-soft">draft</span> : null}
                  </th>
                  {months.map((m) => {
                    const st = monthStatus(s.id, m);
                    const key = `${s.id}:${m}`;
                    return (
                      <td key={m} className="px-1 text-center">
                        <button type="button" onClick={() => cycle(s, m)} disabled={busy === key} aria-label={`${s.name}, ${monthLabel(m, 'long')}: ${AVAILABILITY_LABEL[st]}. Tap to change.`} className={`min-h-9 w-full min-w-[3.25rem] rounded border px-1 text-2xs font-semibold ${STYLE[st]} disabled:opacity-50`}>
                          {busy === key ? '…' : AVAILABILITY_LABEL[st]}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-card border border-paper-edge bg-paper p-4">
        <p className="font-sans text-[16px] font-bold text-ink">Single dates</p>
        <p className="mt-1 text-sm text-ink-soft">Block a date inside an open month, or open one inside a booked month. A date overrides its month.</p>
        <form onSubmit={saveDay} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="a-space" className="field-label">
              Space
            </label>
            <select id="a-space" value={dayForm.spaceId} onChange={(e) => setDayForm((f) => ({ ...f, spaceId: e.target.value }))} className="field-input">
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-day" className="field-label">
              Date
            </label>
            <input id="a-day" type="date" required value={dayForm.day} onChange={(e) => setDayForm((f) => ({ ...f, day: e.target.value }))} className="field-input" />
          </div>
          <div>
            <label htmlFor="a-status" className="field-label">
              Status
            </label>
            <select id="a-status" value={dayForm.status} onChange={(e) => setDayForm((f) => ({ ...f, status: e.target.value as Status }))} className="field-input">
              <option value="booked">Booked</option>
              <option value="limited">Limited</option>
              <option value="open">Open</option>
            </select>
          </div>
          <div>
            <label htmlFor="a-note" className="field-label">
              Note <span className="font-normal text-ink-soft">(optional, public)</span>
            </label>
            <input id="a-note" maxLength={200} value={dayForm.note} onChange={(e) => setDayForm((f) => ({ ...f, note: e.target.value }))} className="field-input" placeholder="e.g. evening only" />
          </div>
          <button type="submit" className="btn-secondary min-h-11 sm:w-auto" disabled={busy === 'day' || !dayForm.day}>
            Save date
          </button>
        </form>
        {dayRows.length ? (
          <ul className="mt-4 grid gap-1 text-sm text-ink">
            {dayRows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-semibold">{r.day}</span> · {spaces.find((s) => s.id === r.space_id)?.name ?? 'space'} · {AVAILABILITY_LABEL[r.status]}
                  {r.note ? <span className="text-ink-soft"> · {r.note}</span> : null}
                </span>
                <button type="button" onClick={() => removeDay(r)} disabled={busy === r.id} className="text-sm text-ink-soft underline underline-offset-[0.2em] hover:text-ink">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {message ? (
        <p role="alert" className="text-sm text-ink">
          {message}
        </p>
      ) : null}
    </div>
  );
}
