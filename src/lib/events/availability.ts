/**
 * Pure helpers to derive event availability and lifecycle from live data.
 *
 * These are the single authoritative definitions used by both the public UI
 * and the admin UI, so the two views can never diverge.
 *
 * Availability rules (current):
 *   remaining === 0  →  SOLD_OUT
 *   remaining  > 0   →  AVAILABLE
 *
 * FEW_SEATS_LEFT is intentionally not implemented yet — do not add a threshold
 * here without a product decision.
 */

export type DerivedAvailability = 'AVAILABLE' | 'SOLD_OUT';

export interface TicketTypeSummary {
  capacity: number;
  soldCount: number;
}

/**
 * Derive availability from the live ticket-type data for an event.
 *
 * `ticketTypes` must be the full set of ticket types for the event.
 * If the array is empty the event has no ticket types defined, so we treat it
 * as available (nothing has been sold).
 */
export function deriveEventAvailability(
  ticketTypes: TicketTypeSummary[]
): DerivedAvailability {
  if (ticketTypes.length === 0) return 'AVAILABLE';

  const totalCapacity = ticketTypes.reduce((sum, tt) => sum + tt.capacity, 0);
  const totalSold = ticketTypes.reduce((sum, tt) => sum + tt.soldCount, 0);
  const remaining = Math.max(0, totalCapacity - totalSold);

  return remaining <= 0 ? 'SOLD_OUT' : 'AVAILABLE';
}
