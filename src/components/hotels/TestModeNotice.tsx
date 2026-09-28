/**
 * Shown wherever a rate or a booking link came from the LiteAPI sandbox.
 * The white label is in test mode until Nuitée's production key is live:
 * the rates are test data and the checkout takes a card for a booking that
 * does not exist. Driven by the `environment` the edge function reports on
 * every rates response, so it disappears on its own once the edge function is switched to the production key.
 */
export default function TestModeNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p role="note" className="text-2xs font-semibold text-ink">
        Booking site in test mode: this rate and checkout are test data. Please don&rsquo;t enter a card.
      </p>
    );
  }
  return (
    <p role="note" className="rounded-card border-2 border-ink bg-paper px-4 py-3 text-sm text-ink">
      <strong className="font-semibold">Booking site in test mode.</strong> Rates and checkout here are test data while our booking site is being set up. A booking made now will not exist, so please don&rsquo;t enter a card.
    </p>
  );
}
