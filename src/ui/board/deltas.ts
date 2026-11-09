import type { Content } from '../../content/schemas';
import { hallGrossRent } from '../../engine/selectors';
import type { GameState } from '../../engine/types';

/**
 * Phase 1 (D4/D9): month-over-month diffs between the previously committed state and the current
 * one (store.ts keeps both as prevState/state). Everything the board animates - rent coins,
 * construction-spend floats, arrival highlights - is derived here from committed state only.
 */

export interface MonthDeltas {
  /** How many months the last commit advanced (0 = not a month boundary: suppress animations). */
  monthsAdvanced: number;
  /** Net monthly rent per delivered hall (gross minus landlord cost share), for the coin fly. */
  rentByHall: Record<string, number>;
  /** Construction spend that hit each hall this month (costSpent delta), for the red float. */
  spendByHall: Record<string, number>;
  /** Long-lead order kinds that flipped arrived false -> true this commit. */
  arrivedOrders: string[];
  /** Plant ids that came online this commit. */
  plantsOnline: string[];
  /** Hall ids delivered this commit. */
  deliveredHalls: string[];
  /** Substation finished building this commit. */
  substationEnergized: boolean;
  /** Orders present now but not before (a purchase this commit - the part "lands" on the map). */
  newOrders: string[];
}

export function monthDeltas(prev: GameState | null, current: GameState, content: Content): MonthDeltas {
  const empty: MonthDeltas = {
    monthsAdvanced: 0,
    rentByHall: {},
    spendByHall: {},
    arrivedOrders: [],
    plantsOnline: [],
    deliveredHalls: [],
    substationEnergized: false,
    newOrders: [],
  };
  if (!prev) return empty;
  const monthsAdvanced = current.month - prev.month;
  if (monthsAdvanced <= 0) return empty;

  const rentByHall: Record<string, number> = {};
  const spendByHall: Record<string, number> = {};
  const deliveredHalls: string[] = [];
  for (const hall of current.halls) {
    if (hall.delivered && !hall.terminated) {
      const gross = hallGrossRent(current, content, hall);
      rentByHall[hall.id] = gross - content.tuning.lease.landlordCostShare * gross;
    }
    const prevHall = prev.halls.find((h) => h.id === hall.id);
    if (prevHall) {
      const spend = hall.costSpent - prevHall.costSpent;
      if (spend > 0) spendByHall[hall.id] = spend;
      if (hall.delivered && !prevHall.delivered) deliveredHalls.push(hall.id);
    }
  }

  const arrivedOrders = current.power.orders
    .filter((o) => o.arrived && !prev.power.orders.some((p) => p.kind === o.kind && p.orderedMonth === o.orderedMonth && p.arrived))
    .map((o) => o.kind);
  const newOrders = current.power.orders
    .filter((o) => !prev.power.orders.some((p) => p.kind === o.kind && p.orderedMonth === o.orderedMonth))
    .map((o) => o.kind);
  const plantsOnline = current.power.plants
    .filter((p) => {
      const prevPlant = prev.power.plants.find((q) => q.id === p.id);
      const wasOnline = prevPlant?.onlineMonth !== null && prevPlant?.onlineMonth !== undefined && prevPlant.onlineMonth <= prev.month;
      const isOnline = p.onlineMonth !== null && p.onlineMonth <= current.month;
      return isOnline && !wasOnline;
    })
    .map((p) => p.id);

  return {
    monthsAdvanced,
    rentByHall,
    spendByHall,
    arrivedOrders,
    plantsOnline,
    deliveredHalls,
    substationEnergized: current.power.substationStatus === 'done' && prev.power.substationStatus !== 'done',
    newOrders,
  };
}
