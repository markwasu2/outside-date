# Weighted developer focus

The player rejected a flat three-instruction allowance. Six monthly focus points allow
unequal instruction mixes without treating a permit filing like a major order.

- 1 point: file a permit, adjust insurance, fix an inspection.
- 2 points: other previously one-action commitments, including negotiations, discovery
  responses, construction starts, equipment orders and site/capital decisions.
- 4 points: recap.
- 0 points: existing quick confirmation, cancellation and stand-down instructions.

This is an explicit game attention budget, not a claim about workdays or crew capacity.
Money and elapsed work clocks remain separate. A plan can contain more than three
instructions. Ongoing jobs continue without another instruction.

## Evidence

All grids use seeds 1-1000, every bot and every difficulty, both Whale and Millbrook.
`before-*` is unchanged main c9605f7. `after-first-*` is the initial screen with cheap
visits and discovery. `after-*` is the final model above. No bot policy changed.

Whale normal careful: 70.4% -> 73.4%; competent: 70.2% -> 69.7%; greedy: 32.2% -> 39.0%.
Whale competent hard: 31.7% -> 41.6%; easy: 96.3% -> 96.8%.
Millbrook normal careful: 85.5% -> 85.6%; competent: 69.6% -> 70.7%.

The initial model brought competent's first-vote docket failures to 14.6%, below the
existing 15% minimum. Full discovery responses and relationship meetings remain major
2-point work; the base docket vote chance moves 45% -> 44% to retain the existing
failure band with earlier cheap permit filing. No test band, takeout cap, starting cash,
construction timing, main RNG stream or event-drawing policy changed.

## Saves

Save v8 upgrades all known versions through v7, then doubles monthly allowance,
already-used attention and any next-month event debt exactly once. It does not replay
instructions, change money, or move hall dates. The monthly help is shown again to teach
the changed rule. New event costs use the same 2-point major-task units.

## Browser proof

The weighted-focus test queues a study (2) and three permit filings (1 each): four
instructions, five points, one left. A 2-point equipment order is unavailable with the
explicit shortfall. End month resets the allowance. Full real-click tutorial and Whale
journeys still close takeout; both have no injected game state or bot actions.
